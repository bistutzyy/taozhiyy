import { useId } from "react";
import {
  LuCheck,
  LuExpand,
  LuFlower2,
  LuLoaderCircle,
  LuRotateCcw,
  LuRotateCw,
  LuShuffle,
  LuSun,
} from "react-icons/lu";
import "./fan-screen.css";

function Command({ label, icon: Icon, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      className={`fan-command ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon aria-hidden="true" />
      <span className="fan-command__tip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

export default function CoverFan({
  covers,
  previewIndex,
  currentIndex,
  readyIndexes,
  failedIndexes,
  busy,
  brightness,
  onPreview,
  onSelect,
  onShuffle,
  onBrightness,
  onResetBrightness,
  onCleanView,
  onConfirm,
  onRetry,
}) {
  const clipId = `fan-paper-${useId().replaceAll(":", "")}`;
  const clipStyle = { clipPath: `url("#${clipId}")` };
  const available = covers.filter(
    ({ index }) => readyIndexes.has(index) && !failedIndexes.has(index),
  );
  const readyPreview = available.some(({ index }) => index === previewIndex);
  return (
    <section
      className={`fan-room${busy ? " is-unfolding" : ""}`}
      aria-label="扇面选景"
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
        <div className="fan-screen" role="group" aria-label="四景折扇">
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
                className={`fan-leaf${selected ? " is-preview" : ""}`}
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
                      onPreview(index);
                  }}
                  onFocus={() => onPreview(index)}
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
      <div className="fan-controls" role="group" aria-label="封面控制">
        <Command
          label="随机一景"
          icon={LuShuffle}
          onClick={onShuffle}
          disabled={
            busy || !available.some(({ index }) => index !== previewIndex)
          }
          className="fan-controls__shuffle"
        />
        <div className="fan-brightness">
          <label htmlFor="cover-brightness">
            <LuSun aria-hidden="true" />
            <span>亮度</span>
          </label>
          <input
            id="cover-brightness"
            aria-label="亮度"
            type="range"
            min={70}
            max={115}
            step={1}
            value={brightness}
            disabled={busy}
            onChange={(event) => onBrightness(Number(event.target.value))}
          />
          <output htmlFor="cover-brightness" data-fit-text>
            {brightness}%
          </output>
          <Command
            label="重置亮度"
            icon={LuRotateCcw}
            onClick={onResetBrightness}
            disabled={busy || brightness === 100}
            className="fan-controls__reset"
          />
        </div>
        <Command
          label="纯净观赏"
          icon={LuExpand}
          onClick={onCleanView}
          disabled={busy || !readyPreview}
          className="fan-controls__clean"
        />
        <button
          type="button"
          className="fan-apply"
          aria-label="使用此封面"
          title="使用此封面"
          disabled={busy || !readyPreview}
          onClick={onConfirm}
        >
          <LuCheck aria-hidden="true" />
          <span>{busy ? "展开中" : "使用此封面"}</span>
        </button>
      </div>
    </section>
  );
}
