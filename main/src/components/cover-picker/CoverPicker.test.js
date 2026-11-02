import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const read = (name) => {
  const url = new URL(name, import.meta.url);
  assert.ok(existsSync(url), `${name} must exist`);
  return readFileSync(url, "utf8");
};
const source = () => read("./CoverPicker.jsx");
const room = () => read("./CoverFan.jsx");

test("screening room module loads server-side and stays empty while closed", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    cacheDir: fileURLToPath(
      new URL("../../../node_modules/.cache/cover-picker-ssr", import.meta.url),
    ),
    server: { middlewareMode: true },
    appType: "custom",
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const { default: CoverPicker } = await server.ssrLoadModule(
      "/src/components/cover-picker/CoverPicker.jsx",
    );
    assert.equal(
      renderToStaticMarkup(createElement(CoverPicker, { open: false })),
      "",
    );
  } finally {
    await server.close();
  }
});

test("screening scene remains a labelled native modal portalled outside Hero", () => {
  const ui = source();
  assert.match(ui, /<dialog\b/);
  assert.match(ui, /className="cover-picker"/);
  assert.match(ui, /aria-labelledby="cover-picker-title"/);
  assert.match(ui, /id="cover-picker-title"/);
  assert.match(ui, /\.showModal\(\)/);
  assert.match(ui, /createPortal\([\s\S]*document\.body/);
  assert.match(ui, /<CoverFan\b/);
  assert.doesNotMatch(
    ui + room(),
    /CoverDial|CoverScreening|Draggable|InertiaPlugin|screening-projector/,
  );
});

test("each opening makes an independent image draft without brightness state", () => {
  const ui = source();
  assert.match(
    ui,
    /if \(!open \|\| typeof document === "undefined"\) return null/,
  );
  assert.match(
    ui,
    /\[previewIndex, setPreviewIndex\] = useState\(currentIndex\)/,
  );
  assert.doesNotMatch(ui + room(), /brightness|LuSun|LuRotateCcw/i);
  assert.doesNotMatch(
    ui + room(),
    /localStorage|sessionStorage|writeCoverPreference|fetch\(/,
  );
});

test("cancel keeps native modal opener, body style priorities and scroll restoration", () => {
  const ui = source();
  assert.match(ui, /event\.preventDefault\(\)/);
  assert.match(ui, /aria-label="关闭封面选择"/);
  assert.match(ui, /const opener = document\.activeElement/);
  assert.match(ui, /getPropertyValue\(property\)/);
  assert.match(ui, /getPropertyPriority\(property\)/);
  assert.match(ui, /"overflow-x"/);
  assert.match(ui, /"overflow-y"/);
  assert.match(ui, /setProperty\("overflow", "hidden"\)/);
  assert.match(ui, /setProperty\("position", "fixed"\)/);
  assert.match(ui, /style\.setProperty\(property, value, priority\)/);
  assert.match(ui, /style\.removeProperty\(property\)/);
  assert.match(ui, /opener\.focus\(\{ preventScroll: true \}\)/);
  assert.match(ui, /window\.scrollTo\(/);
  assert.match(ui, /dialog\.close\(\)/);
  assert.doesNotMatch(ui.match(/<dialog\b[\s\S]*?>/)?.[0] ?? "", /\bonClose=/);
});

test("fan leaves preview on fine hover or focus and explicitly select on click", () => {
  const ui = room();
  assert.match(ui, /data-cover-index=\{index\}/);
  assert.match(
    ui,
    /onClick=\{\(event\) => onSelect\(index, event\.currentTarget\)\}/,
  );
  assert.match(ui, /onMouseEnter=/);
  assert.match(ui, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(ui, /onFocus=\{\(\) => onPreview\(index, "focus"\)\}/);
  assert.match(ui, /onMouseLeave=\{\(\) => onPreviewEnd\(index, "pointer"\)\}/);
  assert.match(ui, /onBlur=\{\(\) => onPreviewEnd\(index, "focus"\)\}/);
  assert.match(ui, /clipPathUnits="objectBoundingBox"/);
  assert.match(ui, /data-fan-hit/);
  assert.match(ui, /disabled=\{!ready \|\| busy\}/);
  assert.match(ui, /aria-busy=\{!ready && !failed\}/);
  assert.match(ui, /className="cover-picker__retry"/);
  assert.match(ui, /onClick=\{\(\) => onRetry\(index\)\}/);
  assert.match(ui, /加载失败/);
  assert.match(ui, /加载中/);
  assert.match(ui, /\{ready && \(?\s*<img[\s\S]*?src=\{src\}/);
});

test("cover selection has no bottom toolbar or redundant commands", () => {
  const ui = room() + source();
  for (const text of ["随机一景", "纯净观赏", "使用此封面"])
    assert.ok(!ui.includes(text), `${text} must be removed`);
  assert.doesNotMatch(ui, /fan-controls|fan-command|fan-apply/);
  assert.doesNotMatch(ui, /<input\b|<output\b|type="range"|亮度/);
  assert.doesNotMatch(ui, /onShuffle|onCleanView|onConfirm|cleanView|getRandomCoverIndex/);
  assert.match(ui, /onSelect=\{confirmCover\}/);
  assert.match(ui, /from "react-icons\/lu"/);
});

test("fan stage fills one row without a reserved toolbar track", () => {
  const css = read("./fan-screen.css");
  const stage = css.match(/\.fan-room\s*\{([^}]+)\}/)?.[1] ?? "";
  assert.match(stage, /grid-template-rows:\s*minmax\(0, 1fr\);/);
  assert.doesNotMatch(css, /fan-controls|fan-command|fan-apply/);
  assert.doesNotMatch(css + read("./cover-mobile.css"), /brightness|__reset/i);
});

test("direct selection obeys image readiness", () => {
  const ui = source();
  assert.match(
    ui,
    /readyIndexes\.has\(index\) && !failedIndexes\.has\(index\)/,
  );
  assert.match(ui, /setPreviewIndex/);
  assert.match(ui, /confirming\.current/);
});

test("selected leaf expands to full-screen with cancellable captured-index Flip", () => {
  const ui = source();
  assert.match(ui, /gsap\s*\.timeline\(/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /onApply\(index,\s*\{ skipTransition:\s*true \}\)/);
  assert.match(
    ui,
    /latestApply\.current\(index,\s*\{ skipTransition:\s*true \}\)/,
  );
  assert.match(ui, /projectionTimeline\.current\?\.kill\(\)/);
  assert.match(ui, /Flip\.fit\(/);
  assert.match(ui, /getVars:\s*true/);
  assert.match(ui, /cover-picker__reveal/);
  assert.match(ui, /cover-picker__petal-burst/);
  assert.match(ui, /data-phase=/);
});

test("Escape closes the picker directly without an intermediate clean view", () => {
  const ui = source();
  assert.match(ui, /onCancel=\{\(event\) => \{\s*event\.preventDefault\(\);\s*onClose\(\);/);
  assert.doesNotMatch(ui + read("./cover-picker.css"), /cleanView|data-clean|cover-picker__return|cover-picker__preview/);
});

test("the backdrop keeps four regions without a separate full-screen photo", () => {
  const ui = source() + room();
  assert.match(ui, /<CoverQuadrants\b/);
  assert.doesNotMatch(ui, /displayedCover|cover-picker__preview/);
  assert.doesNotMatch(ui, /previousCover|setPreviousCover/);
  assert.doesNotMatch(ui, /setInterval|new Image|compass|poem|<canvas/i);
  const css = read("./cover-picker.css") + read("./fan-screen.css");
  assert.doesNotMatch(css, /blur\s*\(|font-size:\s*[^;]*vw/);
});

test("room layouts include constrained mobile, short landscape and reduced motion", () => {
  const css = read("./cover-picker.css") + read("./fan-screen.css");
  assert.match(css, /100dvh/);
  assert.match(css, /aspect-ratio:/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /\[hidden\]/);
  assert.match(css, /transform-origin:\s*50% 100%/);
  assert.match(css, /--leaf-angle/);
  assert.match(css, /fan-tassel/);
});

test("mobile cover selection becomes an undecorated two-column grid and applies without a fan reveal", () => {
  const css = read("./cover-mobile.css");
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /clip-path:\s*none !important/);
  assert.match(css, /\.fan-leaf[\s\S]*?transform:\s*none/);
  assert.match(css, /\.fan-tassel[\s\S]*?display:\s*none/);
  assert.match(room(), /import "\.\/cover-mobile.css"/);
  assert.match(
    source(),
    /window\.matchMedia\("\(max-width: 767px\)"\)\.matches/,
  );
});

test("mobile navigation excludes the console while retaining the desktop entry", () => {
  const nav = read("../Navbar.jsx");
  assert.match(
    nav,
    /const renderMobileLink = \(item\) => \{\s*if \(item.action === "console"\) return null;/,
  );
  assert.match(
    nav,
    /className=\{clsx\(desktopLinkClass\(consoleOpen\), "nav-console-trigger"\)\}/,
  );
  assert.doesNotMatch(nav, /nav-mobile-console/);
});
