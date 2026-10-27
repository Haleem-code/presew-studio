import { beforeAll, afterAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { readConfig } from "./config";
import { openStore, migrateApp, type Store } from "./database";
import { ImageStore, imageInfo } from "./images";
import { RenderQueue } from "./jobs";
import {
  CLOTHES,
  PREPARE,
  ProviderError,
  YouCam,
  assertProviderURL,
  type AIProvider,
} from "./youcam";
import { createRouter } from "./router";
import { initialData } from "../src/catalog";
import { validateStudio } from "./validation";

let db: Store, images: ImageStore, queue: RenderQueue;
const config = {
  ...readConfig({}),
  sqlitePath: ":memory:",
  storagePath: resolve(".data/test-assets"),
  dailyLimit: 3,
};
const providerCalls: string[] = [];
let pollFailure = false;
let uncertain = false;
let png: Uint8Array;
const provider: AIProvider = {
  async upload() {
    providerCalls.push("upload");
    return "file-" + providerCalls.length;
  },
  async prepare() {
    providerCalls.push("prepare");
    if (uncertain) throw new ProviderError("Submission timed out.", true);
    return "prep-1";
  },
  async tryOn() {
    providerCalls.push("tryon");
    return "tryon-1";
  },
  async poll(endpoint) {
    if (pollFailure) throw new ProviderError("Temporary polling failure.");
    providerCalls.push("poll:" + endpoint);
    return { status: "success", url: "https://yce-us.s3-accelerate.amazonaws.com/result.png" };
  },
  async download() {
    return png;
  },
};
beforeAll(async () => {
  png = new Uint8Array(await Bun.file("public/assets/icon-512.png").arrayBuffer());
  db = await openStore(config);
  await migrateApp(db);
  images = new ImageStore(db, config.storagePath);
  queue = new RenderQueue(db, images, provider, 3);
});
afterAll(async () => {
  await db?.close();
});
async function input(owner: string, suffix = "") {
  const row = await images.put(owner, png);
  const a = {
    id: "photo-" + suffix,
    kind: "photo" as const,
    name: "Original photo",
    image: `/api/assets/${row.id}`,
    category: "My photo",
    source: "upload" as const,
    favorite: false,
    createdAt: new Date().toISOString(),
  };
  return {
    photo: a,
    fabric: { ...a, id: "fabric-" + suffix, kind: "fabric" as const },
    style: { ...a, id: "style-" + suffix, kind: "style" as const, category: "Dresses" },
    consent: true as const,
    notes: "",
  };
}
describe("durable rendering", () => {
  test("prepares the fabric and garment, then submits the original photo to clothes try-on", async () => {
    const job = await queue.create("alice", "request-1", await input("alice"));
    await queue.tick();
    expect((await queue.list("alice"))[0].status).toBe("preparing");
    pollFailure = true;
    await queue.tick();
    pollFailure = false;
    expect((await queue.list("alice"))[0].status).toBe("preparing");
    await queue.tick();
    await queue.tick();
    const result = (await queue.list("alice"))[0];
    expect(result.status).toBe("done");
    expect(result.result_asset_id).toBeTruthy();
    expect(providerCalls.filter((c) => c === "prepare")).toHaveLength(1);
    expect(providerCalls.filter((c) => c === "tryon")).toHaveLength(1);
    expect(providerCalls).toContain("poll:" + CLOTHES);
    const again = await queue.create("alice", "request-1", await input("alice"));
    expect(again.id).toBe(job.id);
    const cached = await queue.create("alice", "request-2", await input("alice"));
    expect(cached.id).toBe(job.id);
  });
  test("retains uncertain submissions for review without repeating a paid call", async () => {
    uncertain = true;
    await queue.create("bob", "uncertain-request", await input("bob"));
    await queue.tick();
    uncertain = false;
    const calls = providerCalls.filter((c) => c === "prepare").length;
    expect((await queue.list("bob"))[0].status).toBe("needs_review");
    await queue.tick();
    expect(providerCalls.filter((c) => c === "prepare")).toHaveLength(calls);
  });
  test("does not grant another owner access to an image", async () => {
    const row = await images.put("alice", png);
    await expect(images.get("bob", row.id)).rejects.toThrow("not found");
  });
  test("reserves a bounded number of daily render slots while allowing cached results", async () => {
    const limited = new RenderQueue(db, images, provider, 2);
    const first = await input("quota-user");
    const job = await limited.create("quota-user", "quota-1", first);
    await limited.create("quota-user", "quota-2", {
      ...first,
      style: { ...first.style, category: "Tops" },
    });
    const cached = await limited.create("quota-user", "quota-cache", first);
    expect(cached.id).toBe(job.id);
    await expect(
      limited.create("quota-user", "quota-3", {
        ...first,
        style: { ...first.style, category: "Skirts" },
      }),
    ).rejects.toThrow("limit");
  });
});
describe("HTTP authentication, state and ownership", () => {
  const auth = {
    handler: async () => new Response("auth"),
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const user = headers.get("x-test-user");
        return user ? { user: { id: user, name: user, email: `${user}@example.test` } } : null;
      },
    },
  };
  const request = (
    path: string,
    user = "",
    method = "GET",
    body?: unknown,
    origin = config.origin,
  ) =>
    new Request(config.origin + path, {
      method,
      headers: { "x-test-user": user, Origin: origin, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  test("reports readiness only when the database, auth and render queue are available", async () => {
    const healthy = await createRouter(config, db, auth, images, queue)(request("/api/health"));
    expect(healthy.status).toBe(200);
    expect(await healthy.json()).toEqual({ status: "ok" });
    expect(healthy.headers.get("cache-control")).toBe("no-store");
    expect(
      (await createRouter(config, db, null, images, queue)(request("/api/health"))).status,
    ).toBe(503);
    expect(
      (await createRouter(config, db, auth, images, null)(request("/api/health"))).status,
    ).toBe(503);
    const unavailable = {
      ...db,
      all: async () => {
        throw new Error("Database offline");
      },
    };
    expect(
      (await createRouter(config, unavailable, auth, images, queue)(request("/api/health"))).status,
    ).toBe(500);
  });
  test("requires authentication and exact origins for writes", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    expect((await handler(request("/api/studio"))).status).toBe(401);
    expect(
      (await handler(request("/api/studio", "alice", "PUT", {}, "https://evil.example"))).status,
    ).toBe(403);
  });
  test("persists account libraries and rejects stale writes instead of overwriting another tab", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    const body = { data: initialData(), revision: 0 };
    const saved = await handler(request("/api/studio", "cloud-user", "PUT", body));
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as any).revision).toBe(1);
    expect((await handler(request("/api/studio", "cloud-user", "PUT", body))).status).toBe(409);
    const another = await handler(request("/api/studio", "another-user"));
    expect(((await another.json()) as any).revision).toBe(0);
  });
  test("does not serve another user’s original or generated files", async () => {
    const row = await images.put("alice", png);
    const handler = createRouter(config, db, auth, images, queue);
    expect((await handler(request(`/api/assets/${row.id}`, "bob"))).status).toBe(404);
    const own = await handler(request(`/api/assets/${row.id}`, "alice"));
    expect(own.status).toBe(200);
    expect(own.headers.get("cache-control")).toContain("no-store");
  });
  test("rejects missing consent before provider calls", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    expect(
      (await handler(request("/api/renders", "alice", "POST", { consent: false }))).status,
    ).toBe(400);
  });
  test("stores uploaded originals behind private routes when syncing an account library", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    const data = initialData();
    data.assets.push({
      ...data.assets[0],
      id: "my-photo",
      kind: "photo",
      source: "upload",
      image: `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
    });
    const response = await handler(
      request("/api/studio", "upload-user", "PUT", { data, revision: 0 }),
    );
    expect(response.status).toBe(200);
    const saved = (await response.json()) as any;
    const photo = saved.data.assets.find((a: any) => a.id === "my-photo");
    expect(photo.image.startsWith("/api/assets/")).toBe(true);
    const fetched = await handler(request(photo.image, "upload-user"));
    expect(new Uint8Array((await fetched.arrayBuffer()) as ArrayBuffer)).toEqual(png);
  });
  test("allows owners to delete their completed try-ons and cleans up result assets", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    const asset = await images.put("delete-user", png);
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO render_job(id,user_id,request_id,cache_key,status,input,context,result_asset_id,created_at,updated_at,quota_day,quota_slot) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        jobId,
        "delete-user",
        "req-del-1",
        "cache-del-1",
        "done",
        JSON.stringify({ photo: {}, fabric: {}, style: { name: "Dress" } }),
        "{}",
        asset.id,
        now,
        now,
        now.slice(0, 10),
        10,
      ],
    );
    expect((await handler(request(`/api/renders/${jobId}`, "bob", "DELETE"))).status).toBe(404);
    const del = await handler(request(`/api/renders/${jobId}`, "delete-user", "DELETE"));
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ deleted: true, id: jobId });
    expect((await handler(request(`/api/renders/${jobId}`, "delete-user"))).status).toBe(404);
    expect((await handler(request(`/api/assets/${asset.id}`, "delete-user"))).status).toBe(404);
  });
  test("rejects deleting an in-progress try-on", async () => {
    const handler = createRouter(config, db, auth, images, queue);
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.run(
      "INSERT INTO render_job(id,user_id,request_id,cache_key,status,input,context,created_at,updated_at,quota_day,quota_slot) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      [
        jobId,
        "delete-user",
        "req-in-prog",
        "cache-in-prog",
        "rendering",
        JSON.stringify({ photo: {}, fabric: {}, style: { name: "Dress" } }),
        "{}",
        now,
        now,
        now.slice(0, 10),
        11,
      ],
    );
    const res = await handler(request(`/api/renders/${jobId}`, "delete-user", "DELETE"));
    expect(res.status).toBe(409);
  });
});
describe("provider request contract", () => {
  test("rejects unsupported database URLs and weak configured secrets", () => {
    expect(() => readConfig({ DATABASE_URL: "https://example.com" })).toThrow("PostgreSQL");
    expect(() => readConfig({ BETTER_AUTH_SECRET: "short" })).toThrow("32");
  });
  test("uses multiple garment references and preserves the original as the clothes source", async () => {
    const calls: Array<{ url: string; body: any; authorization: string | null }> = [];
    const client = new YouCam("test-key", (async (url, init) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
        authorization: new Headers(init?.headers).get("Authorization"),
      });
      return Response.json({ status: 200, data: { task_id: "task-1" } });
    }) as typeof fetch);
    await client.prepare("style-id", "fabric-id");
    await client.tryOn("original-person-id", "prepared-garment-id", "full_body");
    expect(calls[0].url.endsWith(PREPARE)).toBe(true);
    expect(calls[0].body.src_file_ids).toEqual(["style-id", "fabric-id"]);
    expect(calls[0].body.prompt_extend).toBe(false);
    expect(calls[1].body.src_file_id).toBe("original-person-id");
    expect(calls[1].body.change_shoes).toBe(false);
    expect(calls[1].body.filter_multi_person).toBe("strict");
    expect(calls[0].authorization).toBe("Bearer test-key");
  });
  test("rejects arbitrary image destinations and invalid image headers", () => {
    expect(() => assertProviderURL("http://127.0.0.1/internal")).toThrow();
    expect(() => assertProviderURL("https://amazonaws.com.evil.example/image")).toThrow();
    expect(() => imageInfo(new Uint8Array(30))).toThrow();
    expect(() => validateStudio({})).toThrow();
  });
});
