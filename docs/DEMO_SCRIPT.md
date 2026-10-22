# PreSew — final three-minute YouTube demo script

**Watch the demo:** [PreSew on YouTube](https://youtu.be/g5kmeHbxNL0).

**Opening:** “This is PreSew.”

**Export:** `outputs/presew-demo/PreSew-YouTube-Final.mp4` — 1920 × 1080, 16:9, 30 fps, exactly 03:00; H.264 video and AAC narration. The mobile web app appears in a neutral phone frame. This is a mobile browser recording, not a claim of physical-phone or installed-PWA capture.

**Captions:** burned into the video, with a separate synchronized UTF-8 SRT at `outputs/presew-demo/presew-demo-3min.srt`. Narration uses the synthetic Microsoft Sonia voice, with the brand pronounced “Pre Sew.” No third-party music is included.

**Sequence:** photo → fabric → style → optional measurements → review/consent → YouCam → interactive preview → saved plan/download. Measurements appear before generation, as requested.

**Visual direction:** warm ivory, oxblood details, the app’s Cormorant and Manrope fonts, soft scene transitions, a persistent real-app phone view, concise reference panels, and high-contrast captions. Keep the typography readable rather than filling the screen with claims.

**Capture source:** [the live Fly.io app](https://presew-studio.fly.dev/). Google sign-in was completed off camera. The camera takes used in the final edit were visually reviewed; failed attempts, personal credentials and unrelated account pages are excluded.

## Timed narration and direction

### 00:00–00:09 — See it before you sew it.

**Visual:** Open on the real signed-in mobile studio. The editorial panel introduces the selected stock model, Festival stripes fabric, and The flowing dress reference. The spoken opening is “This is PreSew.”

**Narration:** “This is PreSew. Your photo. Your fabric. Your style. See your next outfit before the first stitch.”

### 00:09–00:24 — Imagine it before you commit.

**Visual:** Scroll the real studio into its fabric and style collections while explaining the decision that comes before cutting fabric.

**Narration:** “A custom outfit begins with a decision. You choose the fabric, save a style, and hope they work together. But by the time you see the result, the fabric may already be cut. PreSew brings that decision forward.”

### 00:24–00:34 — A studio in your pocket.

**Visual:** Choose Create your look and show the four-step creation flow. Authentication has already happened privately.

**Narration:** “It is a personal fashion studio, designed for your phone. Start a look, bring your references together, and explore the possibility before you commit to sewing.”

### 00:34–00:49 — 01 / Start with you.

**Visual:** Use the file picker to select the downloaded, licensed full-body stock photograph. Name it Stock model · demo, save it, confirm permitted use, and continue. The video labels this as a stock demonstration model.

**Narration:** “First, upload a clear photo of yourself, or someone who has agreed to take part. The guidance helps you frame the person and outfit area. Your original stays unchanged, and every try-on starts from that photo.”

### 00:49–01:05 — 02 / A fabric you love.

**Visual:** Select Festival stripes from the existing catalog. Its colorful print is displayed alongside the real mobile selection state. The internal ID ankara-sun is not evidence that the pictured material is authentic Ankara.

**Narration:** “Next, choose your fabric. Upload a well-lit image of the print you want to use, or explore the collection. Your fabric stays in your library, ready to pair with another style when inspiration changes.”

### 01:05–01:21 — 03 / Make it your own.

**Visual:** Select The flowing dress from the built-in style book. Keep the chosen model, fabric and style consistent through the final actual YouCam result.

**Narration:** “Now find your silhouette. Browse the style edit, or bring a photo of a finished outfit you love. Combine your own fabric with that reference. The idea belongs to you, rather than being limited to a ready-made product.”

### 01:21–01:39 — The details that matter.

**Visual:** Open Manage measurement profiles → Add measurement profile. Enter Demo profile · sample values and seven manual cm values: height 168, bust/chest 90, waist 72, hips 98, shoulder width 38, sleeve length 58, garment length 140. Save, then show the profile attached in review. These fictional sample numbers were not measured from the stock photo.

**Narration:** “Next, add optional measurements. Choose centimeters or inches, enter the values, and save a named profile. Attach it to your outfit plan. These are sample numbers, not measurements from the model’s photo. Confirm your own values with your tailor.”

### 01:39–01:57 — Your idea, together.

**Visual:** Show the three chosen inputs, the design note, the optional selected measurement profile, and the deliberate YouCam processing-consent checkbox.

**Narration:** “Review your photo, fabric, and style together. Add a note about the details that matter. Measurements are optional. When you are ready, confirm permission to process the selected images and choose Try it on. You decide when generation begins.”

### 01:57–02:15 — Powered by YouCam.

**Visual:** Show the actual Try it on action and queue, then cut to the real successful result. The API explanation identifies Image Generator V2 and Clothes V4. The edit combines live-app takes and explicitly labels the shortened wait; it makes no generation-speed claim.

**Narration:** “Behind the preview are two YouCam stages. Image Generator V2 prepares the garment using your fabric and style. Clothes V4 then applies that prepared reference to your original photo. The server saves progress, so you can return to the result.”

### 02:15–02:35 — Look closer.

**Visual:** Show the real YouCam-generated dress, switch to the original photograph, return to the result, zoom, drag/pan, enable Perspective, tilt and reset. Explain that this is a single image rather than a reconstructed 360 model.

**Narration:** “Here is the look, up close. Switch between the preview and the original. Zoom into the fabric and move around the image. Perspective adds a gentle tilt. It is a single-view preview, so it does not invent a back view or claim to prove physical fit.”

### 02:35–02:50 — Your ideas, all together.

**Visual:** Use the clean Outfit plans filter in My looks. Open the saved plan containing the three references, notes, and the seven-value sample measurement profile. Choose Download plan. Failed trial cards and error dialogs are excluded from the film.

**Narration:** “My looks keeps your generated previews and outfit plans together. Open a saved plan to review the photo, fabric, style, notes, and measurement profile. Download it for a clearer conversation with your tailor.”

### 02:50–03:00 — Your next look starts here.

**Visual:** End on the actual successful fitting room, the original/result comparison, the live Fly.io URL, and the brand promise: See it before you sew it.

**Narration:** “Less guesswork. A clearer idea. A look that starts with you. This is PreSew. See it before you sew it.”

## Input media and honest claims

The full-length model photograph is by Dmitriy Steinke / Pexels (17781161). Fabric: Festival stripes, by YESICA CORONADO (14856268). Style: The flowing dress, by Vika Glitter (27677904). The UI hero photograph is by cottonbro studio (9541934). See [DEMO_MEDIA.md](DEMO_MEDIA.md) for source links and the Pexels license. The model is not presented as a customer or endorser.

The resulting dress was actually generated through the live app’s YouCam pipeline and downloaded from the completed job. The original model photo remains the input. Measurements are manual sample data and do not drive the AI image. Perspective tilts a single view; it does not show unseen sides/back or establish physical fit. The exported outfit plan contains references, notes and measurements; it is separate from the generated image.

## Video and submission

The builder supplied the [YouTube demo link](https://youtu.be/g5kmeHbxNL0), now included in the README. Use [YOUTUBE_UPLOAD.md](YOUTUBE_UPLOAD.md) for the description, chapters, source credits, thumbnail and caption file. The finished MP4 is also saved locally. Confirm public playback and add the same URL to the Devpost submission's video field.
