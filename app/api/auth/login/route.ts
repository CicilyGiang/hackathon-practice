import { createSession, sessionCookie } from '../../../../lib/auth-server';
import { transaction } from '../../../../lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) return Response.json({ message: 'Enter your email and password.' }, { status: 400 });
    const result = await transaction(async client => {
      const authenticated = await client.query<{ authenticated: boolean; authenticated_user_id: string; message: string }>('SELECT * FROM authenticate_user($1, $2)', [email, password]);
      const auth = authenticated.rows[0];
      if (!auth?.authenticated) throw new Error(auth?.message || 'Invalid email or password');
      const userId = Number(auth.authenticated_user_id);
      const profileResult = await client.query(`SELECT u.email, COALESCE(u.display_name,u.username) AS name, COALESCE(u.year_level::text,'') AS year, COALESCE(usp.semester,'') AS semester, COALESCE(f.faculty_name,'') AS major, COALESCE(usp.phone_e164,'') AS phone, COALESCE(usp.account_type,'student') AS role, COALESCE(usp.club_name,'') AS "clubName", COALESCE(usp.about_me,'') AS bio, COALESCE(usp.favourite_activities,ARRAY[]::text[]) AS "favouriteActivities", COALESCE(usp.profile_avatar_value,'🌟') AS avatar FROM users u LEFT JOIN faculties f ON f.faculty_id=u.faculty_id LEFT JOIN user_social_profiles usp ON usp.user_id=u.user_id WHERE u.user_id=$1`, [userId]);
      const interests = await client.query('SELECT i.interest_name FROM user_interests ui JOIN interests i ON i.interest_id=ui.interest_id WHERE ui.user_id=$1 ORDER BY i.interest_name LIMIT 6', [userId]);
      const token = await createSession(client, userId);
      return { token, profile: { ...profileResult.rows[0], interests: interests.rows.map(row => row.interest_name) } };
    });
    return Response.json({ authenticated: true, profile: result.profile }, { headers: { 'Set-Cookie': sessionCookie(result.token), 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error && error.message.includes('DATABASE_URL') ? 'Database connection is not configured.' : error instanceof Error && /locked/i.test(error.message) ? 'Account temporarily locked. Try again later.' : 'Invalid email or password.';
    return Response.json({ message }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
}
