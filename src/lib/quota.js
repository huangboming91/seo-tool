import jwt from 'jsonwebtoken';
import { ensureDb } from './auth';
import crypto from 'crypto';
import { MODULE_WEIGHTS } from './init-db';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Reset daily quota if needed
function resetQuotaIfNeeded(db, userId) {
  const today = getTodayKey();
  const quota = db.prepare('SELECT last_reset_date, used_today, daily_limit FROM quotas WHERE user_id = ?').get(userId);

  if (!quota) return null;

  if (quota.last_reset_date !== today) {
    db.prepare(`
      UPDATE quotas SET used_today = 0, last_reset_date = ?
      WHERE user_id = ?
    `).run(today, userId);
    return { used_today: 0, daily_limit: quota.daily_limit };
  }

  return { used_today: quota.used_today, daily_limit: quota.daily_limit };
}

// Check module access permission
function checkModuleAccess(db, userId, module) {
  const perm = db.prepare(`
    SELECT can_access, can_export, can_batch, weight
    FROM permissions WHERE user_id = ? AND module = ?
  `).get(userId, module);

  if (!perm || !perm.can_access) {
    return { allowed: false, permission: null };
  }

  return { allowed: true, permission: perm };
}

// Main quota check function - called by API routes
// Returns: { allowed, remaining, limit, source, user, permission }
export function checkQuota(request, module, action = 'search') {
  const db = ensureDb();

  // Try to get authenticated user
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/seo_token=([^;]+)/);
  let user = null;

  if (match) {
    try {
      const payload = jwt.verify(match[1], process.env.JWT_SECRET || 'fallback-secret-change-me');
      user = db.prepare('SELECT id, email, display_name, role, status, data_scope FROM users WHERE id = ?').get(payload.id);
      if (user && user.status !== 'active') user = null;
    } catch {}
  }

  // Anonymous user: usage requires sign-in (interface is still visible)
  if (!user) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      source: 'auth_required',
      user: null,
      permission: null,
      module,
      reason: 'auth_required',
    };
  }

  // Admin: unlimited access
  if (user.role === 'admin') {
    // Still check module permission exists
    const accessCheck = checkModuleAccess(db, user.id, module);
    return {
      allowed: true,
      remaining: 999999,
      limit: 999999,
      source: 'admin',
      user,
      permission: accessCheck.permission,
      module,
    };
  }

  // Sub-account: 4-dimensional check

  // Dimension 1: Module access
  const accessCheck = checkModuleAccess(db, user.id, module);
  if (!accessCheck.allowed) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      source: 'account',
      user,
      permission: null,
      module,
      reason: 'module_access_denied',
    };
  }

  // Dimension 2: Operation permission (for export/batch)
  if (action === 'export' && !accessCheck.permission.can_export) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      source: 'account',
      user,
      permission: accessCheck.permission,
      module,
      reason: 'export_denied',
    };
  }
  if (action === 'batch' && !accessCheck.permission.can_batch) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      source: 'account',
      user,
      permission: accessCheck.permission,
      module,
      reason: 'batch_denied',
    };
  }

  // Dimension 3: Weighted quota (atomic check + deduct)
  resetQuotaIfNeeded(db, user.id);
  const weight = accessCheck.permission.weight || MODULE_WEIGHTS[module] || 1;

  const quotaRow = db.prepare('SELECT used_today, daily_limit FROM quotas WHERE user_id = ?').get(user.id);

  if (!quotaRow) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      source: 'account',
      user,
      permission: accessCheck.permission,
      module,
      reason: 'no_quota_record',
    };
  }

  if (quotaRow.used_today + weight > quotaRow.daily_limit) {
    return {
      allowed: false,
      remaining: Math.max(0, quotaRow.daily_limit - quotaRow.used_today),
      limit: quotaRow.daily_limit,
      source: 'account',
      user,
      permission: accessCheck.permission,
      module,
      reason: 'quota_exceeded',
    };
  }

  // Atomic deduct
  db.prepare(`
    UPDATE quotas SET used_today = used_today + ?
    WHERE user_id = ?
  `).run(weight, user.id);

  const newUsed = quotaRow.used_today + weight;

  return {
    allowed: true,
    remaining: Math.max(0, quotaRow.daily_limit - newUsed),
    limit: quotaRow.daily_limit,
    source: 'account',
    user,
    permission: accessCheck.permission,
    module,
    weight,
  };
}

// Log to audit_logs
export function logAction({ userId, userEmail, module, action, quotaConsumed = 0, status, detail, ip }) {
  const db = ensureDb();
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_email, module, action, quota_consumed, status, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId || null,
    userEmail || null,
    module,
    action,
    quotaConsumed,
    status,
    detail || null,
    ip || null
  );
}
