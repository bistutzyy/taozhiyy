const isBvid = (value) =>
  typeof value === "string" && /^BV[0-9A-Za-z]{10}$/.test(value);

export function getBiliVideoHref(bvid) {
  return isBvid(bvid) ? `https://www.bilibili.com/video/${bvid}/` : null;
}

export function getBiliEmbedSrc(bvid) {
  if (!isBvid(bvid)) return null;
  const params = new URLSearchParams({
    bvid,
    autoplay: "0",
    poster: "1",
    danmaku: "1",
  });
  return `https://player.bilibili.com/player.html?${params}`;
}

export function getVideoGridVariant(count) {
  if (count < 1) return "empty";
  if (count === 1) return "single";
  if (count === 2) return "pair";
  return "collection";
}

export function formatVideoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("/", ".");
}
