import { createClient } from '@libsql/client';

let clientInstance = null;

function createLibsqlClient() {
  const url = process.env.TURSO_URL || process.env.DATABASE_URL || 'file:./data/seo-tool.db';
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '';
  const client = createClient({ url, authToken });
  // Foreign keys are OFF by default in SQLite; enable per connection so
  // ON DELETE CASCADE (users -> permissions/quotas) works.
  client.execute('PRAGMA foreign_keys = ON').catch(() => {});
  return client;
}

export function getClient() {
  if (!clientInstance) {
    clientInstance = createLibsqlClient();
  }
  return clientInstance;
}

// Compatibility wrapper: the rest of the app calls a synchronous-looking API
// (db.prepare(sql).get / .all / .run and db.exec). libSQL talks to the database
// over the network, so every method actually returns a Promise. Callers must
// `await` these calls (Quota/Auth/Admin routes have been updated accordingly).
export function getDb() {
  const client = getClient();
  return {
    prepare(sql) {
      return {
        get(...args) {
          return client.execute({ sql, args }).then((r) => (r.rows && r.rows[0]) || null);
        },
        all(...args) {
          return client.execute({ sql, args }).then((r) => r.rows || []);
        },
        run(...args) {
          return client.execute({ sql, args });
        },
      };
    },
    exec(sql) {
      // init-db.js sends multiple CREATE TABLE statements separated by ";"
      return client.executeMultiple(sql);
    },
  };
}

export default getDb;
