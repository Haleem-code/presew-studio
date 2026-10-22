import { measurementFields, type Asset, type AssetKind, type Profile, type StudioData } from '../src/domain';

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const text = (value: unknown, max: number, label: string, optional = false): string => {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw new HttpError(400, `Invalid ${label}.`);
  return value;
};
export function validateAsset(value: any, kind?: AssetKind): Asset {
  if (!value || !['photo', 'fabric', 'style'].includes(value.kind) || (kind && value.kind !== kind)) throw new HttpError(400, 'Invalid image selection.');
  if (!['upload', 'catalog'].includes(value.source) || (value.kind === 'photo' && value.source === 'catalog')) throw new HttpError(400, 'Use your own person photo.');
  return { id: text(value.id, 100, 'image ID'), kind: value.kind, name: text(value.name, 80, 'image name'), category: text(value.category, 80, 'category'), image: text(value.image, 15 * 1024 * 1024, 'image'), source: value.source, favorite: value.favorite === true, createdAt: text(value.createdAt, 40, 'image date') };
}
function profile(value: any): Profile {
  if (!value || typeof value.values !== 'object' || !value.values) throw new HttpError(400, 'Invalid measurements.');
  const values: Profile['values'] = {};
  for (const [key, label, , min, max] of measurementFields) if (value.values[key] !== undefined) {
    const n = value.values[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `Invalid ${label}.`);
    values[key] = n;
  }
  return { id: text(value.id, 100, 'profile ID'), name: text(value.name, 80, 'profile name'), values, updatedAt: text(value.updatedAt, 40, 'profile date') };
}
export function validateStudio(value: any): StudioData {
  if (!value || value.version !== 1 || !Array.isArray(value.assets) || value.assets.length > 100 || !Array.isArray(value.looks) || value.looks.length > 100 || !Array.isArray(value.profiles) || value.profiles.length > 50 || !value.draft || !['cm', 'in'].includes(value.unit)) throw new HttpError(400, 'Invalid or oversized studio library.');
  const assets = value.assets.map((a: unknown) => validateAsset(a));
  if (new Set(assets.map((a: Asset) => a.id)).size !== assets.length) throw new HttpError(400, 'Duplicate library image IDs.');
  const d = value.draft;
  const draft = { photoId: text(d.photoId, 100, 'photo selection', true), fabricId: text(d.fabricId, 100, 'fabric selection', true), styleId: text(d.styleId, 100, 'style selection', true), profileId: text(d.profileId, 100, 'measurement selection', true), notes: text(d.notes, 2000, 'notes', true), consent: d.consent === true };
  return { version: 1, assets, draft, unit: value.unit, profiles: value.profiles.map(profile), looks: value.looks.map((l: any) => ({ id: text(l.id, 100, 'look ID'), name: text(l.name, 200, 'look name'), photo: validateAsset(l.photo, 'photo'), fabric: validateAsset(l.fabric, 'fabric'), style: validateAsset(l.style, 'style'), profile: l.profile ? profile(l.profile) : undefined, notes: text(l.notes, 2000, 'notes', true), favorite: l.favorite === true, status: 'draft', createdAt: text(l.createdAt, 40, 'look date') })) };
}
export async function jsonBody(request: Request, max = 40 * 1024 * 1024) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new HttpError(415, 'Send JSON data.');
  if (Number(request.headers.get('content-length') || 0) > max) throw new HttpError(413, 'This upload is too large. Sync fewer images at a time.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Missing request body.');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > max) { await reader.cancel(); throw new HttpError(413, 'Request is too large.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}
