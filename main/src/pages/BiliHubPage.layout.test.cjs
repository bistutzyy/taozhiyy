const assert = require("node:assert/strict");
const { mkdir } = require("node:fs/promises");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { chromium } = require("playwright");

const baseUrl = process.env.BILI_LAYOUT_URL || "http://127.0.0.1:5203";
const screenshotDir = process.env.BILI_LAYOUT_SCREENSHOTS;
const titles = [
  "\u846c\u9001\u7684\u8299\u8389\u83b2",
  "\u5173\u4e8e\u6211\u8f6c\u751f\u53d8\u6210\u53f2\u83b1\u59c6\u8fd9\u6863\u4e8b\u7b2c\u4e09\u5b63",
  "AnExtremelyLongUnbrokenBangumiTitleForOverflowCoverage",
  "\u67d0\u79d1\u5b66\u7684\u8d85\u7535\u78c1\u70ae",
  "Short",
  "A Certain Scientific Railgun",
];
const items = titles.map((title, index) => ({
  id: `layout-${index}`,
  title,
  watched: index,
  total: index === 2 ? 123456789 : 24,
  latestEpisode: index === 2 ? 123456789 : 12,
  coverUrl: null,
  linkUrl: index % 2 ? "https://www.bilibili.com/bangumi/" : null,
}));

let browser;
before(async () => {
  browser = await chromium.launch({ channel: "msedge", headless: true });
  if (screenshotDir) await mkdir(screenshotDir, { recursive: true });
});
after(async () => browser?.close());

async function capture(page, name) {
  if (!screenshotDir) return;
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: path.join(screenshotDir, name), fullPage: true });
}

async function openPage(width) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) => {
    const request = route.request();
    if (!["GET", "HEAD"].includes(request.method())) return route.abort();
    const { pathname } = new URL(request.url());
    if (pathname.startsWith("/api/")) {
      return route.fulfill({
        json: pathname === "/api/v1/bangumi/list" ? items : {},
      });
    }
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/bili`, { waitUntil: "networkidle" });
  await page.locator(".bangumi-mini-card").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

function readLayout(page) {
  return page.locator(".bangumi-mini-grid").evaluate((grid) => {
    const rect = (element) => {
      const { x, y, width, height, bottom, right } = element.getBoundingClientRect();
      return { x, y, width, height, bottom, right };
    };
    return {
      viewport: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      grid: rect(grid),
      cards: [...grid.querySelectorAll(".bangumi-mini-card")]
        .filter((card) => card.getBoundingClientRect().width > 0)
        .map((card) => ({
          ...rect(card),
          poster: rect(card.firstElementChild),
          button: rect(card.querySelector("a, button")),
          text: [...card.querySelectorAll("h3, p, a, button")].map((element) => ({
            ...rect(element),
            text: element.textContent,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
          })),
        })),
    };
  });
}

function assertMobileLayout(layout, count) {
  assert.equal(layout.columns, 2, `${layout.viewport}px must have two columns`);
  assert.equal(layout.cards.length, count);
  assert.ok(layout.pageWidth <= layout.viewport, "page must not scroll horizontally");
  for (const card of layout.cards) {
    assert.ok(card.x >= layout.grid.x - 1 && card.right <= layout.grid.right + 1);
    assert.ok(Math.abs(card.poster.width / card.poster.height - 3 / 4) < 0.01,
      "poster keeps its original 3:4 aspect ratio");
    assert.ok(card.button.bottom <= card.bottom - 5, "button stays inside the card");
    for (const text of card.text) {
      assert.ok(text.scrollWidth <= text.clientWidth + 1, `${text.text} overflows horizontally`);
      assert.ok(text.x >= card.x && text.right <= card.right, "text stays inside the card");
    }
  }
  for (let index = 0; index + 1 < count; index += 2) {
    const [left, right] = layout.cards.slice(index, index + 2);
    assert.ok(Math.abs(left.y - right.y) < 1, "cards share the same row");
    assert.ok(Math.abs(left.width - right.width) < 1, "cards keep equal widths");
    assert.ok(Math.abs(left.button.bottom - right.button.bottom) < 1,
      "Let's watch buttons align across each row");
    if (index + 2 < count) {
      assert.ok(layout.cards[index + 2].y >= Math.max(left.bottom, right.bottom) + 5,
        "expanded cards must not overlap the next row");
    }
  }
}

for (const width of [320, 390, 430]) {
  test(`${width}px: two proportional columns, contained text, aligned watch buttons`, async () => {
    const { context, page } = await openPage(width);
    try {
      const collapsed = await readLayout(page);
      await capture(page, `bili-${width}-collapsed.png`);
      assertMobileLayout(collapsed, 3);
      const toggle = page.locator(".bili-hub-page button[aria-expanded]");
      await toggle.click();
      await page.waitForFunction(() => [...document.querySelectorAll(".bangumi-mini-card")]
        .filter((card) => card.getBoundingClientRect().width > 0).length === 6);
      await page.locator(".bangumi-mini-grid").evaluate(async (grid) => {
        await Promise.all(grid.getAnimations({ subtree: true }).map((animation) => animation.finished));
      });
      assertMobileLayout(await readLayout(page), 6);
      await capture(page, `bili-${width}-expanded.png`);
      await toggle.click();
      await page.waitForFunction(() => [...document.querySelectorAll(".bangumi-mini-card")]
        .filter((card) => card.getBoundingClientRect().width > 0).length === 3);
      assertMobileLayout(await readLayout(page), 3);
    } finally {
      await context.close();
    }
  });
}

for (const width of [768, 1024, 1440]) {
  test(`${width}px: desktop geometry is unchanged by the mobile stylesheet`, async () => {
    const { context, page } = await openPage(width);
    try {
      const before = await readLayout(page);
      assert.equal(before.cards.length, items.length);
      assert.ok(before.cards.every((card) => card.width >= 150 && card.width <= 180));
      await capture(page, `bili-${width}-desktop.png`);
      await page.evaluate(() => {
        for (const style of document.querySelectorAll("style[data-vite-dev-id]")) {
          if (style.dataset.viteDevId.endsWith("/bili-mobile.css")) style.sheet.disabled = true;
        }
      });
      assert.deepEqual(await readLayout(page), before);
    } finally {
      await context.close();
    }
  });
}
