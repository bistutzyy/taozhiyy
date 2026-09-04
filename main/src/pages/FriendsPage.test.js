import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./FriendsPage.jsx", import.meta.url), "utf8");

test("friend avatars avoid hotlink referers and fall back to the site avatar", () => {
  assert.match(source, /referrerPolicy="no-referrer"/);
  assert.match(source, /onError=\{handleFriendAvatarError\}/);
  assert.match(source, /currentTarget\.dataset\.fallbackAvatar = "true"/);
  assert.match(source, /currentTarget\.src = siteAvatarUrl/);
});
