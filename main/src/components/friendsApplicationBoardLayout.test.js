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
  assert.match(source, /activeReplyInThread\s*&&\s*"friends-comment-thread--active"/);
  assert.match(source, /isReplyingToReply\s*&&\s*"friends-comment-reply--active"/);
});

test("loads every friends comment instead of five-item pages", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");

  assert.match(source, /FRIENDS_COMMENT_FETCH_SIZE\s*=\s*50/);
  assert.match(source, /fetchGuestbookMessages\(\s*page,\s*FRIENDS_COMMENT_FETCH_SIZE/);
  assert.match(source, /collected\.length\s*>=\s*total/);
  assert.doesNotMatch(source, /FRIENDS_COMMENT_PAGE_SIZE\s*=\s*5/);
  assert.doesNotMatch(source, /加载更多/);
});

test("shows friend comments as a single glass timeline", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");
  const cssSource = readSource("index.css");

  assert.match(source, /FRIENDS_COMMENT_PAGE\s*=\s*6/);
  assert.match(source, /friends-comments-timeline/);
  assert.match(source, /friends-comment-thread/);
  assert.match(source, /friends-comment-avatar/);
  assert.match(source, /friends-comment-card/);
  assert.match(source, /friends-comment-replies/);
  assert.match(source, /friends-comment-reply-card/);
  assert.match(source, />\s*显示更多\s*</);
  assert.match(cssSource, /\.friends-comments-timeline/);
  assert.match(cssSource, /\.friends-comment-thread/);
  assert.match(cssSource, /\.friends-comment-avatar/);
  assert.match(cssSource, /\.friends-comment-card/);
  assert.match(cssSource, /\.friends-comment-replies/);
  assert.match(cssSource, /\.friends-comment-reply-card/);
  assert.doesNotMatch(source, /column-count:3/);
  assert.doesNotMatch(source, /grid-cols-3 items-stretch gap-5/);
  assert.doesNotMatch(source, /w-\[96\.625rem\]/);
});

test("themes the friend comment boxes for winter without copying the link panel", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");
  const cssSource = readSource("index.css");

  assert.match(source, /friends-comment-form-panel/);
  assert.match(source, /friends-comment-form-note/);
  assert.match(cssSource, /\.friends-comment-form-panel/);
  assert.match(cssSource, /\.friends-comment-form-note/);
  assert.match(cssSource, /\.friends-comment-card\s*\{[\s\S]*?--friend-comment-paper/);
  assert.match(cssSource, /\.friends-comment-card\s*\{[\s\S]*?--friend-comment-ice/);
  assert.match(cssSource, /\.friends-comment-card::after/);
  assert.match(cssSource, /\.friends-comment-reply-card\s*\{[\s\S]*?--friend-comment-paper/);
  assert.doesNotMatch(
    cssSource,
    /\.friends-comment-card\s*\{[\s\S]*?friends-winter-link-panel/,
  );
});

test("mixes friend comment cards across a palette that does not repeat every column", () => {
  const source = readSource("components/FriendsApplicationBoard.jsx");
  const cssSource = readSource("index.css");

  assert.match(source, /FRIEND_COMMENT_TONES/);
  assert.match(source, /index % FRIEND_COMMENT_TONES\.length/);
  assert.match(source, /friends-comment-card--blue/);
  assert.match(source, /friends-comment-card--violet/);
  assert.match(source, /friends-comment-card--mint/);
  assert.match(source, /friends-comment-card--rose/);
  assert.match(source, /friends-comment-card--gold/);
  assert.match(cssSource, /\.friends-comment-card--blue/);
  assert.match(cssSource, /\.friends-comment-card--violet/);
  assert.match(cssSource, /\.friends-comment-card--mint/);
  assert.match(cssSource, /\.friends-comment-card--rose/);
  assert.match(cssSource, /\.friends-comment-card--gold/);
  assert.doesNotMatch(source, /tone === "guest"/);
  assert.doesNotMatch(source, /tone === "login"/);
  assert.doesNotMatch(source, /tone === "admin"/);
});
