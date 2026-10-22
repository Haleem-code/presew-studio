# Connect PreSew

`presew/.env` has been created with a random Better Auth secret and is ignored by Git. Keep the existing secret. Fill the empty provider/database fields in your editor; do not paste secret values into chat.

## Supabase PostgreSQL

Open your hosted Supabase project and click **Connect**. Copy its direct connection URI, or choose **Session pooler** if your development network is IPv4-only. Replace the password placeholder with your database password, percent-encoding reserved characters. Set this as `DATABASE_URL` in `.env`. The app requires this connection and will not start against SQLite.

Supabase does not need to be installed locally to use its hosted database. This app connects from its backend and does not need a frontend Supabase key. Connection modes are explained in the [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).

The migrations create `presew` for application data and `presew_auth` for Better Auth. Keep both out of the Data API exposed-schema list. Migrations enable RLS and revoke client-role access. Better Auth sessions are checked by the backend; they are not Supabase Auth JWTs. No `auth.uid()` policies are added.

Use a role scoped to these application schemas before production deployment. The migration connection needs permission to create schemas/tables. The backend role must be able to operate its owned tables; arbitrary unprivileged roles with no RLS policies will be denied. Private image files currently require a persistent server volume.

## Google OAuth

In Google Cloud Console, create a **Web application** OAuth client. Add `http://localhost:3000/api/auth/callback/google` to its authorized redirect URIs. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.

If using another port, update `PORT`, `BETTER_AUTH_URL`, and the Google redirect URI together. Use your actual HTTPS origin in production. See [Better Auth Google setup](https://better-auth.com/docs/authentication/google).

## Better Auth Infrastructure dashboard (optional)

If you connect this app to Better Auth Infrastructure, install `@better-auth/infra`, set the server-only `BETTER_AUTH_API_KEY`, and restart the app. When that key is present, PreSew loads the `dash()` plugin; without it, Google sign-in runs without the dashboard integration. For a local OutRay tunnel, set `BETTER_AUTH_URL` to its HTTPS URL and add `<tunnel-url>/api/auth/callback/google` as a Google OAuth redirect URI. The dashboard connection check can succeed only while the PreSew API server is running and reachable through the tunnel.

## YouCam

Set `YOUCAM_API_KEY` to the key from your Perfect Corp API console. The two-stage flow requires Image Generator V2 and Clothes V4 access and available API units. It uploads references, prepares the fabric/garment, then renders using the original photo. Live image quality still needs testing.

## Install and run

From `presew/`:

```powershell
bun install
bun run setup:check
bun run db:migrate
bun run dev
```

The setup check reports only configured/missing flags, never secret values. Open the printed app URL, sign in, upload your original photo, choose a fabric and style, and select **Try it on** after processing consent.

To install Supabase's optional agent guidance from an unrestricted terminal:

```powershell
npx skills add supabase/agent-skills
```

This installs agent instructions, not the database or application authentication. The installer was blocked by this session's outbound-network restriction, so the skills are not currently installed. Official source guidance was reviewed remotely.
