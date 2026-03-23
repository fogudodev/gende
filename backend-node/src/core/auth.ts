import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { db } from './database.js';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

export function generateToken(userId: string, email: string, roles: string[]): string {
  return jwt.sign({ sub: userId, email, roles }, config.jwt.secret, {
    expiresIn: config.jwt.expiry,
  });
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiry * 1000);
  await db.execute(
    'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [db.uuid(), userId, token, expiresAt]
  );
  return token;
}

export function validateToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getProfessionalId(userId: string): Promise<string | null> {
  const row = await db.queryOne<{ id: string }>(
    'SELECT id FROM professionals WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return row?.id || null;
}

export async function hasRole(userId: string, role: string): Promise<boolean> {
  const row = await db.queryOne('SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?', [userId, role]);
  return !!row;
}

// Express middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const payload = validateToken(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  (req as any).user = payload;
  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as JwtPayload;
  if (!user?.roles?.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}
