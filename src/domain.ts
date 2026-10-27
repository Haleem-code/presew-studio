export type AssetKind = "fabric" | "style" | "photo";
export type Unit = "cm" | "in";
export type Category = "Dresses" | "Tops" | "Two-piece" | "Traditional" | "Skirts";
export interface Asset {
  id: string;
  kind: AssetKind;
  name: string;
  image: string;
  category: string;
  source: "catalog" | "upload";
  favorite: boolean;
  createdAt: string;
  attribution?: { author: string; url: string };
}
export const measurementFields = [
  [
    "heightCm",
    "Height",
    "Stand barefoot against a wall and measure from floor to the top of your head.",
    60,
    250,
  ],
  [
    "bustCm",
    "Bust / chest",
    "Measure around the fullest part, keeping the tape level and comfortably relaxed.",
    30,
    250,
  ],
  [
    "waistCm",
    "Waist",
    "Measure around your natural waist without pulling the tape tight.",
    30,
    250,
  ],
  [
    "hipsCm",
    "Hips",
    "Measure around the fullest part of your hips, with your feet together.",
    30,
    280,
  ],
  [
    "shoulderCm",
    "Shoulder width",
    "Measure across your back, from one shoulder point to the other.",
    15,
    90,
  ],
  [
    "sleeveCm",
    "Sleeve length",
    "With your elbow slightly bent, measure from shoulder to your chosen sleeve end.",
    0,
    110,
  ],
  [
    "lengthCm",
    "Garment length",
    "Measure from the garment’s starting point to the desired hem.",
    10,
    220,
  ],
] as const;
export type MeasurementKey = (typeof measurementFields)[number][0];
export interface Profile {
  id: string;
  name: string;
  values: Partial<Record<MeasurementKey, number>>;
  updatedAt: string;
}
export interface Look {
  id: string;
  name: string;
  photo: Asset;
  fabric: Asset;
  style: Asset;
  profile?: Profile;
  notes: string;
  status: "draft";
  favorite: boolean;
  createdAt: string;
}
export interface Draft {
  photoId: string;
  fabricId: string;
  styleId: string;
  profileId: string;
  notes: string;
  consent: boolean;
}
export interface StudioData {
  version: 1;
  assets: Asset[];
  looks: Look[];
  profiles: Profile[];
  draft: Draft;
  unit: Unit;
}
export const emptyDraft = (): Draft => ({
  photoId: "",
  fabricId: "",
  styleId: "",
  profileId: "",
  notes: "",
  consent: false,
});
export function toCm(value: number, unit: Unit): number {
  return Math.round((unit === "in" ? value * 2.54 : value) * 10000) / 10000;
}
export function displayMeasurement(value: number | undefined, unit: Unit): string {
  if (value === undefined) return "";
  return String(Math.round((unit === "in" ? value / 2.54 : value) * 10) / 10);
}
export function parseMeasurements(input: Record<string, string>, unit: Unit) {
  const values: Profile["values"] = {};
  const errors: string[] = [];
  for (const [key, label, , min, max] of measurementFields) {
    const raw = input[key]?.trim();
    if (!raw) continue;
    const cm = toCm(Number(raw), unit);
    if (!Number.isFinite(cm) || cm < min || cm > max)
      errors.push(
        `${label} must be between ${displayMeasurement(min, unit)} and ${displayMeasurement(max, unit)} ${unit}.`,
      );
    else values[key] = cm;
  }
  if (!Object.keys(values).length && !errors.length)
    errors.push("Add at least one measurement to save a profile.");
  return { values, errors };
}
export function validateImage(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png"].includes(file.type))
    return "Choose a JPG or PNG image. Convert HEIC photos to JPG first.";
  if (file.size >= 10 * 1024 * 1024) return "Choose an image smaller than 10 MB.";
  return "";
}
export function draftErrors(data: StudioData): string[] {
  const errors: string[] = [];
  for (const kind of ["photo", "fabric", "style"] as const) {
    if (!data.assets.some((a) => a.id === data.draft[`${kind}Id`] && a.kind === kind))
      errors.push(`Choose your ${kind}.`);
  }
  if (!data.draft.consent) errors.push("Confirm you have permission to use this photo.");
  return errors;
}
export function snapshotLook(data: StudioData, id: string, now: string): Look {
  const errors = draftErrors(data);
  if (errors.length) throw new Error(errors.join(" "));
  const find = (kind: AssetKind) =>
    structuredClone(data.assets.find((a) => a.id === data.draft[`${kind}Id`])!);
  const profile = data.profiles.find((p) => p.id === data.draft.profileId);
  return {
    id,
    name: `${find("style").name} · ${find("fabric").name}`,
    photo: find("photo"),
    fabric: find("fabric"),
    style: find("style"),
    profile: profile ? structuredClone(profile) : undefined,
    notes: data.draft.notes,
    status: "draft",
    favorite: false,
    createdAt: now,
  };
}
export function deleteAsset(data: StudioData, id: string): StudioData {
  const next = structuredClone(data);
  next.assets = next.assets.filter((a) => a.id !== id);
  for (const key of ["photoId", "fabricId", "styleId"] as const)
    if (next.draft[key] === id) next.draft[key] = "";
  return next;
}
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
