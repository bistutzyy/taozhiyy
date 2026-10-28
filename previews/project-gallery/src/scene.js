import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const slots = [[-7, 1.2, 1], [-4.5, 2.8, -5], [-1.4, -1.8, 2], [2.7, 2.1, -3], [7, -.3, 0], [4, -2.8, 4]];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function createGallery(canvas, projects, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 650 ? 1.3 : 1.6));
  renderer.setClearColor('#08090e');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 250);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .085;
  controls.enablePan = false; controls.rotateSpeed = .35;
  controls.minDistance = 10; controls.maxDistance = 80;
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.7;
  controls.minAzimuthAngle = -.85; controls.maxAzimuthAngle = .85;
  controls.autoRotateSpeed = .12;
  let requested = 0, rendering = false, dirtyUntil = 0, frames = 0;
  let paused = false, animation = null, generation = 0, loaded = 0;
  let selected = projects[0]?.id, hovered = null;
  const panels = new Map();
  const loader = new THREE.TextureLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  function texture(width, height, draw) {
    const surface = document.createElement('canvas');
    surface.width = width; surface.height = height;
    draw(surface.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(surface); map.colorSpace = THREE.SRGBColorSpace; return map;
  }
  const starMap = texture(32, 32, ctx => {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(16, 16, 6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .15; ctx.beginPath(); ctx.arc(16, 16, 11, 0, Math.PI * 2); ctx.fill();
  });
  // Seeded star fields are independent of project count and use three draw calls.
  let seed = 437;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function stars(count, size, band = false) {
    const positions = [], colors = [];
    for (let i = 0; i < count; i++) {
      const x = (random() - .5) * 180;
      const y = band ? x * .27 + (random() + random() + random() - 1.5) * 12 : (random() - .5) * 135;
      const z = band ? -45 - random() * 40 : -100 + random() * 125;
      if (Math.hypot(x, y, z) < 20) { i--; continue; }
      positions.push(x, y, z);
      const value = .25 + random() * .7, tint = random();
      colors.push(value, value * (tint < .12 ? .65 : .96), value * (tint > .88 ? .7 : 1));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({size, map:starMap, vertexColors:true, transparent:true, depthWrite:false, opacity:band ? .7 : .95, blending:THREE.AdditiveBlending})));
  }
  const mobile = innerWidth < 650;
  stars(mobile ? 1100 : 2400, .5);
  stars(mobile ? 160 : 320, .95);
  stars(mobile ? 1500 : 3400, .32, true);
  function circle(radius, color, opacity, parent) {
    const points = Array.from({length:97}, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * radius, Math.sin(i / 96 * Math.PI * 2) * radius, 0));
    const object = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color, transparent:true, opacity}));
    parent.add(object); return object;
  }
  const orbit = new THREE.Group(); orbit.rotation.set(-1.12, .18, -.2); scene.add(orbit);
  circle(9.9, '#6e7489', .16, orbit); circle(13.6, '#8a6174', .1, orbit);
  function disposePanels() {
    for (const panel of panels.values()) {
      scene.remove(panel.group);
      panel.group.traverse(object => {
        object.geometry?.dispose();
        if (object.material) { object.material.map?.dispose(); object.material.dispose(); }
      });
    }
    panels.clear();
  }
  function setProjects(items) {
    const bounded = items.slice(0, 6);
    if ([...panels.keys()].join('|') === bounded.map(p => p.id).join('|')) return;
    const token = ++generation; disposePanels(); loaded = 0;
    bounded.forEach((project, index) => {
      const group = new THREE.Group(); group.position.set(...slots[index]); scene.add(group);
      const color = '#acbfd3';
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.46, 1.56), new THREE.MeshBasicMaterial({color:'#333744'}));
      frame.position.y = .65; group.add(frame);
      const screenMaterial = new THREE.MeshBasicMaterial({color:'#11141e'});
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), screenMaterial);
      screen.position.set(0, .65, .01); screen.userData.projectId = project.id; group.add(screen);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), new THREE.MeshBasicMaterial({color}));
      dot.position.set(0, 1.65, .02); group.add(dot);
      const ring = circle(.15, color, .9, group); ring.position.copy(dot.position);
      const labelMap = texture(768, 160, ctx => {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#eef0f6'; let size = 68; ctx.font = `500 ${size}px "Microsoft YaHei", sans-serif`;
        while (ctx.measureText(project.title).width > 748 && size > 26) ctx.font = `500 ${--size}px "Microsoft YaHei", sans-serif`;
        ctx.fillText(project.title, 384, 78);
        ctx.fillStyle = color; ctx.font = '27px monospace'; ctx.fillText(project.category, 384, 135);
      });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .75), new THREE.MeshBasicMaterial({map:labelMap, transparent:true, depthWrite:false}));
      label.position.set(0, -.65, .02); label.userData.projectId = project.id; group.add(label);
      panels.set(project.id, {group, screen, label, frame, ring, color});
      loader.loadAsync(project.cover).then(map => {
        if (token !== generation) { map.dispose(); return; }
        map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        screenMaterial.color.set('#ffffff'); screenMaterial.map = map; screenMaterial.needsUpdate = true; loaded++; wake();
      }).catch(() => { if (token === generation) { screenMaterial.color.set(color); wake(); } });
    });
    wake();
  }
  function moveCamera(position, target, zoom, immediate = false) {
    controls.autoRotate = false;
    if (immediate || reduced) {
      camera.position.copy(position); controls.target.copy(target); camera.zoom = zoom;
      camera.updateProjectionMatrix(); controls.update(); animation = null;
    } else animation = {started:performance.now(), from:camera.position.clone(), to:position, targetFrom:controls.target.clone(), targetTo:target, zoomFrom:camera.zoom, zoomTo:zoom};
    wake(1400);
  }
  function overview(immediate = false) {
    moveCamera(new THREE.Vector3(0, innerWidth < 650 ? 7 : 5, innerWidth < 650 ? 48 : 25), new THREE.Vector3(0, 0, 0), 1, immediate);
  }
  function focus(id, close = true) {
    selected = id; const p = panels.get(id);
    if (p && close) {
      const target = p.group.position.clone();
      moveCamera(target.clone().add(new THREE.Vector3(0, 2, innerWidth < 650 ? 24 : 17)), target, innerWidth < 650 ? 1.8 : 2);
    }
    wake();
  }
  function render(now) {
    requested = 0; if (paused || document.hidden) return; rendering = true;
    if (animation) {
      const t = Math.min((now - animation.started) / 1100, 1), k = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(animation.from, animation.to, k); controls.target.lerpVectors(animation.targetFrom, animation.targetTo, k);
      camera.zoom = THREE.MathUtils.lerp(animation.zoomFrom, animation.zoomTo, k); camera.updateProjectionMatrix();
      if (t === 1) animation = null;
    }
    controls.update();
    if (controls.autoRotate) {
      if (controls.getAzimuthalAngle() < controls.minAzimuthAngle + .025) controls.autoRotateSpeed = -.12;
      if (controls.getAzimuthalAngle() > controls.maxAzimuthAngle - .025) controls.autoRotateSpeed = .12;
    }
    for (const [id, p] of panels) {
      p.group.quaternion.copy(camera.quaternion);
      p.frame.material.color.set(id === selected || id === hovered ? p.color : '#333744');
      p.ring.visible = id === selected || id === hovered;
    }
    renderer.render(scene, camera); frames++; rendering = false;
    if (animation || controls.autoRotate || now < dirtyUntil) requested = requestAnimationFrame(render);
  }
  function wake(duration = 180) {
    dirtyUntil = Math.max(dirtyUntil, performance.now() + duration);
    if (!requested && !rendering && !paused && !document.hidden) requested = requestAnimationFrame(render);
  }
  function resize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); wake();
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects([...panels.values()].flatMap(p => [p.screen, p.label]))[0]?.object.userData.projectId;
  }
  let down;
  canvas.addEventListener('pointerdown', e => { down = {x:e.clientX, y:e.clientY}; });
  canvas.addEventListener('pointermove', e => { const id = pick(e); if (id !== hovered) { hovered = id; canvas.style.cursor = id ? 'pointer' : 'grab'; wake(); } });
  canvas.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) { const id = pick(e); if (id) onSelect(id); } down = null; });
  canvas.addEventListener('pointerleave', () => { down = null; hovered = null; wake(); });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('gallery-context-lost')); });
  controls.addEventListener('change', () => wake());
  controls.addEventListener('start', () => { animation = null; wake(1200); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  new ResizeObserver(resize).observe(canvas);
  resize(); overview(true); setProjects(projects);
  return {
    focus, overview, setProjects,
    setPaused(value) { paused = value; if (!value) wake(); },
    zoom(direction) { animation = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * (direction > 0 ? 1.16 : .86), .7, 2.3); camera.updateProjectionMatrix(); wake(); },
    orbit(value) { animation = null; controls.autoRotate = value && !reduced; wake(); return controls.autoRotate; },
    debug() {
      return {frameCount:frames, loaded, nodeCount:panels.size, selected, paused, camera:camera.position.toArray(), zoom:camera.zoom, draws:renderer.info.render.calls,
        projected:[...panels].map(([id, p]) => { const v = p.screen.getWorldPosition(new THREE.Vector3()).project(camera); return {id, x:(v.x + 1) / 2 * canvas.clientWidth, y:(1 - v.y) / 2 * canvas.clientHeight}; })};
    },
  };
}
