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

test("cover switching has a usable mobile path rather than opening a hidden desktop selector", () => {
  const hero = read("../Hero.jsx");
  const handler = hero.slice(
    hero.indexOf("const handler ="),
    hero.indexOf('window.addEventListener("showHeroPreview"'),
  );
  assert.match(handler, /matchMedia/);
  assert.match(handler, /setCurrentIndex\(nextIndex\)/);
});

test("update actions work in local preview and homepage honors the lottery anchor after mounting", () => {
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /href=\{fragmentDestination\(message.href\)\}/);
  const home = read("../../pages/HomePage.jsx");
  assert.match(home, /window.location.hash !== "#end"/);
  assert.match(home, /requestAnimationFrame/);
  assert.match(home, /getElementById\("end"\)\?\.scrollIntoView/);
});

test("console entries are text controls and the journal shows complete messages without click selectors", () => {
  const ui = read("./SiteConsole.jsx");
  assert.match(ui, /aria-label="公告与更新日志"/);
  assert.doesNotMatch(
    ui,
    /<img|covers\/|<details|<summary|role="tablist"|console-message-picker/,
  );
});

test("console is centered on both axes and only the journal feed can scroll", () => {
  const css = read("./site-console.css");
  const panel = css.match(/\.site-console\s*\{([^}]+)\}/)?.[1] || "";
  assert.match(panel, /top:\s*50%/);
  assert.match(panel, /left:\s*50%/);
  assert.match(panel, /translate\(-50%,\s*-50%\)/);
  assert.match(css, /\.console-journal-feed\s*\{[^}]*overflow-y:\s*auto/);
});
