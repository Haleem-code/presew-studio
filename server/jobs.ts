import { createHash } from "node:crypto";
import type { Store } from "./database";
import { ImageStore, imageInfo } from "./images";
import { CLOTHES, PREPARE, ProviderError, type AIProvider } from "./youcam";
import { HttpError } from "./validation";
import type { Asset } from "../src/domain";

export interface RenderInput {
  photo: Asset;
  fabric: Asset;
  style: Asset;
  consent: true;
  notes: string;
}
export interface JobRow {
  id: string;
  user_id: string;
  request_id: string;
  cache_key: string;
  status: string;
  input: string;
  context: string;
  result_asset_id?: string;
  error?: string;
  created_at: string;
  updated_at: string;
}
export const publicJob = (row: JobRow) => ({
  id: row.id,
  status: row.status,
  name: `${JSON.parse(row.input).style.name} · ${JSON.parse(row.input).fabric.name}`,
  createdAt: row.created_at,
  originalUrl: JSON.parse(row.input).photo.image,
  fabricUrl: JSON.parse(row.input).fabric.image,
  styleUrl: JSON.parse(row.input).style.image,
  resultUrl: row.result_asset_id ? `/api/assets/${row.result_asset_id}` : undefined,
  error: row.error || undefined,
});
export function category(value: string) {
  return value === "Tops"
    ? "upper_body"
    : value === "Skirts"
      ? "lower_body"
      : ["Dresses", "Two-piece", "Traditional"].includes(value)
        ? "full_body"
        : "auto";
}
export class RenderQueue {
  constructor(
    private db: Store,
    private images: ImageStore,
    private provider: AIProvider,
    private dailyLimit: number,
  ) {}
  async create(userId: string, requestId: string, input: RenderInput) {
    const prior = (
      await this.db.all<JobRow>("SELECT * FROM render_job WHERE user_id=? AND request_id=?", [
        userId,
        requestId,
      ])
    )[0];
    if (prior) return prior;
    const clean: RenderInput = {
      ...input,
      photo: await this.images.normalize(userId, input.photo),
      fabric: await this.images.normalize(userId, input.fabric),
      style: await this.images.normalize(userId, input.style),
    };
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          userId,
          clean.photo.image,
          clean.fabric.image,
          clean.style.image,
          category(clean.style.category),
          "prepare-v2-cloth-v4-1",
        ]),
      )
      .digest("hex");
    const cached = (
      await this.db.all<JobRow>(
        "SELECT * FROM render_job WHERE user_id=? AND cache_key=? AND status NOT IN ('failed','needs_review') ORDER BY created_at DESC LIMIT 1",
        [userId, key],
      )
    )[0];
    if (cached) return cached;
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    for (let slot = 1; slot <= this.dailyLimit; slot++) {
      await this.db.run(
        "INSERT INTO render_job(id,user_id,request_id,cache_key,status,input,context,created_at,updated_at,quota_day,quota_slot) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING",
        [
          id,
          userId,
          requestId,
          key,
          "queued",
          JSON.stringify(clean),
          "{}",
          now,
          now,
          now.slice(0, 10),
          slot,
        ],
      );
      const inserted = (
        await this.db.all<JobRow>("SELECT * FROM render_job WHERE user_id=? AND request_id=?", [
          userId,
          requestId,
        ])
      )[0];
      if (inserted) return inserted;
      const duplicate = (
        await this.db.all<JobRow>(
          "SELECT * FROM render_job WHERE user_id=? AND cache_key=? AND status NOT IN ('failed','needs_review') LIMIT 1",
          [userId, key],
        )
      )[0];
      if (duplicate) return duplicate;
    }
    throw new HttpError(429, "You have reached today’s try-on limit.");
  }
  async list(userId: string) {
    return this.db.all<JobRow>(
      "SELECT * FROM render_job WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      [userId],
    );
  }
  private async patch(
    id: string,
    status: string,
    context: any,
    error: string | null = null,
    result: string | null = null,
  ) {
    await this.db.run(
      "UPDATE render_job SET status=?,context=?,error=?,result_asset_id=COALESCE(?,result_asset_id),updated_at=? WHERE id=?",
      [status, JSON.stringify(context), error, result, new Date().toISOString(), id],
    );
  }
  async tick() {
    const rows = await this.db.all<JobRow>(
      "SELECT * FROM render_job WHERE status NOT IN ('done','failed','needs_review') AND (lease_until IS NULL OR lease_until<?) ORDER BY created_at LIMIT 4",
      [new Date().toISOString()],
    );
    for (const row of rows) {
      const lock = await this.db.all<{ id: string }>(
        "UPDATE render_job SET lease_until=? WHERE id=? AND status=? AND updated_at=? AND (lease_until IS NULL OR lease_until<?) RETURNING id",
        [
          new Date(Date.now() + 300000).toISOString(),
          row.id,
          row.status,
          row.updated_at,
          new Date().toISOString(),
        ],
      );
      if (!lock.length) continue;
      try {
        await this.advance(row);
      } finally {
        await this.db.run("UPDATE render_job SET lease_until=NULL WHERE id=?", [row.id]);
      }
    }
  }
  private async advance(row: JobRow) {
    const input: RenderInput = JSON.parse(row.input),
      context = JSON.parse(row.context);
    let polling = false;
    try {
      if (Date.now() - Date.parse(row.created_at) > 30 * 60 * 1000)
        return await this.patch(
          row.id,
          "needs_review",
          context,
          "This task took too long. Check the provider task before starting another attempt.",
        );
      if (row.status === "prepare_submit" || row.status === "tryon_submit")
        return await this.patch(
          row.id,
          "needs_review",
          context,
          "Submission was interrupted before confirmation. Check the provider task history; no automatic paid retry was made.",
        );
      if (row.status === "queued") {
        const [style, fabric] = await Promise.all([
          this.images.resolve(row.user_id, input.style),
          this.images.resolve(row.user_id, input.fabric),
        ]);
        const styleBytes = (await this.images.get(row.user_id, style.id)).bytes,
          fabricBytes = (await this.images.get(row.user_id, fabric.id)).bytes;
        for (const bytes of [styleBytes, fabricBytes])
          if (Math.max(imageInfo(bytes).width, imageInfo(bytes).height) > 3072)
            throw new Error(
              "Fabric and style references must have no side over 3072 pixels. Resize a copy and try again.",
            );
        const styleId = await this.provider.upload(styleBytes),
          fabricId = await this.provider.upload(fabricBytes);
        await this.patch(row.id, "prepare_submit", context);
        context.prepareTaskId = await this.provider.prepare(styleId, fabricId);
        await this.patch(row.id, "preparing", context);
        return;
      }
      if (row.status === "preparing") {
        polling = true;
        const result = await this.provider.poll(PREPARE, context.prepareTaskId);
        polling = false;
        if (result.status === "error")
          throw new Error(result.error || "The garment reference could not be prepared.");
        if (result.status !== "success") return;
        if (!result.url) throw new Error("The prepared garment image was missing.");
        const garment = await this.provider.download(result.url);
        const original = await this.images.resolve(row.user_id, input.photo);
        const photoId = await this.provider.upload(
          (await this.images.get(row.user_id, original.id)).bytes,
        );
        const garmentId = await this.provider.upload(garment);
        await this.patch(row.id, "tryon_submit", context);
        context.tryonTaskId = await this.provider.tryOn(
          photoId,
          garmentId,
          category(input.style.category),
        );
        await this.patch(row.id, "rendering", context);
        return;
      }
      if (row.status === "rendering") {
        polling = true;
        const result = await this.provider.poll(CLOTHES, context.tryonTaskId);
        polling = false;
        if (result.status === "error")
          throw new Error(result.error || "The outfit could not be rendered.");
        if (result.status !== "success") return;
        if (!result.url) throw new Error("The rendered image was missing.");
        const image = await this.images.put(row.user_id, await this.provider.download(result.url));
        await this.patch(row.id, "done", context, null, image.id);
      }
    } catch (error) {
      if (error instanceof ProviderError && !error.uncertain && polling) return; // Retry only status GET; never repeat a paid submission.
      await this.patch(
        row.id,
        error instanceof ProviderError && error.uncertain ? "needs_review" : "failed",
        context,
        error instanceof Error ? error.message : "The try-on failed.",
      );
    }
  }
}
