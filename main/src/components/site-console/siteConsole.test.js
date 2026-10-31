import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => {
  const url = new URL(path, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
};

test("public console provides three existing fragment destinations", async () => {
  assert.ok(read("./consoleContent.js"), "console content must exist");
  const { CONSOLE_FRAGMENTS } = await import("./consoleContent.js");
  assert.deepEqual(
    CONSOLE_FRAGMENTS.map(({ id, href }) => [id, href]),
    [
      ["01", "/projects/"],
      ["02", "https://bistutzyy.github.io/"],
      ["03", "/build/"],
    ],
  );
  assert.ok(
    CONSOLE_FRAGMENTS.every(({ title, description }) => title && description),
  );
});

test("navigation inserts a button after HOME on desktop and mobile", () => {
  const nav = read("../Navbar.jsx");
  assert.match(
    nav,
    /label: "HOME"[^\n]+\n\s*\{ label: "控制台", action: "console"/,
  );
  assert.match(nav, /const renderDesktopLink[\s\S]*?item.action === "console"/);
  assert.match(nav, /const renderMobileLink[\s\S]*?item.action === "console"/);
  assert.match(nav, /<SiteConsole/);
});

test("console has a modal, real controls, a journal feed and a lottery reservation", () => {
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /role="dialog"/);
  assert.match(ui, /aria-modal="true"/);
  assert.match(ui, /role="log"/);
  assert.match(ui, /onToggleAudio/);
  assert.match(ui, /navigator.clipboard.writeText/);
  assert.match(ui, /Escape/);
  assert.match(ui, /event.key === "Tab"/);
  assert.match(ui, /机位预留/);
  assert.doesNotMatch(ui, /fetch\(|\/api\/owner|href="\/app/);
});

test("fragment 01 uses the same information treatment as 02 and 03", () => {
  const source = read("../Features.jsx");
  const card = source.match(
    /<ExhibitCard\s+src=\{[^\n]*feature-1[\s\S]*?\/>/,
  )?.[0];
  assert.ok(card);
  assert.match(card, /description=/);
  assert.doesNotMatch(card, /visualOnly/);
  assert.match(card, /linkUrl="\/projects\/"/);
});

test("cover switching opens the same visible picker on mobile and desktop", () => {
  const hero = read("../Hero.jsx");
  const handler = hero.slice(
    hero.indexOf("const handler ="),
    hero.indexOf('window.addEventListener("showHeroPreview"'),
  );
  assert.match(handler, /setSelectorOpen\(true\)/);
  assert.doesNotMatch(handler, /matchMedia|setCurrentIndex/);
  assert.match(hero, /<CoverPicker/);
});

test("update actions work in local preview and homepage honors the lottery anchor after mounting", () => {
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /href=\{fragmentDestination\(message.href\)\}/);
  assert.match(
    ui,
    /<a\s+href=\{fragmentDestination\(message.href\)\}\s+onClick=\{onClose\}/,
  );
  const home = read("../../pages/HomePage.jsx");
  assert.match(home, /window.location.hash !== "#end"/);
  assert.match(home, /requestAnimationFrame/);
  assert.match(home, /getElementById\("end"\)\?\.scrollIntoView/);
});

test("console entries are text controls and the journal shows complete messages without click selectors", () => {
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /aria-label="更新日志"/);
  assert.doesNotMatch(
    ui,
    /<img|covers\/|<details|<summary|role="tablist"|console-message-picker/,
  );
});

test("journal contains only short dated updates, newest first", async () => {
  const content = await import("./consoleContent.js");
  assert.equal(content.CONSOLE_ANNOUNCEMENTS, undefined);
  assert.equal(content.CONSOLE_UPDATES[0].id, "fan-covers");
  let previous = "9999-12-31";
  for (const item of content.CONSOLE_UPDATES) {
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.date <= previous);
    assert.ok(item.text.length <= 45, item.id);
    previous = item.date;
  }
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /<span>更新日志<\/span>/);
  assert.doesNotMatch(ui, /CONSOLE_ANNOUNCEMENTS|公告与更新|写给每一个/);
});

test("console is centered on both axes and only the journal feed can scroll", () => {
  const css = read("./site-console.css");
  const panel = css.match(/\.site-console\s*\{([^}]+)\}/)?.[1] || "";
  assert.match(panel, /top:\s*50%/);
  assert.match(panel, /left:\s*50%/);
  assert.match(panel, /translate\(-50%,\s*-50%\)/);
  assert.match(css, /\.console-journal-feed\s*\{[^}]*overflow-y:\s*auto/);
});

test("console quick links include About instead of Data Center", async () => {
  const { CONSOLE_QUICK_LINKS } = await import("./consoleContent.js");
  assert.ok(
    CONSOLE_QUICK_LINKS.some(
      ({ label, href }) => label === "关于我" && href === "/about",
    ),
  );
  assert.ok(CONSOLE_QUICK_LINKS.every(({ href }) => href !== "/ai-traffic"));
});

test("console offers four distinct themes with validated fallback and a theme control", async () => {
  assert.ok(read("./consoleThemes.js"), "theme definitions must exist");
  const { CONSOLE_THEMES, resolveConsoleTheme } =
    await import("./consoleThemes.js");
  assert.deepEqual(
    CONSOLE_THEMES.map(({ id }) => id),
    ["night", "paper", "titanium", "arcade"],
  );
  assert.equal(resolveConsoleTheme("bogus"), "arcade");
  assert.equal(resolveConsoleTheme("titanium"), "titanium");
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /data-console-theme=\{theme\}/);
  assert.match(ui, /<ConsoleThemePicker/);
  assert.doesNotMatch(ui, /onSwitchCover/);
});

test("first open uses Arcade and later opens rotate without repeating the previous choice", async () => {
  const { nextConsoleTheme } = await import("./consoleThemes.js");
  assert.equal(typeof nextConsoleTheme, "function");
  assert.equal(nextConsoleTheme(null), "arcade");
  assert.equal(nextConsoleTheme("invalid"), "arcade");
  let previous = null;
  const sequence = [];
  for (let i = 0; i < 8; i += 1) {
    const next = nextConsoleTheme(previous);
    assert.notEqual(next, previous);
    sequence.push(next);
    previous = next;
  }
  assert.deepEqual(sequence, [
    "arcade",
    "night",
    "paper",
    "titanium",
    "arcade",
    "night",
    "paper",
    "titanium",
  ]);
  assert.equal(nextConsoleTheme("paper"), "titanium");
});
