import { Router, Request, Response } from 'express';
import { db } from './database.js';
import { authMiddleware, getProfessionalId, JwtPayload } from './auth.js';

export function createCrudRoutes(routePath: string, tableName: string, profColumn = 'professional_id'): Router {
  const router = Router();

  // List with optional eq[column]=value filters
  router.get(`/${routePath}`, authMiddleware, async (req: Request, res: Response) => {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(404).json({ error: 'Professional not found' });

    let where = `\`${profColumn}\` = ?`;
    const params: any[] = [profId];

    // Parse eq[column]=value filters from query string
    for (const [key, val] of Object.entries(req.query)) {
      const eqMatch = key.match(/^eq\[(.+)\]$/);
      if (eqMatch && val !== undefined) {
        const col = eqMatch[1];
        where += ` AND \`${col}\` = ?`;
        params.push(val);
      }
    }

    // Parse order param (column.asc or column.desc)
    let orderClause = 'ORDER BY created_at DESC';
    if (typeof req.query.order === 'string') {
      const [col, dir] = req.query.order.split('.');
      if (col) orderClause = `ORDER BY \`${col}\` ${dir === 'asc' ? 'ASC' : 'DESC'}`;
    }

    // Parse limit
    let limitClause = '';
    if (req.query.limit) limitClause = ` LIMIT ${parseInt(String(req.query.limit), 10)}`;

    const rows = await db.query(
      `SELECT * FROM \`${tableName}\` WHERE ${where} ${orderClause}${limitClause}`,
      params
    );
    res.json(rows);
  });

  // Get by ID
  router.get(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    const row = await db.queryOne(
      `SELECT * FROM \`${tableName}\` WHERE id = ? AND \`${profColumn}\` = ?`,
      [req.params.id, profId]
    );
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  // Create
  router.post(`/${routePath}`, authMiddleware, async (req: Request, res: Response) => {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    if (!profId) return res.status(404).json({ error: 'Professional not found' });

    const data = { ...req.body, [profColumn]: profId, id: req.body.id || db.uuid() };
    const columns = Object.keys(data).map(k => `\`${k}\``).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');

    await db.execute(
      `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
      Object.values(data)
    );
    res.status(201).json({ id: data.id });
  });

  // Update
  router.put(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    const data = { ...req.body };
    delete data.id;
    delete data[profColumn];
    delete data.created_at;

    if (!Object.keys(data).length) return res.status(400).json({ error: 'No data to update' });

    const sets = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
    const values = [...Object.values(data), req.params.id, profId];

    const result = await db.execute(
      `UPDATE \`${tableName}\` SET ${sets} WHERE id = ? AND \`${profColumn}\` = ?`,
      values
    );
    res.json({ updated: result.affectedRows > 0 });
  });

  // Delete
  router.delete(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    const user = (req as any).user as JwtPayload;
    const profId = await getProfessionalId(user.sub);
    const result = await db.execute(
      `DELETE FROM \`${tableName}\` WHERE id = ? AND \`${profColumn}\` = ?`,
      [req.params.id, profId]
    );
    res.json({ deleted: result.affectedRows > 0 });
  });

  return router;
}
