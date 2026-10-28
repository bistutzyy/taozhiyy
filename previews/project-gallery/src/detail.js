export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function link(value) {
  try {const url = new URL(value); return url.protocol === 'https:' ? escapeHTML(url.href) : '#';}
  catch {return '#';}
}
const icon = name => `<i data-lucide="${name}"></i>`;
const external = (url, label, symbol = 'external-link') => `<a href="${link(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}${icon(symbol)}</a>`;

export function renderProjectDetail(p) {
  const e = escapeHTML;
  const demo = p.demo;
  return `<div class="detail-meta"><span>${e(p.category)}</span><span>/</span><span>${e(p.author)}</span></div>
    <h2 id="detail-title">${e(p.title)}</h2><p class="detail-summary">${e(p.summary)}</p>
    <div class="detail-links">${external(p.url,'项目主页')}${external(p.source,'源仓库','code-xml')}${external(p.docs,'官方文档','book-open')}</div>
    <img class="detail-cover" src="${e(p.cover)}" alt="${e(p.title)}官方页面或演示截图" width="960" height="600"/>
    <p class="detail-caption">${p.id === 'ruic' ? '作者演示录像截帧' : '官方页面截图'} / ${e(p.author)} · 核对于 ${e(p.reviewedAt)}</p>
    <div class="detail-body"><nav class="detail-toc" aria-label="项目介绍目录"><a href="#detail-demo">试用与演示</a>${p.sections.map(([title],i)=>`<a href="#detail-section-${i}">${e(title)}</a>`).join('')}<a href="#detail-source">来源与许可</a></nav>
    <div><section class="detail-section detail-demo" id="detail-demo"><h3>试用与演示</h3><p>${e(demo.note)}</p>
    ${demo.kind === 'video' ? `<video controls playsinline preload="none" poster="${e(p.cover)}" aria-label="${e(demo.label)}"><source src="${link(demo.url)}" type="video/mp4"/>当前浏览器无法播放视频。</video><div class="trial-links">${external(demo.url,'打开作者演示录像','play')}</div>` : `<div class="trial-links">${external(demo.url,demo.label,'arrow-up-right')}</div>`}</section>
    ${p.sections.map(([title,copy,code],i)=>`<section class="detail-section" id="detail-section-${i}"><h3>${e(title)}</h3><p>${e(copy)}</p>${code ? `<div class="code-example"><div><span>示例 / 本地参考</span><button class="icon-button" data-copy-section="${i}" aria-label="复制示例" title="复制示例">${icon('copy')}</button></div><pre><code>${e(code)}</code></pre></div>` : ''}</section>`).join('')}
    <section class="detail-section detail-attribution" id="detail-source"><h3>来源与许可</h3><dl><dt>原作者</dt><dd>${e(p.author)}</dd><dt>来源</dt><dd>${external(p.source,p.source,'code-xml')}</dd><dt>核对日期</dt><dd>${e(p.reviewedAt)}</dd></dl><p>${e(p.license)}</p>${external(p.licenseUrl,'查看原始许可文件','file-text')}<p class="review-scope">内容依据公开说明整理，未对全部源码进行安全审计；安装或接入前仍须审阅依赖与服务条款。</p></section>
    <div class="detail-tags">${p.tags.map(tag=>`<span>${e(tag)}</span>`).join('')}</div></div></div>`;
}
