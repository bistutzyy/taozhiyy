import { useId } from "react";
import {
  LuCheck,
  LuFlower2,
  LuLoaderCircle,
  LuRotateCw,
} from "react-icons/lu";
import "./fan-screen.css";
import "./cover-mobile.css";

export default function CoverFan({
  covers,
  previewIndex,
  highlightedIndex,
  currentIndex,
  readyIndexes,
  failedIndexes,
  busy,
  onPreview,
  onPreviewEnd,
  onSelect,
  onRetry,
}) {
  const clipId = `fan-paper-${useId().replaceAll(":", "")}`;
  const clipStyle = { clipPath: `url("#${clipId}")` };
  return (
    <section
      className={`fan-room${busy ? " is-unfolding" : ""}`}
      aria-label="封面选景"
    >
      <svg
        className="fan-room__definitions"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d="M.03 .08 Q.5 -.025 .97 .08 L.58 .97 Q.5 1 .42 .97 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="fan-room__stage">
        <div className="fan-screen" role="group" aria-label="四张封面">
          <svg
            className="fan-screen__arc"
            viewBox="0 0 880 520"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M 112 206 Q 440 -42 768 206" />
            <path d="M 102 222 Q 440 -30 778 222" />
          </svg>
          {covers.map(({ index, src, label }, position) => {
            const ready = readyIndexes.has(index) && !failedIndexes.has(index);
            const failed = failedIndexes.has(index);
            const selected = previewIndex === index;
            const status = failed
              ? "加载失败"
              : !ready
                ? "加载中"
                : currentIndex === index
                  ? "当前封面"
                  : "";
            return (
              <div
                key={index}
                className={`fan-leaf${highlightedIndex === index ? " is-preview" : ""}`}
                style={{
                  "--leaf-angle": `${[-43, -14, 14, 43][position % 4]}deg`,
                  "--leaf-mobile-angle": `${[-28, -9, 9, 28][position % 4]}deg`,
                  "--leaf-order": position,
                }}
              >
                <button
                  type="button"
                  className="fan-leaf__button"
                  style={clipStyle}
                  data-cover-index={index}
                  disabled={!ready || busy}
                  aria-label={`使用封面：${label}`}
                  title={`使用封面：${label}`}
                  aria-pressed={selected}
                  aria-describedby={`cover-picker-status-${index}`}
                  aria-busy={!ready && !failed}
                  onMouseEnter={() => {
                    if (
                      window.matchMedia("(hover: hover) and (pointer: fine)")
                        .matches
                    )
                      onPreview(index, "pointer");
                  }}
                  onMouseLeave={() => onPreviewEnd(index, "pointer")}
                  onFocus={() => onPreview(index, "focus")}
                  onBlur={() => onPreviewEnd(index, "focus")}
                  onClick={(event) => onSelect(index, event.currentTarget)}
                >
                  {ready && <img src={src} alt="" draggable="false" />}
                  <span className="fan-leaf__paper" aria-hidden="true" />
                  <span className="fan-leaf__folds" aria-hidden="true" />
                  <span className="fan-leaf__label" data-fan-hit>
                    <span>{["壹", "贰", "叁", "肆"][position % 4]}</span>
                    {currentIndex === index && <LuCheck aria-hidden="true" />}
                  </span>
                  {!ready && !failed && (
                    <LuLoaderCircle
                      className="fan-leaf__loader"
                      aria-hidden="true"
                    />
                  )}
                </button>
                <svg
                  className="fan-leaf__edge"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 8 Q50 -2.5 97 8 L58 97 Q50 100 42 97 Z" />
                </svg>
                <span
                  className="fan-leaf__status"
                  id={`cover-picker-status-${index}`}
                >
                  {status}
                </span>
                {failed && (
                  <button
                    type="button"
                    className="cover-picker__retry"
                    aria-label={`重试加载：${label}`}
                    title={`重试加载：${label}`}
                    disabled={busy}
                    onClick={() => onRetry(index)}
                  >
                    <LuRotateCw aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
          <span className="fan-screen__pivot" aria-hidden="true">
            <LuFlower2 />
          </span>
          <span key={previewIndex} className="fan-tassel" aria-hidden="true">
            <i className="fan-tassel__cord" />
            <i className="fan-tassel__knot" />
            <span className="fan-tassel__fringe">
              {Array.from({ length: 5 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          </span>
          <span className="fan-screen__seal" aria-hidden="true">
            桃
          </span>
          <div
            className="fan-room__count"
            data-fit-text
            role="status"
            aria-live="polite"
          >
            <strong>{String(previewIndex).padStart(2, "0")}</strong>
            <span>/ {String(covers.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
