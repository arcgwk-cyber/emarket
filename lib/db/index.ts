import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { parse } from 'pg-connection-string';
import * as schema from './schema';
import { validateServerEnv } from '@/lib/env';

validateServerEnv();

const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

let conn: Pool;

if (globalForDb.conn) {
  conn = globalForDb.conn;
} else {
  const dbUrl = process.env.DATABASE_URL || '';
  const poolConfig = parse(dbUrl) as any;
  poolConfig.max = 10;
  poolConfig.idleTimeoutMillis = 30000;
  poolConfig.connectionTimeoutMillis = 2000;
  poolConfig.ssl = { rejectUnauthorized: false };
  conn = new Pool(poolConfig);
}

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
export type DbClient = typeof db;
