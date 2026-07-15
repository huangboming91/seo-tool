import { NextResponse } from 'next/server';
import { getUserFromRequest, ensureDb, hashPassword, getClientIp } from '@/lib/auth';
import { logAction } from '@/lib/quota';
import crypto from 'crypto';

export async function GET(request, { params }) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = ensureDb();
  const user = db.prepare(`
    SELECT id, email, display_name, role, status, data_scope, created_at, updated_at
    FROM users WHERE id = ?
  `).get(params.id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const quota = db.prepare('SELECT daily_limit, used_today, last_reset_date FROM quotas WHERE user_id = ?').get(params.id);
  const perms = db.prepare('SELECT module, can_access, can_export, can_batch, weight FROM permissions WHERE user_id = ?').all(params.id);

  return NextResponse.json({
    user,
    quota,
    permissions: perms.reduce((acc, p) => {
      acc[p.module] = {
        can_access: !!p.can_access,
        can_export: !!p.can_export,
        can_batch: !!p.can_batch,
        weight: p.weight,
      };
      return acc;
    }, {}),
  });
}

export async function PUT(request, { params }) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { display_name, password, status, data_scope, daily_limit, permissions } = body;
    const db = ensureDb();

    const updates = [];
    const values = [];

    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }
    if (password) {
      updates.push('password_hash = ?');
      values.push(hashPassword(password));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (data_scope !== undefined) {
      updates.push('data_scope = ?');
      values.push(data_scope);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(params.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // Update quota
    if (daily_limit !== undefined) {
      const existing = db.prepare('SELECT id FROM quotas WHERE user_id = ?').get(params.id);
      if (existing) {
        db.prepare('UPDATE quotas SET daily_limit = ? WHERE user_id = ?').run(daily_limit, params.id);
      } else {
        const today = new Date().toISOString().slice(0, 10);
        db.prepare(`
          INSERT INTO quotas (id, user_id, daily_limit, used_today, last_reset_date)
          VALUES (?, ?, ?, 0, ?)
        `).run(crypto.randomUUID(), params.id, daily_limit, today);
      }
    }

    // Update permissions
    if (permissions) {
      const permStmt = db.prepare(`
        UPDATE permissions SET can_access = ?, can_export = ?, can_batch = ?
        WHERE user_id = ? AND module = ?
      `);
      for (const [mod, p] of Object.entries(permissions)) {
        permStmt.run(
          p.can_access ? 1 : 0,
          p.can_export ? 1 : 0,
          p.can_batch ? 1 : 0,
          params.id,
          mod
        );
      }
    }

    const ip = getClientIp(request);
    logAction({
      userId: currentUser.id,
      userEmail: currentUser.email,
      module: 'admin',
      action: 'update_user',
      status: 'success',
      detail: `Updated user: ${params.id}`,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser || currentUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const db = ensureDb();

  // Prevent deleting admin
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(params.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (user.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete admin account' }, { status: 400 });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(params.id);

  const ip = getClientIp(request);
  logAction({
    userId: currentUser.id,
    userEmail: currentUser.email,
    module: 'admin',
    action: 'delete_user',
    status: 'success',
    detail: `Deleted user: ${params.id}`,
    ip,
  });

  return NextResponse.json({ success: true });
}
