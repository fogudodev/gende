import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../core/database.js';
import { authMiddleware, adminMiddleware, generateToken, generateRefreshToken, hasRole, JwtPayload } from '../core/auth.js';
import { WhatsAppService } from '../services/whatsapp.js';

const router = Router();

// ============================================
// RPC endpoints (called by frontend hooks)
// ============================================
router.post('/rpc/is_admin', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const isAdmin = await hasRole(user.sub, 'admin');
  res.json(isAdmin);
});

router.post('/rpc/is_support', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const isSupport = await hasRole(user.sub, 'support');
  res.json(isSupport);
});

router.post('/rpc/get_support_users', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  if (!user.roles?.includes('admin')) return res.status(403).json({ error: 'Forbidden' });

  const rows = await db.query(
    `SELECT u.id as user_id, JSON_UNQUOTE(JSON_EXTRACT(u.raw_user_meta_data, '$.name')) as name, u.email, u.created_at 
     FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.role = 'support'`
  );
  res.json(rows);
});

// Feature flags (global table, not scoped by professional_id)
router.get('/feature-flags', authMiddleware, async (req: Request, res: Response) => {
  const order = typeof req.query.order === 'string' ? req.query.order : 'category.asc';
  const [columnRaw, dirRaw] = order.split('.');
  const allowedColumns = new Set(['category', 'key', 'label', 'created_at', 'updated_at']);
  const column = allowedColumns.has(columnRaw) ? columnRaw : 'category';
  const direction = dirRaw === 'desc' ? 'DESC' : 'ASC';

  const rows = await db.query(`SELECT * FROM feature_flags ORDER BY \`${column}\` ${direction}`);
  res.json(rows);
});

router.put('/feature-flags/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  const { enabled, updated_at } = req.body || {};

  const result = await db.execute(
    'UPDATE feature_flags SET enabled = ?, updated_at = ? WHERE id = ?',
    [enabled ? 1 : 0, updated_at || new Date().toISOString(), req.params.id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Feature flag not found' });
  res.json({ success: true });
});

router.get('/admin/professionals', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  const rows = await db.query(
    'SELECT p.*, s.plan_id, s.status as sub_status, s.current_period_end FROM professionals p LEFT JOIN subscriptions s ON s.professional_id = p.id ORDER BY p.created_at DESC'
  );
  res.json(rows);
});

router.put('/admin/professionals/:id/block', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  await db.execute('UPDATE professionals SET is_blocked = ?, blocked_reason = ? WHERE id = ?', [
    req.body.blocked ? 1 : 0, req.body.reason || '', req.params.id,
  ]);
  res.json({ success: true });
});

router.get('/admin/users', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  const rows = await db.query(
    'SELECT u.id, u.email, u.created_at, GROUP_CONCAT(ur.role) as roles FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id GROUP BY u.id ORDER BY u.created_at DESC'
  );
  res.json(rows);
});

const createProfessionalHandler = async (req: Request, res: Response) => {
  const { name, email, password, phone, accountType = 'autonomous', businessName = '', role = '' } = req.body;
  const isSupport = role === 'support';

  if (!name || !email || !password) return res.status(400).json({ error: 'Campos obrigatórios: name, email, password' });

  const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const userId = db.uuid();
  const hash = await bcrypt.hash(password, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)',
      [userId, email, hash, JSON.stringify({ name, account_type: isSupport ? 'autonomous' : accountType, business_name: isSupport ? '' : businessName, is_support: isSupport })]
    );

    if (isSupport) {
      await conn.execute('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [db.uuid(), userId, 'support']);
    } else {
      const profId = db.uuid();
      await conn.execute(
        'INSERT INTO professionals (id, user_id, name, email, account_type, business_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [profId, userId, name, email, accountType, businessName, phone]
      );
      await conn.execute('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [db.uuid(), userId, 'professional']);
      await conn.execute(
        "INSERT INTO subscriptions (id, professional_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, 'enterprise', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))",
        [db.uuid(), profId]
      );

      // Create default automations using correct MySQL column names
      try {
        const triggers = ['booking_created', 'reminder_24h', 'reminder_3h', 'post_service', 'post_sale_review', 'maintenance_reminder', 'reactivation_30d'];
        for (const trigger of triggers) {
          await conn.execute(
            "INSERT INTO whatsapp_automations (id, professional_id, automation_type, custom_message, is_enabled) VALUES (?, ?, ?, '', ?) ON DUPLICATE KEY UPDATE automation_type = VALUES(automation_type)",
            [db.uuid(), profId, trigger, ['booking_created', 'reminder_24h'].includes(trigger) ? 1 : 0]
          );
        }
      } catch (autoErr: any) {
        console.warn('Skipping automations insert:', autoErr.message);
      }
    }

    await conn.commit();

    let whatsappSent = false;
    if (phone) {
      const wa = new WhatsAppService();
      const inst = await db.queryOne<any>("SELECT instance_name FROM whatsapp_instances WHERE status = 'connected' LIMIT 1");
      if (inst) {
        const msg = `🎉 *Bem-vindo(a) ao Gende!*\n\nOlá ${name}!\n\n📧 *Email:* ${email}\n🔑 *Senha:* ${password}\n\n🔗 Acesse: https://app.gende.io/login\n\nAltere sua senha após o primeiro acesso. 😊`;
        const r = await wa.sendMessage(inst.instance_name, phone, msg);
        whatsappSent = r.ok;
      }
    }

    res.status(201).json({ success: true, userId, whatsappSent });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Erro ao criar: ' + e.message });
  } finally {
    conn.release();
  }
};

// Canonical + legacy alias
router.post('/admin/create-professional', authMiddleware, adminMiddleware, createProfessionalHandler);
router.post('/admin-create-professional', authMiddleware, adminMiddleware, createProfessionalHandler);

const deleteUserHandler = async (req: Request, res: Response) => {
  const { professionalId } = req.body;
  if (!professionalId) return res.status(400).json({ error: 'professionalId é obrigatório' });

  const prof = await db.queryOne<any>('SELECT user_id, is_blocked, name FROM professionals WHERE id = ?', [professionalId]);
  if (!prof) return res.status(404).json({ error: 'Professional not found' });
  if (!prof.is_blocked) return res.status(400).json({ error: 'Only blocked users can be deleted' });

  const tables = ['whatsapp_logs', 'whatsapp_automations', 'whatsapp_instances', 'campaign_contacts', 'campaigns', 'commissions', 'bookings', 'blocked_times', 'working_hours', 'reviews', 'expenses', 'products', 'coupons', 'clients', 'services', 'payments', 'payment_config', 'daily_message_usage', 'google_calendar_tokens', 'chat_messages', 'professional_limits', 'salon_employees', 'subscriptions'];
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table} WHERE professional_id = ?`, [professionalId]);
  }
  await db.execute('DELETE FROM user_roles WHERE user_id = ?', [prof.user_id]);
  await db.execute('DELETE FROM professionals WHERE id = ?', [professionalId]);
  await db.execute('DELETE FROM users WHERE id = ?', [prof.user_id]);

  res.json({ success: true, deletedUser: prof.name });
};

router.post('/admin/delete-user', authMiddleware, adminMiddleware, deleteUserHandler);
router.post('/admin-delete-user', authMiddleware, adminMiddleware, deleteUserHandler);

const impersonateHandler = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  const user = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  const roles = (await db.query<{ role: string }>('SELECT role FROM user_roles WHERE user_id = ?', [userId])).map(r => r.role);
  const token = generateToken(userId, user.email, roles);
  const refreshToken = await generateRefreshToken(userId);

  res.json({ success: true, access_token: token, refresh_token: refreshToken });
};

router.post('/admin/impersonate', authMiddleware, adminMiddleware, impersonateHandler);
router.post('/admin-impersonate', authMiddleware, adminMiddleware, impersonateHandler);

const createReceptionUserHandler = async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const { name, email, password, employeeId, salonId } = req.body;
  if (!name || !email || !password || !employeeId || !salonId) return res.status(400).json({ error: 'Missing required fields' });

  const isOwner = !!(await db.queryOne('SELECT id FROM professionals WHERE id = ? AND user_id = ?', [salonId, user.sub]));
  const isAdmin = user.roles?.includes('admin');
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Not authorized' });

  const userId = db.uuid();
  const hash = await bcrypt.hash(password, 10);

  await db.execute('INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)', [userId, email, hash, JSON.stringify({ name, is_reception: true })]);
  await db.execute('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', [db.uuid(), userId, 'user']);
  await db.execute("UPDATE salon_employees SET user_id = ?, has_login = 1, role = 'reception' WHERE id = ?", [userId, employeeId]);

  res.json({ success: true, userId });
};

router.post('/admin/create-reception-user', authMiddleware, createReceptionUserHandler);
router.post('/create-reception-user', authMiddleware, createReceptionUserHandler);

const removeSupportRoleHandler = async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });

  await db.execute('DELETE FROM user_roles WHERE user_id = ? AND role = ?', [userId, 'support']);
  res.json({ success: true });
};

router.post('/admin/remove-support-role', authMiddleware, adminMiddleware, removeSupportRoleHandler);
router.post('/admin-remove-support-role', authMiddleware, adminMiddleware, removeSupportRoleHandler);

export default router;
