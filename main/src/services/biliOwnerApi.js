import { apiUrl } from "../lib/apiBase.js";
import { biliOwner } from "../data/biliOwnerVideos.js";
import { getBiliVideoHref } from "../components/biliVideoModel.js";

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
