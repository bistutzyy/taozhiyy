import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/apiBase";
import {
  hasRemoteCover,
  makePosterDataUri,
  resolveCoverSrc,
} from "../lib/posterPlaceholder";
import { preloadBangumiList } from "../lib/homeWarmup.js";
import { getBangumiList } from "../services/acgApi";

const BANGUMI_CARD =
  "bangumi-mini-card autumn-recipe-card group relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#7C5CFF]/15 bg-white/50 shadow-[0_8px_28px_rgba(124,92,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:border-[#FF6BAA]/35 hover:shadow-[0_12px_34px_rgba(255,107,170,0.12)] active:border-[#00C2FF]/40";

const CANDY_BTN =
  "mt-auto inline-block w-fit rounded-full border border-[#7C5CFF]/45 bg-white/30 px-3 py-1.5 font-mono text-[10px] uppercase text-[#7C5CFF] backdrop-blur-sm transition-all duration-300 hover:border-[#7C5CFF] hover:bg-[#7C5CFF] hover:text-white active:scale-[0.98]";

const MOBILE_BANGUMI_LIMIT = 3;

const EXPAND_BTN =
  "rounded-full border border-[#00C2FF]/50 bg-white/60 px-5 py-2 font-mono text-xs uppercase tracking-wide text-[#2D2A3A] shadow-sm backdrop-blur-md transition-all duration-300 hover:border-[#00C2FF] hover:bg-[#00C2FF]/10 active:scale-[0.98]";

const PosterFrame = ({ item, variant = "bangumi", aspectClass = "aspect-[3/4]" }) => {
  const remote = hasRemoteCover(item);
  const src = remote ? resolveCoverSrc(item, API_BASE) : null;

  return (
    <div className={`relative w-full shrink-0 overflow-hidden ${aspectClass} bg-[#EAF6FF]/60`}>
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#EAF6FF]/80 via-[#FFEAF4]/40 to-[#F3E8FF]/90"
        aria-hidden
      />
      {remote && src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="relative z-[1] h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <img
          src={makePosterDataUri(item.title, variant)}
          alt=""
          className="relative z-[1] h-full w-full object-cover object-center"
        />
      )}
    </div>
  );
};

const BangumiCard = ({ item }) => (
  <article className={BANGUMI_CARD}>
    <PosterFrame item={item} variant="bangumi" />
    <div className="flex flex-1 flex-col p-3">
      <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-[#2D2A3A]">
        {item.title}
      </h3>
      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-[#7C5CFF]/70">
        Latest ep · {item.latestEpisode ?? item.total}
      </p>
      <p className="mt-1 text-[10px] text-[#2D2A3A]/55">
        {item.watched} / {item.total} eps
      </p>

      {item.linkUrl ? (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={CANDY_BTN}
        >
          Let&apos;s watch
        </a>
      ) : (
        <button type="button" className={CANDY_BTN}>
          Let&apos;s watch
        </button>
      )}
    </div>
  </article>
);

const SectionTitle = ({ children, accent = "#7C5CFF" }) => (
  <h3
    className="mb-4 px-1 font-mono text-xs font-semibold uppercase tracking-[0.35em]"
    style={{ color: accent }}
  >
    {children}
  </h3>
);

const AcgNavigation = () => {
  const [bangumiList, setBangumiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bangumiExpanded, setBangumiExpanded] = useState(false);
  const [bangumiRefreshing, setBangumiRefreshing] = useState(false);
  const bangumiSectionRef = useRef(null);

  const hiddenBangumiCount = Math.max(0, bangumiList.length - MOBILE_BANGUMI_LIMIT);
  const showBangumiToggle = hiddenBangumiCount > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBangumiExpanded(false);
      const bangumi = await preloadBangumiList();
      if (!cancelled) {
        setBangumiList(Array.isArray(bangumi) ? bangumi : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBangumiToggle = async () => {
    if (bangumiExpanded) {
      setBangumiRefreshing(true);
      setBangumiExpanded(false);
      try {
        const fresh = await getBangumiList();
        setBangumiList(fresh);
      } finally {
        setBangumiRefreshing(false);
      }
      bangumiSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setBangumiExpanded(true);
  };

  return (
    <section id="acg" className="pb-16 pt-2">
      <div className="container mx-auto px-3 md:px-10">
        <header className="mb-8 px-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00C2FF]/90">
            Tracker
          </p>
          <h2 className="mt-2 font-zentry text-2xl font-black uppercase text-[#2D2A3A] md:text-4xl">
            Bangumi Tracker
          </h2>
        </header>

        {!loading && (
          <>
            <div ref={bangumiSectionRef} className="mb-12 scroll-mt-28 px-1">
              <SectionTitle accent="#7C5CFF">追番大追击</SectionTitle>
              <p className="mb-3 px-1 text-[11px] text-[#2D2A3A]/50 md:hidden">
                {bangumiExpanded
                  ? "以下为展开条目（青框高亮）"
                  : `手机端默认展示 ${MOBILE_BANGUMI_LIMIT} 部`}
              </p>
              <div className="bangumi-mini-grid grid grid-cols-[repeat(auto-fill,minmax(150px,180px))] justify-start gap-5">
                {bangumiList.map((item, index) => {
                  const isExtra = index >= MOBILE_BANGUMI_LIMIT;
                  const revealed = bangumiExpanded && isExtra;

                  return (
                    <div
                      key={item.id}
                      className={clsx(
                        isExtra && !bangumiExpanded && "hidden md:block",
                        revealed &&
                          "max-md:animate-[bangumiReveal_0.45s_ease-out_forwards] max-md:rounded-2xl max-md:ring-2 max-md:ring-[#00C2FF]/45 max-md:ring-offset-2 max-md:ring-offset-[#EAF6FF]",
                      )}
                    >
                      {revealed && (
                        <span className="mb-1.5 inline-block rounded-full bg-[#00C2FF]/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#00C2FF] md:hidden">
                          more
                        </span>
                      )}
                      <BangumiCard item={item} />
                    </div>
                  );
                })}
              </div>

              {showBangumiToggle && (
                <div className="mt-6 flex flex-col items-center gap-2 md:hidden">
                  <button
                    type="button"
                    onClick={handleBangumiToggle}
                    disabled={bangumiRefreshing}
                    className={EXPAND_BTN}
                    aria-expanded={bangumiExpanded}
                  >
                    {bangumiRefreshing
                      ? "刷新中…"
                      : bangumiExpanded
                        ? "收起并刷新"
                        : `展开更多 (+${hiddenBangumiCount})`}
                  </button>
                  {!bangumiExpanded && (
                    <p className="text-center text-[10px] text-[#2D2A3A]/45">
                      点击展开其余 {hiddenBangumiCount} 部；收起将重置列表
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default AcgNavigation;
