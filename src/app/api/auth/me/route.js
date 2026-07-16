import { NextResponse } from 'next/server';
import { getUserFromRequest, ensureDb } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Get quota info for sub-accounts
    let quota = null;
    if (user.role !== 'admin') {
      const db = await ensureDb();
      const q = await db.prepare('SELECT daily_limit, used_today, last_reset_date FROM quotas WHERE user_id = ?').get(user.id);
      if (q) {
        const today = new Date().toISOString().slice(0, 10);
        quota = {
          daily_limit: q.daily_limit,
          used_today: q.last_reset_date === today ? q.used_today : 0,
          remaining: q.last_reset_date === today ? q.daily_limit - q.used_today : q.daily_limit,
        };
      }
    }

    // Get permissions for sub-accounts
    let permissions = null;
    if (user.role !== 'admin') {
      const db = await ensureDb();
      const perms = await db.prepare('SELECT module, can_access, can_export, can_batch, weight FROM permissions WHERE user_id = ?').all(user.id);
      permissions = perms.reduce((acc, p) => {
        acc[p.module] = {
          can_access: !!p.can_access,
          can_export: !!p.can_export,
          can_batch: !!p.can_batch,
          weight: p.weight,
        };
        return acc;
      }, {});
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        data_scope: user.data_scope,
      },
      quota,
      permissions,
    });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ user: null });
  }
}
