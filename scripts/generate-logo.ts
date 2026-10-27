import { resolve } from "node:path";

process.chdir(resolve(import.meta.dir, ".."));
const fontBase64 = Buffer.from(
  await Bun.file("public/fonts/cormorant-latin.woff2").arrayBuffer(),
).toString("base64");

// 1. Square Icon / Favicon / App Icon with the editorial wordmark
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      @font-face {
        font-family: 'Cormorant Garamond';
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
        font-weight: 600;
        font-style: normal;
      }
      .bg { fill: #f6f3ed; }
      .border { fill: none; stroke: #e5ded3; stroke-width: 6; }
      .mark {
        font-family: 'Cormorant Garamond', 'Georgia', serif;
        font-size: 122px;
        font-weight: 600;
        letter-spacing: -6px;
        fill: #241e24;
      }
      .dot { fill: #5c2d3c; }
    </style>
  </defs>
  <rect width="512" height="512" rx="112" class="bg"/>
  <rect x="3" y="3" width="506" height="506" rx="109" class="border"/>
  <text x="256" y="295" text-anchor="middle" class="mark">presew<tspan class="dot">.</tspan></text>
</svg>`;

// 2. Horizontal Editorial Wordmark Banner
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 220" width="640" height="220">
  <defs>
    <style>
      @font-face {
        font-family: 'Cormorant Garamond';
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
        font-weight: 600;
        font-style: normal;
      }
      .bg { fill: #f6f3ed; }
      .mark {
        font-family: 'Cormorant Garamond', 'Georgia', serif;
        font-size: 110px;
        font-weight: 600;
        letter-spacing: -5px;
        fill: #241e24;
      }
      .dot { fill: #5c2d3c; }
      .sub {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 3px;
        text-transform: uppercase;
        fill: #85757d;
      }
    </style>
  </defs>
  <rect width="640" height="220" rx="20" class="bg"/>
  <text x="320" y="115" text-anchor="middle" class="mark">presew<tspan class="dot">.</tspan></text>
  <text x="320" y="162" text-anchor="middle" class="sub">Fashion Studio Atelier</text>
</svg>`;

// 3. Compact Monogram Icon (for tiny 16px/32px favicons)
const monogramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <style>
      @font-face {
        font-family: 'Cormorant Garamond';
        src: url('data:font/woff2;base64,${fontBase64}') format('woff2');
        font-weight: 600;
        font-style: normal;
      }
      .bg { fill: #f6f3ed; }
      .border { fill: none; stroke: #e5ded3; stroke-width: 3; }
      .mark {
        font-family: 'Cormorant Garamond', 'Georgia', serif;
        font-size: 92px;
        font-weight: 600;
        fill: #241e24;
      }
      .dot { fill: #5c2d3c; }
    </style>
  </defs>
  <rect width="128" height="128" rx="28" class="bg"/>
  <rect x="2" y="2" width="124" height="124" rx="26" class="border"/>
  <text x="56" y="88" text-anchor="middle" class="mark">p<tspan class="dot">.</tspan></text>
</svg>`;

await Bun.write("public/assets/icon.svg", iconSvg);
await Bun.write("public/assets/logo.svg", logoSvg);
await Bun.write("public/assets/favicon.svg", monogramSvg);

console.log("Saved public/assets/icon.svg, public/assets/logo.svg, and public/assets/favicon.svg");
