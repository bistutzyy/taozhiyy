import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readSource = (path) => readFileSync(resolve(sourceRoot, path), "utf8");

test("temporarily disables homepage guestbook submissions in the UI", () => {
  const source = readSource("pages/GuestbookPage.jsx");

  assert.match(source, /GUESTBOOK_SUBMISSIONS_DISABLED\s*=\s*true/);
  assert.match(source, /留言区暂时维护中，已暂停提交/);
  assert.match(source, /disabled=\{GUESTBOOK_SUBMISSIONS_DISABLED\s*\|\|\s*submitting\}/);
});
