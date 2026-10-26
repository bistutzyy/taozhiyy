import { useEffect } from 'react';
import { ArrowLeft, ArrowUp, ArrowUpRight, Library, Languages } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

export function Layout() {
  const { pathname } = useLocation();
  const { lang, toggleLang } = useI18n();
  const zh = lang === 'zh';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = zh ? '创造纪事 · 时光档案馆 | 桃之夭夭' : 'Chronicle · The Time Archive | Taozhiyy';
  }, [pathname, zh]);

  return (
    <div className="archive-site">
      <a className="archive-skip" href="#archive-main">{zh ? '跳到正文' : 'Skip to content'}</a>
      <header className="archive-header">
        <Link to="/" className="archive-brand" aria-label={zh ? '创造纪事首页' : 'Chronicle home'}>
          <span className="archive-brand-mark"><Library size={21} strokeWidth={1.5} /></span>
          <span><strong>{zh ? '创造纪事' : 'Chronicle'}</strong><small>TAOZHIYY / ARCHIVE 03</small></span>
        </Link>
        <nav aria-label={zh ? '档案馆导航' : 'Archive navigation'}>
          <NavLink to="/" end>{zh ? '时光轴' : 'Timeline'}</NavLink>
          <NavLink to="/articles">{zh ? '文章目录' : 'Articles'}</NavLink>
          <a href="/" className="archive-home-link">{zh ? '返回主站' : 'Main site'}<ArrowUpRight size={14} /></a>
          <button className="archive-icon-button" onClick={toggleLang} type="button"
            title={zh ? 'Switch to English' : '切换到中文'} aria-label={zh ? 'Switch to English' : '切换到中文'}>
            <Languages size={18} />
          </button>
        </nav>
      </header>
      <main id="archive-main" tabIndex={-1}><Outlet /></main>
      <footer className="archive-footer">
        <div><Link to="/" className="archive-footer-title">{zh ? '故事还在继续。' : 'Still becoming.'}</Link>
          <p>{zh ? '把每一次小小的创造，留给未来回望。' : 'Keeping the little things we make, for the days ahead.'}</p>
        </div>
        <div className="archive-footer-links">
          <a href="/"><ArrowLeft size={15} />taozhiyy.top</a>
          <button type="button" className="archive-icon-button"
            onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
            title={zh ? '回到顶部' : 'Back to top'} aria-label={zh ? '回到顶部' : 'Back to top'}><ArrowUp size={18} /></button>
        </div>
      </footer>
    </div>
  );
}
