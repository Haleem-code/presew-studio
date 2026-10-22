import { readConfig } from '../server/config';

const config = readConfig();
const required = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'YOUCAM_API_KEY'];
const missing = required.filter(name => !process.env[name]?.trim());
const missingPackages = ['better-auth', 'pg', ...(config.betterAuthApiKey ? ['@better-auth/infra'] : [])].filter(name => {
  try { Bun.resolveSync(name, import.meta.dir + '/..'); return false; } catch { return true; }
});
console.log(JSON.stringify({
  database: config.databaseURL ? 'PostgreSQL / Supabase' : 'missing Supabase DATABASE_URL',
  environment: Object.fromEntries(required.map(name => [name, missing.includes(name) ? 'missing' : 'configured'])),
  betterAuthDashboard: config.betterAuthApiKey ? 'configured' : 'not enabled (optional)',
  dependencies: missingPackages.length ? `Run bun install; missing: ${missingPackages.join(', ')}` : 'resolved',
  liveServicesVerified: false,
}, null, 2));
process.exitCode = missing.length || missingPackages.length ? 1 : 0;
