import { Router, Request, Response } from 'express';
import { db } from '../core/database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from '../core/auth.js';

const router = Router();

// ==============================
// SALON EMPLOYEES (POST override to ignore specialty safely)
// ==============================
router.post('/salon-employees', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });

    const items = Array.isArray(req.body) ? req.body : [req.body];
    const ids: string[] = [];

    for (const item of items) {
      const id = item.id || db.uuid();
      const { name, email, phone, role, commission_percentage, is_active, avatar_url, has_login, user_id } = item;
      
      await db.execute(
        `INSERT INTO salon_employees (id, salon_id, user_id, name, email, phone, role, commission_percentage, is_active, avatar_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, profId, user_id || null, name, email || null, phone || null, role || 'employee', commission_percentage || 0, is_active === false ? 0 : 1, avatar_url || null]
      );
      if (has_login) {
        await db.execute("UPDATE salon_employees SET has_login = 1 WHERE id = ?", [id]);
      }
      ids.push(id);
    }
    res.status(201).json(ids.length === 1 ? { id: ids[0] } : { ids });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// EMPLOYEE SERVICES
// ==============================
router.get('/employee-services', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    
    // employee_services connects to salon_employees. We only return matching pairs.
    const rows = await db.query<any>(`
      SELECT es.* 
      FROM employee_services es
      JOIN salon_employees se ON es.employee_id = se.id
      WHERE se.salon_id = ?
    `, [profId]);

    // Handle eq filters manually for basic compatibility
    let filtered = rows;
    if (req.query['eq[employee_id]']) {
      filtered = filtered.filter((r: any) => r.employee_id === req.query['eq[employee_id]']);
    }
    res.json(filtered);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/employee-services', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(403).json({ error: 'Professional not found' });

    const { employee_id, service_id } = req.body;
    // Verify ownership
    const emp = await db.queryOne('SELECT id FROM salon_employees WHERE id = ? AND salon_id = ?', [employee_id, profId]);
    if (!emp) return res.status(403).json({ error: 'Employee not found' });

    const id = db.uuid();
    await db.execute('INSERT INTO employee_services (id, employee_id, service_id) VALUES (?, ?, ?)', [id, employee_id, service_id]);
    res.status(201).json({ id });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/employee-services', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    
    const empId = req.query['eq[employee_id]'] as string;
    const svcId = req.query['eq[service_id]'] as string;
    if (!empId || !svcId) return res.status(400).json({ error: 'Missing filters' });

    const emp = await db.queryOne('SELECT id FROM salon_employees WHERE id = ? AND salon_id = ?', [empId, profId]);
    if (!emp) return res.status(403).json({ error: 'Employee not found' });

    await db.execute('DELETE FROM employee_services WHERE employee_id = ? AND service_id = ?', [empId, svcId]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ==============================
// CAMPAIGN CONTACTS
// ==============================
router.get('/campaign-contacts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    
    // Scoped via campaigns
    let query = `
      SELECT cc.* 
      FROM campaign_contacts cc
      JOIN campaigns c ON cc.campaign_id = c.id
      WHERE c.professional_id = ?
    `;
    const params: any[] = [profId];

    if (req.query['eq[campaign_id]']) {
      query += ` AND cc.campaign_id = ?`;
      params.push(req.query['eq[campaign_id]']);
    }
    query += ` ORDER BY cc.created_at ASC`;

    const rows = await db.query<any>(query, params);
    res.json(rows);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
