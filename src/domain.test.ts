import { describe, expect, test } from 'bun:test';
import { initialData } from './catalog';
import { deleteAsset, displayMeasurement, draftErrors, escapeHtml, parseMeasurements, snapshotLook, toCm, validateImage } from './domain';

describe('measurement profiles', () => {
  test('stores measurements in centimeters regardless of display units', () => {
    const parsed = parseMeasurements({ heightCm: '65', bustCm: '36', waistCm: '28', sleeveCm: '0' }, 'in');
    expect(parsed.errors).toEqual([]);
    expect(parsed.values.heightCm).toBe(165.1);
    expect(parsed.values.bustCm).toBe(91.44);
    expect(parsed.values.sleeveCm).toBe(0);
    expect(displayMeasurement(parsed.values.bustCm, 'in')).toBe('36');
  });
  test('rejects impossible and nonfinite entries without imposing body-shape ratios', () => {
    expect(parseMeasurements({ heightCm: 'Infinity' }, 'cm').errors.length).toBe(1);
    expect(parseMeasurements({ heightCm: '-3' }, 'cm').errors.length).toBe(1);
    expect(parseMeasurements({ bustCm: '130', waistCm: '140', hipsCm: '125' }, 'cm').errors).toEqual([]);
  });
  test('allows partial profiles but does not silently save an empty profile', () => {
    expect(parseMeasurements({ heightCm: '170', bustCm: '' }, 'cm').values).toEqual({ heightCm: 170 });
    expect(parseMeasurements({}, 'cm').errors).toEqual(['Add at least one measurement to save a profile.']);
    expect(displayMeasurement(undefined, 'cm')).toBe('');
    expect(toCm(10, 'in')).toBe(25.4);
  });
});
function completeDraft() {
  const data = initialData();
  data.assets.push({ id: 'photo-1', kind: 'photo', name: 'Original photo', image: 'data:image/png;base64,original', category: 'My photo', source: 'upload', favorite: false, createdAt: '2026-10-21' });
  data.draft = { photoId: 'photo-1', fabricId: 'ankara-sun', styleId: 'bloom-dress', profileId: 'profile-1', consent: true, notes: 'Keep the original face and body.' };
  data.profiles.push({ id: 'profile-1', name: 'My measurements', values: { heightCm: 165.1 }, updatedAt: '2026-10-21' });
  return data;
}
describe('saved history and originals', () => {
  test('takes independent snapshots of images, notes and measurements', () => {
    const data = completeDraft();
    const look = snapshotLook(data, 'look-1', '2026-10-21');
    data.assets.find(a => a.kind === 'photo')!.image = 'changed';
    data.profiles[0].values.heightCm = 180;
    data.draft.notes = 'new note';
    expect(look.photo.image).toBe('data:image/png;base64,original');
    expect(look.profile!.values.heightCm).toBe(165.1);
    expect(look.notes).toBe('Keep the original face and body.');
    expect(look.status).toBe('draft');
  });
  test('clears deleted selections but retains explicit history snapshots', () => {
    const data = completeDraft();
    data.looks.push(snapshotLook(data, 'look-1', '2026-10-21'));
    const next = deleteAsset(data, 'photo-1');
    expect(next.draft.photoId).toBe('');
    expect(next.assets.some(a => a.id === 'photo-1')).toBe(false);
    expect(next.looks[0].photo.image).toBe('data:image/png;base64,original');
    expect(data.draft.photoId).toBe('photo-1');
  });
  test('requires actual selections and permission before making a history entry', () => {
    const data = completeDraft();
    data.draft.consent = false;
    expect(() => snapshotLook(data, 'look-1', '2026-10-21')).toThrow('permission');
    data.draft.consent = true;
    data.draft.photoId = 'ankara-sun';
    expect(draftErrors(data)).toContain('Choose your photo.');
  });
});
describe('upload and text boundaries', () => {
  test('rejects unsupported image formats and oversized uploads', () => {
    expect(validateImage({ type: 'image/svg+xml', size: 100 })).toContain('JPG or PNG');
    expect(validateImage({ type: 'image/jpeg', size: 10 * 1024 * 1024 })).toContain('10 MB');
    expect(validateImage({ type: 'image/png', size: 5000 })).toBe('');
  });
  test('escapes untrusted names and notes for cards and exported HTML', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
});
