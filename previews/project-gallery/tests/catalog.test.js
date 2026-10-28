import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, filterProjects, nextProject, projectPage } from '../src/catalog.js';

test('personal website plus eight requested projects have covers, tutorials, and attribution', () => {
  assert.equal(projects.length, 9);
  assert.deepEqual(projects.map(p => p.id), ['taozhiyy','ruic','shotcraft','reactbits','gsap','emil','qwen','designmd','drawio']);
  assert.equal(new Set(projects.map(p => p.id)).size, 9);
  for (const p of projects) {
    assert.ok(p.cover.startsWith('/covers/'));
    assert.ok(p.url.startsWith('https://'));
    assert.ok(p.author && p.summary && p.sections.length >= 5);
    assert.equal(p.kind, undefined);
    assert.ok(p.license && p.licenseUrl && p.docs);
    assert.ok(p.demo.url.startsWith('https://'));
    assert.equal(p.reviewedAt, '2026-10-28');
  }
});
test('search is case-insensitive across titles, authors and tags without ownership divisions', () => {
  assert.equal(filterProjects(projects, '').length, 9);
  assert.equal(filterProjects(projects, '  QWEN  ').length, 1);
  assert.equal(filterProjects(projects, 'HRuiCcc').length, 1);
  assert.equal(filterProjects(projects, 'not-a-project').length, 0);
  assert.equal(projects.length, 9);
});
test('next project wraps in both directions and tolerates empty filters', () => {
  assert.equal(nextProject(projects, projects.at(-1).id, 1).id, projects[0].id);
  assert.equal(nextProject(projects, projects[0].id, -1).id, projects.at(-1).id);
  assert.equal(nextProject([], '', 1), null);
  assert.equal(nextProject(projects, 'missing', 1).id, projects[0].id);
});

test('500 projects remain bounded to six space nodes or twelve directory cards', () => {
  const many = Array.from({length:500}, (_, i) => ({...projects[i % projects.length], id:`project-${i}`, title:`Project ${i}`}));
  assert.equal(projectPage(many, 0, 6).items.length, 6);
  assert.equal(projectPage(many, 83, 6).items.length, 2);
  assert.equal(projectPage(many, 0, 12).pages, 42);
  assert.equal(projectPage(many, 999, 12).page, 41);
  assert.equal(projectPage(many, -2, 12).page, 0);
  assert.equal(projectPage([], 0, 6).pages, 0);
  assert.equal(projectPage(many, 10, 6).items[0].id, 'project-60');
  assert.equal(filterProjects(many, 'Project 499').length, 1);
  assert.equal(many.length, 500);
});
