import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Store } from './database';
import type { Asset } from '../src/domain';
import { initialData } from '../src/catalog';

export const MAX_IMAGE = 10 * 1024 * 1024;
export function imageInfo(bytes: Uint8Array) {
  if (bytes.length >= MAX_IMAGE || bytes.length < 24) throw new Error('Images must be valid JPG/PNG files under 10 MB.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0, height = 0, contentType = '';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) {
    contentType = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    contentType = 'image/jpeg';
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 255) { offset++; continue; }
      const marker = bytes[offset + 1];
      if (marker === 255) { offset++; continue; }
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xd0 && marker <= 0xd8) { offset += 2; continue; }
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      offset += 2 + length;
    }
  }
  if (!width || !height || Math.max(width, height) > 4096 || Math.min(width, height) < 384) throw new Error('Use a valid image at least 384 pixels on each side, with no side over 4096 pixels.');
  return { width, height, contentType };
}
export async function boundedImage(response: Response) {
  if (!response.ok || !response.body) throw new Error('The image could not be downloaded.');
  if (Number(response.headers.get('content-length') || 0) >= MAX_IMAGE) throw new Error('Image exceeds 10 MB.');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size >= MAX_IMAGE) { await reader.cancel(); throw new Error('Image exceeds 10 MB.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  imageInfo(bytes); return bytes;
}
export class ImageStore {
  constructor(private db: Store, private directory: string, private fetcher: typeof fetch = fetch) {}
  async put(userId: string, bytes: Uint8Array) {
    const info = imageInfo(bytes);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const existing = await this.db.all<any>('SELECT * FROM private_asset WHERE user_id=? AND hash=?', [userId, hash]);
    if (existing[0]) return existing[0];
    await mkdir(this.directory, { recursive: true });
    const id = crypto.randomUUID();
    const filename = `${id}.${info.contentType === 'image/png' ? 'png' : 'jpg'}`;
    await writeFile(join(this.directory, filename), bytes, { flag: 'wx' });
    await this.db.run('INSERT INTO private_asset(id,user_id,hash,content_type,path,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,hash) DO NOTHING', [id, userId, hash, info.contentType, filename, new Date().toISOString()]);
    const saved = (await this.db.all<any>('SELECT * FROM private_asset WHERE user_id=? AND hash=?', [userId, hash]))[0];
    if (saved.id !== id) await unlink(join(this.directory, filename));
    return saved;
  }
  async get(userId: string, id: string) {
    const row = (await this.db.all<any>('SELECT * FROM private_asset WHERE id=? AND user_id=?', [id, userId]))[0];
    if (!row) throw new Error('Image not found.');
    return { ...row, bytes: new Uint8Array(await readFile(join(this.directory, row.path))) };
  }
  async resolve(userId: string, asset: Asset) {
    if (asset.source === 'catalog') {
      const canonical = initialData().assets.find(a => a.id === asset.id && a.kind === asset.kind);
      if (!canonical || !canonical.image.startsWith('https://images.pexels.com/')) throw new Error('This reference is no longer in the catalog. Choose another image.');
      const response = await this.fetcher(canonical.image, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      return this.put(userId, await boundedImage(response));
    }
    const match = /^\/api\/assets\/([\da-f-]{36})$/.exec(asset.image);
    if (match) return this.get(userId, match[1]);
    const data = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(asset.image);
    if (!data || data[2].length > MAX_IMAGE * 1.4) throw new Error('Upload a JPG/PNG image from your device.');
    return this.put(userId, new Uint8Array(Buffer.from(data[2], 'base64')));
  }
  async normalize(userId: string, asset: Asset): Promise<Asset> {
    if (asset.source === 'catalog') {
      const canonical = initialData().assets.find(a => a.id === asset.id && a.kind === asset.kind);
      if (!canonical) throw new Error('Unknown catalog item.');
      return { ...canonical, favorite: asset.favorite === true };
    }
    const row = await this.resolve(userId, asset);
    return { ...asset, image: `/api/assets/${row.id}` };
  }
}
