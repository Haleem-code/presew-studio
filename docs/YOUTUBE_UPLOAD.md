# YouTube upload package

**Demo link:** [Watch PreSew on YouTube](https://youtu.be/g5kmeHbxNL0). Use this URL in the Devpost submission's video field. The sections below retain the title, description, credits, and caption details for the published demo.

## Files

- Video: `outputs/presew-demo/PreSew-YouTube-Final.mp4` — exactly 03:00, 1920 × 1080, 30 fps, H.264/AAC, with burned-in captions.
- Optional closed-caption upload: `outputs/presew-demo/presew-demo-3min.srt` — English, with timing.
- Thumbnail: `outputs/presew-demo/presew-youtube-thumbnail.png` — 1280 × 720.
- Detailed narration and direction: [DEMO_SCRIPT.md](DEMO_SCRIPT.md).
- Actual downloaded result: `outputs/presew-demo/youcam-result.png`.

The production files are saved on the builder’s PC. Raw footage and production outputs are excluded from Git; the repository includes a compact thumbnail, illustrated README, and the YouTube link supplied by the builder.

## Title

PreSew — See It Before You Sew It | YouCam API Hackathon Demo

## Description to paste

This is PreSew. Your photo. Your fabric. Your style. See your next custom outfit before the first stitch.

Try the app: https://presew-studio.fly.dev/

PreSew brings a person photo, fabric reference and outfit style together in a mobile-first fashion studio. This demonstration uses a licensed stock model, the Festival stripes fabric preset, and The flowing dress style preset.

The video follows the real web app: upload a full-body photo, choose fabric and style, enter optional measurements, review and consent, create a YouCam preview, compare with the original, zoom/pan/tilt the single image, and download an outfit plan.

YouCam integration: Image Generator V2 prepares the garment from the fabric and style; Clothes V4 applies the prepared reference to the original person photograph. The resulting dress shown here was actually generated through the deployed app.

00:00 This is PreSew — the decision before sewing
00:24 Start a look
00:34 Add the person photo
00:49 Choose the fabric
01:05 Choose the style
01:21 Enter optional measurements
01:39 Review and consent
01:57 The YouCam workflow
02:15 Compare and explore the result
02:35 Save and download the outfit plan
02:50 See it before you sew it

Measurements in this video are labelled sample values entered manually; they were not inferred from the model’s photo. The AI image is a visual preview, not a guarantee of physical fit or construction. Perspective tilts one image; it is not a true 360-degree reconstruction.

Recorded from the mobile browser interface of the live Fly.io app. The edit combines real app takes and omits processing wait time. Synthetic narration: Microsoft Sonia. No third-party music is used. This is a stock-model demonstration, not a customer testimonial or endorsement.

Photo credits:
Model — Dmitriy Steinke / Pexels: https://www.pexels.com/photo/woman-posing-on-white-background-17781161/
Fabric — YESICA CORONADO / Pexels: https://www.pexels.com/photo/colorful-fabric-patterns-14856268/
Style — Vika Glitter / Pexels: https://www.pexels.com/photo/a-woman-in-a-colorful-dress-posing-for-a-photo-27677904/
Studio hero — cottonbro studio / Pexels: https://www.pexels.com/photo/a-woman-in-long-dress-posing-for-a-photoshoot-9541934/
Source photo license: https://www.pexels.com/license/

Built for the YouCam API Skin AI & eCommerce VTO Hackathon.

## Submission checks

1. Confirm the linked video is the full three-minute demo and plays from a signed-out browser.
2. Check the title, description, source credits, and thumbnail. The English SRT can be added as selectable closed captions alongside the burned-in captions.
3. Keep the video Public for the submission.
4. Paste `https://youtu.be/g5kmeHbxNL0` into the Devpost submission’s video field and the project page if they use different videos. The README already links to it.
5. Check the app’s Google OAuth audience permits reviewers to sign in; this recording verifies the builder’s signed-in account, not every reviewer account. Keep provider credits and the deployment available for judging.

Review the [hackathon rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules) and [Devpost video guidance](https://help.devpost.com/article/84-video-making-best-practices) before submitting. The builder supplied the YouTube link; these documentation updates do not change video visibility or submit the project to Devpost.
