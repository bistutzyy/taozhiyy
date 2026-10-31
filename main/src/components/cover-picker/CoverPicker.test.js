import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const read = (name) => {
  const url = new URL(name, import.meta.url);
  assert.ok(existsSync(url), `${name} must exist`);
  return readFileSync(url, "utf8");
};
const source = () => read("./CoverPicker.jsx");
const dial = () => read("./CoverDial.jsx");

test("picker module and its dial load server-side and stay empty while closed", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
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

test("picker remains a labelled native modal portalled outside the hero", () => {
  const ui = source();
  assert.match(ui, /<dialog\b/);
  assert.match(ui, /className="cover-picker"/);
  assert.match(ui, /aria-labelledby="cover-picker-title"/);
  assert.match(ui, /id="cover-picker-title"/);
  assert.match(ui, /\.showModal\(\)/);
  assert.match(ui, /createPortal\([\s\S]*document\.body/);
  assert.match(ui, /<CoverDial\b/);
  assert.doesNotMatch(ui, /cover-picker__frames|cover-picker__viewfinder/);
});

test("each opening starts from the applied cover without touching persistence", () => {
  const ui = source();
  assert.match(
    ui,
    /if \(!open \|\| typeof document === "undefined"\) return null/,
  );
  assert.match(
    ui,
    /\[previewIndex, setPreviewIndex\] = useState\(currentIndex\)/,
  );
  assert.doesNotMatch(
    ui + dial(),
    /localStorage|sessionStorage|writeCoverPreference|fetch\(/,
  );
});

test("cancel and Escape preserve the opener, body styles and scroll", () => {
  const ui = source();
  assert.match(ui, /event\.preventDefault\(\);\s*onClose\(\)/);
  assert.match(ui, /aria-label="关闭封面选择"/);
  assert.match(ui, /const opener = document\.activeElement/);
  assert.match(ui, /getPropertyValue\(property\)/);
  assert.match(ui, /getPropertyPriority\(property\)/);
  assert.match(ui, /setProperty\("overflow", "hidden"\)/);
  assert.match(ui, /setProperty\("position", "fixed"\)/);
  assert.match(ui, /style\.setProperty\(property, value, priority\)/);
  assert.match(ui, /style\.removeProperty\(property\)/);
  assert.match(ui, /opener\.focus\(\{ preventScroll: true \}\)/);
  assert.match(ui, /window\.scrollTo\(/);
  assert.match(ui, /dialog\.close\(\)/);
  assert.doesNotMatch(ui.match(/<dialog\b[\s\S]*?>/)?.[0] ?? "", /\bonClose=/);
});

test("dial uses installed GSAP rotational dragging, inertia and ready-only snapping", () => {
  const ui = dial();
  assert.match(ui, /Draggable\.create\(/);
  assert.match(ui, /type:\s*"rotation"/);
  assert.match(ui, /InertiaPlugin/);
  assert.match(ui, /snapDialRotation/);
  assert.match(ui, /\.kill\(\)/);
  assert.match(ui, /role="slider"/);
  for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"])
    assert.ok(ui.includes(key));
});

test("radial thumbnails only select a preview and the central lens confirms", () => {
  const ui = dial();
  assert.match(ui, /data-cover-index=\{index\}/);
  assert.match(ui, /onClick=\{\(\) => selectCover\(index\)\}/);
  assert.match(ui, /disabled=\{!ready \|\| busy\}/);
  assert.match(ui, /className="cover-picker__apply[^"]*"/);
  assert.match(ui, /onClick=\{onConfirm\}/);
  assert.match(ui, /aria-label="使用此封面"/);
  assert.doesNotMatch(ui, /onApply|onConfirm\(index\)/);
});

test("confirmation has a readiness guard and cancellable one-shot shutter", () => {
  const ui = source();
  assert.match(ui, /gsap\s*\.timeline\(/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /confirming\.current/);
  assert.match(ui, /onApply\(index\)/);
  assert.match(ui, /shutterTimeline\.current\?\.kill\(\)/);
  assert.match(ui, /cover-picker__shutter/);
});

test("loading and failed frames expose real status and retry without broken images", () => {
  const ui = dial();
  assert.match(ui, /failedIndexes\.has\(index\)/);
  assert.match(ui, /className="cover-picker__retry"/);
  assert.match(ui, /onClick=\{\(\) => onRetry\(index\)\}/);
  assert.match(ui, /加载中/);
  assert.match(ui, /加载失败/);
  assert.match(ui, /aria-busy=\{!ready && !failed\}/);
  assert.match(ui, /\{ready && \(?\s*<img[\s\S]*?src=\{src\}/);
});

test("sharp crossfade retains the real previous image without blur or auto-rotation", () => {
  const ui = source();
  assert.match(ui, /setPreviousCover\(displayedCover\)/);
  assert.match(ui, /src=\{previousCover\.src\}/);
  assert.match(ui, /src=\{displayedCover\.src\}/);
  assert.match(ui, /data-preview-index=\{displayedCover\.index\}/);
  assert.match(ui, /clearTimeout\(timeout\)/);
  assert.doesNotMatch(
    ui + dial(),
    /setInterval|new Image|compass|poem|<canvas/i,
  );
  const css = read("./cover-picker.css") + read("./aperture-dial.css");
  assert.doesNotMatch(css, /(?:backdrop-)?filter\s*:|font-size:\s*[^;]*vw/);
});

test("dial geometry accounts for width, short landscape, touch and reduced motion", () => {
  const css = read("./cover-picker.css") + read("./aperture-dial.css");
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /--dial-size:/);
  assert.match(css, /100dvh -/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /env\(safe-area-inset-bottom/);
});
