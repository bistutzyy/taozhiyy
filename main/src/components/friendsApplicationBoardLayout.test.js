import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (path) => readFileSync(resolve(sourceRoot, path), "utf8");

test("raises the active friends reply thread above following cards for emoji panels", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /activeReplyInThread/);
  assert.match(source, /activeReplyInThread\s*\?\s*"relative z-40"/);
  assert.match(source, /isReplyingToReply\s*&&\s*"relative z-30"/);
});

test("loads friends comments in five-item pages with a load more action", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /FRIENDS_COMMENT_PAGE_SIZE\s*=\s*5/);
  assert.match(source, /fetchGuestbookMessages\(\s*1,\s*FRIENDS_COMMENT_PAGE_SIZE/);
  assert.match(
    source,
    /fetchGuestbookMessages\(\s*nextPage,\s*FRIENDS_COMMENT_PAGE_SIZE/,
  );
  assert.match(source, /entries\.length\s*<\s*commentTotal/);
  assert.match(source, /existingIds\.has\(item\.id\)/);
  assert.match(source, />\s*\{loadingMore\s*\?\s*"加载中\.\.\."\s*:\s*"加载更多"\}\s*</);
});

test("renders friends comments as a three-column waterfall at the current card width", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /friends-comments-waterfall/);
  assert.match(source, /w-\[96\.625rem\]/);
  assert.match(source, /\[column-count:3\]/);
  assert.match(source, /\[column-gap:1\.25rem\]/);
  assert.match(source, /break-inside-avoid/);
  assert.doesNotMatch(source, /friends-comments-balanced/);
  assert.doesNotMatch(source, /md:grid-cols-2/);
  assert.doesNotMatch(source, /mt-8 space-y-5/);
});
