import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const positions = [[-7.3, 2.8], [-6.7, -2.5], [-2.2, -4.1], [2.4, -4.1], [6.9, -2.5], [7.1, 3.2]];
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function createGallery(canvas, projects, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 650 ? 1.3 : 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = .95;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8eaed');
  scene.fog = new THREE.Fog('#e8eaed', 40, 75);
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
  scene.add(new THREE.HemisphereLight('#ffffff', '#929aa6', 1.7));
  const sun = new THREE.DirectionalLight('#ffffff', 2.7);
  sun.position.set(-8, 18, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, far: 60 });
  sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .035;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#e3eaff', 1.3);
  fill.position.set(10, 8, -6);
  scene.add(fill);

  const material = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const white = material('#e6e8eb', .57, .18);
  const stone = material('#373b42', .6, .25);
  const aluminum = material('#b8bfc9', .28, .65);
  const graphite = material('#202329', .64, .18);
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
  const ground = mesh(new THREE.PlaneGeometry(180, 180), material('#dce0e5', .74), [0, -.12, 0]);
  ground.rotation.x = -Math.PI / 2;
  ground.castShadow = false;
  // Flush architectural paving replaces the miniature circular stage.
  box([21, .08, 13], white, [0, -.035, -.3], scene, .005);
  const seam = material('#bfc4cc', .85);
  for (let x = -10; x <= 10; x += 2.5) box([.012, .004, 13], seam, [x, .008, -.3], scene, .001);
  for (let z = -6.8; z <= 6.2; z += 2.6) box([21, .004, .012], seam, [0, .008, z], scene, .001);
  box([10.4, .12, .12], aluminum, [.1, 6.1, -6.45], scene, .015);
  box([.09, 6.1, .09], aluminum, [-5.1, 3.05, -6.45], scene, .01);
  box([.09, 6.1, .09], aluminum, [5.3, 3.05, -6.45], scene, .01);
  box([9.7, .025, .18], new THREE.MeshBasicMaterial({color:'#ffffff'}), [.1, 6.01, -6.43], scene, .005);

  function labelTexture(width, height, draw) {
    const c = document.createElement('canvas'); c.width = width; c.height = height;
    const ctx = c.getContext('2d'); draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }
  const inscription = labelTexture(1024, 512, (ctx, w, h) => {
    ctx.textAlign = 'center'; ctx.fillStyle = '#7e858e';
    ctx.font = '600 130px sans-serif'; ctx.fillText('COLLECTION', w / 2, 205);
    ctx.font = '600 130px sans-serif'; ctx.fillText('01 / 06', w / 2, 355);
    ctx.font = '22px monospace'; ctx.fillStyle = '#b64d60'; ctx.fillText('TAOZHIYY  /  WORKS & DISCOVERIES', w / 2, 425);
  });
  const floorText = mesh(new THREE.PlaneGeometry(5.4, 2.7), new THREE.MeshBasicMaterial({ map: inscription, transparent: true, depthWrite: false }), [-.8, .02, 3.3]);
  floorText.rotation.x = -Math.PI / 2;
  floorText.receiveShadow = false;
  floorText.castShadow = false;

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
    group.position.set(x, .02, z);
    group.rotation.y = Math.atan2(-x, 28 - z);
    scene.add(group);
    const color = material('#c7556b', .48, .25);
    box([3.98, 4.7, .34], index % 2 ? white : graphite, [0, 2.35, 0], group, .025);
    box([.045, 4.7, .37], aluminum, [-1.99, 2.35, 0], group, .005);
    box([.045, 4.7, .37], aluminum, [1.99, 2.35, 0], group, .005);
    const base = box([3.98, .08, .38], stone, [0, .06, .02], group, .005);
    box([3.68, 2.35, .08], graphite, [0, 3.22, .2], group, .01);
    const screenMat = new THREE.MeshBasicMaterial({ color: '#c9cdd4' });
    const screen = mesh(new THREE.PlaneGeometry(3.5, 2.1875), screenMat, [0, 3.22, .247], group);
    screen.castShadow = false;
    screen.userData.projectId = project.id;
    hits.push(screen);
    const plateTexture = labelTexture(1024, 310, (ctx, w, h) => {
      ctx.fillStyle = index % 2 ? '#ad3e55' : '#ef9bad'; ctx.font = '500 28px monospace';
      ctx.fillText(`${String(index + 1).padStart(2, '0')}  /  ${project.kind === 'mine' ? 'SELF-MADE' : 'CURATED'}`, 38, 62);
      ctx.fillStyle = index % 2 ? '#25282f' : '#f2f3f5';
      ctx.font = '500 63px "Microsoft YaHei", sans-serif';
      let size = 63;
      while (ctx.measureText(project.title).width > w - 76 && size > 35) ctx.font = `500 ${--size}px "Microsoft YaHei", sans-serif`;
      ctx.fillText(project.title, 38, 154);
      ctx.font = '29px sans-serif'; ctx.fillStyle = index % 2 ? '#666d77' : '#aeb5c0';
      ctx.fillText(project.category + '   /   ' + project.author, 38, 233);
    });
    const plate = mesh(new THREE.PlaneGeometry(3.5, 1.06), new THREE.MeshBasicMaterial({ map: plateTexture, transparent: true, depthWrite: false }), [0, 1.24, .18], group);
    plate.userData.projectId = project.id;
    plate.castShadow = false;
    hits.push(plate);
    const glow = box([.065, .38, .015], new THREE.MeshBasicMaterial({color:'#e16a82'}), [-1.82, 1.5, .2], group, .002);
    panels.set(project.id, { group, screen, base, color, glow });
    imagePromises.push(loader.loadAsync(project.cover).then(texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      screenMat.map = texture; screenMat.color.set('#ffffff'); screenMat.needsUpdate = true; loaded++; wake();
    }).catch(() => { screenMat.color.set(project.accent); wake(); }));
  });

  function overview(immediate = false) {
    const mobile = innerWidth < 650;
    const target = new THREE.Vector3(0, mobile ? 2 : 3.1, 0);
    const position = new THREE.Vector3(mobile ? 4 : 6, 12, 27);
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
      const center = panel.group.localToWorld(new THREE.Vector3(0, 2.65, 0));
      const offset = new THREE.Vector3(0, 3.5, 20).applyAxisAngle(new THREE.Vector3(0, 1, 0), panel.group.rotation.y);
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
    const width = w < 650 ? 25 : w < 1000 ? 27 : 29;
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
