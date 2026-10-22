import { boundedImage, imageInfo } from './images';

const BASE = 'https://yce-api-01.makeupar.com';
export const PREPARE = '/s2s/v2.0/task/image-to-image/youcam';
export const CLOTHES = '/s2s/v2.0/task/cloth-v4';
export class ProviderError extends Error {
  constructor(message: string, public uncertain = false) { super(message); }
}
export interface AIProvider {
  upload(bytes: Uint8Array): Promise<string>;
  prepare(styleId: string, fabricId: string): Promise<string>;
  tryOn(photoId: string, garmentId: string, category: string): Promise<string>;
  poll(endpoint: string, taskId: string): Promise<{ status: string; url?: string; error?: string }>;
  download(url: string): Promise<Uint8Array>;
}
export class YouCam implements AIProvider {
  constructor(private key: string, private fetcher: typeof fetch = fetch) {}
  private async api(path: string, payload?: unknown) {
    let response: Response;
    try {
      response = await this.fetcher(BASE + path, { method: payload ? 'POST' : 'GET', headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined, signal: AbortSignal.timeout(45000), redirect: 'error' });
    } catch { throw new ProviderError('Could not confirm the provider request. Check its task history before starting another paid attempt.', Boolean(payload && path !== '/s2s/v2.0/file')); }
    const value = await response.json().catch(() => null) as any;
    if (!response.ok || !value || value.status !== 200) {
      const code = value?.error_code || response.status;
      throw new ProviderError(`Try-on provider request failed (${String(code).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60)}).`, Boolean(payload && response.status >= 500 && path !== '/s2s/v2.0/file'));
    }
    return value.data;
  }
  async upload(bytes: Uint8Array) {
    const info = imageInfo(bytes);
    const data = await this.api('/s2s/v2.0/file', { files: [{ content_type: info.contentType, file_name: `presew-${crypto.randomUUID()}.${info.contentType === 'image/png' ? 'png' : 'jpg'}`, file_size: bytes.length }] });
    const file = data?.files?.[0]; const upload = file?.requests?.[0];
    if (!file?.file_id || upload?.method !== 'PUT' || !upload?.url) throw new ProviderError('Provider returned an invalid upload destination.');
    assertProviderURL(upload.url);
    const headers = new Headers(upload.headers || {});
    const response = await this.fetcher(upload.url, { method: 'PUT', headers, body: bytes as any, redirect: 'error', signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new ProviderError('The provider could not receive this image.');
    return file.file_id as string;
  }
  async prepare(styleId: string, fabricId: string) {
    const data = await this.api(PREPARE, {
      model: 'youcam-image-v2', src_file_ids: [styleId, fabricId],
      prompt: 'Edit only the garment in Image 1 using the exact fabric colors and printed motifs from Image 2. Preserve the garment silhouette, neckline, sleeves, seams, closures and hem length. Apply the fabric naturally across folds with plausible lighting and drape. Preserve the reference person, pose and background. Output one realistic garment reference photo, not a collage. Do not add accessories, text or watermarks.',
      negative_prompt: 'different garment silhouette, changed face or body, invented pattern, collage, text, logos, distorted seams, extra limbs',
      prompt_extend: false,
    });
    if (!data?.task_id) throw new ProviderError('No preparation task ID was returned.', true);
    return data.task_id as string;
  }
  async tryOn(photoId: string, garmentId: string, category: string) {
    const data = await this.api(CLOTHES, { src_file_id: photoId, ref_file_id: garmentId, garment_category: category, change_shoes: false, filter_multi_person: 'strict' });
    if (!data?.task_id) throw new ProviderError('No try-on task ID was returned.', true);
    return data.task_id as string;
  }
  async poll(endpoint: string, taskId: string) {
    const data = await this.api(`${endpoint}/${encodeURIComponent(taskId)}`);
    if (!data?.task_status) throw new ProviderError('Provider status was unavailable.');
    return { status: data.task_status, url: data.results?.url, error: data.error ? 'The provider could not render this combination. Try a clearer photo or different reference.' : undefined };
  }
  async download(url: string): Promise<Uint8Array> {
    assertProviderURL(url);
    return boundedImage(await this.fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(45000) }));
  }
}
export function assertProviderURL(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !['amazonaws.com', 'makeupar.com', 'perfectcorp.com'].some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) throw new ProviderError('The provider returned an unexpected image host.');
}
