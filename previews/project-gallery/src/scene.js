import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { spaceWindow, wheelDistance, motionBlend } from './space-navigation.js';
import { resolveGalleryTheme, getScenePalette } from './gallery-themes.js';

const slots = [[1.2, 1], [2.8, -5], [-1.8, 2], [2.1, -3], [-.3, 0], [-2.8, 4]];
const spacing = 5.4;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function createGallery(canvas, projects, onSelect, onBrowse = () => {}) {
  let theme = 'cosmos', palette = getScenePalette(theme);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: innerWidth>=650, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 650 ? 1.25 : 1.5));
  renderer.setClearColor(palette.clear);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 250);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .085;
  controls.enablePan = false; controls.rotateSpeed = .35;
  controls.enableZoom = false;
  controls.mouseButtons.LEFT = null;
  controls.mouseButtons.MIDDLE = null;
  controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
  controls.touches.ONE = null;
  controls.touches.TWO = null;
  controls.minDistance = 10; controls.maxDistance = 80;
  controls.minPolarAngle = .45; controls.maxPolarAngle = 1.7;
  controls.minAzimuthAngle = -.85; controls.maxAzimuthAngle = .85;
  controls.autoRotateSpeed = .12;
  let requested = 0, rendering = false, dirtyUntil = 0, frames = 0;
  let paused = false, animation = null;
  let collection = [], position = 0, destination = 0, browsing = true, announced = '';
  let windowKey = '', activeItems = [], lastFrame = 0, createdPanels = 0, cacheHits = 0;
  let selected = projects[0]?.id, hovered = null;
  const panels = new Map();
  const cachedPanels = new Map();
  const cacheLimit = () => canvas.clientWidth < 650 ? 8 : 12;
  const loader = new THREE.TextureLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targetVector = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  const field = new THREE.Group(); scene.add(field);
  const capacity = () => canvas.clientWidth < 650 ? 3 : 6;
  const centerX = () => (position + (Math.min(collection.length, capacity()) - 1) / 2) * spacing;
  function texture(width, height, draw) {
    const surface = document.createElement('canvas');
    surface.width = width; surface.height = height;
    draw(surface.getContext('2d'), width, height);
    const map = new THREE.CanvasTexture(surface); map.colorSpace = THREE.SRGBColorSpace;
    map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;return map;
  }
  const starMap = texture(32, 32, ctx => {
    const halo=ctx.createRadialGradient(16,16,3,16,16,16);
    halo.addColorStop(0,'#ffffff');halo.addColorStop(.4,'#ffffffb0');halo.addColorStop(1,'#ffffff00');
    ctx.fillStyle=halo;ctx.fillRect(0,0,32,32);
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(16,16,8,0,Math.PI*2);ctx.fill();
  });
  const sparkleMap=texture(128,128,ctx=>{
    const halo=ctx.createRadialGradient(64,64,1,64,64,61);
    halo.addColorStop(0,'#ffffff');halo.addColorStop(.13,'#ffffffd9');halo.addColorStop(.35,'#dceaff35');halo.addColorStop(1,'#ffffff00');
    ctx.fillStyle=halo;ctx.fillRect(0,0,128,128);
    ctx.strokeStyle='#ffffffa0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(64,10);ctx.lineTo(64,118);ctx.moveTo(10,64);ctx.lineTo(118,64);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(64,64,6,0,Math.PI*2);ctx.fill();
  });
  // Seeded star fields are independent of project count and use three draw calls.
  let seed = 437;
  const starLayers = [];
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function stars(count, layer, band = false, sparkle = false) {
    const positions = [], colors = [];
    for (let i = 0; i < count; i++) {
      const x = (random() - .5) * 180;
      const y = band ? x * .27 + (random() + random() + random() - 1.5) * 12 : (random() - .5) * 135;
      const z = band ? -45 - random() * 40 : -100 + random() * 125;
      if (Math.hypot(x, y, z) < 20) { i--; continue; }
      positions.push(x, y, z);
      const value = (sparkle ? .85 : .45) + random() * .55, tint = random();
      colors.push(value*(tint<.16?.72:1), value*(tint>.88?.85:.95), value*(tint>.88?.62:1));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const style = palette.stars[layer];
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({color:style.color, size:style.size, map:sparkle?sparkleMap:starMap, vertexColors:true, transparent:true, depthWrite:false, opacity:style.opacity, blending:THREE.AdditiveBlending}));
    starLayers.push(points); field.add(points);
  }
  const mobile = innerWidth < 650;
  stars(mobile ? 1100 : 2400, 0);
  stars(mobile ? 90 : 180, 1, false, true);
  stars(mobile ? 1500 : 3400, 2, true);
  function circle(radius, color, opacity, parent) {
    const points = Array.from({length:97}, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * radius, Math.sin(i / 96 * Math.PI * 2) * radius, 0));
    const object = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color, transparent:true, opacity}));
    parent.add(object); return object;
  }
  const orbit = new THREE.Group(); orbit.rotation.set(-1.12, .18, -.2); field.add(orbit);
  const orbitLines = [9.9, 13.6].map((radius, index) => circle(radius, palette.orbits[index].color, palette.orbits[index].opacity, orbit));
  const coordinatePoints = [];
  for (let x = -90; x <= 90; x += 15) coordinatePoints.push(x, -42, -28, x, 42, -28);
  for (let y = -36; y <= 36; y += 12) coordinatePoints.push(-90, y, -28, 90, y, -28);
  const coordinateGeometry = new THREE.BufferGeometry();
  coordinateGeometry.setAttribute('position', new THREE.Float32BufferAttribute(coordinatePoints, 3));
  const coordinates = new THREE.LineSegments(coordinateGeometry, new THREE.LineBasicMaterial({color:palette.coordinates.color, transparent:true, opacity:palette.coordinates.opacity, depthWrite:false}));
  coordinates.visible = palette.coordinates.visible; field.add(coordinates);
  function labelTexture(project) {
    return texture(512, 106, ctx => {
      ctx.scale(512/768,106/160);
      ctx.textAlign = 'center';
      ctx.fillStyle = palette.panel.label; let size = 68; ctx.font = `500 ${size}px "Microsoft YaHei", sans-serif`;
      while (ctx.measureText(project.title).width > 748 && size > 26) ctx.font = `500 ${--size}px "Microsoft YaHei", sans-serif`;
      ctx.fillText(project.title, 384, 78);
      ctx.fillStyle = palette.panel.category; ctx.font = '27px monospace'; ctx.fillText(project.category, 384, 135);
    });
  }
  function setTheme(value) {
    const next = resolveGalleryTheme(value);
    if (next === theme) return theme;
    theme = next; palette = getScenePalette(theme);
    renderer.setClearColor(palette.clear);
    starLayers.forEach((points, index) => {
      const style = palette.stars[index], material = points.material;
      material.color.set(style.color); material.size = style.size; material.opacity = style.opacity;
      material.blending = palette.blending === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending;
    });
    orbitLines.forEach((line, index) => {
      line.material.color.set(palette.orbits[index].color); line.material.opacity = palette.orbits[index].opacity;
    });
    coordinates.visible = palette.coordinates.visible;
    coordinates.material.color.set(palette.coordinates.color); coordinates.material.opacity = palette.coordinates.opacity;
    // Cached labels must be ready before re-entering the visible project window.
    for (const [id, panel] of [...panels, ...cachedPanels]) {
      panel.color = palette.panel.accent;
      panel.frame.material.color.set(id === selected || id === hovered ? panel.color : palette.panel.frame);
      panel.dot.material.color.set(panel.color); panel.ring.material.color.set(panel.color);
      if (!panel.screen.material.map) panel.screen.material.color.set(panel.coverFailed ? panel.color : palette.panel.screen);
      const previous = panel.label.material.map;
      panel.label.material.map = labelTexture(panel.project);
      panel.label.material.needsUpdate = true; previous.dispose();
    }
    wake();
    return theme;
  }
  function disposePanel(panel) {
      panel.disposed=true;
      scene.remove(panel.group);
      panel.group.traverse(object => {
        object.geometry?.dispose();
        if (object.material) { object.material.map?.dispose(); object.material.dispose(); }
      });
  }
  function setProjects(items) {
    if (collection.length === items.length && collection.every((p,i) => p === items[i])) return;
    collection = items;
    if (!items.some(p => p.id === selected)) selected = items[0]?.id;
    position = destination = spaceWindow(items.length, items.findIndex(p => p.id === selected) - (capacity()-1)/2, capacity()).position;
    browsing = true; animation = null; announced = '';
    windowKey='';
    updateWindow(); overview(true);
  }
  function createPanel(project, index) {
      createdPanels++;
      const [y,z] = slots[index % slots.length];
      const group = new THREE.Group(); group.position.set(index*spacing, y, z); scene.add(group);
      const color = palette.panel.accent;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.46, 1.56), new THREE.MeshBasicMaterial({color:palette.panel.frame}));
      frame.position.y = .65; group.add(frame);
      const screenMaterial = new THREE.MeshBasicMaterial({color:palette.panel.screen});
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), screenMaterial);
      screen.position.set(0, .65, .01); screen.userData.projectId = project.id; group.add(screen);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(.075, 24), new THREE.MeshBasicMaterial({color}));
      dot.position.set(0, 1.65, .02); group.add(dot);
      const ring = circle(.15, color, .9, group); ring.position.copy(dot.position);
      const labelMap = labelTexture(project);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(3.6, .75), new THREE.MeshBasicMaterial({map:labelMap, transparent:true, depthWrite:false}));
      label.position.set(0, -.65, .02); label.userData.projectId = project.id; group.add(label);
      const panel = {group, screen, label, frame, dot, ring, color, project, disposed:false, coverFailed:false};
      panels.set(project.id, panel);
      loader.loadAsync(project.preview||project.cover).then(map => {
        if (panel.disposed) { map.dispose(); return; }
        map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        map.generateMipmaps=false;map.minFilter=THREE.LinearFilter;
        screenMaterial.color.set('#ffffff'); screenMaterial.map = map; screenMaterial.needsUpdate = true; if(panels.get(project.id)===panel)wake();
      }).catch(() => { if (!panel.disposed) { panel.coverFailed = true; screenMaterial.color.set(panel.color); wake(); } });
  }
  function updateWindow() {
    const window = spaceWindow(collection.length, position, capacity());
    const key=`${window.start}:${window.end}`;
    if(key!==windowKey) {
      windowKey=key;
      activeItems=collection.slice(window.start,window.end);
      const ids=new Set(activeItems.map(p=>p.id));
      for(const [id,panel] of panels)if(!ids.has(id)){scene.remove(panel.group);panels.delete(id);cachedPanels.set(id,panel);}
      activeItems.forEach((p,i) => {
      const index=window.start+i;
      if(!panels.has(p.id)&&cachedPanels.has(p.id)){const panel=cachedPanels.get(p.id);cachedPanels.delete(p.id);panels.set(p.id,panel);scene.add(panel.group);cacheHits++;}
      if (!panels.has(p.id)) createPanel(p,index);
      const [y,z]=slots[index%slots.length];panels.get(p.id).group.position.set(index*spacing,y,z);
      });
    }
    while(panels.size+cachedPanels.size>cacheLimit()){const [id,panel]=cachedPanels.entries().next().value;disposePanel(panel);cachedPanels.delete(id);}
    if (activeItems.length && !panels.has(selected)) selected = activeItems[0].id;
    const signature = `${window.start}:${window.end}:${selected}`;
    if (signature !== announced) {
      announced = signature;
      onBrowse(activeItems,window.start,collection.length,selected);
    }
    return window;
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
    position = destination;
    updateWindow();
    moveCamera(new THREE.Vector3(centerX(), innerWidth < 650 ? 7 : 5, innerWidth < 650 ? 48 : 30), new THREE.Vector3(centerX(), 0, 0), 1, immediate);
    browsing = false;
  }
  function focus(id, close = true) {
    const index = collection.findIndex(p=>p.id===id);
    if (index < 0) return;
    selected = id;
    if (!panels.has(id)) {
      position = destination = spaceWindow(collection.length,index-(capacity()-1)/2,capacity()).position;
      updateWindow();
      if (!close) overview(true);
    }
    const p = panels.get(id);
    if (p && close) {
      const target = p.group.position.clone();
      moveCamera(target.clone().add(new THREE.Vector3(0, 2, innerWidth < 650 ? 24 : 17)), target, innerWidth < 650 ? 1.8 : 2);
      browsing = false;
    }
    wake();
  }
  function browse(delta) {
    if (paused || !collection.length) return;
    if (!browsing) {
      position = controls.target.x/spacing - (Math.min(collection.length,capacity())-1)/2;
      destination = position;
    }
    destination = spaceWindow(collection.length,destination+delta,capacity()).position;
    animation = null; controls.autoRotate = false; browsing = true;
    wake(1400);
  }
  function render(now) {
    requested = 0; if (paused || document.hidden) return; rendering = true;
    const elapsed=lastFrame?now-lastFrame:16.67;lastFrame=now;
    const blend=reduced?1:motionBlend(elapsed,down?.dragged?45:75);
    const previous = position;
    if (browsing) {
      position += (destination-position) * blend;
      if (Math.abs(destination-position)<.001) position = destination;
      updateWindow();
      const target = targetVector.set(centerX(),0,0);
      desiredCamera.set(target.x,innerWidth<650?7:5,innerWidth<650?48:30);
      camera.position.lerp(desiredCamera,blend);
      controls.target.lerp(target,blend);
      camera.position.x = target.x;
      controls.target.x = target.x;
      if(Math.abs(camera.zoom-1)>.0001){camera.zoom=THREE.MathUtils.lerp(camera.zoom,1,blend);camera.updateProjectionMatrix();}
    }
    if (animation) {
      const t = Math.min((now - animation.started) / 1100, 1), k = 1 - (1 - t) ** 3;
      camera.position.lerpVectors(animation.from, animation.to, k); controls.target.lerpVectors(animation.targetFrom, animation.targetTo, k);
      camera.zoom = THREE.MathUtils.lerp(animation.zoomFrom, animation.zoomTo, k); camera.updateProjectionMatrix();
      if (t === 1) animation = null;
    }
    controls.update();
    field.position.x = controls.target.x;
    field.rotation.y = position*.045;
    if (controls.autoRotate) {
      if (controls.getAzimuthalAngle() < controls.minAzimuthAngle + .025) controls.autoRotateSpeed = -.12;
      if (controls.getAzimuthalAngle() > controls.maxAzimuthAngle - .025) controls.autoRotateSpeed = .12;
    }
    for (const [id, p] of panels) {
      p.group.quaternion.copy(camera.quaternion);
      p.frame.material.color.set(id === selected || id === hovered ? p.color : palette.panel.frame);
      p.ring.visible = id === selected || id === hovered;
    }
    renderer.render(scene, camera); frames++; rendering = false;
    const moving = browsing && (Math.abs(destination-previous)>.001 || camera.position.distanceTo(desiredCamera)>.005 || Math.abs(camera.zoom-1)>.001);
    if (animation || moving || controls.autoRotate || now < dirtyUntil) requested = requestAnimationFrame(render);
  }
  function wake(duration = 180) {
    dirtyUntil = Math.max(dirtyUntil, performance.now() + duration);
    if (!requested && !rendering && !paused && !document.hidden) {
      if(performance.now()-lastFrame>120)lastFrame=0;
      requested=requestAnimationFrame(render);
    }
  }
  function resize() {
    camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(canvas.clientWidth, canvas.clientHeight, false); wake();
    if (collection.length) {
      const focused = camera.zoom > 1.2;
      const index = collection.findIndex(p=>p.id===selected);
      position = destination = spaceWindow(collection.length,index-(capacity()-1)/2,capacity()).position;
      updateWindow();
      if (focused) focus(selected); else overview(true);
    }
  }
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects([...panels.values()].flatMap(p => [p.screen, p.label]))[0]?.object.userData.projectId;
  }
  let down;
  canvas.addEventListener('wheel', e => { if(e.ctrlKey)return; e.preventDefault(); browse(wheelDistance(e,canvas.clientHeight)); },{passive:false});
  canvas.addEventListener('keydown', e => {
    const delta = {ArrowDown:.7,ArrowRight:.7,ArrowUp:-.7,ArrowLeft:-.7,PageDown:capacity()-1,PageUp:1-capacity(),Home:-collection.length,End:collection.length}[e.key];
    if (delta !== undefined) {e.preventDefault();browse(delta);}
  });
  canvas.addEventListener('pointerdown', e => {
    controls.autoRotate = false;
    if (e.button !== 0 || down) return;
    down = {id:e.pointerId,x:e.clientX,y:e.clientY,previousX:e.clientX,previousY:e.clientY,dragged:false};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (down && e.pointerId !== down.id) return;
    if (down && Math.hypot(e.clientX-down.x,e.clientY-down.y)>6) down.dragged = true;
    if (down?.dragged) {
      const dx=down.previousX-e.clientX,dy=down.previousY-e.clientY;
      browse((Math.abs(dx)>Math.abs(dy)?dx:dy)/Math.min(canvas.clientWidth,canvas.clientHeight)*3);
      down.previousX=e.clientX;down.previousY=e.clientY;canvas.style.cursor='grabbing';
    } else {const id=pick(e);if(id!==hovered){hovered=id;canvas.style.cursor=id?'pointer':'grab';wake();}}
  });
  canvas.addEventListener('pointerup', e => { if (down && e.pointerId !== down.id) return; if (down && !down.dragged) { const id = pick(e); if (id) onSelect(id); } down = null; canvas.style.cursor='grab'; });
  canvas.addEventListener('pointerleave', () => { down = null; hovered = null; wake(); });
  canvas.addEventListener('pointercancel', () => { down = null; });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('gallery-context-lost')); });
  controls.addEventListener('change', () => wake());
  controls.addEventListener('start', () => { animation = null; browsing = false; wake(1200); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  new ResizeObserver(resize).observe(canvas);
  resize(); setProjects(projects);
  return {
    focus, overview, setProjects, setTheme,
    setPaused(value) { paused = value; if (!value) wake(); },
    zoom(direction) { animation = null; browsing=false; camera.zoom = THREE.MathUtils.clamp(camera.zoom * (direction > 0 ? 1.16 : .86), .7, 2.3); camera.updateProjectionMatrix(); wake(); },
    orbit(value) { animation = null; browsing=false; controls.autoRotate = value && !reduced; wake(); return controls.autoRotate; },
    debug() {
      return {theme, frameCount:frames, loaded:[...panels.values()].filter(p=>p.screen.material.map).length, nodeCount:panels.size, cachedProjects:cachedPanels.size, retainedProjects:panels.size+cachedPanels.size, cacheLimit:cacheLimit(), createdPanels,cacheHits,selected, paused, autoRotate:controls.autoRotate, position, destination, capacity:capacity(), maxPosition:spaceWindow(collection.length,position,capacity()).max, camera:camera.position.toArray(), zoom:camera.zoom, draws:renderer.info.render.calls,
        projected:[...panels].map(([id, p]) => { const v = p.screen.getWorldPosition(new THREE.Vector3()).project(camera); return {id, x:(v.x + 1) / 2 * canvas.clientWidth, y:(1 - v.y) / 2 * canvas.clientHeight}; })};
    },
  };
}
