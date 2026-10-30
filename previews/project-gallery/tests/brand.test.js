import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('project header displays taozhiyo without changing the home URL',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const brand=html.match(/<a class="brand"[\s\S]*?<\/a>/)?.[0];
  assert.ok(brand);
  assert.match(brand,/<span>taozhiyo<small>/);
  assert.match(brand,/href="https:\/\/taozhiyy\.top\/"/);
});

test('gallery and full-screen reader expose same-tab home and contextual back controls', () => {
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const home=html.match(/<a[^>]+class="home-link"[\s\S]*?<\/a>/)?.[0];
  assert.ok(home);
  assert.match(home,/返回主页/);
  assert.match(home,/href="https:\/\/taozhiyy\.top\/"/);
  assert.doesNotMatch(home,/target="_blank"/);
  assert.match(html,/id="reader-back"/);
  assert.match(html,/class="reader-home"/);
  assert.match(html,/data-theme-choice="silver"/);
  assert.match(html,/data-theme-choice="cosmos"/);
});
