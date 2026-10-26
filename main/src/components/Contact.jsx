import { useEffect, useRef, useState } from "react";

import { galleryAlbums } from "../data/galleryAlbums";
import { getWallpaperGift } from "../services/acgApi";
import {
  createSettledDrawState,
  getDrawDigits,
} from "./contactLotteryState";
import {
  DEFAULT_WALLPAPER_ASPECT_RATIO,
  getWallpaperCardStyle,
} from "./wallpaperFrameLayout";
import { loadWallpaperGift, pickWallpaperPosterImage } from "./wallpaperGiftLoader";
import { cosAsset } from "../lib/cosAsset.js";

const SOURCE_ASSET_BASE = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main/img"
);

const prizes = [
  {
    id: "homepage",
    icon: "HP",
    label: "Homepage Source",
    title: "Homepage Learning Reference",
    description:
      "The early homepage learned from Adrian Hajdin's award-winning website tutorial, then kept being reshaped into Taozhiyy's own visual language.",
    href: "https://github.com/adrianhajdin/award-winning-website#introduction",
    visual: `${SOURCE_ASSET_BASE}/swordman.webp`,
    action: "Open reference",
  },
  {
    id: "blog",
    icon: "BG",
    label: "Blog Source",
    title: "Blog Subpage Source",
    description:
      "The blog subpage is based on Hexo and the Butterfly theme. For theme usage, configuration, and attribution details, please refer to Butterfly's official documentation.",
    href: "https://butterfly.js.org/",
    visual: galleryAlbums[1]?.cover || galleryAlbums[0]?.cover || "",
    action: "Visit Butterfly",
  },
  {
    id: "wallpaper",
    icon: "WP",
    label: "Wallpaper Gift",
    title: "A Gallery Wallpaper Gift",
    description:
      "You drew a random high-resolution image from the Gallery archive. Open it full size, download it, or simply keep it on screen for a moment.",
    action: "Open wallpaper",
  },
];

const wallpaperPool = galleryAlbums.flatMap((album) =>
  album.images.map((url, index) => ({
    url,
    album: album.title,
    label: `${album.eyebrow} #${String(index + 1).padStart(2, "0")}`,
  }))
);

const fallbackWallpaper = {
  url: galleryAlbums[0]?.cover || "",
  album: galleryAlbums[0]?.title || "Gallery",
  label: "Gallery Gift",
};

const wallpaperLoadingText = "\u9ad8\u6e05\u58c1\u7eb8\u6b63\u5728\u8def\u4e0a...";

const pickWallpaperGift = () => {
  if (!wallpaperPool.length) return fallbackWallpaper;
  return wallpaperPool[Math.floor(Math.random() * wallpaperPool.length)];
};

const normalizeWallpaperGift = (item) => {
  if (!item?.url) return null;
  return {
    url: item.url,
    previewUrl: item.previewUrl || item.url,
    album:
      item.source === "pexels"
        ? "Pexels Licensed Wallpaper"
        : item.source === "pixabay"
          ? "Pixabay Licensed Wallpaper"
          : item.source || "Legal Wallpaper Pool",
    label: item.author ? `Photo by ${item.author}` : "Legal Wallpaper Gift",
    sourceUrl: item.sourceUrl || item.url,
    licenseNote: item.licenseNote || "Licensed source wallpaper",
  };
};

const requestWallpaperGift = async ({ apiOnly = false, signal } = {}) => {
  const item = await getWallpaperGift({ apiOnly, signal });
  return normalizeWallpaperGift(item);
};

const fetchWallpaperGift = ({ apiOnly = false } = {}) =>
  loadWallpaperGift({
    apiOnly,
    requestWallpaper: requestWallpaperGift,
    pickFallback: pickWallpaperGift,
  });

const getRandomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getPrizeByDrawNumber = (number) => {
  if (number <= 332) return prizes[0];
  if (number <= 665) return prizes[1];
  return prizes[2];
};

const getNumberForPrize = (prize) => {
  if (prize.id === "homepage") return getRandomInt(0, 332);
  if (prize.id === "blog") return getRandomInt(333, 665);
  return getRandomInt(666, 998);
};

const getWeightedPrize = () => {
  const roll = Math.random() * 10;
  if (roll < 0.5) return prizes[0];
  if (roll < 1) return prizes[1];
  return prizes[2];
};

const getPrizeForAutoDraw = (completedDraws) => {
  if (completedDraws === 0) return prizes[0];
  if (completedDraws === 1) return prizes[1];
  return getWeightedPrize();
};

const Contact = () => {
  const [activePrize, setActivePrize] = useState(prizes[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
  const [autoDrawCount, setAutoDrawCount] = useState(0);
  const [drawNumber, setDrawNumber] = useState(0);
  const [slotDigits, setSlotDigits] = useState(() => getDrawDigits(0));
  const [resultOpen, setResultOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [cheatCode, setCheatCode] = useState("");
  const [drawHistory, setDrawHistory] = useState([]);
  const [activeWallpaper, setActiveWallpaper] = useState(() =>
    pickWallpaperGift()
  );
  const [wallpaperLoadStatus, setWallpaperLoadStatus] = useState("idle");
  const [wallpaperOrientation, setWallpaperOrientation] = useState("landscape");
  const [wallpaperAspectRatio, setWallpaperAspectRatio] = useState(
    DEFAULT_WALLPAPER_ASPECT_RATIO
  );
  const drawingRef = useRef(false);
  const drawRunIdRef = useRef(0);
  const spinTimerRef = useRef(null);
  const settleTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      drawRunIdRef.current += 1;
      drawingRef.current = false;
      if (spinTimerRef.current) window.clearInterval(spinTimerRef.current);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, []);

  const drawPrize = (forcedNumber) => {
    if (drawingRef.current) return;
    drawingRef.current = true;
    const drawRunId = drawRunIdRef.current + 1;
    drawRunIdRef.current = drawRunId;
    if (spinTimerRef.current) window.clearInterval(spinTimerRef.current);
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);

    setIsDrawing(true);
    setResultOpen(false);
    setWallpaperLoadStatus("idle");
    setWallpaperOrientation("landscape");
    setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
    const isForcedDraw = typeof forcedNumber === "number";
    const forcedAPITest = forcedNumber === 999;
    const nextPrize = isForcedDraw
      ? getPrizeByDrawNumber(forcedNumber)
      : getPrizeForAutoDraw(autoDrawCount);
    const nextNumber = isForcedDraw ? forcedNumber : getNumberForPrize(nextPrize);
    const recordId = `${Date.now()}-${nextNumber}`;

    spinTimerRef.current = window.setInterval(() => {
      setSlotDigits(getDrawDigits(Math.floor(Math.random() * 1000)));
    }, 90);

    settleTimerRef.current = window.setTimeout(() => {
      if (drawRunIdRef.current !== drawRunId) return;
      if (spinTimerRef.current) window.clearInterval(spinTimerRef.current);
      spinTimerRef.current = null;
      settleTimerRef.current = null;

      const settledState = createSettledDrawState({
        prize: nextPrize,
        number: nextNumber,
      });

      setDrawNumber(settledState.drawNumber);
      setSlotDigits(settledState.slotDigits);
      setActivePrize(nextPrize);
      if (settledState.shouldLoadWallpaper) {
        setActiveWallpaper(null);
        setWallpaperOrientation("landscape");
        setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
        setWallpaperLoadStatus(settledState.wallpaperLoadStatus);
      }
      setDrawCount((count) => count + 1);
      if (!isForcedDraw) {
        setAutoDrawCount((count) => count + 1);
      }
      setDrawHistory((history) =>
        [
          {
            id: recordId,
            number: nextNumber,
            prize: nextPrize,
            wallpaper: null,
          },
          ...history,
        ].slice(0, 8)
      );

      drawingRef.current = false;
      setIsDrawing(settledState.isDrawing);
      setResultOpen(settledState.resultOpen);

      if (settledState.shouldLoadWallpaper) {
        fetchWallpaperGift({ apiOnly: forcedAPITest }).then((wallpaper) => {
          if (drawRunIdRef.current !== drawRunId) return;
          const nextWallpaper = forcedAPITest
            ? {
                ...wallpaper,
                album: wallpaper.album || "后端接口图片",
                label: wallpaper.label || "后端接口测试壁纸",
              }
            : wallpaper;

          setActiveWallpaper(nextWallpaper);
          setWallpaperLoadStatus(nextWallpaper?.url ? "loading" : "unavailable");
          setDrawHistory((history) =>
            history.map((record) =>
              record.id === recordId
                ? { ...record, wallpaper: nextWallpaper }
                : record
            )
          );
        });
      }
    }, 1100);
  };

  const drawCheatPrize = () => {
    const parsedNumber = Number.parseInt(cheatCode, 10);
    if (Number.isNaN(parsedNumber)) return;
    const safeNumber = Math.max(0, Math.min(999, parsedNumber));
    setCheatCode(String(safeNumber).padStart(3, "0"));
    drawPrize(safeNumber);
  };

  const openHistoryResult = (record) => {
    setDrawNumber(record.number);
    setSlotDigits(getDrawDigits(record.number));
    setActivePrize(record.prize);
    if (record.prize.id === "wallpaper") {
      setActiveWallpaper(record.wallpaper || null);
      setWallpaperOrientation("landscape");
      setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
      setWallpaperLoadStatus(record.wallpaper?.url ? "loading" : "unavailable");
    } else {
      setWallpaperOrientation("landscape");
      setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
      setWallpaperLoadStatus("idle");
    }
    setHistoryOpen(false);
    setResultOpen(true);
  };

  const resultPoster =
    activePrize.id === "wallpaper"
      ? {
          image: pickWallpaperPosterImage(activeWallpaper),
          label: activeWallpaper?.label || fallbackWallpaper.label,
          meta: activeWallpaper?.album || fallbackWallpaper.album,
        }
      : {
          image: activePrize.visual || fallbackWallpaper.url,
          label: activePrize.label,
          meta: activePrize.title,
        };

  useEffect(() => {
    if (resultOpen && activePrize.id === "wallpaper" && resultPoster.image) {
      setWallpaperOrientation("landscape");
      setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
      setWallpaperLoadStatus("loading");
    }
  }, [activePrize.id, resultOpen, resultPoster.image]);

  const openPrize = () => {
    if (activePrize.id === "wallpaper") {
      window.open(
        activeWallpaper?.sourceUrl || activeWallpaper?.url || fallbackWallpaper.url,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }
    window.open(activePrize.href, "_blank", "noopener,noreferrer");
  };

  const drawCode = String(drawNumber).padStart(3, "0");
  const wallpaperCardClassName =
    activePrize.id === "wallpaper"
      ? [
          "wallpaper-prize-card is-wallpaper-result",
          wallpaperOrientation === "portrait" ? "is-portrait-result" : "",
        ]
          .filter(Boolean)
          .join(" ")
      : "wallpaper-prize-card is-text-result";
  const wallpaperMediaClassName = [
    "wallpaper-prize-media",
    wallpaperOrientation === "portrait" ? "is-portrait" : "is-landscape",
    wallpaperLoadStatus === "loaded"
      ? "is-loaded"
      : wallpaperLoadStatus === "unavailable"
        ? "is-unavailable"
        : "is-loading",
  ].join(" ");
  const wallpaperFrameStyle = getWallpaperCardStyle(wallpaperAspectRatio);
  const wallpaperStatusText =
    wallpaperLoadStatus === "unavailable"
      ? "暂时没有拿到高清壁纸"
      : wallpaperLoadingText;
  const wallpaperStatusDetail =
    wallpaperLoadStatus === "unavailable"
      ? activeWallpaper?.licenseNote || "可以稍后再试一次。"
      : "Loading gallery wallpaper";

  return (
    <>
      <section
        id="end"
        className="source-lottery-section my-20 min-h-96 w-screen px-4 md:px-10"
      >
        <div className="source-arcade-shell">
        <div className="source-arcade-bg-grid" aria-hidden="true" />

        <div className="source-lottery-stage">
          <div className="source-arcade-machine">
            <div className="source-machine-crown" aria-hidden="true" />
            <div className="source-arcade-marquee">
              <span />
              <strong>SOURCE SLOT</strong>
              <span />
            </div>

            <div className="source-machine-body">
              <div className="source-screen-bay">
                <div className="source-arcade-screen">
                  <div className="source-screen-glass" aria-hidden="true" />
                  <div
                    className={
                      isDrawing ? "source-reels is-spinning" : "source-reels"
                    }
                  >
                    {slotDigits.map((digit, index) => (
                      <div
                        className="source-reel-card source-digit-card"
                        key={`${index}-${drawCount}`}
                      >
                        <span>{digit}</span>
                        <strong>{["HUN", "TEN", "ONE"][index]}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="source-machine-controls">
                <div
                  className={
                    isDrawing
                      ? "source-arcade-lever is-pulled"
                      : "source-arcade-lever"
                  }
                >
                  <button
                    type="button"
                    onClick={() => drawPrize()}
                    aria-label="Pull to draw a source prize"
                  >
                    <span className="source-lever-stick" />
                    <span className="source-lever-ball" />
                  </button>
                  <p>PULL</p>
                </div>

                <button
                  type="button"
                  className="source-arcade-draw-btn"
                  onClick={() => drawPrize()}
                  disabled={isDrawing}
                >
                  {isDrawing ? "DRAWING" : "START"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="source-outer-tools" aria-label="Source slot tools">
          <button
            type="button"
            className={manualOpen ? "source-manual-book is-open" : "source-manual-book"}
            onClick={() => setManualOpen((open) => !open)}
            aria-expanded={manualOpen}
          >
            <span>USER</span>
            <strong>MANUAL</strong>
          </button>

          <div className="source-tool-dock">
            <button
              type="button"
              className={historyOpen ? "source-tool-chip is-open" : "source-tool-chip"}
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              <span>History</span>
              <strong>{drawHistory.length}</strong>
            </button>
            <button
              type="button"
              className={cheatOpen ? "source-tool-chip source-tool-chip--cheat is-open" : "source-tool-chip source-tool-chip--cheat"}
              onClick={() => setCheatOpen((open) => !open)}
              aria-expanded={cheatOpen}
            >
              <span>Cheat</span>
              <strong>000</strong>
            </button>
          </div>
        </div>

        </div>
      </section>

      {manualOpen && (
        <div className="source-manual-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="source-manual-backdrop"
            aria-label="Close source manual"
            onClick={() => setManualOpen(false)}
          />
          <div className="source-manual-result-card">
            <button
              type="button"
              className="source-tool-close"
              onClick={() => setManualOpen(false)}
            >
              Close
            </button>
            <div className="source-manual-page">
              <p>使用说明</p>
              <h3>抽奖魔法书</h3>
              <span>点击拉杆或开始按钮会抽出一个三位数，并打开对应奖品卡片。</span>
              <span>第一次固定获得首页学习来源，第二次固定获得博客主题来源。</span>
              <span>从第三次开始进入概率池：前两种文字奖品各占 0.5 份，壁纸奖品占 9 份。</span>
              <span>壁纸奖品会优先向后端接口请求新图片，接口不可用时才使用本地相册兜底。</span>
              <span>历史记录会保留最近八次抽奖，测试模式可输入三位数检查指定结果。</span>
            </div>
          </div>
        </div>
      )}

      {historyOpen && (
        <div className="source-tool-modal source-history-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="source-tool-backdrop source-history-backdrop"
            aria-label="Close history records"
            onClick={() => setHistoryOpen(false)}
          />
          <div className="source-tool-result-card source-history-result-card">
            <button
              type="button"
              className="source-tool-close"
              onClick={() => setHistoryOpen(false)}
            >
              Close
            </button>
            <div className="source-history-card">
              <p>History Records</p>
              {drawHistory.length ? (
                <div className="source-history-list">
                  {drawHistory.map((record) => (
                    <button
                      type="button"
                      key={record.id}
                      onClick={() => openHistoryResult(record)}
                    >
                      <span>{String(record.number).padStart(3, "0")}</span>
                      <small>{record.prize.label}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="source-history-empty">
                  No draws yet. Pull the lever once and the number will be stored here.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {cheatOpen && (
        <div className="source-tool-modal source-cheat-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="source-tool-backdrop source-cheat-backdrop"
            aria-label="Close cheat mode"
            onClick={() => setCheatOpen(false)}
          />
          <div className="source-tool-result-card source-cheat-result-card">
            <button
              type="button"
              className="source-tool-close"
              onClick={() => setCheatOpen(false)}
            >
              Close
            </button>
            <div className="source-cheat-card">
              <p>Cheat Mode</p>
              <span className="source-cheat-note">
                输入任意三位数字，可直接检查它对应的奖品结果。
              </span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={3}
                value={cheatCode}
                placeholder="000"
                onChange={(event) =>
                  setCheatCode(event.target.value.replace(/\D/g, "").slice(0, 3))
                }
              />
              <button
                type="button"
                onClick={() => {
                  drawCheatPrize();
                  setCheatOpen(false);
                }}
                disabled={isDrawing || cheatCode.length === 0}
              >
                Set Number
              </button>
            </div>
          </div>
        </div>
      )}

      {resultOpen && (
        <div className="wallpaper-prize-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="wallpaper-prize-backdrop"
            aria-label="Close source result"
            onClick={() => {
              setResultOpen(false);
              setWallpaperLoadStatus("idle");
              setWallpaperOrientation("landscape");
            }}
          />
          <div className={wallpaperCardClassName} style={wallpaperFrameStyle}>
            <button
              type="button"
              className="wallpaper-prize-close"
              onClick={() => {
                setResultOpen(false);
                setWallpaperLoadStatus("idle");
                setWallpaperOrientation("landscape");
              }}
            >
              Close
            </button>
            {activePrize.id === "wallpaper" ? (
              <div className={wallpaperMediaClassName}>
                {wallpaperLoadStatus !== "loaded" && (
                  <div className="wallpaper-prize-loading" aria-live="polite">
                    <span>{wallpaperStatusText}</span>
                    <small>{wallpaperStatusDetail}</small>
                  </div>
                )}
                {resultPoster.image && (
                  <img
                    key={resultPoster.image}
                    src={resultPoster.image}
                    alt={`${resultPoster.label} wallpaper`}
                    className={
                      wallpaperLoadStatus === "loaded" ? "is-loaded" : ""
                    }
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } =
                        event.currentTarget;
                      const nextAspectRatio =
                        naturalWidth > 0 && naturalHeight > 0
                          ? naturalWidth / naturalHeight
                          : DEFAULT_WALLPAPER_ASPECT_RATIO;
                      setWallpaperAspectRatio(nextAspectRatio);
                      setWallpaperOrientation(
                        naturalWidth > 0 &&
                          naturalHeight > 0 &&
                          naturalWidth < naturalHeight
                          ? "portrait"
                          : "landscape"
                      );
                      setWallpaperLoadStatus("loaded");
                    }}
                    onError={() => {
                      const fallback = pickWallpaperGift();
                      if (fallback?.url && resultPoster.image !== fallback.url) {
                        setActiveWallpaper(fallback);
                        setWallpaperOrientation("landscape");
                        setWallpaperAspectRatio(DEFAULT_WALLPAPER_ASPECT_RATIO);
                        setWallpaperLoadStatus("loading");
                        return;
                      }
                      setWallpaperLoadStatus("unavailable");
                    }}
                  />
                )}
              </div>
            ) : (
              <>
                <p>Source Result</p>
                <h3>{activePrize.title}</h3>
                <span>
                  No. {drawCode} · {resultPoster.meta}
                </span>
                <p className="wallpaper-prize-description">
                  {activePrize.description}
                </p>
                <div className="wallpaper-prize-actions">
                  <button type="button" onClick={openPrize}>
                    {activePrize.action}
                  </button>
                  <button type="button" onClick={() => setResultOpen(false)}>
                    Keep Reading
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Contact;
