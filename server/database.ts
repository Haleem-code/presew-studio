import { Database } from 'bun:sqlite';
import { SQL } from 'bun';
import type { Config } from './config';

export interface Store {
  dialect: 'sqlite' | 'postgres';
  authDatabase: Database | unknown;
  all<T = Record<string, unknown>>(sql: string, args?: unknown[]): Promise<T[]>;
  run(sql: string, args?: unknown[]): Promise<void>;
  close(): Promise<void>;
}
const privateSQL = (statement: string) => statement.replace(/\b(studio_state|private_asset|render_job)\b/g, '"presew"."$1"');
export async function openStore(config: Config): Promise<Store> {
  if (config.databaseURL) {
    const sql = new SQL(config.databaseURL, { max: 3 });
    return {
      dialect: 'postgres', authDatabase: null,
      all: (statement, args = []) => { let index = 0; return sql.unsafe(privateSQL(statement).replace(/\?/g, () => `$${++index}`), args); },
      run: async (statement, args = []) => { let index = 0; await sql.unsafe(privateSQL(statement).replace(/\?/g, () => `$${++index}`), args); },
      close: async () => { await sql.close(); },
    };
  }
  if (config.sqlitePath !== ':memory:') throw new Error('DATABASE_URL is required. Set it to your Supabase PostgreSQL connection URI; SQLite is only available for isolated tests.');
  const db = new Database(':memory:', { create: true });
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return {
    dialect: 'sqlite', authDatabase: db,
    all: async (statement, args = []) => db.query(statement).all(...args as any[]) as any,
    run: async (statement, args = []) => { db.query(statement).run(...args as any[]); },
    close: async () => { db.close(); },
  };
}
export async function migrateApp(store: Store) {
  if (store.dialect === 'postgres') {
    await store.run('CREATE SCHEMA IF NOT EXISTS presew');
    await store.run('CREATE SCHEMA IF NOT EXISTS presew_auth');
  }
  await store.run(`CREATE TABLE IF NOT EXISTS studio_state (user_id TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  await store.run(`CREATE TABLE IF NOT EXISTS private_asset (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, hash TEXT NOT NULL, content_type TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(user_id, hash))`);
  await store.run(`CREATE TABLE IF NOT EXISTS render_job (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, request_id TEXT NOT NULL, cache_key TEXT NOT NULL, status TEXT NOT NULL, input TEXT NOT NULL, context TEXT NOT NULL, result_asset_id TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, lease_until TEXT, quota_day TEXT NOT NULL, quota_slot INTEGER NOT NULL, UNIQUE(user_id, request_id), UNIQUE(user_id, quota_day, quota_slot))`);
  await store.run('CREATE INDEX IF NOT EXISTS render_owner_created ON render_job(user_id, created_at)');
  await store.run('CREATE INDEX IF NOT EXISTS render_queue ON render_job(status, updated_at)');
  await store.run("CREATE UNIQUE INDEX IF NOT EXISTS render_active_cache ON render_job(user_id,cache_key) WHERE status NOT IN ('failed','needs_review')");
  await hardenPostgres(store);
}
export async function hardenPostgres(store: Store, includeAuth = false) {
  if (store.dialect !== 'postgres') return;
  // Better Auth sessions are not Supabase Auth JWTs: do not add auth.uid() policies.
  // Only the trusted backend database owner accesses these unexposed schemas.
  for (const table of ['studio_state', 'private_asset', 'render_job']) await store.run(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  if (includeAuth) for (const table of ['user', 'session', 'account', 'verification']) await store.run(`ALTER TABLE IF EXISTS "presew_auth"."${table}" ENABLE ROW LEVEL SECURITY`);
  await store.run('REVOKE ALL ON SCHEMA presew, presew_auth FROM PUBLIC');
  await store.run('REVOKE ALL ON ALL TABLES IN SCHEMA presew, presew_auth FROM PUBLIC');
  for (const role of ['anon', 'authenticated', 'service_role']) await store.run(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN
    REVOKE ALL ON SCHEMA presew, presew_auth FROM ${role};
    REVOKE ALL ON ALL TABLES IN SCHEMA presew, presew_auth FROM ${role};
    ALTER DEFAULT PRIVILEGES IN SCHEMA presew, presew_auth REVOKE ALL ON TABLES FROM ${role};
  END IF; END $$`);
}
