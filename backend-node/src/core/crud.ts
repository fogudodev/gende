import { Router, Request, Response } from 'express';
import { db } from './database.js';
import { authMiddleware, getProfessionalId, hasRole, JwtPayload } from './auth.js';

export function createCrudRoutes(routePath: string, tableName: string, profColumn = 'professional_id'): Router {
  const router = Router();
  const hasScope = !!profColumn; // If profColumn is empty string, skip scoping
  let cachedTableColumns: Set<string> | null = null;

  async function getTableColumns(): Promise<Set<string> | null> {
    if (cachedTableColumns) return cachedTableColumns;

    try {
      const rows = await db.query<{ COLUMN_NAME: string }>(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
        [tableName]
      );
      cachedTableColumns = new Set(rows.map((row) => row.COLUMN_NAME));
      return cachedTableColumns;
    } catch {
      return null;
    }
  }

  async function sanitizeDataForTable(data: Record<string, any>): Promise<Record<string, any>> {
    const columns = await getTableColumns();

    if (!columns) {
      return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && columns.has(key)) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Helper: check if user is admin and resolve profId accordingly
  async function resolveAccess(user: JwtPayload): Promise<{ isAdmin: boolean; profId: string | null }> {
    const isAdmin = user.roles?.includes('admin') || await hasRole(user.sub, 'admin');
    const profId = isAdmin ? null : await getProfessionalId(user.sub);
    return { isAdmin, profId };
  }

  // List with optional eq[column]=value filters
  router.get(`/${routePath}`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);
      if (hasScope && !isAdmin && !profId) return res.status(404).json({ error: 'Professional not found' });

      let where = '1=1';
      const params: any[] = [];

      // Non-admin: scope to professional (only if table has profColumn)
      if (hasScope && !isAdmin) {
        where = `\`${profColumn}\` = ?`;
        params.push(profId);
      }

      // Parse filters from query string
      // Express with qs parser converts eq[col]=val into { eq: { col: val } }
      // Also support literal keys op[col] for simple query parsers
      for (const [key, val] of Object.entries(req.query)) {
        const eqMatch = key.match(/^eq\[(.+)\]$/);
        if (eqMatch && typeof val === 'string') {
          const col = eqMatch[1];
          where += ` AND \`${col}\` = ?`;
          params.push(val);
        }
        const neqMatch = key.match(/^neq\[(.+)\]$/);
        if (neqMatch && typeof val === 'string') {
          const col = neqMatch[1];
          where += ` AND \`${col}\` != ?`;
          params.push(val);
        }
        const gtMatch = key.match(/^gt\[(.+)\]$/);
        if (gtMatch && typeof val === 'string') {
          const col = gtMatch[1];
          where += ` AND \`${col}\` > ?`;
          params.push(val);
        }
        const gteMatch = key.match(/^gte\[(.+)\]$/);
        if (gteMatch && typeof val === 'string') {
          const col = gteMatch[1];
          where += ` AND \`${col}\` >= ?`;
          params.push(val);
        }
        const ltMatch = key.match(/^lt\[(.+)\]$/);
        if (ltMatch && typeof val === 'string') {
          const col = ltMatch[1];
          where += ` AND \`${col}\` < ?`;
          params.push(val);
        }
        const lteMatch = key.match(/^lte\[(.+)\]$/);
        if (lteMatch && typeof val === 'string') {
          const col = lteMatch[1];
          where += ` AND \`${col}\` <= ?`;
          params.push(val);
        }
        const likeMatch = key.match(/^like\[(.+)\]$/);
        if (likeMatch && typeof val === 'string') {
          const col = likeMatch[1];
          where += ` AND \`${col}\` LIKE ?`;
          params.push(val);
        }
        const inMatch = key.match(/^in\[(.+)\]$/);
        if (inMatch && typeof val === 'string') {
          const col = inMatch[1];
          const values = val.replace(/^\(|\)$/g, '').split(',');
          where += ` AND \`${col}\` IN (${values.map(() => '?').join(',')})`;
          params.push(...values);
        }
      }

      // Handle qs-parsed nested objects: eq: { column: value }
      if (req.query.eq && typeof req.query.eq === 'object') {
        for (const [col, val] of Object.entries(req.query.eq as Record<string, string>)) {
          where += ` AND \`${col}\` = ?`;
          params.push(val);
        }
      }
      if (req.query.neq && typeof req.query.neq === 'object') {
        for (const [col, val] of Object.entries(req.query.neq as Record<string, string>)) {
          where += ` AND \`${col}\` != ?`;
          params.push(val);
        }
      }
      if (req.query.gt && typeof req.query.gt === 'object') {
        for (const [col, val] of Object.entries(req.query.gt as Record<string, string>)) {
          where += ` AND \`${col}\` > ?`;
          params.push(val);
        }
      }
      if (req.query.gte && typeof req.query.gte === 'object') {
        for (const [col, val] of Object.entries(req.query.gte as Record<string, string>)) {
          where += ` AND \`${col}\` >= ?`;
          params.push(val);
        }
      }
      if (req.query.lt && typeof req.query.lt === 'object') {
        for (const [col, val] of Object.entries(req.query.lt as Record<string, string>)) {
          where += ` AND \`${col}\` < ?`;
          params.push(val);
        }
      }
      if (req.query.lte && typeof req.query.lte === 'object') {
        for (const [col, val] of Object.entries(req.query.lte as Record<string, string>)) {
          where += ` AND \`${col}\` <= ?`;
          params.push(val);
        }
      }
      if (req.query.like && typeof req.query.like === 'object') {
        for (const [col, val] of Object.entries(req.query.like as Record<string, string>)) {
          where += ` AND \`${col}\` LIKE ?`;
          params.push(val);
        }
      }
      if (req.query.in && typeof req.query.in === 'object') {
        for (const [col, val] of Object.entries(req.query.in as Record<string, string>)) {
          const values = String(val).replace(/^\(|\)$/g, '').split(',');
          where += ` AND \`${col}\` IN (${values.map(() => '?').join(',')})`;
          params.push(...values);
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

      // Handle exact count requests
      const preferHeader = String(req.headers['prefer'] || '');
      const wantsExactCount = preferHeader.includes('count=exact') || req.query.count === 'exact';
      const wantsHeadCount = req.query.head === 'true';
      if (wantsExactCount && (req.query.select === 'id' || wantsHeadCount)) {
        const [row] = await db.query<any>(`SELECT COUNT(*) as cnt FROM \`${tableName}\` WHERE ${where}`, params);
        res.set('content-range', `0-0/${row.cnt}`);
        if (wantsHeadCount) {
          return res.json({ count: row.cnt });
        }
        return res.json([]);
      }

      const rows = await db.query(
        `SELECT * FROM \`${tableName}\` WHERE ${where} ${orderClause}${limitClause}`,
        params
      );
      res.json(rows);
    } catch (err: any) {
      console.error(`[CRUD GET /${routePath}]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  // Get by ID
  router.get(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);

      let query = `SELECT * FROM \`${tableName}\` WHERE id = ?`;
      const params: any[] = [req.params.id];
      if (hasScope && !isAdmin) {
        query += ` AND \`${profColumn}\` = ?`;
        params.push(profId);
      }

      const row = await db.queryOne(query, params);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (err: any) {
      console.error(`[CRUD GET /${routePath}/:id]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  // Bulk delete by filter (DELETE /route?eq[column]=value)
  router.delete(`/${routePath}`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);

      let where = '1=1';
      const params: any[] = [];

      if (hasScope && !isAdmin) {
        where = `\`${profColumn}\` = ?`;
        params.push(profId);
      }

      // Parse eq[column]=value filters
      let hasFilter = false;
      for (const [key, val] of Object.entries(req.query)) {
        const eqMatch = key.match(/^eq\[(.+)\]$/);
        if (eqMatch && typeof val === 'string') {
          where += ` AND \`${eqMatch[1]}\` = ?`;
          params.push(val);
          hasFilter = true;
        }
      }
      if (req.query.eq && typeof req.query.eq === 'object') {
        for (const [col, val] of Object.entries(req.query.eq as Record<string, string>)) {
          where += ` AND \`${col}\` = ?`;
          params.push(val);
          hasFilter = true;
        }
      }

      if (!hasFilter && !isAdmin) return res.status(400).json({ error: 'Filter required for bulk delete' });

      const result = await db.execute(`DELETE FROM \`${tableName}\` WHERE ${where}`, params);
      res.json({ deleted: result.affectedRows });
    } catch (err: any) {
      console.error(`[CRUD BULK DELETE /${routePath}]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  // Create (supports single object or array)
  router.post(`/${routePath}`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);
      if (hasScope && !isAdmin && !profId) return res.status(404).json({ error: 'Professional not found' });

      // Handle array inserts
      const items = Array.isArray(req.body) ? req.body : [req.body];
      const ids: string[] = [];

      for (const item of items) {
        let data = { ...item, id: item.id || db.uuid() };
        if (hasScope && !isAdmin && !data[profColumn]) {
          data[profColumn] = profId;
        }

        data = await sanitizeDataForTable(data);

        if (!Object.keys(data).length) {
          return res.status(400).json({ error: 'No valid fields to insert' });
        }

        const columns = Object.keys(data).map(k => `\`${k}\``).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');

        // Check for upsert (onConflict header)
        const onConflict = req.headers['x-on-conflict'] as string;
        if (onConflict) {
          const updateParts = Object.keys(data)
            .filter(k => !onConflict.split(',').includes(k) && k !== 'id')
            .map(k => `\`${k}\` = VALUES(\`${k}\`)`);
          
          await db.execute(
            `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateParts.join(', ')}`,
            Object.values(data)
          );
        } else {
          await db.execute(
            `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`,
            Object.values(data)
          );
        }
        ids.push(data.id);
      }

      res.status(201).json(ids.length === 1 ? { id: ids[0] } : { ids });
    } catch (err: any) {
      console.error(`[CRUD POST /${routePath}]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  // Update
  router.put(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);
      const rawData = { ...req.body };
      delete rawData.id;
      delete rawData.created_at;
      if (hasScope && !isAdmin) delete rawData[profColumn];

      const data = await sanitizeDataForTable(rawData);

      if (!Object.keys(data).length) return res.status(400).json({ error: 'No data to update' });

      const sets = Object.keys(data).map(k => `\`${k}\` = ?`).join(', ');
      let query = `UPDATE \`${tableName}\` SET ${sets} WHERE id = ?`;
      const values = [...Object.values(data), req.params.id];

      if (hasScope && !isAdmin) {
        query += ` AND \`${profColumn}\` = ?`;
        values.push(profId);
      }

      const result = await db.execute(query, values);
      res.json({ updated: result.affectedRows > 0 });
    } catch (err: any) {
      console.error(`[CRUD PUT /${routePath}/:id]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  // Delete
  router.delete(`/${routePath}/:id`, authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user as JwtPayload;
      const { isAdmin, profId } = await resolveAccess(user);

      let query = `DELETE FROM \`${tableName}\` WHERE id = ?`;
      const params: any[] = [req.params.id];

      if (hasScope && !isAdmin) {
        query += ` AND \`${profColumn}\` = ?`;
        params.push(profId);
      }

      const result = await db.execute(query, params);
      res.json({ deleted: result.affectedRows > 0 });
    } catch (err: any) {
      console.error(`[CRUD DELETE /${routePath}/:id]`, err.message);
      res.status(500).json({ error: 'Database error', details: err.message });
    }
  });

  return router;
}
