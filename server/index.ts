import { readConfig } from './config';
import { openStore, migrateApp } from './database';
import { makeAuth } from './auth';
import { ImageStore } from './images';
import { RenderQueue } from './jobs';
import { YouCam } from './youcam';
import { createRouter } from './router';

const config = readConfig();
const db = await openStore(config);
await migrateApp(db);
let auth = null, authError = '';
try { auth = await makeAuth(config, db); }
catch { authError = 'Google sign-in could not start. Install dependencies, configure server credentials, and run bun run db:migrate.'; console.error(authError); }
const images = new ImageStore(db, config.storagePath);
const queue = config.youcamKey ? new RenderQueue(db, images, new YouCam(config.youcamKey), config.dailyLimit) : null;
const server = Bun.serve({ hostname: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 3000), maxRequestBodySize: 64 * 1024 * 1024, fetch: createRouter(config, db, auth, images, queue, authError) });
let ticking = false;
const interval = setInterval(async () => {
  if (!queue || ticking) return;
  ticking = true;
  try { await queue.tick(); } catch { console.error('Render worker could not advance the queue. Recorded task IDs were retained.'); }
  finally { ticking = false; }
}, 10000);
console.log(`PreSew: ${config.baseURL} · ${db.dialect} database · Google ${auth ? 'ready' : 'not configured'} · YouCam ${queue ? 'configured' : 'not configured'}`);
async function stop() { clearInterval(interval); await server.stop(); await db.close(); process.exit(0); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
