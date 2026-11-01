const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

for (const [slug, date, phrases] of [
  ['site-growth-17-project-cosmos', '2026-10-28', ['奇想馆', '来源', '滑动']],
  ['site-growth-18-home-console', '2026-10-30', ['控制台', '游艺', '更新日志']],
  ['site-growth-19-folding-fan-covers', '2026-10-31', ['扇面画屏', '花瓣', '亮度', '星空默认开启']],
  ['site-growth-20-home-covers-bili-videos', '2026-11-01', ['不规则 2x2', '四选一', '追番', '按需加载', '移除亮度', '右下角', 'wallpaper1', '刷新随机']],
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

test('new video release distinguishes the known-video fallback from production ingestion', () => {
  const data = JSON.parse(read('build/src/data/content.json'));
  const article = data.articles.find((item) => item.slug === 'site-growth-20-home-covers-bili-videos');
  assert.ok(article, 'newest generated article must exist');
  for (const body of [article.bodyHtmlZh, article.bodyHtmlEn]) {
    assert.match(body, /\/api\/v1\/bili\/videos/);
    assert.match(body, /ready:\s*false/);
  }
  assert.match(article.bodyHtmlZh, /已收录视频/);
  assert.match(article.bodyHtmlZh, /自动抓取尚未验证成功/);
  assert.match(article.bodyHtmlEn, /known-video fallback/);
  assert.match(article.bodyHtmlEn, /automatic ingestion has not been verified/);
});

test('console starts with short November updates linked to the newest timeline record', async () => {
  const { CONSOLE_UPDATES } = await import('../main/src/components/site-console/consoleContent.js');
  const latest = CONSOLE_UPDATES.filter((item) => item.date === '2026-11-01');
  assert.equal(CONSOLE_UPDATES[0].date, '2026-11-01');
  assert.equal(latest.length, 3);
  for (const item of latest) {
    assert.equal(item.href, '/build/post/site-growth-20-home-covers-bili-videos');
  }
  const text = latest.map((item) => item.text).join(' ');
  for (const phrase of ['wallpaper1', '刷新随机', '右下', '2x2', '四选一', '移除亮度', '播放器', '自动同步仍待就绪']) {
    assert.ok(text.includes(phrase), phrase);
  }
  let previous = '9999-12-31';
  for (const item of CONSOLE_UPDATES) {
    assert.ok(item.date <= previous, item.id);
    assert.ok(item.text.length <= 45, item.id);
    previous = item.date;
  }
  assert.doesNotMatch(CONSOLE_UPDATES.find((item) => item.id === 'fan-covers').text, /调光|亮度/);
});

test('lottery timeline summary reflects the current static image source', () => {
  const source = read('build/src/data/chronicle.ts');
  const entry = source.split("'site-growth-16-lottery-wallpaper-source': {")[1].split("'site-growth-15-time-archive':")[0];
  assert.match(entry, /t\.alcy\.cc/);
  assert.doesNotMatch(entry, /换成 Lolicon/);
});
