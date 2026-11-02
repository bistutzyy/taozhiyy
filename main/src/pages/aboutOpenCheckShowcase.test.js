import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const publicFile = (path) => new URL(`../../public/${path}`, import.meta.url);
const readPublic = (path) => readFileSync(publicFile(path), "utf8");
const showcaseFile = "showcase/opencheck.html";

test("About adds OpenCheck to the existing showcase without changing the other cards", () => {
  const html = readPublic("about-preview.html");
  const card = html.match(/<a class="project p-real p-opencheck"[\s\S]*?<\/a>/)?.[0];
  assert.ok(card, "OpenCheck needs its own About project card");
  assert.match(card, /href="\/showcase\/opencheck\.html"/);
  assert.match(card, /<h3>OpenCheck<\/h3>/);
  assert.match(card, /纯前端 MVP/);
  assert.match(card, /Team-18/);
  assert.match(card, /GPL-3\.0/);
  assert.match(card, /src="\/showcase\/opencheck-home\.png"/);
  assert.doesNotMatch(card, /ON LINE|安全审计|商用级|在线体验/);
  assert.equal((html.match(/class="project /g) || []).length, 4);
  assert.match(html, /class="project p-real p-quizcard" href="\/showcase\/quizcard\.html"/);
  assert.match(html, /class="project p-coming p-soon-2"/);
  assert.match(html, /class="project p-coming p-soon-3"/);
  assert.equal((html.match(/<h3>敬请期待<\/h3>/g) || []).length, 2);
});

test("the About project route supports both projects with project-specific loading text", () => {
  const source = readFileSync(new URL("./AboutProjectPage.jsx", import.meta.url), "utf8");
  assert.match(source, /opencheck:\s*\{\s*url:\s*"\/showcase\/opencheck\.html",\s*title:\s*"OpenCheck"/);
  assert.match(source, /quizcard:\s*\{\s*url:\s*"\/showcase\/quizcard\.html",\s*title:\s*"AI QuizCard"/);
  assert.match(source, /正在打开\s*\{showcase\.title\}/);
  assert.match(source, /<Navigate to="\/about" replace/);
});

test("OpenCheck's showcase describes the documented MVP and clearly attributes its source", () => {
  assert.ok(existsSync(publicFile(showcaseFile)), "OpenCheck needs a local showcase page");
  const html = readPublic(showcaseFile);
  assert.match(html, /<h1>OpenCheck<\/h1>/);
  for (const fact of ["纯前端 MVP", "README", "LICENSE", "运行说明", "项目结构", "协作", "CI", "Markdown", "Team-18", "GPL-3.0"]) {
    assert.ok(html.includes(fact), `missing documented fact: ${fact}`);
  }
  assert.match(html, /不能替代人工 Review/);
  assert.match(html, /截图.*来源.*上游仓库/);
  assert.match(html, /href="\/about"/);
  assert.match(html, /blob\/ebb47349ec42dacfea613833504669d028cc7dba\/README\.md/);
  assert.match(html, /blob\/ebb47349ec42dacfea613833504669d028cc7dba\/LICENSE/);
  assert.doesNotMatch(html, /<iframe|<form|<script|安全审计|商用级|在线体验|已验证上线/);
  const externalLinks = html.match(/<a\b[^>]*href="https?:[^>]*>/g) || [];
  assert.ok(externalLinks.length >= 3);
  for (const link of externalLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener noreferrer"/);
  }
});

test("OpenCheck screenshots and branding retain pinned upstream provenance", () => {
  const manifestFile = "showcase/opencheck-source.json";
  assert.ok(existsSync(publicFile(manifestFile)), "vendored assets need source provenance");
  const manifest = JSON.parse(readPublic(manifestFile));
  assert.equal(manifest.repository, "https://github.com/Bistu-OSSDT-2026/OpenCheck");
  assert.equal(manifest.commit, "ebb47349ec42dacfea613833504669d028cc7dba");
  assert.equal(manifest.author, "Bistu-OSSDT-2026 / Team-18");
  assert.equal(manifest.license, "GPL-3.0");
  assert.deepEqual(manifest.assets.map((asset) => asset.upstream), [
    "public/favicon.svg", "screenshots/home.png", "screenshots/mobile-home.png",
    "screenshots/result.png", "screenshots/report.png",
  ]);
  for (const asset of manifest.assets) {
    assert.match(asset.file, /^opencheck-[a-z.-]+$/);
    assert.match(asset.blob, /^[a-f0-9]{40}$/);
    const bytes = readFileSync(publicFile(`showcase/${asset.file}`));
    const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
    assert.equal(blob, asset.blob, `${asset.file} must match the original upstream asset`);
    if (asset.file.endsWith(".png")) {
      assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    }
  }
  const license = readFileSync(publicFile("showcase/opencheck-LICENSE.txt"), "utf8");
  assert.match(license, /GNU GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 29 June 2007/);
});
