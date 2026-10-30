export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function link(value) {
  try {const url = new URL(value); return url.protocol === 'https:' ? escapeHTML(url.href) : '#';}
  catch {return '#';}
}
const icon = name => `<i data-lucide="${name}"></i>`;
const external = (url, label, symbol = 'external-link') => `<a href="${link(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}${icon(symbol)}</a>`;
const codeExample = (code, index) => code ? `<div class="code-example"><div><span>TERMINAL / EXAMPLE</span><button class="icon-button" data-copy-section="${index}" aria-label="复制示例" title="复制示例">${icon('copy')}</button></div><pre><code>${escapeHTML(code)}</code></pre></div>` : '';

export function renderProjectDetail(p) {
  const e = escapeHTML;
  const demo = p.demo;
  const sections = p.sections.map(([title, copy, code], index) => ({title, copy, code, index, id:index ? `detail-section-${index}` : 'detail-introduction'}));
  const navigation = [
    ...sections.map(section => ({id:section.id, title:section.index ? section.title : '项目介绍'})),
    {id:'detail-demo', title:'试用与演示'}, {id:'detail-source', title:'来源与许可'},
  ];
  return `<header class="reader-masthead">
      <div class="reader-file-label"><span>${icon('orbit')}PROJECT FILE</span><span>${e(p.category)}</span></div>
      <div class="reader-overview"><div class="reader-lead"><h2 id="detail-title">${e(p.title)}</h2><p class="detail-summary">${e(p.summary)}</p>
      <div class="detail-links">${external(p.url,'项目主页','arrow-up-right')}${external(p.source,'源仓库','code-xml')}${external(p.docs,'官方文档','book-open')}</div></div>
      <figure class="reader-preview"><img class="detail-cover" src="${e(p.cover)}" alt="${e(p.title)}官方页面或演示截图" width="960" height="600" loading="lazy" decoding="async"/><figcaption class="detail-caption">${p.id === 'ruic' ? '作者演示录像截帧' : '官方页面截图'}</figcaption></figure></div>
      <dl class="reader-facts"><div><dt>原作者</dt><dd>${e(p.author)}</dd></div><div><dt>核对日期</dt><dd>${e(p.reviewedAt)}</dd></div><div><dt>收录主题</dt><dd>${e(p.tags.slice(0,3).join(' / '))}</dd></div></dl>
    </header>
    <div class="reader-mobile-index"><label for="reader-section-select">章节导航</label><select id="reader-section-select" aria-label="选择项目章节">${navigation.map(item => `<option value="${item.id}">${e(item.title)}</option>`).join('')}</select>${icon('chevron-down')}</div>
    <div class="detail-body"><nav class="detail-toc" aria-label="项目介绍目录"><span class="reader-index-label">IN THIS PROJECT</span>${navigation.map((item,index) => `<a data-reader-link href="#${item.id}"${index === 0 ? ' aria-current="location"' : ''}><span>${String(index+1).padStart(2,'0')}</span>${e(item.title)}</a>`).join('')}</nav>
    <div class="reader-sections">${sections.map(section => `<section class="detail-section" id="${section.id}"><span class="reader-section-kicker">${section.index ? 'FIELD NOTES' : 'OVERVIEW'} / ${String(section.index+1).padStart(2,'0')}</span><h3>${e(section.index ? section.title : '项目介绍')}</h3><p>${e(section.copy)}</p>${codeExample(section.code, section.index)}</section>`).join('')}
    <section class="detail-section detail-demo" id="detail-demo"><span class="reader-section-kicker">TRY IT / PREVIEW</span><h3>试用与演示</h3><p>${e(demo.note)}</p>
      ${demo.kind === 'video' ? `<video controls playsinline preload="none" poster="${e(p.cover)}" aria-label="${e(demo.label)}"><source src="${link(demo.url)}" type="video/mp4"/>当前浏览器无法播放视频。</video><div class="trial-links">${external(demo.url,'打开作者演示录像','play')}</div>` : `<div class="trial-links">${external(demo.url,demo.label,'arrow-up-right')}</div>`}</section>
    <section class="detail-section detail-attribution" id="detail-source"><span class="reader-section-kicker">CREDITS / LICENSE</span><h3>来源与许可</h3><dl><dt>原作者</dt><dd>${e(p.author)}</dd><dt>来源</dt><dd>${external(p.source,p.source,'code-xml')}</dd><dt>核对日期</dt><dd>${e(p.reviewedAt)}</dd></dl><p>${e(p.license)}</p>${external(p.licenseUrl,'查看原始许可文件','file-text')}<p class="review-scope">内容依据公开说明整理，未对全部源码进行安全审计；安装或接入前仍须审阅依赖与服务条款。</p></section>
    <div class="detail-tags">${p.tags.map(tag => `<span>${e(tag)}</span>`).join('')}</div>
    <div class="reader-end"><span>END OF FILE</span>${icon('aperture')}<span>${e(p.author)}</span></div></div></div>`;
}
