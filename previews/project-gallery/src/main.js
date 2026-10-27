import './style.css';
import { createIcons, Aperture, Box, LayoutGrid, Search, Scan, Plus, Minus, Orbit, ArrowUpRight, ArrowLeft, ArrowRight, Sparkle, X, SearchX, ExternalLink, CodeXml } from 'lucide';
import { projects, filterProjects, nextProject } from './catalog.js';

const icons = { Aperture, Box, LayoutGrid, Search, Scan, Plus, Minus, Orbit, ArrowUpRight, ArrowLeft, ArrowRight, Sparkle, X, SearchX, ExternalLink, Github: CodeXml };
const $ = selector => document.querySelector(selector);
const iconize = () => createIcons({ icons, attrs: { 'aria-hidden': 'true' } });
let scene;
let selected = projects[0];
let kind = 'all';
let view = 'scene';
let query = '';
let visible = projects;
let noticeTimer;
let sceneFailed = false;
let opener = null;
const dialog = $('#project-dialog');

function notify(text) {
  $('#notice').textContent = text;
  $('#notice').classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => $('#notice').classList.remove('visible'), 4000);
}
function renderSelection() {
  const focusedProject = document.activeElement?.closest('.dock-item')?.dataset.project;
  const number = String(projects.indexOf(selected) + 1).padStart(2, '0');
  $('#selected-info').innerHTML = `<span class="selected-number">${number}</span><div class="selected-content"><div class="selected-meta">${selected.kind === 'mine' ? '我的作品' : '精选分享'} / ${selected.category}</div><h2>${selected.title}</h2><p>${selected.summary}</p></div>`;
  $('.exhibit-meta strong').innerHTML = `${number} <i>/</i> 06`;
  $('#project-dock').innerHTML = visible.map(p => `<button class="dock-item" data-project="${p.id}" aria-label="查看${p.title}" aria-pressed="${p.id === selected.id}" title="${p.title}"><img src="${p.cover}" alt="" width="96" height="60" /></button>`).join('');
  $('#previous').disabled = visible.length < 2; $('#next').disabled = visible.length < 2;
  if (focusedProject) [...$('#project-dock').children].find(button => button.dataset.project === focusedProject)?.focus({ preventScroll: true });
}
function select(id, focus = true) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  selected = project; renderSelection();
  $('#orbit-toggle').setAttribute('aria-pressed', 'false');
  scene?.orbit(false);
  scene?.focus(id, focus);
}
function renderCatalogue() {
  visible = filterProjects(projects, kind, query);
  $('#result-count').textContent = `${visible.length} 个项目`;
  $('#empty-state').hidden = visible.length > 0;
  $('#project-grid').innerHTML = visible.map(p => `<button class="project-card" data-detail="${p.id}" aria-label="查看${p.title}详情"><img class="card-cover" src="${p.cover}" alt="${p.title}页面截图" width="960" height="600" loading="lazy" /><span class="card-copy"><span class="card-meta"><span>${p.kind === 'mine' ? '我的作品' : '精选分享'}</span><span>${p.category}</span></span><h2>${p.title}</h2><p>${p.summary}</p><span class="card-bottom"><span>${p.author}</span><i data-lucide="arrow-up-right"></i></span></span></button>`).join('');
  if (visible.length && !visible.some(p => p.id === selected.id)) select(visible[0].id, false);
  scene?.setFilter(visible.map(p => p.id));
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
  $('#project-detail').innerHTML = `<div class="detail-meta"><span>${p.kind === 'mine' ? '我的作品' : '精选分享'}</span><span>/</span><span>${p.author}</span><span>/</span><span>${p.category}</span></div><h2 id="detail-title">${p.title}</h2><p class="detail-summary">${p.summary}</p><div class="detail-links"><a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.kind === 'mine' ? '打开作品' : '访问项目'}<i data-lucide="external-link"></i></a><a href="${p.source}" target="_blank" rel="noopener noreferrer">源代码<i data-lucide="github"></i></a></div><img class="detail-cover" src="${p.cover}" alt="${p.title}页面截图" width="960" height="600"/><p class="detail-caption">公开页面留影 / ${p.author}</p><div class="detail-body"><nav class="detail-toc" aria-label="项目介绍目录">${p.sections.map(([title], i) => `<a href="#detail-section-${i}">${title}</a>`).join('')}</nav><div>${p.sections.map(([title, copy], i) => `<section class="detail-section" id="detail-section-${i}"><h3>${title}</h3><p>${copy}</p></section>`).join('')}<div class="detail-tags">${p.tags.map(tag => `<span>${tag}</span>`).join('')}</div></div></div>`;
  iconize(); dialog.showModal(); dialog.scrollTop = 0;
  $('#close-dialog').focus(); scene?.setPaused(true);
}
$('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
dialog.addEventListener('close', () => { scene?.setPaused(view !== 'scene'); if (opener?.isConnected) opener.focus(); });
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
$('#project-search').addEventListener('input', event => { query = event.target.value; renderCatalogue(); });
$('.collection-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-kind]'); if (!button) return;
  kind = button.dataset.kind;
  document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  renderCatalogue(); if (view === 'scene') scene?.overview();
});
$('#clear-search').addEventListener('click', () => { kind = 'all'; query = ''; $('#project-search').value = ''; document.querySelectorAll('[data-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kind === 'all'))); renderCatalogue(); });
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
  scene = await createGallery($('#gallery-canvas'), projects, id => select(id));
  scene.setFilter(visible.map(p => p.id));
  scene.focus(selected.id, false);
  scene.setPaused(view !== 'scene' || dialog.open);
  window.__galleryDebug = () => ({ ...scene.debug(), view, selected: selected.id, kind, query, visible: visible.map(p => p.id) });
  document.documentElement.dataset.sceneReady = 'true';
} catch (error) { console.error(error); failScene(); }
