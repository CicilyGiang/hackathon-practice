import { clearSessionCookie } from '../../../../lib/auth-server';
export async function POST() { return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie(), 'Cache-Control': 'no-store' } }); }
