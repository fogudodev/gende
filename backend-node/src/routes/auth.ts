import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../core/database.js';
import { generateToken, generateRefreshToken, authMiddleware, JwtPayload } from '../core/auth.js';

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

    const [rolesRows] = await withTimeout(conn.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]));
    const roles = (rolesRows as any[]).map(r => r.role);

    const token = generateToken(userId, email, roles);
    const refresh = await withTimeout(generateRefreshToken(userId));

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
