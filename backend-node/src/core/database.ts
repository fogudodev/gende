import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      timezone: '-03:00',
    });
  }
  return pool;
}

export const db = {
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await getPool().execute(sql, params);
    return rows as T[];
  },

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  },

  async execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
    const [result] = await getPool().execute(sql, params);
    return result as mysql.ResultSetHeader;
  },

  async getConnection() {
    return getPool().getConnection();
  },

  uuid: uuidv4,
};
