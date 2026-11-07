import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");

test("mounting Hero requests only the selected original cover", () => {
  const source = read("./Hero.jsx");
  assert.match(source, /requestImage\(initialIndex\.current\)/);
  assert.doesNotMatch(source, /\.\.\.COVER_INDEXES\.filter/);
});

test("the remaining original covers are requested only when the picker opens", () => {
  const source = read("./Hero.jsx");
  assert.match(source, /if \(!selectorOpen\) return;[\s\S]*?COVER_INDEXES\.forEach\(requestImage\)/);
  assert.match(source, /decoded\.current\.has\(index\)/);
});

test("offscreen homepage originals retain their layout and are deferred", () => {
  assert.ok(existsSync(new URL("./DeferredImage.jsx", import.meta.url)));
  for (const file of ["./About.jsx", "./Story.jsx"]) {
    const source = read(file);
    assert.match(source, /<DeferredImage\b/);
    assert.match(source, /(?:about|entrance)\.webp/);
  }
  const source = read("./DeferredImage.jsx");
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /src=\{active \? src : undefined\}/);
  assert.match(source, /forwardRef/);
  assert.match(source, /observer\.disconnect\(\)/);
});
