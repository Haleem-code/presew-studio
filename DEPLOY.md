# Fly.io launch plan

Prepared October 22, 2026. The user has verified real uploads and try-ons locally. This release adds account avatars, mobile UI refinements, installation help, versioned offline caching, and Fly.io deployment files. Deployment has not been performed.

The subsequent fashion-design pass and interactive fitting room are documented in [DESIGN.md](DESIGN.md). The latest frontend build and all 23 tests pass. Before deploying, check the new preview page on real phones; its perspective effect is a single-image view, not a true 360 model.

## 1. Review the polish

- Signed-in users open their account through their Google photo. Initials appear if the photo is missing or fails. Measurements retain their own ruler control.
- Mobile text, cards, buttons, consent controls, dialogs and bottom navigation have consistent spacing and larger labels.
- Home-screen guidance works without an Android install prompt, including instructions for iPhone Safari. Installed mode hides the prompt.
- A new service worker preloads a complete public build. Updates wait for the user to select Refresh app. Private images and account APIs are never cached.
- Offline copy distinguishes device drafts from account data, which still requires a connection.

Before launch, verify at 320, 390, 430 and 1440 pixels: no horizontal page scrolling, account dialog opens by keyboard, Google photo/initials display, buttons remain above the bottom safe area, and long names wrap. On an actual iPhone and Android phone, test home-screen installation, standalone launch, slow-network uploads, and navigation during rendering. The browser install UI varies by browser.

## 2. Prepare the Fly app

Run all commands from this directory (`presew/`). The included `fly.toml` is a template; its app name is deliberately a placeholder. Choose a globally available name, replace both `app` and `BETTER_AUTH_URL`, and confirm the region. `lhr` is a starting choice; put the Machine near your Supabase region.

```powershell
bun run build
bun test
fly auth login
fly apps create YOUR_APP_NAME
fly volumes create presew_data --region lhr --size 1 --app YOUR_APP_NAME
fly config validate --strict
```

Provisioning Machines and volumes incurs Fly.io charges. Keep one application Machine with this storage implementation. Private files are local to its attached volume; additional Machines would not share them. Move image storage to an object-storage adapter before horizontal scaling. A single volume has an availability risk; arrange independent backups as well as volume snapshots. See [Fly Volumes](https://fly.io/docs/volumes/overview/).

## 3. Set server secrets

Use Fly's secrets UI or `fly secrets import --app YOUR_APP_NAME` from a private secrets file outside source control. Import only these server values; do not import the local `.env` wholesale because its tunnel URL, HOST and paths override production configuration:

```dotenv
DATABASE_URL=YOUR_SUPABASE_POSTGRES_CONNECTION
BETTER_AUTH_SECRET=YOUR_EXISTING_SECRET
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
YOUCAM_API_KEY=YOUR_YOUCAM_KEY
```

Optionally include `BETTER_AUTH_API_KEY` if you use Better Auth Infrastructure. Keep secret values out of chat, source control and Docker build arguments. Retain the existing Better Auth secret if using the existing database. `HOST=0.0.0.0`, `PORT=3000`, `PRIVATE_STORAGE_PATH=/data/assets`, HTTPS origin and production mode are already configured in `fly.toml`.

Register `https://YOUR_APP_NAME.fly.dev/api/auth/callback/google` as a Google OAuth redirect URI, and the HTTPS origin as an authorized JavaScript origin if required by your Google configuration. Set the final origin in `BETTER_AUTH_URL`. Better Auth uses that explicit base URL and its trusted origins; see [Better Auth options](https://better-auth.com/docs/reference/options). If using a custom domain, configure its Fly certificate/DNS and update both OAuth and `BETTER_AUTH_URL` together. Update the Better Auth Infrastructure project URL too if used. The tunnel can remain available for development until the production checks pass.

## 4. Move existing private images deliberately

The SQL database stores image metadata, while image bytes currently live in local `.data/assets` (or your configured `PRIVATE_STORAGE_PATH`). Deploying the code does not upload these files. If production reuses the same Supabase database, pause local writes and active jobs during migration and copy all private image files to `/data/assets` on the Fly volume, preserving filenames. Use an authenticated private transfer such as Fly SSH/SFTP. Verify existing original photos, fabric/style uploads and past render results open after transfer. Do not put personal images in the Docker image, Git repository or public directory. Back up both database and files before migration.

Device-only IndexedDB libraries belong to the old browser origin. Before retiring the tunnel, sign in there and explicitly import the device library into the account if you want it on the new domain. Then transfer the resulting private files. Cookies from the tunnel do not sign users in on the new domain; users will sign in again.

## 5. Deploy and smoke-test

```powershell
fly deploy --app YOUR_APP_NAME --ha=false
fly status --app YOUR_APP_NAME
fly checks list --app YOUR_APP_NAME
fly logs --app YOUR_APP_NAME
```

The container builds with Bun 1.4.2 and excludes local credentials/files. Fly runs database/auth migrations as the release command before starting the web server. `/api/health` checks SQL access plus initialized authentication and the render worker; incomplete setup produces a failed readiness check. `auto_stop_machines = "off"` keeps the asynchronous worker running after users close their browser. See [Fly app configuration](https://fly.io/docs/reference/configuration/).

Verify before announcing the URL:

1. HTTPS and `/api/health` succeed; Google login and sign-out work from a fresh browser and installed app.
2. The account avatar opens account controls; uploads and measurements persist after refreshing.
3. Create one deliberately approved live try-on, close the screen, reopen History and confirm it finishes. Live renders consume provider units.
4. Existing images/results open, and another signed-in account cannot access them.
5. Install on iPhone/Android. Go offline: public shell and device drafts work; account actions explain the need to reconnect.
6. Deploy a later build: the update notice appears, unfinished input is preserved until refresh, and refreshing loads the new build.
7. Restart the Machine and verify private images persist. Test restoring backups separately.

Stop using the tunnel for production after these checks pass. Keep the previous working image available for rollback, and take database backups before future migrations because rolling back an image does not reverse schema changes.

## Verification in this change

- Production frontend build and all 21 automated tests passed. Added readiness tests cover missing auth/worker and a disconnected database.
- Browser QA with isolated account fixtures covered account initials/photo-failure fallback, account/install dialogs, accepting a PWA update, and responsive layouts at 320, 390, 430 and 1440 pixels. Fixed narrow-library overflow and mobile headline wrapping. Live profile-provider requests were not used.
- `fly config validate --strict` passed locally. No Fly app, volume or deployment was created.
- `docker build --tag presew-ui-polish:local .` passed. An isolated container with networking disabled loaded the server router, Better Auth and PostgreSQL dependency, verified public build files, and confirmed local `.env` and QA data were excluded. Full server startup against production PostgreSQL is still a launch check.
- Live Fly OAuth, storage migration and physical-device installation still require environment checks. No live provider requests were made for this change.
