import { emptyDraft, type Asset, type StudioData } from "./domain";

const fabrics = [
  [
    "ankara-sun",
    "Festival stripes",
    "Print",
    14856268,
    "YESICA CORONADO",
    "colorful-fabric-patterns",
  ],
  [
    "ankara-plum",
    "Silk in colour",
    "Satin",
    8752733,
    "Tamanna Rumee",
    "full-shot-colorful-silky-fabric",
  ],
  [
    "adire-indigo",
    "Woven rhythm",
    "Woven",
    10900713,
    "Magda Ehlers",
    "colorful-fabric-in-close-up-shot",
  ],
  ["aso-rose", "Floral flourish", "Print", 11275072, "Engin Akyurt", "colorful-fabric-flowers"],
  [
    "lace-sage",
    "Colour & texture",
    "Texture",
    36299787,
    "Jonathan Borba",
    "colorful-fabric-textures-in-close-up",
  ],
  [
    "satin-cocoa",
    "Liquid colour",
    "Satin",
    36267069,
    "Rafael Minguet Delgado",
    "vibrant-satin-fabric-with-abstract-hues",
  ],
] as const;
const styles = [
  [
    "bloom-dress",
    "Colour block gown",
    "Dresses",
    9541934,
    "cottonbro studio",
    "a-woman-in-long-dress-posing-for-a-photoshoot",
  ],
  [
    "peplum-blouse",
    "Studio tailoring",
    "Two-piece",
    6520931,
    "Esmeralda Segura",
    "a-woman-in-stylish-outfit-standing",
  ],
  [
    "weekend-set",
    "The flowing dress",
    "Dresses",
    27677904,
    "Vika Glitter",
    "a-woman-in-a-colorful-dress-posing-for-a-photo",
  ],
  ["evening-dress", "Evening muse", "Dresses", 8538848, "Imad Clicks", "a-woman-wearing-dress"],
  [
    "agbada-set",
    "Soft statement",
    "Dresses",
    9511236,
    "cottonbro studio",
    "woman-in-white-long-sleeve-dress",
  ],
  [
    "wrap-skirt",
    "Summer silhouette",
    "Dresses",
    4464619,
    "HONG SON",
    "woman-in-white-dress-walking-along-road",
  ],
] as const;
export const heroImage =
  "https://images.pexels.com/photos/9541934/pexels-photo-9541934.jpeg?auto=compress&cs=tinysrgb&w=1200";
export function initialData(): StudioData {
  const collection = (
    rows: readonly (readonly [string, string, string, number, string, string])[],
    kind: "fabric" | "style",
  ): Asset[] =>
    rows.map(([id, name, category, photo, author, slug]) => ({
      id,
      name,
      category,
      kind,
      image: `https://images.pexels.com/photos/${photo}/pexels-photo-${photo}.jpeg?auto=compress&cs=tinysrgb&w=1400`,
      source: "catalog",
      favorite: false,
      createdAt: "2026-10-21T00:00:00Z",
      attribution: { author, url: `https://www.pexels.com/photo/${slug}-${photo}/` },
    }));
  const assets = [...collection(fabrics, "fabric"), ...collection(styles, "style")];
  return { version: 1, assets, looks: [], profiles: [], draft: emptyDraft(), unit: "cm" };
}
export function refreshCatalog(data: StudioData): StudioData {
  const next = structuredClone(data);
  next.assets = [
    ...next.assets.filter((a) => a.source === "upload"),
    ...initialData().assets.map((a) => ({
      ...a,
      favorite: next.assets.find((old) => old.id === a.id)?.favorite || false,
    })),
  ];
  return next;
}
