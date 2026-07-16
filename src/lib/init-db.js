import { getDb } from './db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const MODULE_WEIGHTS = {
  keyword_research: 1,
  rank_tracking: 1,
  domain_overview: 2,
  brand_lookup: 2,
  backlinks: 3,
  site_audit: 5,
};

const MODULES = Object.keys(MODULE_WEIGHTS);

export async function initDatabase() {
  const db = getDb();

  // DDL is idempotent thanks to IF NOT EXISTS
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sub_account',
      status TEXT NOT NULL DEFAULT 'active',
      data_scope TEXT NOT NULL DEFAULT 'self',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      module TEXT NOT NULL,
      can_access INTEGER NOT NULL DEFAULT 1,
      can_export INTEGER NOT NULL DEFAULT 1,
      can_batch INTEGER NOT NULL DEFAULT 0,
      weight INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, module)
    );

    CREATE TABLE IF NOT EXISTS quotas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      daily_limit INTEGER NOT NULL DEFAULT 10,
      used_today INTEGER NOT NULL DEFAULT 0,
      last_reset_date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      quota_consumed INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      detail TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Check if admin exists
  const admin = await db.prepare('SELECT id FROM users WHERE role = ?').get('admin');

  if (!admin) {
    const adminId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync('Admin@2026', 10);
    const today = new Date().toISOString().slice(0, 10);

    await db.prepare(`
      INSERT INTO users (id, email, password_hash, display_name, role, status, data_scope)
      VALUES (?, ?, ?, ?, 'admin', 'active', 'all')
    `).run(adminId, 'admin@seotool.com', passwordHash, 'Administrator');

    // Admin quota: unlimited (set high limit)
    await db.prepare(`
      INSERT INTO quotas (id, user_id, daily_limit, used_today, last_reset_date)
      VALUES (?, ?, 999999, 0, ?)
    `).run(crypto.randomUUID(), adminId, today);

    // Admin permissions: all modules, all operations
    const permStmt = db.prepare(`
      INSERT INTO permissions (id, user_id, module, can_access, can_export, can_batch, weight)
      VALUES (?, ?, ?, 1, 1, 1, ?)
    `);
    for (const mod of MODULES) {
      await permStmt.run(crypto.randomUUID(), adminId, mod, MODULE_WEIGHTS[mod]);
    }

    console.log('[DB] Admin account created: admin@seotool.com / Admin@2026');
  }

  return db;
}

export { MODULE_WEIGHTS, MODULES };
