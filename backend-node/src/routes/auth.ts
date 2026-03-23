import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../core/database.js';
import { generateToken, generateRefreshToken, authMiddleware, JwtPayload } from '../core/auth.js';

const router = Router();

// Sign Up
router.post('/auth/signup', async (req: Request, res: Response) => {
  const { email, password, name = '', account_type = 'autonomous', business_name = '', phone = '' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = await db.queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const userId = db.uuid();
  const hash = await bcrypt.hash(password, 10);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      'INSERT INTO users (id, email, password_hash, raw_user_meta_data) VALUES (?, ?, ?, ?)',
      [userId, email, hash, JSON.stringify({ name, account_type, business_name, phone })]
    );

    const profId = db.uuid();
    await conn.execute(
      'INSERT INTO professionals (id, user_id, name, email, account_type, business_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [profId, userId, name, email, account_type, business_name, phone]
    );

    await conn.execute(
      'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
      [db.uuid(), userId, 'professional']
    );

    if (email === 'admin@gende.io') {
      await conn.execute(
        'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role=role',
        [db.uuid(), userId, 'admin']
      );
    }

    await conn.execute(
      "INSERT INTO subscriptions (id, professional_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, 'enterprise', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY))",
      [db.uuid(), profId]
    );

    await conn.commit();

    const [rolesRows] = await conn.execute('SELECT role FROM user_roles WHERE user_id = ?', [userId]);
    const roles = (rolesRows as any[]).map(r => r.role);

    const token = generateToken(userId, email, roles);
    const refresh = await generateRefreshToken(userId);

    res.status(201).json({
      access_token: token,
      refresh_token: refresh,
      user: { id: userId, email, name },
    });
  } catch (e: any) {
    await conn.rollback();
    res.status(500).json({ error: 'Registration failed: ' + e.message });
  } finally {
    conn.release();
  }
});

// Login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await db.queryOne<any>('SELECT * FROM users WHERE email = ?', [email]);

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const roles = (await db.query<{ role: string }>('SELECT role FROM user_roles WHERE user_id = ?', [user.id])).map(r => r.role);
  const token = generateToken(user.id, user.email, roles);
  const refresh = await generateRefreshToken(user.id);
  const meta = JSON.parse(user.raw_user_meta_data || '{}');

  res.json({
    access_token: token,
    refresh_token: refresh,
    user: { id: user.id, email: user.email, name: meta.name || '' },
  });
});

// Refresh
router.post('/auth/refresh', async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  const rt = await db.queryOne<any>('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [refresh_token]);
  if (!rt) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  const user = await db.queryOne<any>('SELECT * FROM users WHERE id = ?', [rt.user_id]);
  const roles = (await db.query<{ role: string }>('SELECT role FROM user_roles WHERE user_id = ?', [user.id])).map(r => r.role);

  await db.execute('DELETE FROM refresh_tokens WHERE id = ?', [rt.id]);

  const token = generateToken(user.id, user.email, roles);
  const newRefresh = await generateRefreshToken(user.id);

  res.json({ access_token: token, refresh_token: newRefresh });
});

// Logout
router.post('/auth/logout', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  await db.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [user.sub]);
  res.json({ success: true });
});

export default router;
