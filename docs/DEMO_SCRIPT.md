# PreSew — three-minute mobile product demo

Opening: **“This is PreSew.”**

Format: 1080 × 1920 portrait, 30 fps, exactly 03:00. A neutral phone frame surrounds footage of the real mobile web app. Use the browser's mobile viewport; no phone-extension installation is needed. It demonstrates the PWA interface, without claiming the capture came from an installed physical-phone app.

Style: warm ivory, oxblood accents, generous typography, gentle transitions, and legible captions. Keep the app visible for most of the running time. Record authentication privately before the take; exclude Google credentials, account chooser and unrelated personal data. Use one approved person, fabric and style consistently through the result.

This script describes the planned real-app capture. It does not certify that the final footage has been recorded. Narration and claims must follow the actual behavior captured.

## Selected demo inputs

The demo uses a stock model rather than the builder's personal photo. The user requested a freely usable full-length photograph and the existing fabric/style presets. See [DEMO_MEDIA.md](DEMO_MEDIA.md) for the source and license record.

- **Person:** full-length model in a white T-shirt and jeans, photographed by Dmitriy Steinke, Pexels photo 17781161. Local upload file: `outputs/presew-demo/demo-model-pexels-17781161.jpg`.
- **Fabric:** **Festival stripes**, the existing catalog preset (`ankara-sun`), photographed by YESICA CORONADO. The catalog ID is a legacy internal identifier; describe the pictured material as a colorful print, without claiming it is a verified Ankara textile.
- **Style:** **The flowing dress**, the existing catalog preset (`weekend-set`), photographed by Vika Glitter.

Use a small editorial label, **“Stock model · demonstration”**, when first showing the person and a source credit in the video description. Do not present the model as a customer, testimonial, or endorser. Capture the actual YouCam result from these inputs; the source style photograph is a reference, not a generated result.

## Narration and scene timing

### 00:00–00:09 — This is PreSew

**Visual:** wordmark and the mobile studio; introduce the main creation action within the first seconds.

**Voice:** “This is PreSew. Your photo. Your fabric. Your style. See your next outfit before the first stitch.”

**Headline:** See it before you sew it.

### 00:09–00:24 — The decision before sewing

**Visual:** retain the real studio, then move into fabric/style references. Avoid an extended title-card introduction.

**Voice:** “A custom outfit begins with a decision. You choose the fabric, save a style, and hope they work together. But by the time you see the result, the fabric may already be cut. PreSew brings that decision forward.”

**Headline:** Imagine it before you commit.

### 00:24–00:36 — Your pocket studio

**Visual:** start a look from the mobile home screen. Keep the labelled navigation and four-step flow visible.

**Voice:** “It is a personal fashion studio, designed for your phone. Start a look, bring your references together, and explore the possibility before you commit to sewing.”

**Headline:** A studio in your pocket.

### 00:36–00:53 — Start with your photo

**Visual:** open the photo picker, select the approved photo, show the preview and permission checkbox, then continue. Do not show unrelated folders or files.

**Voice:** “First, upload a clear photo of yourself, or someone who has agreed to take part. The guidance helps you frame the person and outfit area. Your original stays unchanged, and every try-on starts from that photo.”

**Headline:** 01 / Start with you.

### 00:53–01:11 — Choose your fabric

**Visual:** browse the built-in fabric collection, open **Festival stripes**, and select it. Briefly show the upload option as an available alternative; the recorded look uses the preset.

**Voice:** “Next, choose your fabric. Upload a well-lit image of the print you want to use, or explore the collection. Your fabric stays in your library, ready to pair with another style when inspiration changes.”

**Headline:** 02 / A fabric you love.

### 01:11–01:29 — Find the silhouette

**Visual:** open **The flowing dress** from the built-in style collection, select it, show the selected state and continue to review.

**Voice:** “Now find your silhouette. Browse the style edit, or bring a photo of a finished outfit you love. Combine your own fabric with that reference. The idea belongs to you, rather than being limited to a ready-made product.”

**Headline:** 03 / Make it your own.

### 01:29–01:47 — Review, then choose

**Visual:** show the selected photo, fabric and style together. Add a short design note if appropriate. Confirm processing consent and deliberately choose Try it on.

**Voice:** “Review your photo, fabric, and style together. Add a note about the details that matter. Measurements are optional. When you are ready, confirm permission to process the selected images and choose Try it on. You decide when generation begins.”

**Headline:** Your idea, together.

### 01:47–02:05 — YouCam does the work

**Visual:** real status progression. Shorten an actual wait with an explicit on-screen label. If a cached completed result is reused, label it as a previously generated YouCam result instead; do not stage a new provider call.

**Voice:** “Behind the preview are two YouCam stages. Image Generator V2 prepares the garment using your fabric and style. Clothes V4 then applies that prepared reference to your original photo. The server saves progress, so you can return to the result.”

**Headline:** Powered by YouCam.

### 02:05–02:25 — The fitting room

**Visual:** the real completed result. Switch to the original, switch back, zoom, pan, reset and briefly show perspective.

**Voice:** “Here is the look, up close. Switch between the preview and the original. Zoom into the fabric and move around the image. Perspective adds a gentle tilt. It is a single-view preview, so it does not invent a back view or claim to prove physical fit.”

**Headline:** Look closer. Decide with more context.

### 02:25–02:37 — Keep the possibility

**Visual:** return to My looks and reopen the same result. Show download if useful; omit a browser/OS download dialog from the final frame.

**Voice:** “Your completed try-ons stay together in My looks. Return to a favourite idea, reopen the preview, or download it for your next conversation with a tailor.”

**Headline:** Your ideas, all together.

### 02:37–02:50 — Prepare the conversation

**Visual:** an explicitly named example measurement profile and a real saved outfit plan. Show its exported HTML if captured; do not imply it already contains a generated tailor-grade brief.

**Voice:** “Save optional measurements and outfit notes alongside your plan. They help you communicate what you want to make. Confirm measurements and construction with your tailor; the AI image is a visual starting point.”

**Headline:** A clearer conversation with your tailor.

### 02:50–03:00 — Before the first stitch

**Visual:** return to the studio, then a restrained closing wordmark. Include a small synthetic-narration disclosure. Add a live production URL only after deployment is verified.

**Voice:** “Less guesswork. A clearer idea. A look that starts with you. This is PreSew. See it before you sew it.”

**Headline:** Your next look starts here.

## Caption and audio treatment

- Burn readable synchronized captions into the MP4, and export a matching SRT for the host's caption track.
- Use short sentence fragments, two lines at most, high contrast and a quiet background. Keep them away from the phone's navigation and the main action.
- A synthetic Microsoft Sonia narration can be used, with disclosure. Do not imitate a real person's voice. The script text is sent to the speech service; it contains no account data or credentials.
- No commercial soundtrack is needed. Use voice-first audio and restrained, original transition sounds only if they improve clarity.
- Caption any actual shortened render wait. Avoid a claim that the edit measures generation speed.

## Upload-ready checklist

The [event rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules) specify a public 1–3 minute video explaining the YouCam integration and showing the target-device experience. Use **YouTube or Vimeo** for this event. The broader Devpost platform can accept other hosts; the event-specific rules take priority.

1. Review the completed video for approved people/assets, exposed credentials and claims that match the app.
2. Upload the final MP4 to YouTube or Vimeo using the correct account. Select public visibility for the hackathon requirement.
3. Upload the matching SRT caption file, set English, and check the processed video after upload.
4. Open the viewing link while signed out. Confirm the full three-minute file is playable and captions work.
5. Paste the final share URL into the **hackathon submission's** video field before the deadline. Confirm the project-page video too if the two differ.

The final upload/publication remains a separate action. No hosting URL should be claimed until it exists and has been checked.
