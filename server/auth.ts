import type { Config } from './config';
import { hardenPostgres, type Store } from './database';

export interface AuthService {
  handler(request: Request): Promise<Response>;
  api: { getSession(options: { headers: Headers }): Promise<{ user: { id: string; name: string; email: string; image?: string | null } } | null> };
  options?: any;
}
export async function makeAuth(config: Config, store: Store, migrate = false): Promise<AuthService | null> {
  if (!config.authConfigured) return null;
  if (!migrate) await store.all(store.dialect === 'postgres' ? 'SELECT id FROM "presew_auth"."user" LIMIT 0' : 'SELECT id FROM "user" LIMIT 0');
  const { betterAuth } = await import('better-auth');
  const database = store.dialect === 'postgres'
    ? new (await import('pg')).Pool({ connectionString: config.databaseURL, options: '-c search_path=presew_auth', max: 3 })
    : store.authDatabase;
  const plugins: any[] = [];
  if (config.betterAuthApiKey) {
    const { dash } = await import('@better-auth/infra');
    plugins.push(dash({ apiKey: config.betterAuthApiKey }));
  }
  const auth = betterAuth({
    database: database as any, baseURL: config.baseURL, secret: config.secret,
    trustedOrigins: config.trustedOrigins, emailAndPassword: { enabled: false },
    socialProviders: { google: { clientId: config.googleId!, clientSecret: config.googleSecret!, prompt: 'select_account' } },
    plugins,
    account: {
      accountLinking: { enabled: true },
      storeStateStrategy: 'database',
      skipStateCookieCheck: true,
    },
    advanced: {
      trustedProxyHeaders: true,
    },
    rateLimit: { enabled: true },
  });
  if (migrate) {
    const { getMigrations } = await import('better-auth/db/migration');
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    await hardenPostgres(store, true);
  }
  return auth as unknown as AuthService;
}
