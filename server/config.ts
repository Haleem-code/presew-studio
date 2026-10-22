import { resolve } from 'node:path';

export function readConfig(env: Record<string, string | undefined> = process.env) {
  const baseURL = env.BETTER_AUTH_URL || `http://localhost:${env.PORT || 3000}`;
  const origin = new URL(baseURL).origin;
  if (!['http:', 'https:'].includes(new URL(baseURL).protocol)) throw new Error('BETTER_AUTH_URL must be an HTTP or HTTPS origin.');
  if (env.DATABASE_URL && !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL)) throw new Error('DATABASE_URL must be a PostgreSQL connection string copied from Supabase > Connect.');
  if (env.NODE_ENV === 'production' && !baseURL.startsWith('https:')) throw new Error('Production BETTER_AUTH_URL must use HTTPS.');
  const authConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.BETTER_AUTH_SECRET);
  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 random characters.');
  const dailyLimit = Number(env.MAX_RENDERS_PER_DAY || 5);
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100) throw new Error('MAX_RENDERS_PER_DAY must be an integer from 1 to 100.');
  const port = env.PORT || 3000;
  const extra = env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const trustedOrigins = Array.from(new Set([
    origin,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://[::1]:${port}`,
    ...extra,
  ]));
  return { baseURL, origin, trustedOrigins, authConfigured, secret: env.BETTER_AUTH_SECRET, googleId: env.GOOGLE_CLIENT_ID, googleSecret: env.GOOGLE_CLIENT_SECRET,
    betterAuthApiKey: env.BETTER_AUTH_API_KEY || '',
    youcamKey: env.YOUCAM_API_KEY || '', databaseURL: env.DATABASE_URL || '', sqlitePath: resolve(env.SQLITE_PATH || '.data/presew.sqlite'),
    storagePath: resolve(env.PRIVATE_STORAGE_PATH || '.data/assets'), dailyLimit };
}
export type Config = ReturnType<typeof readConfig>;
