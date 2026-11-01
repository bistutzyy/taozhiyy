import test from "node:test";
import assert from "node:assert/strict";

const model = () => import("./biliVideoModel.js");

test("video links and embeds accept only BV ids and stay on official Bilibili hosts", async () => {
  const { getBiliVideoHref, getBiliEmbedSrc } = await model();
  const bvid = "BV1jK7W6MEAj";
  assert.equal(
    getBiliVideoHref(bvid),
    `https://www.bilibili.com/video/${bvid}/`,
  );
  const embed = new URL(getBiliEmbedSrc(bvid));
  assert.equal(embed.origin, "https://player.bilibili.com");
  assert.equal(embed.pathname, "/player.html");
  assert.equal(embed.searchParams.get("bvid"), bvid);
  assert.equal(embed.searchParams.get("autoplay"), "0");
  for (const invalid of [
    "",
    null,
    undefined,
    "javascript:alert(1)",
    `${bvid}&autoplay=1`,
    "BVbad",
    123,
    ` ${bvid}`,
  ]) {
    assert.equal(getBiliVideoHref(invalid), null);
    assert.equal(getBiliEmbedSrc(invalid), null);
  }
});

test("video shelves adapt to one, two or many real entries without empty slots", async () => {
  const { getVideoGridVariant } = await model();
  assert.equal(getVideoGridVariant(0), "empty");
  assert.equal(getVideoGridVariant(1), "single");
  assert.equal(getVideoGridVariant(2), "pair");
  assert.equal(getVideoGridVariant(7), "collection");
});

test("publication dates use the site's Shanghai timezone and reject invalid dates", async () => {
  const { formatVideoDate } = await model();
  assert.equal(formatVideoDate("2026-06-27T16:30:00Z"), "2026.06.28");
  assert.equal(formatVideoDate("not a date"), "");
  assert.equal(formatVideoDate(null), "");
});

test("the preview includes the actual public video for the confirmed owner", async () => {
  const { biliOwner, ownerVideos } = await import("../data/biliOwnerVideos.js");
  assert.equal(biliOwner.uid, "1061280173");
  assert.equal(ownerVideos.length, 1);
  assert.equal(ownerVideos[0].bvid, "BV1jK7W6MEAj");
  assert.match(
    ownerVideos[0].cover,
    /^https:\/\/i0\.hdslb\.com\/bfs\/archive\//,
  );
  assert.equal(ownerVideos[0].duration, "04:36");
});
