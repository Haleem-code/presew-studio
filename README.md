# PreSew Studio 🪡✨

> **"See it before you sew it."**  
> *The AI-powered personal fashion atelier & bespoke fitting room that bridges custom fabric buying, digital tailoring consultations, and neural garment try-ons.*

Built for the **[YouCam API: Skin & AI E-commerce Hackathon](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)** using the **Perfect Corp / YouCam AI Suite** (Clothes V4 API, Image Generator V2 API, and File API).

---

<p align="center">
  <img src="public/prew-sew-loading-screen.png" alt="PreSew Loading Screen" width="310" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="public/pre-sew-mobile.png" alt="PreSew Mobile Studio Interface" width="310" />
</p>

<p align="center">
  <em>The PreSew mobile experience: editorial boot screen (left) and the personal studio interface with curated silhouettes and fabrics (right).</em>
</p>

---

## 💡 The Core Problem: The Blind Sewing Dilemma

The custom apparel, bespoke tailoring, and artisanal fabric market (from African Ankara, Adire, and Aso Oke to European silks, linens, and bespoke suiting) is a multi-billion-dollar global industry. Yet, it suffers from a fundamental, high-cost friction: **you have to buy and cut the fabric before you know if it looks good on you.**

### 1. For Normal Everyday Users & Fashion Lovers
* **Costly Fabric Regret**: Consumers spend $50 to $350+ buying 3 to 6 yards of premium fabric. Once scissors cut the material, it is non-refundable. If the finished dress or two-piece doesn’t suit their figure or skin tone, the money and fabric are lost.
* **The "Model Disconnect"**: When browsing catalog or Pinterest pictures, shoppers see professional supermodels in studio lighting. A bold geometric Ankara print or ruffled gown that looks stunning on a model can look completely different on a customer's individual body proportions.
* **Decision Paralysis**: Shoppers hoard fabric bolts in their closets because they cannot picture which silhouette will best highlight the print.

### 2. For Fashion Designers, Ateliers & Tailors
* **The Consultation Communication Gap**: Clients frequently bring hand sketches, magazine clippings, or vague Instagram screenshots alongside a bolt of fabric. Bridging what a client *imagines* and what the fabric will *actually look like* is the hardest part of bespoke fashion.
* **Painful, Unpaid Alterations**: When the finished garment is tried on, clients are often surprised by the print placement or drape, demanding extensive alterations, rework, or even refusing to pay the final balance.
* **No Unified Digital Handover**: Fit notes and measurements are scattered across paper notebooks, WhatsApp voice notes, and scratchpads, leading to measurement errors and miscommunication between designers and their sewing technicians.

---

## 🌟 The PreSew Solution

**PreSew Studio** is a Progressive Web App (PWA) and digital atelier that eliminates the guesswork from bespoke tailoring. By pairing user portrait photos, real fabric swatches, and garment silhouettes through a **multi-stage YouCam AI neural pipeline**, PreSew lets clients and designers see photorealistic try-ons before cutting a single thread.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Client Photo   │  +  │  Fabric Swatch  │  +  │ Style Reference │
│  (Real Person)  │     │ (Upload or Shelf│     │(Gown/Suit/Cut)  │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
         ┌────────────────────────────────────────────────┐
         │         YouCam AI Preparation Engine           │
         │  (Image Generator V2: Maps fabric onto style)  │
         └───────────────────────┬────────────────────────┘
                                 ▼
         ┌────────────────────────────────────────────────┐
         │         YouCam Clothes API V4 Pipeline         │
         │  (Transfers custom garment onto user portrait) │
         └───────────────────────┬────────────────────────┘
                                 ▼
         ┌────────────────────────────────────────────────┐
         │   Interactive Fitting Room & Tailor Handover   │
         │  (Zoom/Pan, Comparison, Measurement Brief PDF) │
         └────────────────────────────────────────────────┘
```

---

## 👥 Built for Both Worlds

| Feature | For Normal Users / Clients | For Fashion Designers / Tailors |
| :--- | :--- | :--- |
| **Fabric Testing** | Take a quick photo of fabric at the market or in your closet and test it before buying. | Digitally showcase how your fabric inventory looks made up into garments. |
| **Style Exploration** | Mix-and-match silhouettes (dresses, peplum tops, agbada, two-piece sets, modern cuts). | Walk clients through silhouette options during intake consultations. |
| **Body Proportions** | See the clothes rendered directly onto your own face, body, and posture. | Help clients choose cuts that flatter their unique measurements and frame. |
| **Client Intake** | Save private look ideas and drafts on your phone. | Create separate client profiles with exact centimeter measurements. |
| **Tailor Handover** | Export a ready-to-sew brief to give your tailor complete clarity. | Generate professional sewing specification sheets for cutting and stitching teams. |

---

## 🔄 The Complete Workflow

### Step 1: Start With You (Photo Consent & Upload)
* The user provides a clear, front-facing portrait or full-body photo.
* PreSew emphasizes privacy and dignity: original photos are kept private in secure storage, and explicit consent is required before any processing begins.

### Step 2: The Fabric Shelf
* Users can upload their own fabric photo (e.g., a phone snap of an Ankara wax print, silk brocade, or linen) or select from the curated studio collection.
* The fabric texture and motifs are analyzed to preserve authentic pattern scale.

### Step 3: Find Your Silhouette
* Browse curated cuts including *Colour Block Gowns, Studio Tailoring, Two-Piece Sets, Agbada Sets, Tops, and Skirts*, or upload a custom style photograph.

### Step 4: Finishing Touches & Measurement Profiles
* Attach a client measurement profile (Height, Bust, Waist, Hips, Sleeve, Inseam in metric `cm` or imperial `inches`).
* Add bespoke tailoring notes (e.g., *"Make the hem floor-length for high heels; add lining to the bodice"*).

### Step 5: The YouCam AI Engine
1. **File Staging**: The server stages the fabric swatch and garment reference with the YouCam File API.
2. **Fabric-to-Garment Synthesis**: The server initiates **Image Generator V2**, conditioning the silhouette with the exact pattern and texture of the selected fabric.
3. **Neural Clothes Try-On**: The resulting garment is passed directly into **YouCam Clothes API V4**, which realistically drapes the garment onto the client's original photo while preserving their facial features, skin tone, hair, and body contour.
4. **Resilient Background Execution**: A durable polling worker tracks the rendering job with idempotency keys, quotas, and automatic status updates.

### Step 6: Interactive Fitting Room & Tailor Specification Brief
* **Dual-View Comparison**: Toggle between the original photo and the AI try-on, or zoom in up to 300% to inspect pattern alignment, seamlines, and drape.
* **Downloadable Outfit Plan**: Export a complete HTML/PDF specification document complete with fabric swatches, reference images, body measurements, and tailor instructions.

---

## 🪄 YouCam API Integration Architecture

PreSew relies heavily on the **Perfect Corp / YouCam API** suite to deliver realistic, production-grade e-commerce virtual try-ons:

* **Clothes API V4 (`POST /api/v4/clothes`)**:
  - Drapes generated garments onto user portraits with strict person filtering.
  - Automatically preserves human posture, hands, hair, and background context.
* **Image Generator V2 (`POST /api/v2/image-generator`)**:
  - Multi-image preparation phase that synthesizes raw fabric swatches into structured 3D garments prior to body fitting.
* **File Upload API (`POST /api/v1/files`)**:
  - Securely transmits and caches high-resolution fabric and silhouette assets.
* **Durable Task Queue (`server/jobs.ts`)**:
  - Implements an asynchronous finite state machine: `queued` ➔ `prepare_submit` ➔ `preparing` ➔ `tryon_submit` ➔ `rendering` ➔ `done`.
  - Built-in exponential backoff, worker lease timeouts, idempotency keys, and daily quota management (preventing wasteful paid API re-runs).

---

## 🛡️ Security, Privacy & Auth Gating

* **Strict Auth-Gating**: Visitors cannot access the interactive look creation wizard, measurement tools, or private try-on generators without signing in first. Clicking **Try your look** in the studio prompts a dedicated sign-in card.
* **Google Authentication with Better Auth**: Session authentication powered by Better Auth using secure HTTP-only cookies and cryptographic CSRF tokens.
* **Multi-Tenant Asset Isolation**: Private photos and generated previews are stored behind authenticated API endpoints (`/api/assets/*` and `/api/renders/*`) that verify account ownership on every request.
* **Explicit Processing Consent**: Users must actively consent to sending image data to YouCam for virtual try-on processing.
* **Complete Data Deletion**: Users can purge their cloud studio data, measurement profiles, and try-on history at any time from the account dialog.

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla TypeScript, Custom Editorial CSS (*Atelier Design System*), SVG icon system, PWA Service Worker (offline-first public shell).
* **Backend Runtime**: [Bun](https://bun.sh/) 1.4+ (High-performance native TypeScript HTTP server).
* **Authentication**: [Better Auth](https://www.better-auth.com/) with Google OAuth.
* **Database**: [Supabase](https://supabase.com/) PostgreSQL with typed Bun SQL connection pooling and isolated schema namespaces (`presew`, `presew_auth`).
* **AI Provider**: Perfect Corp YouCam AI API Suite (Clothes V4, Image Generator V2, Files API).
* **Hosting**: [Fly.io](https://fly.io/) with Docker containerization and persistent NVMe volume storage.

---

## 🚀 Step-by-Step Setup & Local Development

### Prerequisites
* [Bun](https://bun.sh/) 1.4 or higher installed.
* A Google Cloud OAuth Web Application Client ID & Secret.
* A Perfect Corp / YouCam API Key with Clothes V4 and Image Generator V2 enabled.
* A Supabase PostgreSQL database URL.

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/presew.git
cd presew
bun install --frozen-lockfile
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in the server credentials in `.env`:
```dotenv
PORT=3000
HOST=127.0.0.1
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
YOUCAM_API_KEY=your-youcam-api-key
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
PRIVATE_STORAGE_PATH=.data/assets
MAX_RENDERS_PER_DAY=5
```

> **Note**: Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI in your Google Cloud Console.

### 3. Run Migrations & Start Development
```bash
# Run PostgreSQL database schema migrations
bun run db:migrate

# Build assets and start local dev server
bun run dev
```

Open **`http://localhost:3000`** in your browser.

### 4. Running Tests & Production Build
```bash
# Run unit and backend integration tests
bun test

# Build production bundle in dist/
bun run build
```

---

## 🐙 Pushing to GitHub

Follow these exact steps from the `presew/` project root to push the project to your GitHub repository:

```bash
# 1. Verify git status and ensure secrets (.env) and data (.data/) are ignored
git status

# 2. Stage all project files
git add .

# 3. Create your initial commit
git commit -m "Initial commit: PreSew Studio with YouCam AI virtual try-on"

# 4. Set the branch to main
git branch -M main

# 5. Add your GitHub remote repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/presew.git

# 6. Push to GitHub
git push -u origin main
```

---

## ✈️ Deploying to Fly.io

PreSew includes production-ready [Dockerfile](Dockerfile) and [fly.toml](fly.toml) configurations.

### 1. Log in to Fly CLI
```bash
fly auth login
```

### 2. Choose Your App Name & Create Fly App
Choose a unique app name on Fly (e.g. `presew-atelier`):
```bash
# Set your chosen app name
$APP_NAME="presew-studio"

# Create the application on Fly.io
fly apps create $APP_NAME
```

Update your `fly.toml` to match your app name:
* `app = "presew-studio"`
* `BETTER_AUTH_URL = "https://presew-studio.fly.dev"`

### 3. Create the Persistent Storage Volume
PreSew stores private customer photos and generated AI assets on a dedicated persistent volume:
```bash
fly volumes create presew_data --region lhr --size 1 --app $APP_NAME
```

### 4. Set Production Secrets
Set your database and API keys securely in Fly.io (these are kept out of source control and Docker builds):
```bash
fly secrets set \
  DATABASE_URL="your_supabase_postgres_url" \
  BETTER_AUTH_SECRET="your_secure_32_character_secret" \
  GOOGLE_CLIENT_ID="your_google_client_id" \
  GOOGLE_CLIENT_SECRET="your_google_client_secret" \
  YOUCAM_API_KEY="your_youcam_api_key" \
  --app $APP_NAME
```

### 5. Update Google OAuth Redirect URI
In your **Google Cloud Console** under OAuth 2.0 Client IDs, add your production callback URL to the **Authorized redirect URIs** list:
```
https://YOUR_APP_NAME.fly.dev/api/auth/callback/google
```

### 6. Validate & Deploy
```bash
# Validate the configuration
fly config validate --strict

# Deploy to Fly.io (Fly runs 'bun server/migrate.ts' automatically before starting)
fly deploy --app $APP_NAME --ha=false
```

### 7. Monitor & Verify Deployment
```bash
fly status --app $APP_NAME
fly checks list --app $APP_NAME
fly logs --app $APP_NAME
```

Your live application will be accessible at: **`https://YOUR_APP_NAME.fly.dev`**

---

## 📁 Source Code Organization

```
presew/
├── public/                 # Static assets, CSS, icons, PWA manifest & screenshots
│   ├── atelier.css         # Editorial Atelier CSS design system
│   ├── styles.css          # Base layout, typography and dialog styles
│   ├── sw.js               # Service Worker for offline public shell caching
│   ├── pre-sew-mobile.png  # Mobile studio interface screenshot
│   └── prew-sew-loading-screen.png # Editorial loading boot screen screenshot
├── src/                    # Frontend client code & domain models
│   ├── app.ts              # Single-page client router, modal handlers & state
│   ├── catalog.ts          # Curated reference fabrics and silhouettes
│   ├── domain.ts           # Pure business logic, measurement math & validation
│   ├── icons.ts            # Bespoke SVG iconography
│   ├── preview.ts          # Interactive fitting room viewer (zoom/pan/compare)
│   └── remote.ts           # Type-safe API client & social sign-in helpers
├── server/                 # Backend API, Authentication & YouCam AI engine
│   ├── index.ts            # Bun HTTP server entrypoint & background tick worker
│   ├── auth.ts             # Better Auth Google configuration & database schema
│   ├── config.ts           # Environment variable validation & defaults
│   ├── database.ts         # Supabase PostgreSQL connection & migration runner
│   ├── images.ts           # Authenticated disk storage & multi-tenant access control
│   ├── jobs.ts             # Durable state machine for rendering jobs & quotas
│   ├── router.ts           # API route handlers & static file server
│   ├── validation.ts       # Strict schema validators & HTTP error types
│   └── youcam.ts           # Perfect Corp Clothes V4 & Image Generator V2 client
├── fly.toml                # Fly.io deployment specification
├── Dockerfile              # Multi-stage Bun build & production runtime image
└── DEPLOY.md               # Operations & migration checklist
```

---

## ⚖️ License & Credits

* Photography assets in the curated catalog are real reference images sourced from [Pexels](https://www.pexels.com/) under the Pexels license, with photographer credits provided on each asset card.
* AI virtual try-on and garment generation powered by the **Perfect Corp / YouCam AI Suite**.
* Developed for the **2026 YouCam API: Skin & AI E-commerce Hackathon**.
