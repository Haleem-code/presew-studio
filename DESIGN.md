# PreSew studio design and interactive previews

October 22, 2026. Implementation is in this app directory (`presew/`).

## Visual direction

An editorial fashion studio: generous space, clear image hierarchy, quiet surfaces, a wordmark without a decorative star, and a consistent outline icon family. Reference sites reviewed were [COS](https://www.cos.com/en-us) and [TOTEME](https://toteme.com/en-se). The layout and artwork implementation are PreSew's own; catalog photography retains its existing Pexels credits.

| Role | Choice |
| --- | --- |
| Background | Warm ivory, `#F6F3ED` |
| Text and primary controls | Dark ink, `#25231F` |
| Accent and selected states | Oxblood, `#5C2D3C` |
| Secondary text | Warm gray, `#6F6862` |
| Display typography | Cormorant Garamond, regular and italic |
| Controls and body typography | Manrope |

Fonts are self-hosted as Latin WOFF2 subsets in `public/fonts/`, with their SIL Open Font License files. Sources: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) and [Manrope](https://fonts.google.com/specimen/Manrope). They are precached with the public PWA shell; runtime Google Fonts requests are not required. Other characters fall back to system fonts.

Desktop uses a straightforward top navigation. Mobile retains four labelled destinations and a fixed bottom navigation. Measurements and account controls remain accessible in the header. The main journey is photo → fabric → style → review → try-on. My looks separates try-ons from outfit plans and favorites. Existing uploads, authentication and paid provider submission behavior are retained.

Brand rules and fitting-room styles are in `public/atelier.css`; core screen layouts are in `public/styles.css`. The new wordmark, home/fabric/hanger/gallery icons, favicon, raster app icons and PWA colors use the same direction. No raster image-generation service was used for these vector/code assets.

## Interactive fitting room

Open a completed try-on from Studio or My looks. It opens `#preview/<job-id>` with:

- Result/original photo switching.
- Zoom from 100% to 400%, explicit plus/minus buttons, reset and double-click zoom.
- Pointer dragging when zoomed, two-finger pinch on touch devices, and Ctrl/trackpad pinch-wheel zoom. Ordinary mouse scrolling continues down the page.
- Optional perspective mode: cursor movement or a deliberate swipe tilts the image within a small bounded range. Passive cursor motion respects reduced-motion preference.
- Keyboard controls while the viewer is focused: +/− zoom, arrows pan or tilt, and 0 resets.
- Original fabric and style references, download, and a clear route to create another look.
- Load/error messages, bounded panning, and event/ResizeObserver cleanup when leaving the page.

`src/preview.ts` owns the viewer; pure bounds and pinch calculations live in `src/preview-state.ts` and have unit tests. The page does not submit provider jobs or consume API units. Private result/original URLs retain their existing authenticated handling and stay outside the service-worker cache.

## What a true 360-degree preview needs

The existing backend receives one rendered image from its YouCam Clothes V4 task (`server/youcam.ts` reads `results.url`). It does not receive a mesh, depth field, or synchronized angle sequence. The [Clothes V4 task documentation](https://docs.perfectcorp.com/reference/ai_clothes/v4.0/paths/~1s2s~1v2.0~1task~1cloth-v4/post) describes the image-based try-on operation.

A single photograph cannot reveal the actual back of the outfit. The implemented fitting room is labelled **Single-view preview**. Perspective is an image interaction, and the UI explicitly says side/back views are unavailable. It is not presented as a completed 3D reconstruction.

For true 360 viewing after the hackathon:

1. Choose the data source: a real textured garment/person model, or a consistent multi-angle image sequence. A sequence can provide a spin viewer but is not a 3D model.
2. Validate a provider or capture pipeline using front/side/back references. Evaluate garment pattern, face/body consistency, occluded details, latency and credit cost before selecting it. Generated rear details would be inferred and must be described that way.
3. Add authenticated model/frame assets, ownership validation, new job phases, request idempotency, quotas, deletion and retention. Keep this an explicit user action because it can use additional credits.
4. Add the orbit/spin viewer with desktop drag, touch rotation, zoom, keyboard alternatives and the current image viewer as a fallback.
5. Test on real iPhone/Android devices over slow connections before promising a true 360 result.

For the current hackathon, prioritize the working try-on and the polished fitting room over an unvalidated 3D claim.

## Verification

- Production frontend builds; 23 tests pass, including bounded pan and pinch calculations.
- Fixture-based browser checks cover the desktop layout, mobile libraries/creation at 320px, viewer layout, original switching, keyboard zoom/pan/tilt/reset, and My looks filters. Fixtures use catalog images, not live provider results.
- The fonts load from this server. The PWA update notice successfully moves to a newer complete build.
- The updated Docker image (`presew-fashion:local`) builds successfully with the local fonts and fitting-room module.
- Keyboard Skip to content retains the current route and focuses the main content. Preview controls appear above the image so they remain easy to discover.
- Physical-device pinch/swipe behavior, installed iOS/Android rendering and live production OAuth remain launch checks. No live YouCam calls were made for this UI work.

Restart `bun run dev` after source changes and accept **Refresh app** if an older installed PWA shell is still visible. Installed launcher icons can be cached by the phone; verify the new monogram during the physical-device installation check.
