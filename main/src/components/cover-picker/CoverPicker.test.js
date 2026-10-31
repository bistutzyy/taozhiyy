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
const styles = () => read("./cover-picker.css");

test("picker module imports successfully and stays server-safe while closed", async () => {
  const input = source();
  const { transformWithOxc } = await import("vite");
  const result = await transformWithOxc(input, "CoverPicker.jsx", {
    jsx: { runtime: "automatic" },
  });
  assert.deepEqual(result.errors, []);
  const code = result.code
    .replace(/import\s+["']\.\/cover-picker\.css["'];?/g, "")
    .replace(
      /from (["'])(react(?:\/jsx-runtime)?|react-dom|react-icons\/lu)\1/g,
      (_, quote, name) => `from ${quote}${import.meta.resolve(name)}${quote}`,
    );
  const { default: CoverPicker } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
  );
  assert.equal(typeof CoverPicker, "function");
  assert.equal(
    renderToStaticMarkup(
      createElement(CoverPicker, {
        open: false,
        covers: [],
        currentIndex: 1,
        readyIndexes: new Set(),
        failedIndexes: new Set(),
        onApply() {},
        onClose() {},
        onRetry() {},
      }),
    ),
    "",
  );
});

test("picker is a labelled native modal portalled to the document body", () => {
  const ui = source();
  assert.match(ui, /import\s+\{\s*createPortal\s*\}\s+from "react-dom"/);
  assert.match(ui, /<dialog\b/);
  assert.match(ui, /className="cover-picker"/);
  assert.match(ui, /aria-labelledby="cover-picker-title"/);
  assert.match(ui, /id="cover-picker-title"/);
  assert.match(ui, /\.showModal\(\)/);
  assert.match(ui, /createPortal\([\s\S]*document\.body/);
  assert.doesNotMatch(ui, /role="(?:application|listbox)"/);
});

test("each opening creates fresh local preview state from the applied index", () => {
  const ui = source();
  assert.match(
    ui,
    /if \(!open \|\| typeof document === "undefined"\) return null/,
  );
  assert.match(ui, /<CoverPickerSession\b/);
  assert.match(
    ui,
    /\[previewIndex, setPreviewIndex\] = useState\(currentIndex\)/,
  );
  for (const prop of [
    "covers",
    "currentIndex",
    "readyIndexes",
    "failedIndexes",
    "onApply",
    "onClose",
    "onRetry",
  ]) {
    assert.match(ui, new RegExp(`\\b${prop}\\b`));
  }
  assert.doesNotMatch(
    ui,
    /localStorage|sessionStorage|writeCoverPreference|fetch\(/,
  );
});

test("hover and focus preview only decoded ready images without applying", () => {
  const ui = source();
  assert.match(
    ui,
    /const isReady = \(index\) =>[\s\S]*?readyIndexes\.has\(index\) && !failedIndexes\.has\(index\)/,
  );
  const preview = ui.match(
    /const previewCover = \(index\) => \{([\s\S]*?)\n  \};/,
  )?.[1];
  assert.ok(preview, "ready-only preview handler must exist");
  assert.match(preview, /if \(isReady\(index\)\) setPreviewIndex\(index\)/);
  assert.doesNotMatch(preview, /onApply|onClose/);
  assert.match(
    ui,
    /onMouseEnter=\{[\s\S]*?\(hover: hover\) and \(pointer: fine\)[\s\S]*?previewCover\(index\)/,
  );
  assert.match(ui, /onFocus=\{\(\) => previewCover\(index\)\}/);
});

test("thumbnail clicks apply directly through a readiness guard", () => {
  const ui = source();
  const apply = ui.match(
    /const applyCover = \(index\) => \{([\s\S]*?)\n  \};/,
  )?.[1];
  assert.ok(apply, "ready-only apply handler must exist");
  assert.match(apply, /if \(isReady\(index\)\) onApply\(index\)/);
  assert.match(ui, /data-cover-index=\{index\}/);
  assert.match(ui, /onClick=\{\(\) => applyCover\(index\)\}/);
  assert.match(ui, /disabled=\{!ready\}/);
  assert.match(ui, /aria-pressed=\{currentIndex === index\}/);
});

test("cancel and native Escape request close without applying a preview", () => {
  const ui = source();
  assert.match(
    ui,
    /onCancel=\{\(event\) => \{\s*event\.preventDefault\(\);\s*onClose\(\);/,
  );
  assert.match(
    ui,
    /className="cover-picker__close"[\s\S]*?onClick=\{onClose\}/,
  );
  assert.match(ui, /aria-label="关闭封面选择"/);
  assert.doesNotMatch(ui, /document\.addEventListener\("keydown"/);
});

test("modal preserves the opener, body styles and scroll position", () => {
  const ui = source();
  assert.match(ui, /const opener = document\.activeElement/);
  assert.match(ui, /window\.scrollX/);
  assert.match(ui, /window\.scrollY/);
  assert.match(ui, /getPropertyValue\(property\)/);
  assert.match(ui, /getPropertyPriority\(property\)/);
  assert.match(ui, /setProperty\("overflow", "hidden"\)/);
  assert.match(ui, /setProperty\("position", "fixed"\)/);
  assert.match(ui, /style\.setProperty\(property, value, priority\)/);
  assert.match(ui, /style\.removeProperty\(property\)/);
  assert.match(ui, /opener\?\.isConnected/);
  assert.match(ui, /opener\.focus\(\{ preventScroll: true \}\)/);
  assert.match(ui, /window\.scrollTo\(/);
  assert.match(ui, /dialog\.close\(\)/);
});

test("failed frames have explicit retry controls and truthful loading status", () => {
  const ui = source();
  assert.match(ui, /failedIndexes\.has\(index\)/);
  assert.match(ui, /className="cover-picker__retry"/);
  assert.match(ui, /onClick=\{\(\) => onRetry\(index\)\}/);
  assert.match(ui, /重试/);
  assert.match(ui, /加载中/);
  assert.match(ui, /加载失败/);
  assert.match(ui, /aria-busy=\{!ready && !failed\}/);
  assert.match(ui, /from "react-icons\/lu"/);
  assert.match(ui, /<LuRotateCw\b/);
});

test("StrictMode cleanup close events are not forwarded to the parent", () => {
  const dialog = source().match(/<dialog\b[\s\S]*?>/)?.[0];
  assert.ok(dialog);
  assert.doesNotMatch(dialog, /\bonClose=/);
});

test("unavailable thumbnail images unmount so successful retries create fresh images", () => {
  const ui = source();
  assert.match(ui, /\{ready && \(?\s*<img[\s\S]*?src=\{src\}/);
});

test("full-screen crossfade retains the previous real image and exposes the current index", () => {
  const ui = source();
  assert.match(ui, /\[previousCover, setPreviousCover\]/);
  assert.match(ui, /setPreviousCover\(displayedCover\)/);
  assert.match(ui, /if \(\s*!nextCover/);
  assert.match(ui, /src=\{previousCover\.src\}/);
  assert.match(ui, /src=\{displayedCover\.src\}/);
  assert.match(ui, /data-preview-index=\{displayedCover\.index\}/);
  assert.match(ui, /key=\{displayedCover\.src\}/);
  assert.match(ui, /clearTimeout\(timeout\)/);
  assert.doesNotMatch(ui, /setInterval|new Image|compass|poem|orb|<canvas/i);
});

test("preview is full bleed and the tool uses stable four-column frame geometry", () => {
  const css = styles();
  assert.match(
    css,
    /\.cover-picker\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s,
  );
  assert.match(css, /height:\s*100dvh/);
  assert.match(css, /max-width:\s*none/);
  assert.match(css, /\.cover-picker__preview\s*\{[^}]*object-fit:\s*cover;/s);
  assert.match(
    css,
    /grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(css, /aspect-ratio:\s*16\s*\/\s*9/);
  assert.doesNotMatch(
    css,
    /(?:backdrop-)?filter\s*:|radial-gradient|font-size:\s*[^;]*vw/i,
  );
  for (const [, radius] of css.matchAll(/border-radius:\s*([\d.]+)px/g)) {
    assert.ok(Number(radius) <= 8, `radius ${radius}px exceeds 8px`);
  }
});

test("phone grid, short landscape and reduced motion have dedicated scoped rules", () => {
  const css = styles();
  assert.match(css, /@media\s*\(max-width:\s*767px\)/);
  assert.match(
    css,
    /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    css,
    /@media[^\{]*max-height:\s*450px[^\{]*orientation:\s*landscape/,
  );
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /:focus-visible/);
});
