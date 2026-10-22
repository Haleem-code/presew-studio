import { mkdir, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { generateAssets } from './create-assets';

process.chdir(resolve(import.meta.dir, '..'));
await generateAssets();
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
const result = await Bun.build({ entrypoints: ['src/app.ts'], outdir: 'dist', target: 'browser', minify: true, naming: 'app.js' });
if (!result.success) { console.error(result.logs); process.exit(1); }
const hash = createHash('sha256');
const files = Array.from(new Bun.Glob('**/*').scanSync({ cwd: 'dist', onlyFiles: true })).filter(path => path !== 'sw.js').sort();
for (const path of files) { hash.update(path); hash.update(new Uint8Array(await Bun.file(`dist/${path}`).arrayBuffer())); }
const worker = await Bun.file('public/sw.js').text();
hash.update(worker);
await Bun.write('dist/sw.js', worker.replace('__BUILD_ID__', hash.digest('hex').slice(0, 16)));
console.log('Built PreSew in dist/');
