import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuArrowRight,
  LuArrowUp,
  LuArrowUpRight,
  LuAudioLines,
  LuBell,
  LuBookOpen,
  LuCheck,
  LuChevronDown,
  LuCommand,
  LuCopy,
  LuDices,
  LuFlower2,
  LuHeart,
  LuImages,
  LuLayoutGrid,
  LuLink,
  LuMonitor,
  LuMoon,
  LuPin,
  LuPower,
  LuSparkles,
  LuStar,
  LuVolumeX,
  LuX,
} from "react-icons/lu";
import {
  CONSOLE_ANNOUNCEMENTS,
  CONSOLE_FRAGMENTS,
  CONSOLE_QUICK_LINKS,
  CONSOLE_UPDATES,
} from "./consoleContent.js";
import projectCover from "./covers/projects.png";
import blogCover from "./covers/blog.png";
import buildCover from "./covers/build.png";
import "./site-console.css";

const covers = { projects: projectCover, blog: blogCover, build: buildCover };
const fragmentIcons = [LuSparkles, LuBookOpen, LuLayoutGrid];
const quickIcons = { glimmer: LuImages, friends: LuHeart, pulse: LuMonitor };
const fragmentDestination = (href) =>
  import.meta.env.DEV && ["/projects/", "/build/"].includes(href)
    ? `https://taozhiyy.top${href}`
    : href;

export default function SiteConsole({
  open,
  onClose,
  isAudioPlaying,
  onToggleAudio,
  onSwitchCover,
}) {
  const [tab, setTab] = useState("announcements");
  const [copyState, setCopyState] = useState("");
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = document.getElementById("root");
    const previousInert = background?.inert;
    if (background) background.inert = true;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const focusable = [
          ...dialogRef.current.querySelectorAll(
            'a[href], button:not([disabled]), summary, [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (background) background.inert = previousInert;
      if (returnFocusRef.current?.isConnected)
        returnFocusRef.current.focus({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const copySite = async () => {
    window.clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText("https://taozhiyy.top/");
      setCopyState("已复制站点链接");
    } catch {
      setCopyState("暂时无法复制，请检查浏览器权限");
    }
    copyTimerRef.current = window.setTimeout(() => setCopyState(""), 2600);
  };

  const goTop = () => {
    onClose();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const onTabKey = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "announcements"
        : event.key === "End"
          ? "updates"
          : tab === "announcements"
            ? "updates"
            : "announcements";
    setTab(next);
    document.getElementById(`console-tab-${next}`)?.focus();
  };

  const entries =
    tab === "announcements" ? CONSOLE_ANNOUNCEMENTS : CONSOLE_UPDATES;

  return createPortal(
    <div className="site-console-layer">
      <div
        className="site-console-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <section
        ref={dialogRef}
        id="site-console"
        className="site-console"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-console-title"
      >
        <header className="console-heading">
          <div className="console-identity">
            <span className="console-emblem" aria-hidden="true">
              <LuCommand />
            </span>
            <div>
              <span className="console-eyebrow">TAOZHIYO / CONTROL ROOM</span>
              <h2 id="site-console-title">
                控制台<span className="console-title-dot">.</span>
              </h2>
            </div>
          </div>
          <div className="console-heading-end">
            <span className="console-local-time">
              <LuFlower2 aria-hidden="true" />{" "}
              {new Intl.DateTimeFormat("zh-CN", {
                month: "long",
                day: "numeric",
                timeZone: "Asia/Shanghai",
              }).format(new Date())}
            </span>
            <span className="console-head-rule" />
            <button
              ref={closeRef}
              type="button"
              className="console-icon-key console-close"
              onClick={onClose}
              aria-label="关闭控制台"
              title="关闭控制台"
            >
              <LuX />
            </button>
          </div>
        </header>

        <div className="console-workspace">
          <aside className="console-journal" aria-label="公告与更新">
            <div className="console-section-label">
              <LuBell aria-hidden="true" />
              <span>小站消息</span>
              <span className="console-section-index">01 / JOURNAL</span>
            </div>
            <div
              className="console-tabs"
              role="tablist"
              aria-label="消息分类"
              onKeyDown={onTabKey}
            >
              {[
                ["announcements", "公告"],
                ["updates", "更新日志"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  id={`console-tab-${id}`}
                  type="button"
                  role="tab"
                  tabIndex={tab === id ? 0 : -1}
                  aria-selected={tab === id}
                  aria-controls="console-journal-panel"
                  onClick={() => setTab(id)}
                >
                  {label}
                  {tab === id && <span className="console-tab-light" />}
                </button>
              ))}
            </div>
            <div
              id="console-journal-panel"
              role="tabpanel"
              aria-labelledby={`console-tab-${tab}`}
              className="console-journal-entries"
              key={tab}
            >
              {entries.map((item, index) => (
                <details
                  className={`console-journal-entry ${index === 0 ? "is-featured" : ""}`}
                  key={item.id}
                  open={index === 0 ? true : undefined}
                >
                  <summary>
                    <span className="console-entry-meta">
                      {index === 0 && tab === "announcements" ? (
                        <LuPin aria-hidden="true" />
                      ) : (
                        <span className="console-entry-dot" />
                      )}
                      {item.tag}
                      {item.date && (
                        <time dateTime={item.date}>
                          {item.date.slice(5).replace("-", ".")}
                        </time>
                      )}
                    </span>
                    <span className="console-entry-title">
                      {item.title}
                      <LuChevronDown aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="console-entry-body">
                    <p>{item.text}</p>
                    {item.href && (
                      <a href={fragmentDestination(item.href)}>
                        {item.action}
                        <LuArrowUpRight aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </div>
            <div className="console-journal-signature">
              <span className="console-tiny-flower" aria-hidden="true">
                <LuFlower2 />
              </span>
              <span>写给每一个偶然路过的你</span>
            </div>
          </aside>

          <div className="console-main">
            <section className="console-fragments" aria-label="片段入口">
              <div className="console-section-label">
                <LuLayoutGrid aria-hidden="true" />
                <span>从这里出发</span>
                <span className="console-section-index">02 / EXPLORE</span>
              </div>
              <div className="console-fragment-grid">
                {CONSOLE_FRAGMENTS.map((fragment, index) => {
                  const Icon = fragmentIcons[index];
                  const external = fragment.href.startsWith("https:");
                  return (
                    <article
                      key={fragment.id}
                      className={`console-fragment console-fragment--${fragment.id}`}
                    >
                      <a
                        className="console-fragment-cover"
                        href={fragmentDestination(fragment.href)}
                        aria-label={fragment.action}
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        <img
                          src={covers[fragment.cover]}
                          alt={`${fragment.title}页面预览`}
                          width="1120"
                          height="700"
                        />
                        <span className="console-number-key">
                          {fragment.id}
                        </span>
                        <span className="console-cover-launch">
                          <LuArrowUpRight aria-hidden="true" />
                        </span>
                      </a>
                      <div className="console-fragment-info">
                        <span className="console-fragment-english">
                          {fragment.english}
                        </span>
                        <h3>{fragment.title}</h3>
                        <p>{fragment.description}</p>
                        <a
                          className="console-key console-enter-key"
                          href={fragmentDestination(fragment.href)}
                          {...(external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          <Icon aria-hidden="true" />
                          <span>{fragment.action}</span>
                          <LuArrowUpRight aria-hidden="true" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <div className="console-lower-deck">
              <section
                className="console-lottery"
                aria-labelledby="console-lottery-title"
              >
                <div className="console-lottery-copy">
                  <span className="console-lottery-label">
                    <LuDices aria-hidden="true" /> LUCKY STATION
                  </span>
                  <h3 id="console-lottery-title">
                    留一点位置
                    <br />
                    给好运气<span>。</span>
                  </h3>
                  <span className="console-reserved">
                    <span />
                    机位预留
                  </span>
                  <a href="/#end" onClick={onClose}>
                    前往现有抽奖机
                    <LuArrowRight aria-hidden="true" />
                  </a>
                </div>
                <div className="console-mini-machine" aria-hidden="true">
                  <div className="console-machine-top">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="console-machine-reels">
                    <span>
                      <LuStar />
                    </span>
                    <span>
                      <LuHeart />
                    </span>
                    <span>
                      <LuMoon />
                    </span>
                  </div>
                  <div className="console-machine-bottom">
                    <i />
                    <span />
                    <i />
                  </div>
                  <div className="console-machine-lever">
                    <span />
                  </div>
                  <div className="console-machine-feet">
                    <i />
                    <i />
                  </div>
                </div>
              </section>
              <section className="console-shortcuts" aria-label="快捷访问">
                <div className="console-section-label">
                  <LuLink aria-hidden="true" />
                  <span>随处逛逛</span>
                </div>
                <div className="console-shortcut-grid">
                  {CONSOLE_QUICK_LINKS.map((item) => {
                    const Icon = quickIcons[item.id];
                    return (
                      <a
                        key={item.id}
                        className={`console-shortcut console-shortcut--${item.id}`}
                        href={item.href}
                      >
                        <span className="console-shortcut-icon">
                          <Icon aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.note}</small>
                        </span>
                        <LuArrowUpRight aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>

        <footer className="console-control-strip">
          <a className="console-site-address" href="/">
            <LuFlower2 aria-hidden="true" />
            <span>
              taozhiyo<small>taozhiyy.top</small>
            </span>
          </a>
          <div className="console-control-keys">
            <button
              type="button"
              className={`console-tool-key ${isAudioPlaying ? "is-on" : ""}`}
              aria-pressed={isAudioPlaying}
              onClick={onToggleAudio}
              title={isAudioPlaying ? "关闭背景音乐" : "播放背景音乐"}
            >
              {isAudioPlaying ? <LuAudioLines /> : <LuVolumeX />}
              <span>音乐</span>
              <i />
            </button>
            <button
              type="button"
              className="console-tool-key"
              onClick={onSwitchCover}
              title="切换首页封面"
            >
              <LuImages />
              <span>换封面</span>
            </button>
            <button
              type="button"
              className="console-tool-key"
              onClick={copySite}
              title="复制站点链接"
            >
              {copyState.startsWith("已复制") ? <LuCheck /> : <LuCopy />}
              <span>分享</span>
            </button>
            <span className="console-controls-divider" />
            <button
              type="button"
              className="console-tool-key"
              onClick={goTop}
              title="回到顶部"
            >
              <LuArrowUp />
              <span>顶部</span>
            </button>
            <button
              type="button"
              className="console-tool-key console-power-key"
              onClick={onClose}
              title="收起控制台"
            >
              <LuPower />
              <span>收起</span>
            </button>
          </div>
          <span className="console-copy-status" role="status">
            {copyState}
          </span>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
