import { NextResponse } from 'next/server';
import { ensureDb, hashPassword, getClientIp } from '@/lib/auth';
import { logAction } from '@/lib/quota';
import { MODULE_WEIGHTS } from '@/lib/init-db';
import crypto from 'crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = ensureDb();

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const today = new Date().toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, status, data_scope)
      VALUES (?, ?, ?, ?, 'sub_account', 'active', 'self')
    `).run(userId, email.toLowerCase().trim(), passwordHash, display_name);

    db.prepare(`
      INSERT INTO quotas (id, user_id, daily_limit, used_today, last_reset_date)
      VALUES (?, ?, 10, 0, ?)
    `).run(crypto.randomUUID(), userId, today);

    const permStmt = db.prepare(`
      INSERT INTO permissions (id, user_id, module, can_access, can_export, can_batch, weight)
      VALUES (?, ?, ?, 1, 1, 0, ?)
    `);
    for (const [mod, weight] of Object.entries(MODULE_WEIGHTS)) {
      permStmt.run(crypto.randomUUID(), userId, mod, weight);
    }

    const ip = getClientIp(request);
    logAction({
      userId,
      userEmail: email.toLowerCase().trim(),
      module: 'auth',
      action: 'register',
      status: 'success',
      detail: `Self-registered account: ${email}`,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
