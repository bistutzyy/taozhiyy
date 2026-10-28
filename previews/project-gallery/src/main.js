import './style.css';
import './cosmos.css';
import { createIcons, Aperture, Box, LayoutGrid, Search, Scan, Plus, Minus, Orbit, ArrowUpRight, ArrowLeft, ArrowRight, Sparkle, X, SearchX, ExternalLink, CodeXml, BookOpen, FileText, Copy, Play } from 'lucide';
import { projects, filterProjects, nextProject, projectPage } from './catalog.js';
import { renderProjectDetail, escapeHTML as e } from './detail.js';

const icons = { Aperture, Box, LayoutGrid, Search, Scan, Plus, Minus, Orbit, ArrowUpRight, ArrowLeft, ArrowRight, Sparkle, X, SearchX, ExternalLink, CodeXml, BookOpen, FileText, Copy, Play };
const $ = selector => document.querySelector(selector);
const iconize = () => createIcons({ icons, attrs: { 'aria-hidden': 'true' } });
let scene;
let selected = projects[0];
let view = 'scene';
let query = '';
let visible = projects;
let listPage = 0;
let starPage = 0;
let noticeTimer;
let sceneFailed = false;
let opener = null;
let detailProject = null;
const dialog = $('#project-dialog');
$('#scene-view span').textContent = '星空';
$('.intro .eyebrow').innerHTML = '<span class="accent-rule"></span>AN ATLAS OF IDEAS';
$('.intro p').textContent = '让作品与灵感，在这里交汇。';
$('.collection-filters').innerHTML = `<span class="collection-count">PROJECT INDEX / ${String(projects.length).padStart(2,'0')}</span>`;
$('.collection-filters').removeAttribute('role');
$('.collection-filters').setAttribute('aria-label', '项目数量');
$('.exhibit-meta > span').textContent = 'EXPLORE THE UNKNOWN';
$('.exhibit-meta small').textContent = 'PROJECTS / SOURCES';
$('#reset-camera').title = '星空全景';
$('#reset-camera').setAttribute('aria-label', '星空全景');
$('#project-grid').insertAdjacentHTML('afterend', '<nav id="list-pager" class="pager" aria-label="目录分页"><button id="list-prev" class="icon-button" aria-label="上一页" title="上一页"><i data-lucide="arrow-left"></i></button><span></span><button id="list-next" class="icon-button" aria-label="下一页" title="下一页"><i data-lucide="arrow-right"></i></button></nav>');
$('.footer-label').innerHTML = '<nav id="star-pager" class="pager" aria-label="星域分页"><button id="star-prev" class="icon-button" aria-label="上一组星域" title="上一组星域"><i data-lucide="arrow-left"></i></button><span></span><button id="star-next" class="icon-button" aria-label="下一组星域" title="下一组星域"><i data-lucide="arrow-right"></i></button></nav>';
function updatePager(prefix, bucket) {
  $(`#${prefix}-prev`).disabled = bucket.page === 0;
  $(`#${prefix}-next`).disabled = bucket.page >= bucket.pages - 1;
  $(`#${prefix}-pager span`).textContent = `${prefix === 'star' ? 'FIELD ' : ''}${String(bucket.pages ? bucket.page + 1 : 0).padStart(2, '0')} / ${String(bucket.pages).padStart(2, '0')}`;
  if (prefix === 'list') $('#list-pager').hidden = bucket.pages <= 1;
}

function notify(text) {
  $('#notice').textContent = text;
  $('#notice').classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('#notice').classList.remove('visible'), 4000);
}
function renderSelection() {
  const focusedProject = document.activeElement?.closest('.dock-item')?.dataset.project;
  const number = String(projects.indexOf(selected) + 1).padStart(2, '0');
  $('#selected-info').innerHTML = `<span class="selected-number">${number}</span><div class="selected-content"><div class="selected-meta">${e(selected.category)} / ${e(selected.author)}</div><h2>${e(selected.title)}</h2><p>${e(selected.summary)}</p></div>`;
  $('.exhibit-meta strong').innerHTML = `${number} <i>/</i> ${String(projects.length).padStart(2, '0')}`;
  const bucket = projectPage(visible, starPage, 6); starPage = bucket.page;
  updatePager('star', bucket);
  scene?.setProjects(bucket.items);
  $('#project-dock').innerHTML = bucket.items.map(p => `<button class="dock-item" data-project="${e(p.id)}" aria-label="查看${e(p.title)}" aria-pressed="${p.id === selected.id}" title="${e(p.title)}"><img src="${e(p.cover)}" alt="" width="96" height="60" /></button>`).join('');
  $('#previous').disabled = visible.length < 2; $('#next').disabled = visible.length < 2;
  if (focusedProject) [...$('#project-dock').children].find(button => button.dataset.project === focusedProject)?.focus({ preventScroll: true });
}
function select(id, focus = true) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  selected = project;
  starPage = Math.max(0, Math.floor(visible.findIndex(p => p.id === id) / 6));
  renderSelection();
  $('#orbit-toggle').setAttribute('aria-pressed', 'false');
  scene?.orbit(false);
  scene?.focus(id, focus);
}
function renderCatalogue() {
  visible = filterProjects(projects, query);
  $('#result-count').textContent = `${visible.length} 个项目`;
  $('#empty-state').hidden = visible.length > 0;
  const bucket = projectPage(visible, listPage, 12); listPage = bucket.page;
  updatePager('list', bucket);
  $('#project-grid').innerHTML = bucket.items.map(p => `<button class="project-card" data-detail="${e(p.id)}" aria-label="查看${e(p.title)}详情"><img class="card-cover" src="${e(p.cover)}" alt="${e(p.title)}官方页面或演示截图" width="960" height="600" loading="lazy" /><span class="card-copy"><span class="card-meta">${e(p.category)}</span><h2>${e(p.title)}</h2><p>${e(p.summary)}</p><span class="card-bottom"><span>${e(p.author)}</span><i data-lucide="arrow-up-right"></i></span></span></button>`).join('');
  if (visible.length && !visible.some(p => p.id === selected.id)) select(visible[0].id, false);
  starPage = Math.max(0, Math.floor(visible.findIndex(p => p.id === selected.id) / 6));
  renderSelection(); iconize();
}
function setView(next) {
  if (next === 'scene' && sceneFailed) { notify('当前设备无法启动 3D，项目目录仍可正常浏览。'); return; }
  view = next;
  $('#app').classList.toggle('list-mode', view === 'list');
  $('#catalogue').hidden = view !== 'list';
  $('#scene-view').setAttribute('aria-pressed', String(view === 'scene'));
  $('#list-view').setAttribute('aria-pressed', String(view === 'list'));
  if (view === 'scene') { query = ''; $('#project-search').value = ''; renderCatalogue(); }
  scene?.setPaused(view !== 'scene' || dialog.open);
}
function openDetail(id) {
  const p = projects.find(project => project.id === id);
  if (!p) return;
  opener = document.activeElement;
  detailProject = p;
  $('#project-detail').innerHTML = renderProjectDetail(p);
  iconize(); dialog.showModal(); dialog.scrollTop = 0;
  $('#close-dialog').focus(); scene?.setPaused(true);
}
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => { dialog.querySelector('video')?.pause(); scene?.setPaused(view !== 'scene'); if (opener?.isConnected) opener.focus(); });
dialog.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy-section]');
  if (!button || !detailProject) return;
  try { await navigator.clipboard.writeText(detailProject.sections[Number(button.dataset.copySection)][2]); button.title = '已复制'; button.setAttribute('aria-label','已复制'); }
  catch { button.title = '复制失败，请选择文本复制'; }
});
dialog.addEventListener('click', event => {
  const link = event.target.closest('.detail-toc a');
  if (link) { event.preventDefault(); $(link.getAttribute('href')).scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }
});
$('#open-project').addEventListener('click', () => openDetail(selected.id));
$('#project-dock').addEventListener('click', event => { const button = event.target.closest('[data-project]'); if (button) select(button.dataset.project); });
$('#project-grid').addEventListener('click', event => { const button = event.target.closest('[data-detail]'); if (button) openDetail(button.dataset.detail); });
$('#previous').addEventListener('click', () => { const p = nextProject(visible, selected.id, -1); if (p) select(p.id); });
$('#next').addEventListener('click', () => { const p = nextProject(visible, selected.id, 1); if (p) select(p.id); });
$('#scene-view').addEventListener('click', () => setView('scene'));
$('#list-view').addEventListener('click', () => setView('list'));
$('#search-launch').addEventListener('click', () => { setView('list'); $('#project-search').focus(); });
$('#project-search').addEventListener('input', event => { query = event.target.value; listPage = 0; starPage = 0; renderCatalogue(); });
for (const [name, direction] of [['prev', -1], ['next', 1]]) {
  $(`#list-${name}`).addEventListener('click', () => { listPage += direction; renderCatalogue(); $('#catalogue').scrollTop = 0; });
  $(`#star-${name}`).addEventListener('click', () => { starPage += direction; const bucket = projectPage(visible, starPage, 6); if (bucket.items.length) select(bucket.items[0].id, false); scene?.overview(); });
}
$('#clear-search').addEventListener('click', () => { query = ''; listPage = 0; starPage = 0; $('#project-search').value = ''; renderCatalogue(); });
$('#reset-camera').addEventListener('click', () => { scene?.overview(); $('#orbit-toggle').setAttribute('aria-pressed', 'false'); });
$('#zoom-in').addEventListener('click', () => scene?.zoom(1));
$('#zoom-out').addEventListener('click', () => scene?.zoom(-1));
$('#orbit-toggle').addEventListener('click', () => {
  const state = $('#orbit-toggle').getAttribute('aria-pressed') !== 'true';
  const active = scene?.orbit(state) ?? false;
  $('#orbit-toggle').setAttribute('aria-pressed', String(active));
  if (state && !active && window.matchMedia('(prefers-reduced-motion: reduce)').matches) notify('已遵循设备的减少动态效果设置。');
});
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !dialog.open && view === 'scene') scene?.overview(); });
function failScene() { sceneFailed = true; setView('list'); scene?.setPaused(true); notify('3D 暂不可用，已打开项目目录。'); }
window.addEventListener('gallery-context-lost', failScene);
renderSelection(); renderCatalogue(); iconize();
try {
  const { createGallery } = await import('./scene.js');
  scene = await createGallery($('#gallery-canvas'), projectPage(visible, starPage, 6).items, id => select(id));
  scene.setProjects(projectPage(visible, starPage, 6).items);
  scene.focus(selected.id, false);
  scene.setPaused(view !== 'scene' || dialog.open);
  window.__galleryDebug = () => ({ ...scene.debug(), view, selected: selected.id, query, visible: visible.map(p => p.id) });
  document.documentElement.dataset.sceneReady = 'true';
} catch (error) { console.error(error); failScene(); }
