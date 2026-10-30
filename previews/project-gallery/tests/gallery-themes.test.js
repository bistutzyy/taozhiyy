import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as THREE from 'three';
import * as navigation from '../src/space-navigation.js';

const themeUrl = new URL('../src/gallery-themes.js', import.meta.url);
const themes = existsSync(themeUrl) ? await import(themeUrl.href) : {};
const sceneSource = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');

function luminance(color) {
  const value = new THREE.Color(color);
  return .2126 * value.r + .7152 * value.g + .0722 * value.b;
}

test('theme choices and storage key expose the shared integration contract', () => {
  assert.equal(themes.GALLERY_THEME_STORAGE, 'taozhiyy.projects.theme.v1');
  assert.deepEqual(themes.GALLERY_THEMES, [
    {id:'cosmos', label:'星空'}, {id:'silver', label:'银白星图'},
  ]);
});

test('only exact known theme ids are accepted, with Cosmos as the safe fallback', () => {
  assert.equal(typeof themes.resolveGalleryTheme, 'function');
  for (const id of ['cosmos', 'silver']) assert.equal(themes.resolveGalleryTheme(id), id);
  for (const value of [undefined, null, '', 'Silver', ' silver ', 'unknown', '__proto__', 'constructor', 1, false, {}, [], Symbol('silver')]) {
    assert.equal(themes.resolveGalleryTheme(value), 'cosmos');
  }
});

test('Silver has a genuinely light palette with contrasting small normal-blended stars', () => {
  assert.equal(typeof themes.getScenePalette, 'function');
  const dark = themes.getScenePalette('cosmos'), light = themes.getScenePalette('silver');
  assert.equal(dark.id, 'cosmos');
  assert.equal(light.id, 'silver');
  assert.equal(themes.getScenePalette('invalid'), dark);
  assert.equal(themes.getScenePalette(), dark);
  assert.equal(dark.clear, '#08090e');
  assert.equal(light.clear, '#eef1f3');
  assert.equal(light.panel.label, '#27343b');
  assert.equal(light.panel.accent, '#366b69');
  assert.equal(light.orbits[1].color, '#97536a');
  assert.ok(luminance(dark.clear) < .01);
  assert.ok(luminance(light.clear) > .8);
  assert.equal(dark.blending, 'additive');
  assert.equal(light.blending, 'normal');
  assert.equal(dark.coordinates.visible, false);
  assert.equal(light.coordinates.visible, true);
  for (const [index, star] of light.stars.entries()) {
    assert.ok((luminance(light.clear) + .05) / (luminance(star.color) + .05) >= 4.5);
    assert.ok(star.size < dark.stars[index].size);
  }
  assert.ok((luminance(light.clear) + .05) / (luminance(light.panel.label) + .05) >= 7);
  assert.notEqual(light.panel.frame, dark.panel.frame);
  assert.notEqual(light.orbits[0].color, dark.orbits[0].color);
});

// Keep real Three.js objects; replace only browser, WebGL and image-loading boundaries.
async function galleryHarness({width = 1000, count = 9, pendingCovers = false} = {}) {
  let now = 100, nextFrame = 0, renderer;
  const scheduled = new Map(), coverRequests = [], groups = new Set();
  const context2d = surface => ({
    scale() {}, fillRect() {}, beginPath() {}, arc() {}, fill() {},
    moveTo() {}, lineTo() {}, stroke() {},
    createRadialGradient() { return {addColorStop() {}}; },
    measureText(text) { return {width:text.length * 25}; },
    fillText(text) { surface.text.push({text, color:this.fillStyle}); },
  });
  const canvas = {
    clientWidth:width, clientHeight:800, style:{}, listeners:new Map(),
    addEventListener(name, callback) { this.listeners.set(name, callback); },
    getBoundingClientRect() { return {left:0, top:0, width, height:800}; },
    setPointerCapture() {},
  };
  class Renderer {
    constructor() { renderer = this; }
    capabilities = {getMaxAnisotropy:() => 4};
    info = {render:{calls:0}};
    setClearColor(value) { this.clear = value; }
    setPixelRatio() {}
    setSize() {}
    render(scene, camera) {
      this.scene = scene;
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      for (const group of scene.children) {
        if (group.children.some(child => child.userData.projectId)) groups.add(group);
      }
    }
  }
  class Controls extends THREE.EventDispatcher {
    target = new THREE.Vector3();
    mouseButtons = {};
    touches = {};
    autoRotate = false;
    constructor(camera) { super(); this.camera = camera; }
    update() { this.camera.lookAt(this.target); }
    getAzimuthalAngle() { return 0; }
  }
  class CoverLoader {
    loadAsync(url) {
      return new Promise((resolve, reject) => {
        coverRequests.push({url, resolve, reject});
        if (!pendingCovers) resolve(new THREE.Texture());
      });
    }
  }
  const document = {
    hidden:false, addEventListener() {},
    createElement() {
      const surface = {text:[]};
      surface.getContext = () => context2d(surface);
      return surface;
    },
  };
  const source = sceneSource.replace(/^import .+;\r?$/gm, '').replace('export async function createGallery', 'async function createGallery');
  const createGallery = runInNewContext(`${source}\ncreateGallery`, {
    THREE:{...THREE, WebGLRenderer:Renderer, TextureLoader:CoverLoader},
    OrbitControls:Controls, ...navigation, ...themes,
    window:{matchMedia:() => ({matches:false})}, document,
    innerWidth:width, devicePixelRatio:1, performance:{now:() => now},
    requestAnimationFrame(callback) { const id = ++nextFrame; scheduled.set(id, callback); return id; },
    ResizeObserver:class { observe() {} },
  }, {filename:'scene.js'});
  const projects = Array.from({length:count}, (_, index) => ({
    id:`p${index}`, title:`Project ${index}`, category:'Tools', cover:`/cover-${index}.webp`,
  }));
  const gallery = await createGallery(canvas, projects, () => {});
  function flush(limit = 300) {
    for (let i = 0; scheduled.size && i < limit; i++) {
      const callbacks = [...scheduled.values()]; scheduled.clear(); now += 16.67;
      for (const callback of callbacks) callback(now);
    }
  }
  flush();
  return {gallery, renderer, canvas, groups, coverRequests, scheduled, flush, document};
}

function navigationState(gallery) {
  const state = gallery.debug();
  return JSON.parse(JSON.stringify(Object.fromEntries([
    'selected', 'position', 'destination', 'camera', 'zoom', 'paused', 'autoRotate',
    'nodeCount', 'cachedProjects', 'retainedProjects', 'createdPanels', 'cacheHits',
  ].map(key => [key, state[key]]))));
}

test('gallery exposes setTheme and debug theme, defaults to unchanged Cosmos and wakes on demand', async () => {
  const {gallery, renderer, scheduled, flush} = await galleryHarness();
  assert.equal(typeof gallery.setTheme, 'function');
  assert.equal(gallery.debug().theme, 'cosmos');
  assert.equal(renderer.clear, '#08090e');
  assert.equal(scheduled.size, 0);
  const field = renderer.scene.children.find(group => group.children.some(child => child.isPoints));
  const stars = field.children.filter(child => child.isPoints);
  const original = stars.map(star => ({geometry:star.geometry, map:star.material.map, size:star.material.size, opacity:star.material.opacity}));
  assert.deepEqual(stars.map(star => star.material.size), [.65, 1.8, .43]);
  const before = navigationState(gallery);
  assert.equal(gallery.setTheme('silver'), 'silver');
  assert.equal(gallery.debug().theme, 'silver');
  assert.equal(renderer.clear, themes.getScenePalette('silver').clear);
  assert.deepEqual(navigationState(gallery), before);
  assert.equal(scheduled.size, 1);
  for (const [index, star] of stars.entries()) {
    assert.equal(star.geometry, original[index].geometry);
    assert.equal(star.material.map, original[index].map);
    assert.equal(star.material.blending, THREE.NormalBlending);
    assert.ok(star.material.size < original[index].size);
    assert.ok(luminance(star.material.color) < .2);
  }
  const coordinates = field.children.find(child => child.isLineSegments);
  assert.ok(coordinates?.visible);
  assert.ok(coordinates.geometry.getAttribute('position').count >= 20);
  flush();
  assert.equal(scheduled.size, 0);
  const frames = gallery.debug().frameCount;
  gallery.setTheme('silver');
  flush();
  assert.equal(gallery.debug().frameCount, frames);
  assert.equal(gallery.setTheme('invalid'), 'cosmos');
  assert.equal(renderer.clear, '#08090e');
  for (const [index, star] of stars.entries()) {
    assert.equal(star.material.blending, THREE.AdditiveBlending);
    assert.equal(star.material.color.getHexString(), 'ffffff');
    assert.equal(star.material.size, original[index].size);
    assert.equal(star.material.opacity, original[index].opacity);
  }
  assert.equal(coordinates.visible, false);
  flush();
  assert.equal(scheduled.size, 0);
});

test('theme changes refresh active and cached labels in place without refetching covers or unpausing', async () => {
  const {gallery, groups, coverRequests, scheduled, flush} = await galleryHarness();
  assert.equal(typeof gallery.setTheme, 'function');
  gallery.focus('p8', false); flush();
  assert.ok(gallery.debug().cachedProjects > 0);
  assert.equal(groups.size, 9);
  gallery.orbit(true); gallery.setPaused(true); flush();
  const before = navigationState(gallery), loads = coverRequests.length;
  const resources = [...groups].map(group => {
    const screen = group.children.find(child => child.userData.projectId && child.position.y > 0);
    const label = group.children.find(child => child.userData.projectId && child.position.y < 0);
    let disposed = 0;
    label.material.map.addEventListener('dispose', () => disposed++);
    return {group, position:group.position.clone(), screen, cover:screen.material.map, label,
      map:label.material.map, geometry:label.geometry, material:label.material, disposed:() => disposed};
  });
  gallery.setTheme('silver');
  assert.deepEqual(navigationState(gallery), before);
  assert.equal(scheduled.size, 0);
  assert.equal(coverRequests.length, loads);
  for (const resource of resources) {
    assert.ok(resource.group.position.equals(resource.position));
    assert.equal(resource.screen.material.map, resource.cover);
    assert.equal(resource.label.geometry, resource.geometry);
    assert.equal(resource.label.material, resource.material);
    assert.notEqual(resource.label.material.map, resource.map);
    assert.equal(resource.disposed(), 1);
    assert.equal(resource.label.material.map.image.text[0].color, themes.getScenePalette('silver').panel.label);
  }
  const currentLabels = resources.map(resource => resource.label.material.map);
  gallery.setTheme('silver');
  resources.forEach((resource, index) => assert.equal(resource.label.material.map, currentLabels[index]));
  gallery.orbit(false); gallery.setPaused(false); flush();
  assert.ok(gallery.debug().frameCount > 0);
  gallery.focus('p0', false); flush();
  assert.equal(coverRequests.length, loads);
  assert.ok(gallery.debug().cacheHits > before.cacheHits);
  assert.equal(resources[0].group.parent?.isScene, true);
  gallery.setTheme('cosmos');
  for (const resource of resources) {
    assert.equal(resource.label.material.map.image.text[0].color, '#eef0f6');
    assert.equal(resource.disposed(), 1);
  }
});

test('late cover failures use the current theme instead of a stale Cosmos placeholder', async () => {
  const {gallery, coverRequests, groups, flush} = await galleryHarness({pendingCovers:true});
  assert.equal(typeof gallery.setTheme, 'function');
  gallery.setTheme('silver');
  coverRequests.forEach(request => request.reject(new Error('missing local cover')));
  await Promise.resolve(); await Promise.resolve();
  flush();
  for (const group of groups) {
    const screen = group.children.find(child => child.userData.projectId && child.position.y > 0);
    assert.equal(screen.material.color.getHexString(), new THREE.Color(themes.getScenePalette('silver').panel.accent).getHexString());
  }
  gallery.setTheme('cosmos');
  for (const group of groups) {
    const screen = group.children.find(child => child.userData.projectId && child.position.y > 0);
    assert.equal(screen.material.color.getHexString(), 'acbfd3');
  }
});

test('500-project mobile and desktop caches remain bounded across navigation and theme changes', async () => {
  for (const width of [375, 1000]) {
    const {gallery, flush} = await galleryHarness({width, count:500});
    assert.equal(typeof gallery.setTheme, 'function');
    for (const [index, id] of ['p8', 'p20', 'p100', 'p499', 'p4'].entries()) {
      gallery.focus(id, false); flush();
      const before = navigationState(gallery);
      gallery.setTheme(index % 2 ? 'cosmos' : 'silver');
      assert.deepEqual(navigationState(gallery), before);
      flush();
      const state = gallery.debug();
      assert.ok(state.nodeCount <= (width < 650 ? 4 : 7));
      assert.ok(state.retainedProjects <= state.cacheLimit);
      assert.equal(state.selected, id);
    }
  }
});
