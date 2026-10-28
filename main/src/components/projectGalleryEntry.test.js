import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./Features.jsx',import.meta.url),'utf8');
test('fragment 01 links to the separate project cosmos while retaining its video',()=>{
  const card=source.match(/<ExhibitCard\s+src=\{[^\n]*feature-1[\s\S]*?\/>/)?.[0];
  assert.ok(card);
  assert.match(card,/linkUrl="\/projects\/"/);
  assert.match(card,/linkText="进入奇想馆"/);
  assert.match(card,/visualOnly/);
  assert.match(source,/index:\s*"01"[\s\S]*?linkUrl:\s*"\/projects\/"/);
});
test('visual-only fragment links are accessible and the old destinations stay intact',()=>{
  const branch=source.slice(source.indexOf('if (visualOnly)'),source.indexOf('if (visualOnly)')+2400);
  assert.match(branch,/href=\{linkUrl\}/);
  assert.match(branch,/aria-label=\{linkText\}/);
  assert.match(source,/linkUrl="https:\/\/bistutzyy.github.io\/"/);
  assert.match(source,/linkUrl="\/build\/"/);
});
