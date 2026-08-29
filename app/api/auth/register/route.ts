import { createSession, sessionCookie } from '../../../../lib/auth-server';
import { transaction } from '../../../../lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!/^[^@\s]+@uni\.sydney\.edu\.au$/i.test(email)) return Response.json({ message: 'Use a University of Sydney student email.' }, { status: 400 });
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return Response.json({ message: 'Password must be at least 8 characters with upper-case, lower-case and a number.' }, { status: 400 });
    if (!name || name.length > 120) return Response.json({ message: 'Enter a valid full name.' }, { status: 400 });
    const result = await transaction(async client => {
      const username = email.split('@')[0];
      const registered = await client.query<{ register_user: string }>('SELECT register_user($1, $2, $3, $4, NULL, NULL)', [username, email, password, name]);
      const userId = Number(registered.rows[0].register_user);
      await client.query(`INSERT INTO user_social_profiles (user_id, semester, phone_e164, account_type, club_name, about_me, favourite_activities, profile_avatar_type, profile_avatar_value)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (user_id) DO UPDATE SET semester=EXCLUDED.semester, phone_e164=EXCLUDED.phone_e164, account_type=EXCLUDED.account_type, club_name=EXCLUDED.club_name, about_me=EXCLUDED.about_me, favourite_activities=EXCLUDED.favourite_activities, profile_avatar_type=EXCLUDED.profile_avatar_type, profile_avatar_value=EXCLUDED.profile_avatar_value`,
      [userId, body.semester || null, body.phone || null, body.role === 'organizer' ? 'organizer' : 'student', body.role === 'organizer' ? body.clubName || null : null, body.bio || '', Array.isArray(body.favouriteActivities) ? body.favouriteActivities.slice(0, 6) : [], typeof body.avatar === 'string' && body.avatar.startsWith('data:image/') ? 'upload' : 'preset', body.avatar || '🌟']);
      const token = await createSession(client, userId);
      return { userId, token };
    });
    return Response.json({ authenticated: true, userId: result.userId }, { status: 201, headers: { 'Set-Cookie': sessionCookie(result.token), 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error && /unique|duplicate/i.test(error.message) ? 'An account with that email already exists.' : error instanceof Error && error.message.includes('DATABASE_URL') ? 'Database connection is not configured.' : 'Account creation failed. Please try again.';
    return Response.json({ message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
