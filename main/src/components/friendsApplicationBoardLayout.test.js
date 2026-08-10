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
