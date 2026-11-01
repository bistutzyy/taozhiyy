import test from "node:test";
import assert from "node:assert/strict";

const service = () => import("./biliOwnerApi.js");
const video = (overrides = {}) => ({
  bvid: "BV1jK7W6MEAj",
  title: "A real upload",
  description: "Description",
  cover: "/api/v1/acg/image/owner_BV1jK7W6MEAj_1234.jpg",
  duration: "04:36",
  publishedAt: "2026-06-27T16:04:10Z",
  ...overrides,
});
const feed = (overrides = {}) => ({
  owner: {
    uid: "1061280173",
    name: "Taozhiyo",
    profileUrl: "https://space.bilibili.com/1061280173/",
  },
  items: [video()],
  ready: true,
  syncedAt: "2026-11-01T00:00:00Z",
  ...overrides,
});

test("reads only the site's cached owner endpoint and forwards cancellation", async () => {
  const { getBiliOwnerFeed } = await service();
  const controller = new AbortController();
  let request;
  const result = await getBiliOwnerFeed({
    signal: controller.signal,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return Response.json(feed());
    },
  });
  assert.equal(request.url, "/api/v1/bili/videos");
  assert.equal(request.options.signal, controller.signal);
  assert.equal(request.options.cache, "no-cache");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].cover, video().cover);
  assert.equal(
    result.owner.profileUrl,
    "https://space.bilibili.com/1061280173/",
  );
});

test("distinguishes pending synchronization from a successfully empty list", async () => {
  const { normalizeBiliOwnerFeed } = await service();
  assert.equal(
    normalizeBiliOwnerFeed(feed({ ready: false, syncedAt: "", items: [] }))
      .ready,
    false,
  );
  assert.deepEqual(normalizeBiliOwnerFeed(feed({ items: [] })).items, []);
  assert.equal(normalizeBiliOwnerFeed(feed({ items: [] })).ready, true);
});

test("accepts only sanitized synchronization diagnostics and ignores raw upstream details", async () => {
  const { normalizeBiliOwnerFeed, getBiliSyncNotice } = await service();
  assert.equal(typeof getBiliSyncNotice, "function");
  const sync = {
    state: "error",
    reason: "upstream_rejected",
    attemptedAt: "2026-11-01T11:00:00Z",
    upstreamCode: 412,
    message: "private raw response",
  };
  const pending = normalizeBiliOwnerFeed(
    feed({ ready: false, items: [], syncedAt: "", sync }),
  );
  assert.deepEqual(pending.sync, {
    state: sync.state,
    reason: sync.reason,
    attemptedAt: sync.attemptedAt,
    upstreamCode: 412,
  });
  assert.equal(
    getBiliSyncNotice(pending),
    "B站投稿接口暂不可用，暂用已收录视频",
  );
  assert.equal(
    getBiliSyncNotice({ ready: true, sync: pending.sync }),
    "B站投稿接口暂不可用，暂用上次同步视频",
  );
  assert.equal(getBiliSyncNotice({ ready: true }), "");
  assert.equal(getBiliSyncNotice({ ready: false }), "等待首次同步");
  assert.equal(
    getBiliSyncNotice({ ready: false, sync: { state: "syncing" } }),
    "正在同步投稿，暂用已收录视频",
  );
  for (const invalid of [
    { ...sync, reason: "raw-secret" },
    { ...sync, state: "unknown" },
    { ...sync, attemptedAt: "invalid" },
  ]) {
    assert.equal(normalizeBiliOwnerFeed(feed({ sync: invalid })).sync, null);
  }
});

test("rejects malformed, wrong-owner and incomplete feed data instead of clearing a good list", async () => {
  const { normalizeBiliOwnerFeed } = await service();
  for (const value of [
    null,
    {},
    feed({ items: null }),
    feed({ owner: { uid: "999" } }),
    feed({ syncedAt: "" }),
    feed({ items: [video(), video()] }),
    feed({ items: [video({ bvid: "javascript:alert(1)" })] }),
    feed({ items: [video({ title: null })] }),
  ]) {
    assert.throws(() => normalizeBiliOwnerFeed(value));
  }
});

test("allows only safe local cover routes or HTTPS Bilibili CDN covers", async () => {
  const { normalizeBiliOwnerFeed } = await service();
  const remote = "https://i0.hdslb.com/bfs/archive/cover.jpg";
  assert.equal(
    normalizeBiliOwnerFeed(feed({ items: [video({ cover: remote })] })).items[0]
      .cover,
    remote,
  );
  assert.equal(
    normalizeBiliOwnerFeed(feed({ items: [video({ cover: "" })] })).items[0]
      .cover,
    "",
  );
  for (const cover of [
    "javascript:alert(1)",
    "https://evil.test/cover.jpg",
    "//evil.test/cover.jpg",
    "/api/v1/acg/image/../secret",
    "https://i0.hdslb.com@evil.test/cover.jpg",
    "http://i0.hdslb.com/cover.jpg",
  ]) {
    assert.throws(() =>
      normalizeBiliOwnerFeed(feed({ items: [video({ cover })] })),
    );
  }
});

test("network, HTTP and non-JSON failures remain errors for the caller's fallback handling", async () => {
  const { getBiliOwnerFeed } = await service();
  for (const fetchImpl of [
    async () => {
      throw new Error("offline");
    },
    async () => new Response("unavailable", { status: 503 }),
    async () =>
      new Response("<html>", { headers: { "Content-Type": "text/html" } }),
  ]) {
    await assert.rejects(() => getBiliOwnerFeed({ fetchImpl }));
  }
});
