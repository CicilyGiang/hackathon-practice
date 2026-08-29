import { createHash, randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';

export const SESSION_COOKIE = 'sidequest_session';

export async function createSession(client: PoolClient, userId: number) {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  await client.query('INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL \'7 days\')', [userId, hash]);
  return token;
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
