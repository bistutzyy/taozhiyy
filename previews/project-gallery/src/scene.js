import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const positions = [[-6, 2.7], [-4.7, -1.8], [-1.65, -4.3], [1.75, -4.3], [4.8, -1.7], [6.1, 2.8]];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function createGallery(canvas, projects, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 650 ? 1.3 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef3f1');
  scene.fog = new THREE.Fog('#eef3f1', 45, 80);
  const camera = new THREE.OrthographicCamera(-13, 13, 8, -8, 0.1, 120);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.65;
  controls.minZoom = .7;
  controls.maxZoom = 2.25;
  controls.minPolarAngle = .4;
  controls.maxPolarAngle = 1.26;
  controls.minAzimuthAngle = -1.05;
  controls.maxAzimuthAngle = 1.05;
  controls.autoRotateSpeed = .24;
  scene.add(new THREE.HemisphereLight('#ffffff', '#bacabc', 2.25));
  const sun = new THREE.DirectionalLight('#fff6ec', 3.1);
  sun.position.set(-8, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, far: 60 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .035;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#deeff5', 1.1);
  fill.position.set(10, 8, -6);
  scene.add(fill);

  const material = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const white = material('#f7f8f3');
  const stone = material('#e2e9e0');
  const rose = material('#d9a7b2');
  const mint = material('#8db4a3');
  const brass = material('#ac9b78', .44, .42);
  function mesh(geometry, mat, position, parent = scene) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(size, mat, position, parent = scene, radius = .04) {
    return mesh(new RoundedBoxGeometry(...size, 2, radius), mat, position, parent);
  }
  function cylinder(top, bottom, height, mat, position, parent = scene) {
    return mesh(new THREE.CylinderGeometry(top, bottom, height, 64), mat, position, parent);
  }
  const ground = mesh(new THREE.PlaneGeometry(180, 180), material('#eef3f1'), [0, -.38, 0]);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  cylinder(9.1, 9.2, .22, material('#bacfc1'), [0, -.16, 0]);
  cylinder(9.04, 9.04, .24, white, [0, .01, 0]);
  cylinder(7.9, 7.9, .015, material('#edf0e9'), [0, .14, 0]);
  const rim = mesh(new THREE.TorusGeometry(8.65, .022, 8, 100), brass, [0, .15, 0]);
  rim.rotation.x = Math.PI / 2;

  // A small open architectural frame gives the exhibits a room without blocking them.
  box([.24, 4.5, .24], rose, [-3.05, 2.4, -6.25]);
  box([.24, 4.5, .24], rose, [3.05, 2.4, -6.25]);
  const arch = mesh(new THREE.TorusGeometry(3.05, .12, 12, 64, Math.PI), rose, [0, 4.65, -6.25]);
  arch.castShadow = true;
  box([6.4, .13, .45], white, [0, 4.54, -6.25]);
  const backRail = mesh(new THREE.TorusGeometry(8.35, .055, 8, 90, Math.PI), mint, [0, .88, 0]);
  backRail.rotation.x = Math.PI / 2;
  for (let i = 0; i <= 12; i++) {
    const a = i / 12 * Math.PI;
    cylinder(.035, .035, .72, mint, [8.35 * Math.cos(a), .53, -8.35 * Math.sin(a)]);
  }

  function labelTexture(width, height, draw) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }
  const sign = labelTexture(1024, 160, (ctx, w, h) => {
    ctx.fillStyle = '#f7f8f3'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#607469'; ctx.textAlign = 'center';
    ctx.font = '40px Georgia'; ctx.fillText('THE CURIOUS ROOM', w / 2, 67);
    ctx.font = '17px sans-serif'; ctx.fillStyle = '#a77b87'; ctx.fillText('PROJECTS  /  MADE & FOUND  /  01', w / 2, 112);
  });
  mesh(new THREE.PlaneGeometry(4.7, .73), new THREE.MeshBasicMaterial({ map: sign }), [0, 5.15, -6.05]);

  const inscription = labelTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#edf0e9'; ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center'; ctx.fillStyle = '#c5d4c8';
    ctx.font = '60px Georgia'; ctx.fillText('A little room', w / 2, 195);
    ctx.font = 'italic 58px Georgia'; ctx.fillText('for big ideas.', w / 2, 270);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#a1b4a4'; ctx.fillText('TAOZHIYY   /   COLLECTION 01', w / 2, 345);
  });
  const floorText = mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: inscription }), [0, .157, 1.4]);
  floorText.rotation.x = -Math.PI / 2;
  floorText.receiveShadow = false;
  floorText.castShadow = false;

  // Low bench, book plinth, and foliage stay secondary to the project screenshots.
  box([3.5, .28, .85], rose, [0, .85, 5.35], scene, .13);
  box([.35, .55, .62], white, [-1.2, .46, 5.35]);
  box([.35, .55, .62], white, [1.2, .46, 5.35]);
  cylinder(.6, .62, .68, stone, [-3, .5, 4.3]);
  [mint, white, rose].forEach((mat, i) => {
    const book = box([.82, .105, .55], mat, [-3, .91 + i * .115, 4.3]);
    book.rotation.y = i * .2 - .2;
  });
  function plant(x, z, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, .16, z); group.scale.setScalar(scale); scene.add(group);
    cylinder(.37, .25, .6, white, [0, .3, 0], group);
    cylinder(.31, .31, .025, material('#899b7a'), [0, .61, 0], group);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#779b84', side: THREE.DoubleSide, roughness: .95 });
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      const h = 1.0 + i % 3 * .23;
      const stem = new THREE.CylinderGeometry(.012, .012, h, 6);
      const stalk = mesh(stem, material('#77927a'), [.14 * Math.cos(a), .6 + h / 2, .14 * Math.sin(a)], group);
      stalk.rotation.z = .2 * Math.cos(a); stalk.rotation.x = .2 * Math.sin(a);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.bezierCurveTo(-.45, .24, -.35, .8, 0, 1); shape.bezierCurveTo(.35, .72, .48, .22, 0, 0);
      const leaf = mesh(new THREE.ShapeGeometry(shape, 10), leafMat, [.2 * Math.cos(a), .8 + h * .45, .2 * Math.sin(a)], group);
      leaf.rotation.set(-.5 + .3 * Math.sin(a), a, -.5 * Math.cos(a));
    }
  }
  plant(-7.4, -.4, 1.05); plant(7.3, -3.9, 1.1); plant(3.9, 5.7, .75);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const panels = new Map();
  const hits = [];
  let selected = projects[0].id;
  let hovered = null;
  let paused = false;
  let visible = true;
  let animation = null;
  let frameCount = 0;
  let loaded = 0;
  let requested = 0;
  let rendering = false;
  let dirtyUntil = 0;
  const loader = new THREE.TextureLoader();
  const imagePromises = [];
  projects.forEach((project, index) => {
    const [x, z] = positions[index];
    const group = new THREE.Group();
    group.position.set(x, .16, z);
    group.rotation.y = Math.atan2(-x, 19 - z);
    scene.add(group);
    const color = material(project.accent);
    const base = box([2.6, .17, 1.25], stone, [0, .1, 0], group, .08);
    box([2.2, .1, 1.0], white, [0, .23, 0], group);
    cylinder(.045, .045, 1.2, brass, [-.72, .9, 0], group);
    cylinder(.045, .045, 1.2, brass, [.72, .9, 0], group);
    box([2.94, 2.9, .18], white, [0, 2.55, 0], group, .07);
    box([.035, 2.55, .035], color, [-1.47, 2.55, .1], group, .01);
    const screenMat = new THREE.MeshBasicMaterial({ color: '#e1e8df' });
    const screen = mesh(new THREE.PlaneGeometry(2.69, 1.68), screenMat, [0, 2.98, .105], group);
    screen.castShadow = false;
    screen.userData.projectId = project.id;
    hits.push(screen);
    const plateTexture = labelTexture(1024, 310, (ctx, w, h) => {
      ctx.fillStyle = '#f7f8f3'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = project.accent; ctx.font = '500 28px sans-serif';
      ctx.fillText(`${String(index + 1).padStart(2, '0')}  /  ${project.kind === 'mine' ? 'SELF-MADE' : 'CURATED'}`, 38, 62);
      ctx.fillStyle = '#354c41';
      ctx.font = '500 63px "Microsoft YaHei", sans-serif';
      let size = 63;
      while (ctx.measureText(project.title).width > w - 76 && size > 35) ctx.font = `500 ${--size}px "Microsoft YaHei", sans-serif`;
      ctx.fillText(project.title, 38, 154);
      ctx.font = '29px sans-serif'; ctx.fillStyle = '#829386';
      ctx.fillText(project.category + '   /   ' + project.author, 38, 233);
    });
    const plate = mesh(new THREE.PlaneGeometry(2.69, .815), new THREE.MeshBasicMaterial({ map: plateTexture }), [0, 1.65, .106], group);
    plate.userData.projectId = project.id;
    plate.castShadow = false;
    hits.push(plate);
    const glow = mesh(new THREE.RingGeometry(.11, .145, 28), new THREE.MeshBasicMaterial({ color: project.accent, side: THREE.DoubleSide }), [0, .31, .6], group);
    glow.rotation.x = -Math.PI / 2;
    panels.set(project.id, { group, screen, base, color, glow });
    imagePromises.push(loader.loadAsync(project.cover).then(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      screenMat.map = texture; screenMat.color.set('#ffffff'); screenMat.needsUpdate = true; loaded++; wake();
    }).catch(() => { screenMat.color.set(project.accent); wake(); }));
  });

  function overview(immediate = false) {
    const mobile = innerWidth < 650;
    const target = new THREE.Vector3(0, mobile ? 1.35 : 2.4, 0);
    const position = new THREE.Vector3(mobile ? 5 : 7, 14, 24);
    moveCamera(position, target, 1, immediate);
  }
  function moveCamera(position, target, zoom, immediate = false) {
    controls.autoRotate = false;
    if (immediate || reduced) {
      camera.position.copy(position); controls.target.copy(target); camera.zoom = zoom; camera.updateProjectionMatrix(); controls.update(); animation = null;
    } else {
      animation = { started: performance.now(), from: camera.position.clone(), to: position, targetFrom: controls.target.clone(), targetTo: target, zoomFrom: camera.zoom, zoomTo: zoom };
    }
    wake(1300);
  }
  function focus(id, close = true) {
    selected = id;
    const panel = panels.get(id);
    if (!panel) return;
    if (close) {
      const center = panel.group.localToWorld(new THREE.Vector3(0, 2.5, 0));
      const offset = new THREE.Vector3(0, 7.5, 20).applyAxisAngle(new THREE.Vector3(0, 1, 0), panel.group.rotation.y);
      moveCamera(center.clone().add(offset), center, innerWidth < 650 ? 1.8 : 2.0);
    }
    wake();
  }
  function setFilter(ids) {
    for (const [id, panel] of panels) panel.group.visible = ids.includes(id);
    wake();
  }
  function render(now) {
    requested = 0;
    if (paused || !visible) return;
    rendering = true;
    if (animation) {
      const t = Math.min((now - animation.started) / 1000, 1);
      const k = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(animation.from, animation.to, k);
      controls.target.lerpVectors(animation.targetFrom, animation.targetTo, k);
      camera.zoom = THREE.MathUtils.lerp(animation.zoomFrom, animation.zoomTo, k);
      camera.updateProjectionMatrix();
      if (t === 1) animation = null;
    }
    for (const [id, p] of panels) {
      p.base.material = id === selected ? p.color : stone;
      p.glow.visible = id === selected || id === hovered;
    }
    controls.update();
    if (controls.autoRotate) {
      const angle = controls.getAzimuthalAngle();
      if (angle < controls.minAzimuthAngle + .025) controls.autoRotateSpeed = -.24;
      if (angle > controls.maxAzimuthAngle - .025) controls.autoRotateSpeed = .24;
    }
    renderer.render(scene, camera);
    frameCount++;
    rendering = false;
    if (animation || controls.autoRotate || now < dirtyUntil) requested = requestAnimationFrame(render);
  }
  function wake(duration = 180) {
    dirtyUntil = Math.max(dirtyUntil, performance.now() + duration);
    if (!requested && !rendering && !paused && visible) requested = requestAnimationFrame(render);
  }
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const width = w < 650 ? 22 : w < 1000 ? 25 : 28.5;
    camera.left = -width / 2; camera.right = width / 2;
    camera.top = width / (w / h) / 2; camera.bottom = -camera.top;
    camera.updateProjectionMatrix(); renderer.setSize(w, h, false); wake();
  }
  controls.addEventListener('change', () => wake());
  controls.addEventListener('start', () => { animation = null; wake(1200); });
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hits.filter(hit => hit.parent.visible), false)[0]?.object.userData.projectId;
  }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => {
    const id = pick(e);
    if (hovered !== id) { hovered = id; canvas.style.cursor = id ? 'pointer' : 'grab'; wake(); }
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; down = null; wake(); });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const id = pick(e);
    if (id) onSelect(id);
  });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('gallery-context-lost')); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) wake(); });
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  resize(); overview(true);
  await Promise.allSettled(imagePromises);
  wake();
  return {
    focus, overview, setFilter,
    setPaused(value) { paused = value; if (!paused) wake(); },
    zoom(direction) { animation = null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * (direction > 0 ? 1.16 : .86), .7, 2.25); camera.updateProjectionMatrix(); wake(); },
    orbit(value) { animation = null; controls.autoRotate = value && !reduced; wake(); return controls.autoRotate; },
    debug() {
      return { frameCount, loaded, selected, paused, camera: camera.position.toArray(), zoom: camera.zoom, draws: renderer.info.render.calls,
        projected: [...panels].filter(([, p]) => p.group.visible).map(([id, p]) => {
          const v = p.screen.getWorldPosition(new THREE.Vector3()).project(camera);
          return { id, x: (v.x + 1) / 2 * canvas.clientWidth, y: (1 - v.y) / 2 * canvas.clientHeight };
        }) };
    },
  };
}
