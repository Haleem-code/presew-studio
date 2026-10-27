import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

// The SVG and raster icons share this outline. Even-odd fill creates the counter.
const monogramPath =
  "M320 760V240H500C760 240 760 580 500 580H410V760Z M410 325V495H500C642 495 642 325 500 325Z";
function curve(start: number[], a: number[], b: number[], end: number[]) {
  return Array.from({ length: 33 }, (_, index) => {
    const t = index / 32,
      u = 1 - t;
    return [0, 1].map(
      (axis) =>
        u ** 3 * start[axis] +
        3 * u ** 2 * t * a[axis] +
        3 * u * t ** 2 * b[axis] +
        t ** 3 * end[axis],
    );
  });
}
const outer = [
  [320, 760],
  [320, 240],
  [500, 240],
  ...curve([500, 240], [760, 240], [760, 580], [500, 580]),
  [410, 580],
  [410, 760],
];
const counter = [
  [410, 325],
  [410, 495],
  [500, 495],
  ...curve([500, 495], [642, 495], [642, 325], [500, 325]),
];
function inside(x: number, y: number, polygon: number[][]) {
  let filled = false;
  for (let i = 0, previous = polygon.length - 1; i < polygon.length; previous = i++) {
    const [ax, ay] = polygon[i],
      [bx, by] = polygon[previous];
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) filled = !filled;
  }
  return filled;
}
function appIcon(size: number, maskable = false) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coverage = 0;
      for (const sy of [0.25, 0.75])
        for (const sx of [0.25, 0.75]) {
          const scale = maskable ? 1 : 1.1;
          const nx = (((x + sx) / size - 0.5) / scale + 0.5) * 1000;
          const ny = (((y + sy) / size - 0.5) / scale + 0.5) * 1000;
          if (inside(nx, ny, outer) && !inside(nx, ny, counter)) coverage += 0.25;
        }
      const color = [92, 45, 60].map((value, index) =>
        Math.round(value + ([246, 243, 237][index] - value) * coverage),
      );
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw.set([...color, 255], i);
    }
  }
  const crc32 = (buffer: Buffer) => {
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, value: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), value]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(value.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const palettes: Record<string, string[]> = {
  sun: ["#e8ad4e", "#722e46", "#f9e2ad"],
  plum: ["#72334e", "#dba0a5", "#efcea3"],
  indigo: ["#273c69", "#e7e4d8", "#6177a0"],
  rose: ["#b96f77", "#e7bb9c", "#792f49"],
  sage: ["#93a690", "#e3e7d7", "#617b63"],
  cocoa: ["#9b7159", "#cfa589", "#76503e"],
};
function pattern(key: string) {
  const [a, b, c] = palettes[key];
  const art =
    key === "sun"
      ? `<path d="M0 30 30 0 60 30 30 60Z" fill="${b}"/><path d="M17 30 30 17 43 30 30 43Z" fill="${c}"/><path d="M0 0h10v10H0zM50 50h10v10H50z" fill="${c}"/>`
      : key === "plum"
        ? `<path d="M30 30C-10 15 5-8 30 15 55-8 70 15 30 30 70 45 55 68 30 45 5 68-10 45 30 30Z" fill="${b}"/><circle cx="30" cy="30" r="5" fill="${c}"/>`
        : key === "indigo"
          ? `<path d="M-15 0 0 15 15 0 30 15 45 0 60 15 75 0M-15 30 0 45 15 30 30 45 45 30 60 45 75 30" stroke="${b}" stroke-width="4" fill="none"/><circle cx="15" cy="22" r="3" fill="${c}"/><circle cx="45" cy="52" r="3" fill="${c}"/>`
          : key === "rose"
            ? `<path d="M0 0h12v60H0zM26 0h5v60h-5zM40 0h10v60H40z" fill="${b}"/><path d="M15 0h4v60h-4zM53 0h3v60h-3z" fill="${c}"/><path d="M0 12h60M0 42h60" stroke="${c}" stroke-width="2"/>`
            : key === "sage"
              ? `<g fill="none" stroke="${b}" stroke-width="1.5"><circle cx="30" cy="30" r="10"/><path d="M30 20C0-5-5 25 20 30-5 55 25 65 30 40c25 30 35 0 10-10 30-25 0-35-10-10Z"/></g><circle cx="30" cy="30" r="3" fill="${b}"/>`
              : `<path d="M-20 60Q10-10 60 0M0 80Q30 10 80 20" stroke="${b}" stroke-width="17" opacity=".2" fill="none"/>`;
  return `<pattern id="fabric" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="${a}"/>${art}</pattern>`;
}
function garment(shape: string, fill = "url(#fabric)") {
  const shapes: Record<string, string> = {
    dress:
      "M92 60 125 45Q150 70 175 45L208 60 222 110 194 118 184 84 177 160 213 315Q150 340 87 315L123 160 116 84 106 118 78 110Z",
    peplum:
      "M92 75 125 60Q150 86 175 60L208 75 234 145 201 155 185 109 177 178Q193 204 213 238Q150 257 87 238 107 204 123 178L115 109 99 155 66 145Z",
    set: "M90 60 125 45Q150 65 175 45L210 60 222 128 190 133 180 93 180 172H120V93L110 133 78 128ZM120 184H180L200 330H159L150 232 141 330H100Z",
    evening:
      "M126 48Q150 83 177 64L184 137 177 168Q202 228 207 326H161L153 249 145 326H94Q97 230 123 168L116 94Z",
    agbada:
      "M61 77 125 55Q150 75 175 55L239 77 252 233 193 245 188 104 180 303H120L112 104 107 245 48 233Z",
    skirt: "M121 87H179L211 305Q153 335 89 305Z",
  };
  return `<path d="${shapes[shape] || shapes.dress}" fill="${fill}" stroke="#542c40" stroke-width="1.3"/><g fill="none" stroke="#49283a" opacity=".35"><path d="M125 160Q150 170 177 160M126 177 108 305M175 177 192 305"/>${shape === "skirt" ? '<path d="m179 90-44 205 25 16M121 98h56"/>' : ""}</g>`;
}
function plate(shape: string, key: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 300 380"><defs>${pattern(key)}<radialGradient id="bg"><stop stop-color="#fcfaf6"/><stop offset="1" stop-color="#e9e2d8"/></radialGradient></defs><rect width="300" height="380" fill="url(#bg)"/><ellipse cx="150" cy="345" rx="87" ry="7" fill="#70534a" opacity=".1"/><path d="M149 22v13l-18 10m18-10 20 10" fill="none" stroke="#947c69" stroke-width="2"/>${garment(shape)}<path d="M31 24h15M31 24v15M269 356h-15M269 356v-15" stroke="#b5a599" fill="none"/></svg>`;
}
function person(x: number, scale: number, key: string, shape: string) {
  return `<g transform="translate(${x} 22) scale(${scale})"><defs>${pattern(key)}</defs><ellipse cx="150" cy="383" rx="65" ry="7" fill="#6b4751" opacity=".13"/><path d="m131 294 3 75-12 13h23l7-88m17 0-1 75 13 13h-23l-7-88" fill="#8e523f"/><path d="M130 69 110 88 86 163 90 229l9-2 2-66 25-45m48-47 23 20 26 74-4 65-10-2-2-64-24-48" fill="#9c5d46"/><path d="M139 47v23q12 10 24 0V47" fill="#8e523f"/><ellipse cx="151" cy="34" rx="23" ry="30" fill="#9c5d46"/><path d="M127 37q-8-42 25-40 33 1 24 45l-10-23q-17 10-34 0Z" fill="#2d2025"/><circle cx="129" cy="43" r="3" fill="#dcb474"/><circle cx="174" cy="43" r="3" fill="#dcb474"/><path d="m143 49 12 1" stroke="#542f30" stroke-width="1.5" stroke-linecap="round"/><g transform="translate(0 17) scale(1 .98)">${garment(shape)}</g><path d="M133 371h12v12h-24ZM158 371h11l14 12h-25Z" fill="#382831"/></g>`;
}
export async function generateAssets() {
  await mkdir("public/assets", { recursive: true });
  for (const key of Object.keys(palettes))
    await writeFile(
      `public/assets/fabric-${key}.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 240 240"><defs>${pattern(key)}<linearGradient id="shade"><stop stop-color="#fff" stop-opacity=".13"/><stop offset=".5" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient></defs><rect width="240" height="240" fill="url(#fabric)"/><rect width="240" height="240" fill="url(#shade)"/></svg>`,
    );
  for (const [shape, key] of [
    ["dress", "plum"],
    ["peplum", "sun"],
    ["set", "indigo"],
    ["evening", "rose"],
    ["agbada", "cocoa"],
    ["skirt", "sage"],
  ])
    await writeFile(`public/assets/style-${shape}.svg`, plate(shape, key));
  await writeFile(
    "public/assets/studio-hero.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 400 450"><rect width="400" height="450" fill="#e8d8da"/><path d="M40 450V170a140 140 0 0 1 280 0v280" fill="#f2e9e3"/><path d="M60 450V170a120 120 0 0 1 240 0v280" stroke="#c5a9ab" fill="none"/><path d="M-10 395q95-29 195 0t240 0" fill="none" stroke="#c3a5a3"/>${person(-40, 1.05, "plum", "dress")}${person(117, 0.93, "sun", "peplum")}<path d="m289 76 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#87516a"/><circle cx="330" cy="335" r="32" fill="#faf5e9"/><path d="m316 335 9 9 18-19" stroke="#87516a" stroke-width="2" fill="none"/><path d="M43 349q-21-45-28-74m26 65q12-32-2-49m-6 25q-24-9-24-26" stroke="#826d5c" fill="none"/></svg>`,
  );
  if (!existsSync("public/assets/logo.png")) {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 1000 1000"><rect width="1000" height="1000" rx="170" fill="#5c2d3c"/><path d="${monogramPath}" transform="translate(-50 -50) scale(1.1)" fill="#f6f3ed" fill-rule="evenodd"/></svg>`;
    await writeFile("public/assets/icon.svg", icon);
    for (const size of [192, 512]) {
      const raster = appIcon(size);
      await writeFile(`public/assets/icon-${size}.png`, raster);
      await writeFile(`public/assets/app-icon-${size}.png`, raster);
    }
    await writeFile("public/assets/apple-touch-icon.png", appIcon(180));
    const favicon = appIcon(32);
    await writeFile("public/assets/favicon-32.png", favicon);
    const ico = Buffer.alloc(22);
    ico.writeUInt16LE(1, 2);
    ico.writeUInt16LE(1, 4);
    ico[6] = 32;
    ico[7] = 32;
    ico.writeUInt16LE(1, 10);
    ico.writeUInt16LE(32, 12);
    ico.writeUInt32LE(favicon.length, 14);
    ico.writeUInt32LE(22, 18);
    await writeFile("public/favicon.ico", Buffer.concat([ico, favicon]));
  }
  for (const size of [192, 512]) {
    await writeFile(`public/assets/maskable-icon-${size}.png`, appIcon(size, true));
  }
}
