import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, filterProjects, nextProject } from '../src/catalog.js';

test('six real, uniquely identified projects have local covers and attributed links', () => {
  assert.equal(projects.length, 6);
  assert.equal(new Set(projects.map(p => p.id)).size, 6);
  for (const p of projects) {
    assert.ok(p.cover.startsWith('/covers/'));
    assert.ok(p.url.startsWith('https://'));
    assert.ok(p.author && p.summary && p.sections.length);
    assert.ok(['mine', 'shared'].includes(p.kind));
  }
});
test('filters preserve original data and combine ownership with case-insensitive search', () => {
  assert.equal(filterProjects(projects, 'mine', '').length, 3);
  assert.equal(filterProjects(projects, 'shared', 'three').length, 1);
  assert.equal(filterProjects(projects, 'all', '  MAGIC ').length, 1);
  assert.equal(filterProjects(projects, 'mine', 'starlight').length, 0);
  assert.equal(filterProjects(projects, 'all', 'not-a-project').length, 0);
  assert.equal(projects.length, 6);
});
test('next project wraps in both directions and tolerates empty filters', () => {
  assert.equal(nextProject(projects, projects.at(-1).id, 1).id, projects[0].id);
  assert.equal(nextProject(projects, projects[0].id, -1).id, projects.at(-1).id);
  assert.equal(nextProject([], '', 1), null);
  assert.equal(nextProject(projects, 'missing', 1).id, projects[0].id);
});
