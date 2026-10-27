import { resolve } from "node:path";
import { inflateSync } from "node:zlib";
import assert from "node:assert/strict";

process.chdir(resolve(import.meta.dir, ".."));
const manifest = await Bun.file("dist/manifest.webmanifest").json();
const html = await Bun.file("dist/index.html").text();
const worker = await Bun.file("dist/sw.js").text();
const png = async (path: string) => {
  const bytes = Buffer.from(await Bun.file(`dist${path}`).arrayBuffer());
  assert(
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `${path}: invalid PNG`,
  );
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  return { bytes, width, height };
};
assert.equal(manifest.id, "/");
assert.equal(manifest.display, "standalone");
for (const size of [192, 512])
  for (const purpose of ["any", "maskable"]) {
    const icon = manifest.icons.find(
      (item: any) => item.sizes === `${size}x${size}` && item.purpose === purpose,
    );
    assert(icon, `Missing ${size}px ${purpose} icon`);
    const { bytes, width, height } = await png(icon.src);
    assert.equal(width, size);
    assert.equal(height, size);
    assert(worker.includes(`'${icon.src}'`), `${icon.src} must be precached`);
    if (purpose === "maskable") {
      // Generated RGBA8 PNGs use filter 0. Verify every foreground pixel stays
      // inside the central 80%-diameter safe circle used by platform masks.
      assert.equal(bytes[24], 8);
      assert.equal(bytes[25], 6);
      const parts: Buffer[] = [];
      for (let offset = 8; offset < bytes.length;) {
        const length = bytes.readUInt32BE(offset);
        if (bytes.toString("ascii", offset + 4, offset + 8) === "IDAT")
          parts.push(bytes.subarray(offset + 8, offset + 8 + length));
        offset += length + 12;
      }
      const pixels = inflateSync(Buffer.concat(parts));
      for (let y = 0; y < size; y++) {
        assert.equal(pixels[y * (size * 4 + 1)], 0);
        for (let x = 0; x < size; x++) {
          const offset = y * (size * 4 + 1) + 1 + x * 4;
          assert.equal(pixels[offset + 3], 255);
          if (pixels[offset] !== 92 || pixels[offset + 1] !== 45 || pixels[offset + 2] !== 60) {
            assert(
              Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= size * 0.4,
              `${icon.src}: artwork outside the safe area`,
            );
          }
        }
      }
    }
  }
for (const [path, size] of [
  ["/assets/apple-touch-icon.png", 180],
  ["/assets/favicon-32.png", 32],
] as const) {
  const image = await png(path);
  assert.equal(image.width, size);
  assert.equal(image.height, size);
  assert(html.includes(path));
  assert(worker.includes(path));
}
const ico = Buffer.from(await Bun.file("dist/favicon.ico").arrayBuffer());
assert.equal(ico.readUInt16LE(2), 1);
assert.equal(ico.readUInt16LE(4), 1);
assert.equal(ico[6], 32);
assert.equal(ico[7], 32);
assert.equal(ico.readUInt32LE(14), ico.length - 22);
assert(!worker.includes("__BUILD_ID__"), "Build ID was not injected");
console.log(
  "PWA assets verified: 192/512 standard + maskable icons, mask safe areas, Apple 180px, PNG/ICO favicons and cache references.",
);
