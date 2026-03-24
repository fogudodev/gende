import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';

const router = Router();

// Check if current user is a reception employee
router.get('/salon-employees', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const userId = (req.query['eq[user_id]'] as string) || user.sub;
  const role = req.query['eq[role]'] as string;
  
  let where = 'user_id = ?';
  const params: any[] = [userId];
  
  if (role) {
    where += ' AND role = ?';
    params.push(role);
  }
  
  // Parse limit
  if (req.query.limit) {
    const limit = parseInt(String(req.query.limit), 10);
    const rows = await db.query(`SELECT * FROM salon_employees WHERE ${where} LIMIT ?`, [...params, limit]);
    return res.json(rows);
  }
  
  const rows = await db.query(`SELECT * FROM salon_employees WHERE ${where}`, params);
  res.json(rows);
});

router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;

  // Support query builder format: eq[user_id]=xxx&limit=1
  const userId = (req.query['eq[user_id]'] as string) || user.sub;

  const prof = await db.queryOne('SELECT * FROM professionals WHERE user_id = ?', [userId]);
  if (!prof) {
    // Return empty array for query-builder compatibility (no 404)
    return res.json([]);
  }
  // If limit=1 was passed (single/maybeSingle), return array with one item
  res.json([prof]);
});

router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const data = { ...req.body };
  delete data.id; delete data.user_id; delete data.created_at;

  if (!Object.keys(data).length) return res.status(400).json({ error: 'No data' });

  const sets = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
  await db.execute(`UPDATE professionals SET ${sets} WHERE user_id = ?`, [...Object.values(data), user.sub]);
  res.json({ success: true });
});

router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const sub = await db.queryOne<any>(
    'SELECT * FROM subscriptions WHERE professional_id = ? ORDER BY created_at DESC LIMIT 1',
    [profId]
  );

  if (!sub) return res.json({ subscribed: false, plan: 'none' });

  const isActive = sub.status === 'active' && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
  res.json({ subscribed: isActive, plan: sub.plan_id, subscription_end: sub.current_period_end });
});

router.get('/dashboard/stats', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user as JwtPayload;
  const profId = await getProfessionalId(user.sub);
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.slice(0, 7) + '-01';

  const [todayBookings] = await db.query<any>(
    "SELECT COUNT(*) as cnt FROM bookings WHERE professional_id = ? AND DATE(start_time) = ? AND status != 'cancelled'",
    [profId, today]
  );
  const [monthRevenue] = await db.query<any>(
    "SELECT COALESCE(SUM(price), 0) as total FROM bookings WHERE professional_id = ? AND DATE(start_time) >= ? AND status = 'completed'",
    [profId, monthStart]
  );
  const [totalClients] = await db.query<any>('SELECT COUNT(*) as cnt FROM clients WHERE professional_id = ?', [profId]);
  const [totalServices] = await db.query<any>('SELECT COUNT(*) as cnt FROM services WHERE professional_id = ? AND active = 1', [profId]);

  res.json({
    today_bookings: todayBookings.cnt,
    month_revenue: parseFloat(monthRevenue.total),
    total_clients: totalClients.cnt,
    total_services: totalServices.cnt,
  });
});

export default router;
