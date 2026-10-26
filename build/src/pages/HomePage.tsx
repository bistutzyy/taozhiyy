import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownUp, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, FileText, Search, X } from 'lucide-react';
import { motion, useReducedMotion, useScroll } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArchiveImage } from '../components/ArchiveImage';
import { categories, chronicleEntries, type ArchiveCategory } from '../data/chronicle';
import { useI18n } from '../i18n/I18nContext';
import previousHome from '../../mobile-check-4.png';
import aboutSnapshot from '../assets/archive/about-20261026.webp';
import homeSnapshot from '../assets/archive/home-20261026.webp';

export function HomePage() {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const languageIndex = zh ? 0 : 1;
  const reducedMotion = useReducedMotion();
  const [category, setCategory] = useState<ArchiveCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);
  const [activeSlug, setActiveSlug] = useState(chronicleEntries[0]?.slug ?? '');
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: timelineRef, offset: ['start center', 'end center'] });
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    const items = chronicleEntries.filter(entry => (category === 'all' || entry.category === category)
      && (!search || [entry.title_zh, entry.title_en, ...entry.title, entry.excerpt_zh, entry.excerpt_en, entry.date, ...entry.tags].join(' ').toLocaleLowerCase().includes(search)));
    return oldestFirst ? items.reverse() : items;
  }, [category, query, oldestFirst]);

  useEffect(() => {
    const records = timelineRef.current?.querySelectorAll<HTMLElement>('[data-record]');
    setActiveSlug(visible[0]?.slug ?? '');
    const observer = new IntersectionObserver(entries => {
      const entry = entries.find(item => item.isIntersecting);
      if (entry) setActiveSlug((entry.target as HTMLElement).dataset.record ?? '');
    }, { rootMargin: '-16% 0px -55% 0px' });
    records?.forEach(record => observer.observe(record));
    return () => observer.disconnect();
  }, [visible]);

  function jumpTo(slug: string) {
    setActiveSlug(slug);
    document.getElementById(slug)?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  }

  const firstDate = chronicleEntries.at(-1)?.date ?? '';
  const lastDate = chronicleEntries[0]?.date ?? '';
  const activeEntry = visible.find(entry => entry.slug === activeSlug) ?? visible[0];

  return (
    <div className="chronicle">
      <section className="chronicle-intro" aria-labelledby="chronicle-title">
        <div className="chronicle-kicker"><span className="archive-status-dot" />THE TIME ARCHIVE<span className="chronicle-issue">VOL. 03 / TAOZHIYY</span></div>
        <div className="chronicle-intro-line">
          <div><p className="chronicle-overline">{zh ? '一座小站的生长切片' : 'A small website, a growing story'}</p>
            <h1 id="chronicle-title">{zh ? '创造纪事' : 'The Chronicle'}<span className="chronicle-title-dot">.</span></h1>
          </div>
          <div className="chronicle-intro-copy"><span className="chronicle-script">Every little step.</span>
            <p>{zh ? <>从一个想法，到一处可以停留的地方。<br />那些试过的、改过的、终于实现的，都在这里。</> : <>From an idea to a place to stay.<br />The experiments, revisions, and things that finally worked.</>}</p>
            <a href="#records">{zh ? '翻开档案' : 'Open the archive'}<ArrowDown size={16} /></a>
          </div>
        </div>
        <div className="chronicle-colophon">
          <span><strong>{String(chronicleEntries.length).padStart(2, '0')}</strong>{zh ? '篇成长记录' : 'growth records'}</span>
          <span><FileText size={15} />{zh ? '始于' : 'Since'} {firstDate.replaceAll('-', '.')}</span>
          <span className="chronicle-colophon-last">{zh ? '最近一页' : 'Latest entry'}<time dateTime={lastDate}>{lastDate.replaceAll('-', '.')}</time></span>
          <span className="chronicle-ongoing"><span className="archive-status-dot" />{zh ? '未完待续' : 'Still in progress'}</span>
        </div>
      </section>

      <section id="records" className="chronicle-records" aria-label={zh ? '成长时间轴' : 'Growth timeline'}>
        <div className="chronicle-toolbar">
          <div className="chronicle-filters" role="group" aria-label={zh ? '记录分类' : 'Filter records'}>
            {categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}>{item.label[languageIndex]}<span>{chronicleEntries.filter(entry => item.id === 'all' || entry.category === item.id).length}</span></button>)}
          </div>
          <div className="chronicle-tools">
            <label className="chronicle-search"><Search size={16} /><input type="search" value={query}
              onChange={event => setQuery(event.target.value)} placeholder={zh ? '查找记录' : 'Find a record'}
              aria-label={zh ? '搜索时间轴记录' : 'Search timeline records'} />
              {query && <button className="archive-icon-button" type="button" onClick={() => setQuery('')}
                title={zh ? '清空搜索' : 'Clear search'} aria-label={zh ? '清空搜索' : 'Clear search'}><X size={14} /></button>}
            </label>
            <button className="archive-icon-button" type="button" onClick={() => setOldestFirst(value => !value)}
              aria-pressed={oldestFirst} title={zh ? (oldestFirst ? '当前最早优先，切换为最新优先' : '当前最新优先，切换为最早优先') : (oldestFirst ? 'Oldest first; switch to newest' : 'Newest first; switch to oldest')}
              aria-label={zh ? '切换时间排序' : 'Reverse chronological order'}><ArrowDownUp size={17} /></button>
          </div>
        </div>

        <p className="archive-sr-only" aria-live="polite">{zh ? `共 ${visible.length} 条记录` : `${visible.length} records`}</p>
        <div className="chronicle-body">
          <div className="chronicle-timeline" ref={timelineRef}>
            {visible.length > 0 && <div className="chronicle-track" aria-hidden="true"><motion.div style={{ scaleY: scrollYProgress }} /></div>}
            {visible.map((entry, index) => {
              const active = activeSlug === entry.slug;
              const categoryLabel = categories.find(item => item.id === entry.category)?.label[languageIndex];
              return (
                <article key={entry.slug} id={entry.slug} data-record={entry.slug}
                  className={`chronicle-record chronicle-record--${entry.category} ${active ? 'is-current' : ''}`}>
                  <div className="record-date"><span className="record-year">{entry.date.slice(0, 4)}</span>
                    <time dateTime={entry.date}>{entry.date.slice(5).replace('-', '.')}</time>
                    <span className="record-number">NO. {entry.number}</span>
                  </div>
                  <span className="record-point" aria-hidden="true"><span /></span>
                  <motion.div className="record-content" initial={false}
                    whileInView={reducedMotion ? {} : { y: [12, 0] }}
                    viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.5 }}>
                    <div className="record-eyebrow"><span>{categoryLabel}</span><span className="record-file-id">ARCHIVE / {entry.number}</span>
                      {index === 0 && !oldestFirst && category === 'all' && !query && <span className="record-latest">{zh ? '最新一页' : 'LATEST'}</span>}
                    </div>
                    <h2><Link to={`/post/${entry.slug}`}>{entry.title[languageIndex]}</Link></h2>
                    <p className="record-summary">{entry.note[languageIndex]}</p>
                    {entry.slug === 'site-growth-09-about-quizcard-showcase' && <ArchiveImage src={aboutSnapshot}
                      alt={zh ? '关于我页面的当前画面' : 'The current About page'}
                      caption={zh ? '页面留影 / 关于我 · 2026.10.26' : 'Page snapshot / About · 2026.10.26'} />}
                    {entry.slug === 'site-growth-04-homepage-originalization' && <ArchiveImage src={homeSnapshot}
                      alt={zh ? '桃之夭夭首页的当前画面' : 'The current Taozhiyy home page'}
                      caption={zh ? '页面留影 / 主站首页 · 2026.10.26' : 'Page snapshot / Main site · 2026.10.26'} />}
                    {entry.slug === 'site-growth-02-frontend-design' && <div className="record-memory">
                      <ArchiveImage src={previousHome} portrait alt={zh ? '上一版创作屋的移动端截图' : 'Previous studio mobile layout'}
                        caption={zh ? '旧版存档 / 创作屋移动端' : 'Previous version / Mobile studio'} />
                      <blockquote><span>FIELD NOTE / 02</span>
                        <p>{zh ? '每一个现在，都是从某个还不完美的开始走过来的。' : 'Every present version started somewhere imperfect.'}</p>
                        <small>{zh ? '留住来时的样子。' : 'Keeping a trace of where it started.'}</small>
                      </blockquote>
                    </div>}
                    <ul className="record-tags" aria-label={zh ? '涉及主题' : 'Topics'}>{entry.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
                    <details className="record-notes">
                      <summary><Bookmark size={14} />{zh ? '这一页的笔记' : 'Notes from this page'}<ChevronDown size={14} /></summary>
                      <p>{zh ? entry.excerpt_zh : entry.excerpt_en}</p>
                    </details>
                    <div className="record-bottom"><span><Check size={13} />{zh ? '已收录' : 'Archived'}<i />{entry.minutes} {zh ? '分钟阅读' : 'min read'}</span>
                      <Link to={`/post/${entry.slug}`}>{zh ? '阅读完整记录' : 'Read the full story'}<ArrowUpRight size={16} /></Link>
                    </div>
                  </motion.div>
                </article>
              );
            })}
            {visible.length === 0 && <div className="chronicle-empty"><Search size={28} /><h2>{zh ? '还没有这一页' : 'No matching records'}</h2>
              <p>{zh ? '换一个关键词，或回到全部记录。' : 'Try another keyword or return to all records.'}</p>
              <button type="button" onClick={() => { setCategory('all'); setQuery(''); }}>{zh ? '查看全部记录' : 'Show all records'}<ArrowRight size={16} /></button>
            </div>}
            {visible.length > 0 && <div className="chronicle-end"><span /><p>{zh ? (oldestFirst ? '下一页，还在慢慢写。' : '故事，从这里开始。') : (oldestFirst ? 'The next page is still being written.' : 'This is where it began.')}</p><small>TO BE CONTINUED</small></div>}
          </div>
          <aside className="chronicle-index" aria-label={zh ? '档案索引' : 'Archive index'}>
            <div className="chronicle-index-top"><Bookmark size={16} /><span>{zh ? '阅览索引' : 'READING INDEX'}</span><span>{String(visible.length).padStart(2, '0')}</span></div>
            <p className="chronicle-index-date">{activeEntry?.date.slice(0, 4) ?? '—'}<span>/ {activeEntry?.date.slice(5, 7) ?? '—'}</span></p>
            <div className="chronicle-index-links">{visible.map(entry => <button key={entry.slug} type="button"
              aria-current={activeSlug === entry.slug ? 'location' : undefined} onClick={() => jumpTo(entry.slug)}>
              <span>{entry.number}</span><span>{entry.title[languageIndex]}</span>
            </button>)}</div>
            <div className="chronicle-index-foot"><span>{zh ? '收集微小的进步' : 'Collecting little steps'}</span><span>EST. {firstDate.slice(0, 4)}</span></div>
            <div className="chronicle-marginalia"><span className="chronicle-marginalia-mark">“</span>
              <p>{zh ? '不急着抵达，\n也别忘了记录。' : 'Take your time.\nKeep a little record.'}</p>
              <span>— {zh ? '写在页边' : 'A margin note'}</span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
