import { Pool, type PoolClient } from 'pg';

declare global { var sidequestPostgresPool: Pool | undefined; }

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is not configured.');
  return value;
}

export function db() {
  if (!globalThis.sidequestPostgresPool) {
    globalThis.sidequestPostgresPool = new Pool({
      connectionString: connectionString(),
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalThis.sidequestPostgresPool;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await db().connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
