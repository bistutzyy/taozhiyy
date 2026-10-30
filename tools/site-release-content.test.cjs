const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

for (const [slug, date, phrases] of [
  ['site-growth-17-project-cosmos', '2026-10-28', ['奇想馆', '来源', '滑动']],
  ['site-growth-18-home-console', '2026-10-30', ['控制台', '游艺', '更新日志']],
]) {
  test(`timeline includes bilingual release record ${slug}`, () => {
    const data = JSON.parse(read('build/src/data/content.json'));
    const article = data.articles.find((item) => item.slug === slug);
    assert.ok(article, `generated article missing: ${slug}`);
    assert.equal(article.date, date);
    for (const phrase of phrases) assert.ok(article.bodyHtmlZh.includes(phrase), phrase);
    assert.ok(article.bodyHtmlEn.length > 200);
    const markdown = read(`build/content/articles/${slug}.md`);
    assert.ok(markdown.includes('---en---'));
    assert.ok(read('build/src/data/chronicle.ts').includes(`'${slug}':`));
  });
}

test('lottery timeline summary reflects the current static image source', () => {
  const source = read('build/src/data/chronicle.ts');
  const entry = source.split("'site-growth-16-lottery-wallpaper-source': {")[1].split("'site-growth-15-time-archive':")[0];
  assert.match(entry, /t\.alcy\.cc/);
  assert.doesNotMatch(entry, /换成 Lolicon/);
});
