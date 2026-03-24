import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../core/database.js';
import { generateToken, generateRefreshToken, authMiddleware, JwtPayload } from '../core/auth.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { config } from '../config.js';

const router = Router();

const DB_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, timeoutMs = DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs)),
  ]);
}

function authErrorResponse(res: Response, err: any, fallback: string) {
  const message = String(err?.message || fallback);
  const isDbUnavailable = /DB_TIMEOUT|ER_ACCESS_DENIED_ERROR|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|PROTOCOL_CONNECTION_LOST|ECONNRESET/i.test(message);
  return res.status(isDbUnavailable ? 503 : 500).json({
    error: isDbUnavailable ? 'Serviço temporariamente indisponível. Tente novamente em instantes.' : fallback,
  });
}

// Sign Up
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { email, password, name = '', account_type = 'autonomous', business_name = '', phone = '' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  let conn: any = null;
  try {
    const existing = await withTimeout(db.queryOne('SELECT id FROM users WHERE email = ?', [email]));
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const userId = db.uuid();
    const hash = await bcrypt.hash(password, 10);

    conn = await withTimeout(db.getConnection());
    await withTimeout(conn.beginTransaction());

    await withTimeout(conn.execute(
      'INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)',
      [userId, email, hash, JSON.stringify({ name, account_type, business_name, phone })]
    ));

    const profId = db.uuid();
    await withTimeout(conn.execute(
      'INSERT INTO professionals (id, user_id, name, email, account_type, business_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [profId, userId, name, email, account_type, business_name, phone]
    ));

    await withTimeout(conn.execute(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [db.uuid(), userId, 'professional']
    ));

    if (email === 'admin@gende.io') {
      await withTimeout(conn.execute(
        'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=role',
        [db.uuid(), userId, 'admin']
      ));
    }

    await withTimeout(conn.execute(
      "INSERT INTO subscriptions (id, professional_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, 'enterprise', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))",
      [db.uuid(), profId]
    ));

    await withTimeout(conn.commit());

    const rolesResult = await withTimeout<any>(conn.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]));
    const roles = ((rolesResult?.[0] || []) as any[]).map((r) => r.role);

    const token = generateToken(userId, email, roles);
    const refresh = await withTimeout(generateRefreshToken(userId));

    // Auto-create WhatsApp instance and default automations (fire-and-forget)
    (async () => {
      try {
        // Create default automations
        const triggers = ['booking_created', 'reminder_24h', 'reminder_3h', 'post_service', 'post_sale_review', 'maintenance_reminder', 'reactivation_30d'];
        const [columnRows] = await db.getConnection().then(async (c) => {
          const result = await c.execute<any[]>(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_automations'"
          );
          c.release();
          return result;
        });
        const columnNames = new Set((columnRows as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME));
        const triggerColumn = columnNames.has('automation_type') ? 'automation_type' : columnNames.has('trigger_type') ? 'trigger_type' : null;
        const messageColumn = columnNames.has('custom_message') ? 'custom_message' : columnNames.has('message_template') ? 'message_template' : null;
        const enabledColumn = columnNames.has('is_enabled') ? 'is_enabled' : columnNames.has('is_active') ? 'is_active' : null;

        if (triggerColumn && enabledColumn) {
          for (const trigger of triggers) {
            const shouldEnable = ['booking_created', 'reminder_24h'].includes(trigger) ? 1 : 0;
            if (messageColumn) {
              await db.execute(
                `INSERT INTO whatsapp_automations (id, professional_id, ${triggerColumn}, ${messageColumn}, ${enabledColumn}) VALUES (?, ?, ?, '', ?) ON DUPLICATE KEY UPDATE ${triggerColumn} = VALUES(${triggerColumn})`,
                [db.uuid(), profId, trigger, shouldEnable]
              );
            } else {
              await db.execute(
                `INSERT INTO whatsapp_automations (id, professional_id, ${triggerColumn}, ${enabledColumn}) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE ${triggerColumn} = VALUES(${triggerColumn})`,
                [db.uuid(), profId, trigger, shouldEnable]
              );
            }
          }
        }

        // Auto-create Evolution API instance
        if (config.evolution.url && config.evolution.key) {
          const wa = new WhatsAppService();
          const instanceName = `gende_${profId.slice(0, 8)}`;
          await wa.createInstance(instanceName, profId);
          console.log(`[Signup] Auto-created WhatsApp instance: ${instanceName} for professional ${profId}`);
        }

        // Notify admin about new signup
        if (config.evolution.url && config.evolution.key) {
          const wa = new WhatsAppService();
          const adminInst = await db.queryOne<any>("SELECT instance_name FROM whatsapp_instances WHERE status = 'connected' LIMIT 1");
          if (adminInst) {
            const msg = `🆕 *Novo cadastro no Gende!*\n\n👤 *Nome:* ${name}\n🏪 *Studio/Salão:* ${business_name}\n📧 *Email:* ${email}\n📱 *WhatsApp:* ${phone}\n\n📅 *Data:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n_Entre em contato para ajudar na configuração!_`;
            await wa.sendMessage(adminInst.instance_name, config.adminPhone, msg);
          }
        }
      } catch (autoErr: any) {
        console.warn('[Signup] Auto-setup error (non-blocking):', autoErr.message);
      }
    })();

    return res.status(201).json({
      access_token: token,
      refresh_token: refresh,
      user: { id: userId, email, name },
    });
  } catch (e: any) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        // noop
      }
    }
    return authErrorResponse(res, e, 'Registration failed');
  } finally {
    if (conn) conn.release();
  }
});

// Login
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await withTimeout(db.queryOne<any>('SELECT * FROM users WHERE email = ?', [email]));

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const roles = (await withTimeout(db.query<{ role: string }>('SELECT role FROM user_roles WHERE user_id = ?', [user.id]))).map(r => r.role);
    const token = generateToken(user.id, user.email, roles);
    const refresh = await withTimeout(generateRefreshToken(user.id));
    const meta = JSON.parse(user.raw_user_meta_data || '{}');

    return res.json({
      access_token: token,
      refresh_token: refresh,
      user: { id: user.id, email: user.email, name: meta.name || '' },
    });
  } catch (e: any) {
    return authErrorResponse(res, e, 'Login failed');
  }
});

// Refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    const rt = await withTimeout(db.queryOne<any>('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [refresh_token]));
    if (!rt) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const user = await withTimeout(db.queryOne<any>('SELECT * FROM users WHERE id = ?', [rt.user_id]));
    if (!user) return res.status(401).json({ error: 'Invalid token user' });
    const roles = (await withTimeout(db.query<{ role: string }>('SELECT role FROM user_roles WHERE user_id = ?', [user.id]))).map(r => r.role);

    await withTimeout(db.execute('DELETE FROM refresh_tokens WHERE id = ?', [rt.id]));

    const token = generateToken(user.id, user.email, roles);
    const newRefresh = await withTimeout(generateRefreshToken(user.id));

    return res.json({ access_token: token, refresh_token: newRefresh });
  } catch (e: any) {
    return authErrorResponse(res, e, 'Token refresh failed');
  }
});

// Logout
router.post('/auth/logout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    await withTimeout(db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [user.sub]));
    return res.json({ success: true });
  } catch (e: any) {
    return authErrorResponse(res, e, 'Logout failed');
  }
});

export default router;
