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
