import { resolve, sep, join } from "node:path";
import { unlink } from "node:fs/promises";
import type { AuthService } from "./auth";
import type { Config } from "./config";
import type { Store } from "./database";
import { ImageStore } from "./images";
import { RenderQueue, publicJob, type JobRow } from "./jobs";
import { HttpError, jsonBody, text, validateAsset, validateStudio } from "./validation";
import { initialData } from "../src/catalog";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function createRouter(
  config: Config,
  db: Store,
  auth: AuthService | null,
  images: ImageStore,
  queue: RenderQueue | null,
  authError = "",
) {
  const root = resolve(import.meta.dir, "../dist");
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url),
        path = url.pathname;
      if (path === "/api/health" && request.method === "GET") {
        await db.all("SELECT 1");
        return reply({ status: auth && queue ? "ok" : "degraded" }, auth && queue ? 200 : 503);
      }
      if (path === "/api/status")
        return reply({
          googleSignIn: Boolean(auth),
          rendering: Boolean(auth && queue),
          database: db.dialect,
          authError: authError || undefined,
          missing: [
            ...(!config.authConfigured
              ? ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET"]
              : []),
            ...(!config.youcamKey ? ["YOUCAM_API_KEY"] : []),
          ],
        });
      if (path === "/api/auth" || path.startsWith("/api/auth/"))
        return auth
          ? auth.handler(request)
          : reply(
              {
                error: authError || "Google sign-in is not configured on this server.",
              },
              503,
            );
      if (path === "/api/catalog" && request.method === "GET") return reply(initialData().assets);
      if (path === "/api/me" && request.method === "GET")
        return reply({
          user: auth
            ? (await auth.api.getSession({ headers: request.headers }))?.user || null
            : null,
        });
      if (path.startsWith("/api/")) {
        if (
          !["GET", "HEAD"].includes(request.method) &&
          !config.trustedOrigins.includes(request.headers.get("origin") || "")
        )
          throw new HttpError(403, "Request origin is not allowed.");
        const session = auth ? await auth.api.getSession({ headers: request.headers }) : null;
        if (!session)
          throw new HttpError(401, "Sign in with Google to save online and create try-ons.");
        const userId = session.user.id;
        if (path.startsWith("/api/assets/") && request.method === "GET") {
          const image = await images.get(userId, path.slice("/api/assets/".length)).catch(() => {
            throw new HttpError(404, "Image not found.");
          });
          return new Response(image.bytes, {
            headers: {
              "Content-Type": image.content_type,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
        if (path === "/api/studio" && request.method === "GET") {
          const row = (
            await db.all<any>("SELECT * FROM studio_state WHERE user_id=?", [userId])
          )[0];
          return reply({
            data: row ? JSON.parse(row.data) : initialData(),
            revision: row?.revision || 0,
          });
        }
        if (path === "/api/studio" && request.method === "PUT") {
          const body = await jsonBody(request);
          if (!Number.isInteger(body.revision) || body.revision < 0)
            throw new HttpError(400, "Invalid library revision.");
          const state = validateStudio(body.data),
            memo = new Map<string, any>();
          const normalize = async (a: any) => {
            const key = JSON.stringify([a.source, a.id, a.image]);
            if (!memo.has(key)) memo.set(key, await images.normalize(userId, a));
            return { ...memo.get(key), favorite: a.favorite };
          };
          state.assets = await Promise.all(state.assets.map(normalize));
          for (const look of state.looks) {
            look.photo = await normalize(look.photo);
            look.fabric = await normalize(look.fabric);
            look.style = await normalize(look.style);
          }
          const current = (
            await db.all<any>("SELECT revision FROM studio_state WHERE user_id=?", [userId])
          )[0];
          const now = new Date().toISOString();
          const rows = current
            ? await db.all<any>(
                "UPDATE studio_state SET data=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=? RETURNING revision",
                [JSON.stringify(state), now, userId, body.revision],
              )
            : body.revision === 0
              ? await db.all<any>(
                  "INSERT INTO studio_state(user_id,revision,data,updated_at) VALUES(?,1,?,?) ON CONFLICT DO NOTHING RETURNING revision",
                  [userId, JSON.stringify(state), now],
                )
              : [];
          if (!rows.length)
            throw new HttpError(
              409,
              "Your library changed in another tab. Reload before saving to avoid overwriting it.",
            );
          return reply({ data: state, revision: rows[0].revision });
        }
        if (path === "/api/renders" && request.method === "POST") {
          if (!queue)
            throw new HttpError(
              503,
              "Configure YOUCAM_API_KEY on the server to create real try-ons.",
            );
          const body = await jsonBody(request, 48 * 1024 * 1024);
          if (body.consent !== true)
            throw new HttpError(
              400,
              "Confirm permission to process this person’s photo with YouCam.",
            );
          const requestId = text(request.headers.get("idempotency-key"), 100, "request ID");
          const job = await queue.create(userId, requestId, {
            photo: validateAsset(body.photo, "photo"),
            fabric: validateAsset(body.fabric, "fabric"),
            style: validateAsset(body.style, "style"),
            consent: true,
            notes: text(body.notes || "", 2000, "notes", true),
          });
          return reply(publicJob(job), 202);
        }
        if (path === "/api/renders" && request.method === "GET")
          return reply(
            (
              await db.all<JobRow>(
                "SELECT * FROM render_job WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
                [userId],
              )
            ).map(publicJob),
          );
        if (path.startsWith("/api/renders/") && request.method === "GET") {
          const job = (
            await db.all<JobRow>("SELECT * FROM render_job WHERE id=? AND user_id=?", [
              path.slice("/api/renders/".length),
              userId,
            ])
          )[0];
          if (!job) throw new HttpError(404, "Try-on not found.");
          return reply(publicJob(job));
        }
        if (path.startsWith("/api/renders/") && request.method === "DELETE") {
          const renderId = path.slice("/api/renders/".length);
          const job = (
            await db.all<JobRow>("SELECT * FROM render_job WHERE id=? AND user_id=?", [
              renderId,
              userId,
            ])
          )[0];
          if (!job) throw new HttpError(404, "Try-on not found.");
          if (!["done", "failed", "needs_review"].includes(job.status))
            throw new HttpError(409, "Wait for this try-on to finish before deleting it.");
          await db.run("DELETE FROM render_job WHERE id=? AND user_id=?", [renderId, userId]);
          if (job.result_asset_id) {
            const others = await db.all<any>(
              "SELECT id FROM render_job WHERE result_asset_id=? AND id!=?",
              [job.result_asset_id, renderId],
            );
            if (!others.length) {
              const asset = (
                await db.all<any>("SELECT path FROM private_asset WHERE id=? AND user_id=?", [
                  job.result_asset_id,
                  userId,
                ])
              )[0];
              if (asset) {
                await db.run("DELETE FROM private_asset WHERE id=? AND user_id=?", [
                  job.result_asset_id,
                  userId,
                ]);
                await unlink(join(config.storagePath, asset.path)).catch(() => {});
              }
            }
          }
          return reply({ deleted: true, id: renderId });
        }
        if (path === "/api/me/data" && request.method === "DELETE") {
          const pending = (
            await db.all<any>(
              "SELECT id FROM render_job WHERE user_id=? AND status NOT IN ('done','failed','needs_review') LIMIT 1",
              [userId],
            )
          )[0];
          if (pending)
            throw new HttpError(
              409,
              "Wait for active try-ons to finish before deleting cloud data.",
            );
          const assets = await db.all<any>("SELECT path FROM private_asset WHERE user_id=?", [
            userId,
          ]);
          await db.run("DELETE FROM render_job WHERE user_id=?", [userId]);
          await db.run("DELETE FROM studio_state WHERE user_id=?", [userId]);
          for (const a of assets) await unlink(join(config.storagePath, a.path)).catch(() => {});
          await db.run("DELETE FROM private_asset WHERE user_id=?", [userId]);
          return reply({
            deleted: true,
            message:
              "Studio data removed from this server. Provider-retained copies follow YouCam’s retention policy; downloaded files are separate.",
          });
        }
        throw new HttpError(404, "API route not found.");
      }
      if (!["GET", "HEAD"].includes(request.method))
        return reply({ error: "Method not allowed." }, 405);
      const filename = resolve(
        root,
        "." + (path === "/" ? "/index.html" : decodeURIComponent(path)),
      );
      if (!filename.startsWith(root + sep)) throw new HttpError(403, "Forbidden.");
      const file = Bun.file(filename);
      if (!(await file.exists())) throw new HttpError(404, "File not found.");
      return new Response(request.method === "HEAD" ? null : file, {
        headers: {
          "Cache-Control": "no-cache",
          "X-Content-Type-Options": "nosniff",
          ...(path.endsWith(".webmanifest") ? { "Content-Type": "application/manifest+json" } : {}),
        },
      });
    } catch (error) {
      if (error instanceof HttpError) return reply({ error: error.message }, error.status);
      console.error("Request failed:", error);
      return reply(
        {
          error: "The server could not complete this request. Please try again.",
        },
        500,
      );
    }
  };
}
