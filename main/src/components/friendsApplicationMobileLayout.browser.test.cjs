const assert = require("node:assert/strict");
const { mkdir } = require("node:fs/promises");
const path = require("node:path");
const { before, after, test } = require("node:test");
const { chromium } = require("playwright");

const baseURL = process.env.FRIENDS_QA_URL || "http://127.0.0.1:5203";
const output = path.resolve(__dirname, "../../../.qa/friends-comments");
const phase = process.env.FRIENDS_QA_PHASE || "after";
const replyLabel = "\u56de\u590d\u8fd9\u6761\u7559\u8a00";
const emojiLabel = "\u6dfb\u52a0\u8868\u60c5";
const moreLabel = "\u663e\u793a\u66f4\u591a";
let browser;

function message(id, parentId = 0, overrides = {}) {
  return {
    id, parentId, nickname: `Friend${id}`, content: `Message ${id}`,
    createdAt: "2026-10-31T12:30:00Z", ipRegion: "Shanghai",
    isLoginUser: true, replies: [], replyCount: 0, ...overrides,
  };
}

function fixtures() {
  let nested = [];
  for (let depth = 8; depth >= 1; depth -= 1) {
    nested = [message(100 + depth, depth === 1 ? 1 : 99 + depth, {
      nickname: depth % 2 ? "LongReplyNickname".repeat(3) : "\u53cb\u94fe\u4f19\u4f34",
      content: `Reply depth ${depth}\nhttps://example.test/${"nested".repeat(22)}`,
      replies: nested, replyCount: 8 - depth,
    })];
  }
  return Array.from({ length: 7 }, (_, index) => message(index + 1, 0,
    index === 0 ? {
      nickname: "LongFriendNickname".repeat(3),
      content: `\u7ad9\u70b9\u94fe\u63a5\uff1ahttps://example.test/${"long-url".repeat(26)}\n\u51ac\u5929\u4e5f\u8981\u5e38\u6765\u4e32\u95e8\u3002`,
      replies: nested, replyCount: 8,
    } : {}));
}

async function openPage(width, loggedIn = true) {
  const context = await browser.newContext({ viewport: { width, height: 1100 } });
  const page = await context.newPage();
  const writes = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // All API requests, including writes, terminate here and never reach a server.
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let data = {};
    if (url.pathname === "/api/auth/me") {
      data = { loggedIn, user: loggedIn ? { id: 42, displayName: "Layout Tester", email: "test@example.test" } : null };
    } else if (url.pathname === "/api/guestbook/messages") {
      if (request.method() === "GET") {
        data = { items: fixtures(), total: 7 };
      } else {
        const body = request.postDataJSON();
        writes.push(body);
        data = { item: message(1000 + writes.length, body.parentId || 0, body) };
      }
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
  context.setDefaultTimeout(15000);
  await page.goto(`${baseURL}/friends`, { waitUntil: "domcontentloaded" });
  await page.locator(".friends-comment-thread").first().waitFor();
  return { page, context, writes, errors };
}

async function capture(page, name, locator) {
  if (locator) {
    await locator.evaluate((element) => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 104));
  }
  await page.screenshot({ path: path.join(output, `${phase}-${name}.png`), animations: "disabled" });
}

before(async () => {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ channel: "msedge", headless: true });
});
after(async () => { await browser?.close(); });

for (const width of [320, 390, 430]) {
  test(`${width}px: full-width cards, compact avatars and readable deep replies`, async () => {
    const { page, context, errors } = await openPage(width);
    try {
      const firstThread = page.locator(".friends-comment-thread").first();
      await capture(page, `layout-${width}`, firstThread);
      await capture(page, `normal-${width}`, page.locator(".friends-comment-thread").nth(1));
      const violations = await page.locator("#friends-guestbook").evaluate((board) => {
        const issues = [];
        const bounds = board.getBoundingClientRect();
        const cards = [...board.querySelectorAll(".friends-comment-card")];
        for (const card of cards) {
          const rect = card.getBoundingClientRect();
          if (Math.abs(rect.left - bounds.left) > 2 || Math.abs(rect.right - bounds.right) > 2) issues.push("top-level card is not full width");
        }
        for (const avatar of board.querySelectorAll(".friends-comment-avatar")) {
          if (avatar.getBoundingClientRect().width > (avatar.classList.contains("friends-comment-avatar--reply") ? 32 : 36)) issues.push("avatar too large");
        }
        for (const element of board.querySelectorAll(".friends-comment-card, .friends-comment-reply-card, .friends-comment-card p, .friends-comment-card span")) {
          const rect = element.getBoundingClientRect();
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) issues.push(`outside board: ${element.className}`);
          if (element.scrollWidth > element.clientWidth + 2 && getComputedStyle(element).display !== "inline") issues.push(`text overflow: ${element.className}`);
        }
        for (const reply of board.querySelectorAll(".friends-comment-reply-card")) {
          if (reply.getBoundingClientRect().width < bounds.width * 0.75) issues.push("deep reply card too narrow");
        }
        const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        for (const header of board.querySelectorAll(".friends-comment-header")) {
          const meta = header.querySelector(".friends-comment-meta");
          const actions = header.querySelector(".friends-comment-actions");
          if (overlaps(meta.getBoundingClientRect(), actions.getBoundingClientRect())) issues.push("metadata overlaps actions");
          const labels = [...meta.children];
          for (let index = 0; index < labels.length; index += 1) {
            for (const other of labels.slice(index + 1)) {
              if (overlaps(labels[index].getBoundingClientRect(), other.getBoundingClientRect())) issues.push("name, time or role overlap");
            }
          }
        }
        const replies = [...board.querySelectorAll(".friends-comment-reply")];
        if (Math.max(...replies.map((reply) => parseFloat(getComputedStyle(reply).marginLeft))) > 12) issues.push("reply indentation is not capped");
        return [...new Set(issues)];
      });
      assert.deepEqual(violations, []);
      assert.deepEqual(errors, []);
      assert.equal(await page.locator(".friends-comment-thread").count(), 6);
      await page.getByRole("button", { name: moreLabel, exact: true }).click();
      assert.equal(await page.locator(".friends-comment-thread").count(), 7);
      await firstThread.getByRole("button", { name: "\u6536\u8d77", exact: true }).click();
      assert.equal(await firstThread.locator(".friends-comment-reply").count(), 0);
      await firstThread.getByRole("button", { name: "\u56de\u590d 8", exact: true }).click();
      assert.equal(await firstThread.locator(".friends-comment-reply").count(), 8);
    } finally { await context.close(); }
  });

  test(`${width}px: emoji panels stay in bounds and above sibling comments; replies still submit`, async () => {
    const { page, context, writes, errors } = await openPage(width);
    try {
      const root = page.locator(".friends-comment-thread").first();
      const nested = root.locator(".friends-comment-reply").last();
      for (const [target, label] of [[page.locator("#friends-guestbook > form"), "form"], [root, "root"], [nested, "nested"]]) {
        if (label !== "form") {
          await target.getByRole("button", { name: replyLabel, exact: true }).first().click();
        }
        const picker = target.getByRole("button", { name: emojiLabel, exact: true }).first();
        await picker.click();
        const panelId = await picker.getAttribute("aria-controls");
        const panel = page.locator(`[id="${panelId}"]`);
        await capture(page, `emoji-${width}-${label}`, picker);
        const problems = await panel.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const issues = [];
          if (rect.left < 0 || rect.right > window.innerWidth) issues.push("emoji panel outside viewport");
          if (element.scrollWidth > element.clientWidth + 2) issues.push("emoji grid overflows panel");
          for (const button of element.querySelectorAll("button")) {
            const bounds = button.getBoundingClientRect();
            const x = bounds.left + bounds.width / 2;
            const y = bounds.top + bounds.height / 2;
            if (x > 0 && x < innerWidth && y > 0 && y < innerHeight && !button.contains(document.elementFromPoint(x, y))) issues.push("emoji obscured by another element");
          }
          return [...new Set(issues)];
        });
        assert.deepEqual(problems, []);
        await panel.getByRole("button").first().click();
        await picker.click();
      }
      const draft = nested.locator("textarea");
      assert.notEqual(await draft.inputValue(), "");
      await draft.fill("Mock-only nested reply");
      await nested.getByRole("button", { name: "\u63d0\u4ea4\u56de\u590d", exact: true }).click();
      await page.getByText("Mock-only nested reply", { exact: true }).waitFor();
      assert.deepEqual(writes, [{ parentId: 108, content: "Mock-only nested reply", channel: "friends" }]);
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  });
}

test("desktop keeps its two-column winter timeline", async () => {
  const { page, context, errors } = await openPage(1440);
  try {
    const root = page.locator(".friends-comment-thread").first();
    const avatar = await root.locator(".friends-comment-avatar").first().boundingBox();
    const card = await root.locator(".friends-comment-card").boundingBox();
    assert.ok(avatar.width > 40);
    assert.ok(card.x > avatar.x + avatar.width);
    assert.ok(await page.locator(".seasonal-page--winter").count());
    await capture(page, "desktop-1440", root);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }
});

test("guest reply login gate and comment submission stay intact", async () => {
  const { page, context, writes } = await openPage(390, false);
  try {
    const root = page.locator(".friends-comment-thread").first();
    await root.getByRole("button", { name: replyLabel, exact: true }).first().click();
    assert.equal(await root.getByRole("link", { name: "\u53bb\u767b\u5f55", exact: true }).getAttribute("href"), "/login");
    const form = page.locator("#friends-guestbook > form");
    await form.getByPlaceholder("\u600e\u4e48\u79f0\u547c\u4f60").fill("LayoutGuest");
    await form.getByPlaceholder("you@example.com").fill("layout@example.test");
    await form.locator("textarea").fill("Mock-only guest comment");
    await form.getByRole("button", { name: "\u8bc4\u8bba", exact: true }).click();
    await page.getByText("Mock-only guest comment", { exact: true }).waitFor();
    assert.equal(writes.length, 1);
    assert.equal(writes[0].channel, "friends");
    assert.equal(writes[0].content, "Mock-only guest comment");
  } finally { await context.close(); }
});
