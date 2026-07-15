import { NextResponse } from 'next/server';
import { ensureDb, createToken, verifyPassword, COOKIE_NAME, getClientIp } from '@/lib/auth';
import { logAction } from '@/lib/quota';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = ensureDb();
    const user = db.prepare(`
      SELECT id, email, password_hash, display_name, role, status, data_scope
      FROM users WHERE email = ?
    `).get(email.toLowerCase().trim());

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is disabled. Contact administrator.' }, { status: 403 });
    }

    const token = createToken(user);
    const ip = getClientIp(request);

    logAction({
      userId: user.id,
      userEmail: user.email,
      module: 'auth',
      action: 'login',
      status: 'success',
      detail: `User ${user.email} logged in`,
      ip,
    });

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      data_scope: user.data_scope,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
