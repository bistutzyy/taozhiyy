import { apiUrl } from "../lib/apiBase.js";
import { biliOwner } from "../data/biliOwnerVideos.js";
import { getBiliVideoHref } from "../components/biliVideoModel.js";

function normalizeSyncStatus(value) {
  if (!value || !["pending", "syncing", "ok", "error"].includes(value.state))
    return null;
  if (
    ![
      "",
      "upstream_rejected",
      "network_error",
      "invalid_response",
      "cache_error",
    ].includes(value.reason ?? "")
  )
    return null;
  if (
    typeof value.attemptedAt !== "string" ||
    (value.attemptedAt && !Number.isFinite(Date.parse(value.attemptedAt)))
  )
    return null;
  return {
    state: value.state,
    reason: value.reason || "",
    attemptedAt: value.attemptedAt,
    ...(Number.isSafeInteger(value.upstreamCode)
      ? { upstreamCode: value.upstreamCode }
      : {}),
  };
}

export function getBiliSyncNotice(feed) {
  if (feed.sync?.state === "error") {
    const reason =
      {
        upstream_rejected: "B站投稿接口暂不可用",
        network_error: "投稿同步网络暂不可用",
        invalid_response: "投稿数据校验未通过",
        cache_error: "投稿缓存暂不可用",
      }[feed.sync.reason] || "投稿同步暂未完成";
    return `${reason}，暂用${feed.ready ? "上次同步" : "已收录"}视频`;
  }
  if (feed.ready) return "";
  return feed.sync?.state === "syncing"
    ? "正在同步投稿，暂用已收录视频"
    : "等待首次同步";
}

function normalizeCover(value) {
  if (!value) return "";
  if (typeof value !== "string") throw new Error("Invalid video cover");
  if (
    /^\/api\/v1\/acg\/image\/[A-Za-z0-9_.-]+$/.test(value) &&
    !value.includes("..")
  )
    return apiUrl(value);
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname.endsWith(".hdslb.com")
  )
    throw new Error("Invalid video cover host");
  return url.href;
}

export function normalizeBiliOwnerFeed(data) {
  if (
    !data ||
    String(data.owner?.uid) !== biliOwner.uid ||
    !Array.isArray(data.items) ||
    typeof data.ready !== "boolean"
  )
    throw new Error("Invalid owner video feed");
  if (
    data.ready &&
    (!data.syncedAt || !Number.isFinite(Date.parse(data.syncedAt)))
  )
    throw new Error("Invalid synchronization timestamp");
  if (!data.ready && data.items.length)
    throw new Error("Incomplete owner video feed");
  const seen = new Set();
  const items = data.items.map((item) => {
    if (
      !item ||
      !getBiliVideoHref(item.bvid) ||
      seen.has(item.bvid) ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      !Number.isFinite(Date.parse(item.publishedAt))
    )
      throw new Error("Invalid owner video");
    seen.add(item.bvid);
    return {
      bvid: item.bvid,
      title: item.title.trim(),
      description: typeof item.description === "string" ? item.description : "",
      cover: normalizeCover(item.cover),
      publishedAt: new Date(item.publishedAt).toISOString(),
      duration: typeof item.duration === "string" ? item.duration : "",
    };
  });
  return {
    owner: {
      uid: biliOwner.uid,
      name:
        typeof data.owner.name === "string" && data.owner.name.trim()
          ? data.owner.name.trim()
          : biliOwner.name,
      profileUrl: biliOwner.profileUrl,
    },
    items,
    ready: data.ready,
    syncedAt: data.ready ? data.syncedAt : "",
    sync: normalizeSyncStatus(data.sync),
  };
}

export async function getBiliOwnerFeed({ signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(apiUrl("/api/v1/bili/videos"), {
    signal,
    cache: "no-cache",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Expected JSON owner video feed");
  return normalizeBiliOwnerFeed(await response.json());
}
