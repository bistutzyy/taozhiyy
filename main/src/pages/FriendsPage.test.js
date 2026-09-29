import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./FriendsPage.jsx", import.meta.url), "utf8");

test("friend avatars avoid hotlink referers and fall back to a unified placeholder", () => {
  assert.match(source, /referrerPolicy="no-referrer"/);
  assert.match(source, /onError=\{\(\) => handleFriendAvatarError\(friend\.name\)\}/);
  assert.match(source, /failedFriendAvatars\.has\(friend\.name\)/);
  assert.match(source, /aria-label=\{`\$\{friend\.name\} 默认头像`\}/);
  assert.match(source, /friendAvatarInitial\(friend\.name\)/);
  assert.doesNotMatch(source, /data:image\/svg\+xml,/);
  assert.doesNotMatch(source, /currentTarget\.src = friendAvatarPlaceholder/);
  assert.doesNotMatch(source, /currentTarget\.src = siteAvatarUrl/);
});
