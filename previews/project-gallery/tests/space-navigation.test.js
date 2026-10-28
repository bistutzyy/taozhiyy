import test from 'node:test';
import assert from 'node:assert/strict';
import { spaceWindow, wheelDistance, motionBlend } from '../src/space-navigation.js';

test('continuous project windows retain an incoming node and clamp both ends', () => {
  assert.deepEqual(spaceWindow(9,0,6), {position:0,start:0,end:7,max:3});
  assert.deepEqual(spaceWindow(9,1.25,6), {position:1.25,start:1,end:8,max:3});
  assert.deepEqual(spaceWindow(9,999,6), {position:3,start:3,end:9,max:3});
  assert.deepEqual(spaceWindow(9,-99,3), {position:0,start:0,end:4,max:6});
  assert.deepEqual(spaceWindow(0,99,6), {position:0,start:0,end:0,max:0});
});
test('500 projects never require more than seven desktop or four mobile nodes', () => {
  for (const count of [3,6]) for(let position=0;position<500;position+=.37) {
    const window=spaceWindow(500,position,count);
    assert.ok(window.end-window.start<=count+1);
    assert.ok(window.end<=500 && window.start>=0);
  }
});
test('wheel and trackpad input respect dominant axis, units, direction and bounded jumps', () => {
  assert.ok(wheelDistance({deltaY:120,deltaX:0,deltaMode:0},900)>0);
  assert.ok(wheelDistance({deltaY:0,deltaX:-30,deltaMode:0},900)<0);
  assert.equal(wheelDistance({deltaY:0,deltaX:0,deltaMode:0},900),0);
  assert.ok(Math.abs(wheelDistance({deltaY:999999,deltaMode:0},900))<=1.2);
  assert.ok(wheelDistance({deltaY:3,deltaMode:1},900)>wheelDistance({deltaY:3,deltaMode:0},900));
});

test('motion settles at the same rate across display refresh rates without a tab-resume jump', () => {
  const at60=motionBlend(1000/60,75),at120=motionBlend(1000/120,75);
  assert.ok(Math.abs((1-at60)-(1-at120)**2)<1e-12);
  assert.equal(motionBlend(0,75),0);
  assert.ok(motionBlend(1000,75)<.6);
  assert.ok(motionBlend(16,55)>motionBlend(16,85));
});
