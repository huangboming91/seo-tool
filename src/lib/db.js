import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || './data/seo-tool.db';
  const fullPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = new Database(fullPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}
