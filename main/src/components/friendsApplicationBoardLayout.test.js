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

test("loads every friends comment instead of five-item pages", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /FRIENDS_COMMENT_FETCH_SIZE\s*=\s*50/);
  assert.match(source, /fetchGuestbookMessages\(\s*page,\s*FRIENDS_COMMENT_FETCH_SIZE/);
  assert.match(source, /collected\.length\s*>=\s*total/);
  assert.doesNotMatch(source, /FRIENDS_COMMENT_PAGE_SIZE\s*=\s*5/);
  assert.doesNotMatch(source, /加载更多/);
});

test("shows two comments per column, then the final remainder left to right", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /FRIENDS_COMMENT_COLUMNS\s*=\s*3/);
  assert.match(source, /FRIENDS_COMMENT_ROWS\s*=\s*2/);
  assert.match(source, /requested\s*>\s*equalCount/);
  assert.match(source, /steps\s*>\s*1/);
  assert.match(source, /friends-comments-even/);
  assert.match(source, /w-\[96\.625rem\]/);
  assert.match(source, /grid-cols-3 items-stretch gap-5/);
  assert.match(source, /"flex h-full"/);
  assert.match(source, />\s*显示更多\s*</);
  assert.doesNotMatch(source, /column-count:3/);
  assert.doesNotMatch(source, /FRIENDS_COMMENT_PAGE_SIZE\s*=\s*5/);
});

test("mixes friend comment cards across a palette that does not repeat every column", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /FRIEND_COMMENT_TONES/);
  assert.match(source, /index % FRIEND_COMMENT_TONES\.length/);
  assert.match(source, /border-\[#FFE066\]/);
  assert.match(source, /border-\[#A5D8FF\]/);
  assert.match(source, /border-\[#FFC9C9\]/);
  assert.match(source, /border-\[#B2F2BB\]/);
  assert.match(source, /border-\[#D0BFFF\]/);
  assert.match(source, /FRIEND_COMMENT_TONES\.length % FRIENDS_COMMENT_COLUMNS !== 0/);
  assert.doesNotMatch(source, /tone === "guest"/);
  assert.doesNotMatch(source, /tone === "login"/);
  assert.doesNotMatch(source, /tone === "admin"/);
});
