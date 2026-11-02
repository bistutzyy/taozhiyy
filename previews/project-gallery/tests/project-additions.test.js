import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { projects, filterProjects } from '../src/catalog.js';
import { renderProjectDetail } from '../src/detail.js';

const additions = [
  {id:'localsend', repo:'localsend/localsend', author:'LocalSend', license:'Apache-2.0', queries:['LocalSend','局域网','Tien Nam Do']},
  {id:'nature-skills', repo:'Yuan1z0825/nature-skills', author:'Yuan1z0825', license:'Apache-2.0', queries:['nature-skills','Yuan1z0825','科研绘图']},
  {id:'anti-defensive-writing', repo:'Adkid-Zephyr/anti-defensive-writing-Skill', author:'Adkid-Zephyr', license:'MIT', queries:['Anti-Defensive Writing','Adkid-Zephyr','防御性写作']},
];
const project = id => {
  const entry = projects.find(p => p.id === id);
  assert.ok(entry, `${id} is in the shared catalog`);
  return entry;
};
const copy = entry => [entry.summary, entry.demo.note, ...entry.sections.flat()].join(' ');

test('static count metadata agrees with twelve projects plus the guide before JavaScript runs', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const realCount = projects.filter(p => !p.isGuide).length;
  assert.equal(realCount, 12);
  assert.ok(html.includes(`class="collection-count">PROJECT INDEX / ${realCount} + GUIDE</span>`));
  assert.ok(html.includes(`aria-label="${realCount} 个项目与板块介绍"`));
  assert.ok(html.includes(`<strong>01 <i>/</i> ${projects.length}</strong>`));
});

for (const expected of additions) {
  test(`${expected.id} has five useful sections, primary attribution, and safe external references`, () => {
    const entry = project(expected.id);
    assert.equal(entry.source, `https://github.com/${expected.repo}`);
    assert.equal(entry.docs, `${entry.source}/blob/main/README.md`);
    assert.equal(entry.licenseUrl, `${entry.source}/blob/main/LICENSE`);
    assert.ok(entry.author.includes(expected.author));
    assert.ok(entry.license.includes(expected.license));
    assert.equal(entry.reviewedAt, '2026-11-01');
    assert.equal(entry.sections.length, 5);
    assert.equal(new Set(entry.sections.map(([title]) => title)).size, 5);
    for (const [title, text] of entry.sections) assert.ok(title.length >= 4 && text.length >= 35);
    assert.equal(entry.demo.kind, 'external');
    for (const url of [entry.url, entry.source, entry.docs, entry.licenseUrl, entry.demo.url]) {
      const parsed = new URL(url);
      assert.equal(parsed.protocol, 'https:');
      assert.equal(parsed.username + parsed.password, '');
    }
    assert.match(entry.demo.note, /本站.*(?:未|不)/);
    assert.doesNotMatch(entry.demo.note, /本站(?:已实测|已部署|在线运行|内置试用)/);
    const html = renderProjectDetail(entry);
    assert.doesNotMatch(html, /<(?:iframe|video|form)\b/);
    assert.ok(html.includes('rel="noopener noreferrer"'));
    assert.ok(html.includes(entry.source));
    assert.ok(html.includes('2026-11-01'));
    for (const query of expected.queries) {
      assert.ok(filterProjects(projects, `  ${query.toUpperCase()}  `).some(p => p.id === entry.id), query);
    }
  });
}

test('LocalSend points to an app download, not a hosted transfer tryout', () => {
  const entry = project('localsend');
  assert.equal(entry.url, 'https://localsend.org/');
  assert.equal(entry.demo.url, 'https://localsend.org/download');
  assert.match(entry.demo.label, /下载/);
  assert.match(copy(entry), /同一.*(?:局域网|网络)/);
  assert.match(copy(entry), /接收.*确认/);
  assert.match(copy(entry), /53317/);
  assert.match(copy(entry), /未.*双设备实测/);
});

test('Nature Skills distinguishes its community, author website, and untested local use', () => {
  const entry = project('nature-skills');
  assert.equal(entry.url, 'https://yuan1z0825.github.io/nature-skills/');
  assert.equal(entry.demo.url, entry.url);
  assert.match(entry.author, /社区/);
  assert.match(entry.demo.label, /作者.*(?:网站|项目页)/);
  assert.match(copy(entry), /不是 Nature.*官方/);
  assert.match(copy(entry), /nature-shared/);
  assert.match(copy(entry), /https:\/\/natureskills\.cn/);
  assert.match(copy(entry), /未.*本地.*实测/);
  assert.match(copy(entry), /(?:核对|核验).*(?:数据|引用)/);
});

test('Anti-Defensive Writing is a CN/EN prompt pack with evidence-integrity boundaries', () => {
  const entry = project('anti-defensive-writing');
  assert.equal(entry.url, entry.source);
  assert.equal(entry.demo.url, entry.docs);
  assert.match(entry.demo.label, /README|说明/);
  assert.match(copy(entry), /(?:中英文|CN\/EN)/);
  assert.match(copy(entry), /(?:提示词|prompt pack)/);
  assert.match(copy(entry), /不是独立.*(?:网页|Web).*应用/);
  assert.match(copy(entry), /不.*编造.*(?:数据|结果)/);
  assert.match(copy(entry), /不.*隐瞒.*(?:负面|不利)/);
  assert.match(copy(entry), /(?:局限|限制).*保留|保留.*(?:局限|限制)/);
});

test('new covers and thumbnails are real, locally stored, and traceable to author sources', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/covers/project-additions.sources.json', import.meta.url), 'utf8'));
  assert.deepEqual(manifest.map(item => item.id), additions.map(item => item.id));
  for (const expected of additions) {
    const entry = project(expected.id);
    const asset = manifest.find(item => item.id === entry.id);
    assert.equal(asset.reviewedAt, '2026-11-01');
    assert.equal(asset.repository, entry.source);
    assert.match(asset.revision, /^[a-f0-9]{40}$/);
    assert.ok(asset.sourceUrl.startsWith('https://'));
    assert.ok(asset.credit.includes(expected.author));
    assert.match(asset.method, /screenshot|resize/);
    assert.ok(copy(entry).includes(asset.sourceUrl), 'reader credits the exact cover source');
    const license = readFileSync(new URL(`../public/${asset.licensePath}`, import.meta.url), 'utf8');
    assert.match(license, expected.license === 'MIT' ? /Copyright \(c\) 2026 Adkid-Zephyr/ : /Apache License[\s\S]*Version 2\.0/);
    for (const path of [entry.cover, entry.preview]) {
      const bytes = readFileSync(new URL(`../public${path}`, import.meta.url));
      assert.ok(bytes.length > 1000, `${path} is not empty`);
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    }
  }
});
