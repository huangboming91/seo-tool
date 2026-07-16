import { NextResponse } from 'next/server';
import { getUserFromRequest, ensureDb, hashPassword, getClientIp } from '@/lib/auth';
import { logAction } from '@/lib/quota';
import { MODULE_WEIGHTS } from '@/lib/init-db';
import crypto from 'crypto';

export async function GET(request) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = await ensureDb();
  const users = await db.prepare(`
    SELECT u.id, u.email, u.display_name, u.role, u.status, u.data_scope,
           u.created_at, u.updated_at,
           q.daily_limit, q.used_today, q.last_reset_date
    FROM users u
    LEFT JOIN quotas q ON q.user_id = u.id
    WHERE u.role != 'admin'
    ORDER BY u.created_at DESC
  `).all();

  const permStmt = db.prepare('SELECT module, can_access, can_export, can_batch, weight FROM permissions WHERE user_id = ?');
  const today = new Date().toISOString().slice(0, 10);

  const usersWithDetails = await Promise.all(users.map(async (u) => {
    const perms = await permStmt.all(u.id);
    const usedToday = u.last_reset_date === today ? u.used_today : 0;
    return {
      ...u,
      used_today: usedToday,
      remaining: u.daily_limit ? Math.max(0, Number(u.daily_limit) - Number(usedToday)) : 0,
      permissions: perms.reduce((acc, p) => {
        acc[p.module] = {
          can_access: !!p.can_access,
          can_export: !!p.can_export,
          can_batch: !!p.can_batch,
          weight: p.weight,
        };
        return acc;
      }, {}),
    };
  }));

  return NextResponse.json({ users: usersWithDetails });
}

export async function POST(request) {
  const currentUser = await getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, display_name, daily_limit = 10, data_scope = 'self', permissions } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'Email, password, and display name are required' }, { status: 400 });
    }

    const db = await ensureDb();

    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const today = new Date().toISOString().slice(0, 10);

    await db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, status, data_scope)
      VALUES (?, ?, ?, ?, 'sub_account', 'active', ?)
    `).run(userId, email.toLowerCase().trim(), passwordHash, display_name, data_scope);

    await db.prepare(`
      INSERT INTO quotas (id, user_id, daily_limit, used_today, last_reset_date)
      VALUES (?, ?, ?, 0, ?)
    `).run(crypto.randomUUID(), userId, daily_limit, today);

    const permStmt = db.prepare(`
      INSERT INTO permissions (id, user_id, module, can_access, can_export, can_batch, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultPerms = permissions || {};
    for (const [mod, weight] of Object.entries(MODULE_WEIGHTS)) {
      const p = defaultPerms[mod] || {};
      await permStmt.run(
        crypto.randomUUID(),
        userId,
        mod,
        p.can_access !== false ? 1 : 0,
        p.can_export !== false ? 1 : 0,
        p.can_batch ? 1 : 0,
        weight
      );
    }

    const ip = getClientIp(request);
    await logAction({
      userId: currentUser.id,
      userEmail: currentUser.email,
      module: 'admin',
      action: 'create_user',
      status: 'success',
      detail: `Created sub-account: ${email}`,
      ip,
    });

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
