import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, filterProjects, nextProject, projectPage } from '../src/catalog.js';

test('personal website plus eight requested projects have covers, tutorials, and attribution', () => {
  const entries = projects.filter(p => !p.isGuide);
  assert.equal(entries.length, 9);
  assert.deepEqual(entries.map(p => p.id), ['taozhiyy','ruic','shotcraft','reactbits','gsap','emil','qwen','designmd','drawio']);
  assert.equal(new Set(projects.map(p => p.id)).size, 10);
  for (const p of entries) {
    assert.ok(p.cover.startsWith('/covers/'));
    assert.equal(p.preview,`/thumbs/${p.id}.webp`);
    assert.ok(p.url.startsWith('https://'));
    assert.ok(p.author && p.summary && p.sections.length >= 5);
    assert.equal(p.kind, undefined);
    assert.ok(p.license && p.licenseUrl && p.docs);
    assert.ok(p.demo.url.startsWith('https://'));
    assert.equal(p.reviewedAt, '2026-10-28');
  }
});

test('the first scene entry explains Project Cosmos without inventing an external project', () => {
  const guide = projects[0];
  assert.equal(projects.length, 10);
  assert.equal(guide.id, 'project-guide');
  assert.equal(guide.isGuide, true);
  assert.equal(guide.category, '板块介绍');
  assert.equal(guide.cover, '/covers/project-guide.webp');
  assert.equal(guide.preview, '/thumbs/project-guide.webp');
  const copy = guide.sections.map(section => section.join(' ')).join(' ');
  for (const phrase of ['开源项目', '实用工具', '教程', '试用', '作者', '来源']) assert.ok(copy.includes(phrase), phrase);
  assert.equal(guide.source, undefined);
  assert.equal(guide.demo, undefined);
  assert.equal(filterProjects(projects, '板块介绍')[0].id, guide.id);
});

test('search is case-insensitive across titles, authors and tags without ownership divisions', () => {
  assert.equal(filterProjects(projects, '').length, 10);
  assert.equal(filterProjects(projects, '  QWEN  ').length, 1);
  assert.equal(filterProjects(projects, 'HRuiCcc').length, 1);
  assert.equal(filterProjects(projects, 'not-a-project').length, 0);
  assert.equal(projects.length, 10);
});
test('next project wraps in both directions and tolerates empty filters', () => {
  assert.equal(nextProject(projects, projects.at(-1).id, 1).id, projects[0].id);
  assert.equal(nextProject(projects, projects[0].id, -1).id, projects.at(-1).id);
  assert.equal(nextProject([], '', 1), null);
  assert.equal(nextProject(projects, 'missing', 1).id, projects[0].id);
});

test('500 projects keep directory pages bounded and search complete', () => {
  const many = Array.from({length:500}, (_, i) => ({...projects[i % projects.length], id:`project-${i}`, title:`Project ${i}`}));
  assert.equal(projectPage(many, 0, 12).items.length, 12);
  assert.equal(projectPage(many, 41, 12).items.length, 8);
  assert.equal(projectPage(many, 0, 12).pages, 42);
  assert.equal(projectPage(many, 999, 12).page, 41);
  assert.equal(projectPage(many, -2, 12).page, 0);
  assert.equal(projectPage([], 0, 6).pages, 0);
  assert.equal(projectPage(many, 10, 12).items[0].id, 'project-120');
  assert.equal(filterProjects(many, 'Project 499').length, 1);
  assert.equal(many.length, 500);
});
