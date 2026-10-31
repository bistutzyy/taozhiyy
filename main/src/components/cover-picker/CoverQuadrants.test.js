import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("the four-panel backdrop begins dim and never paints failed or loading images", async () => {
  const { createServer } = await import("vite");
  const { default: react } = await import("@vitejs/plugin-react");
  const server = await createServer({
    configFile: false,
    cacheDir: fileURLToPath(
      new URL(
        "../../../node_modules/.cache/cover-quadrants-ssr",
        import.meta.url,
      ),
    ),
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [react()],
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const { default: CoverQuadrants } = await server.ssrLoadModule(
      "/src/components/cover-picker/CoverQuadrants.jsx",
    );
    const props = {
      covers: [1, 2, 3, 4].map((index) => ({
        index,
        src: `/cover-${index}.webp`,
      })),
      readyIndexes: new Set([1, 2, 4]),
      failedIndexes: new Set([4]),
    };
    const dark = renderToStaticMarkup(createElement(CoverQuadrants, props));
    assert.equal((dark.match(/data-quad-index=/g) || []).length, 4);
    assert.equal((dark.match(/<img /g) || []).length, 2);
    assert.doesNotMatch(dark, /data-lit="true"/);
    assert.ok(
      !dark.includes('src="/cover-3.webp"') &&
        !dark.includes('src="/cover-4.webp"'),
    );
    const lit = renderToStaticMarkup(
      createElement(CoverQuadrants, { ...props, highlightedIndex: 2 }),
    );
    assert.equal((lit.match(/data-lit="true"/g) || []).length, 1);
    assert.match(lit, /data-highlight-index="2"/);
    const failed = renderToStaticMarkup(
      createElement(CoverQuadrants, { ...props, highlightedIndex: 4 }),
    );
    assert.doesNotMatch(failed, /data-lit="true"/);
  } finally {
    await server.close();
  }
});
