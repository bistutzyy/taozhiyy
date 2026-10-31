import { useEffect, useState } from "react";
import {
  LuCheck,
  LuDices,
  LuDisc3,
  LuExpand,
  LuLoaderCircle,
  LuPlay,
  LuRotateCcw,
  LuRotateCw,
  LuSun,
} from "react-icons/lu";
import "./screening-room.css";

function Command({ label, icon: Icon, onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      className={`screening-command ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon aria-hidden="true" />
      <span className="screening-command__tip" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}

export default function CoverScreening({
  covers,
  previewIndex,
  currentIndex,
  readyIndexes,
  failedIndexes,
  busy,
  brightness,
  onPreview,
  onShuffle,
  onBrightness,
  onResetBrightness,
  onCleanView,
  onConfirm,
  onRetry,
}) {
  const [projecting, setProjecting] = useState(false);
  const available = covers.filter(
    ({ index }) => readyIndexes.has(index) && !failedIndexes.has(index),
  );
  const readyPreview = available.some(({ index }) => index === previewIndex);
  const alternate = available.some(({ index }) => index !== previewIndex);
  useEffect(() => {
    setProjecting(true);
    const timeout = window.setTimeout(() => setProjecting(false), 700);
    return () => window.clearTimeout(timeout);
  }, [previewIndex]);
  return (
    <section
      className={`screening-room${projecting || busy ? " is-projecting" : ""}`}
      aria-label="封面放映室"
    >
      <div className="screening-room__scene">
        <div
          className="screening-projector"
          aria-label={`预览 ${previewIndex} / ${covers.length}`}
        >
          <div className="screening-projector__wrap">
            <div className="screening-projector__object">
              <div className="screening-projector__beam" aria-hidden="true" />
              <LuDisc3
                className="screening-projector__reel screening-projector__reel--back"
                aria-hidden="true"
              />
              <LuDisc3
                className="screening-projector__reel screening-projector__reel--front"
                aria-hidden="true"
              />
              <div className="screening-projector__body" aria-hidden="true">
                <span className="screening-projector__led" />
                <span className="screening-projector__brand">taozhiyo</span>
                <i />
                <i />
                <i />
              </div>
              <span className="screening-projector__lens" aria-hidden="true">
                <LuPlay aria-hidden="true" />
              </span>
              <span className="screening-projector__foot" aria-hidden="true" />
              <button
                type="button"
                className="screening-projector__trigger"
                aria-label="放映并应用封面"
                title="放映并应用封面"
                disabled={!readyPreview || busy}
                onClick={onConfirm}
              />
            </div>
          </div>
          <div
            className="screening-projector__readout"
            data-fit-text
            role="status"
            aria-live="polite"
          >
            <span className="screening-projector__readout-line" />
            <span>PREVIEW</span>
            <strong>{String(previewIndex).padStart(2, "0")}</strong>
            <span>/ {String(covers.length).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="screening-slides" role="group" aria-label="封面画片">
          {covers.map(({ index, src, label }, position) => {
            const ready = readyIndexes.has(index) && !failedIndexes.has(index);
            const failed = failedIndexes.has(index);
            const selected = previewIndex === index;
            const status = failed
              ? "加载失败"
              : !ready
                ? "加载中"
                : selected
                  ? "预览中"
                  : currentIndex === index
                    ? "当前封面"
                    : "";
            return (
              <div
                key={index}
                className={`screening-slide${selected ? " is-selected" : ""}`}
                style={{
                  "--slide-angle": `${[-7, 5, -4, 7][position % 4]}deg`,
                  "--slide-delay": `${position * 60}ms`,
                }}
              >
                <div className="screening-slide__mount">
                  <button
                    type="button"
                    className="screening-slide__button"
                    data-cover-index={index}
                    disabled={!ready || busy}
                    aria-busy={!ready && !failed}
                    aria-label={`预览封面：${label}`}
                    aria-pressed={selected}
                    aria-describedby={`cover-picker-status-${index}`}
                    onClick={() => onPreview(index)}
                  >
                    <span className="screening-slide__image">
                      {ready && <img src={src} alt="" draggable="false" />}
                      {!ready && !failed && (
                        <LuLoaderCircle
                          className="screening-slide__loader"
                          aria-hidden="true"
                        />
                      )}
                      {currentIndex === index && (
                        <span
                          className="screening-slide__current"
                          aria-hidden="true"
                        >
                          <LuCheck />
                        </span>
                      )}
                    </span>
                    <span className="screening-slide__caption" data-fit-text>
                      <span>{String(index).padStart(2, "0")}</span>
                      <span id={`cover-picker-status-${index}`}>{status}</span>
                      <span
                        className="screening-slide__perforation"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
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
              </div>
            );
          })}
        </div>
      </div>
      <div className="screening-controls" role="group" aria-label="封面控制">
        <Command
          label="随机一景"
          icon={LuDices}
          onClick={onShuffle}
          disabled={!alternate || busy}
          className="screening-controls__shuffle"
        />
        <span className="screening-controls__divider" aria-hidden="true" />
        <div className="screening-brightness">
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
            onChange={(event) => onBrightness(Number(event.target.value))}
            disabled={busy}
          />
          <output htmlFor="cover-brightness" data-fit-text>
            {brightness}%
          </output>
          <Command
            label="重置亮度"
            icon={LuRotateCcw}
            onClick={onResetBrightness}
            disabled={busy || brightness === 100}
            className="screening-controls__reset"
          />
        </div>
        <span className="screening-controls__divider" aria-hidden="true" />
        <Command
          label="纯净观赏"
          icon={LuExpand}
          onClick={onCleanView}
          disabled={!readyPreview || busy}
          className="screening-controls__clean"
        />
        <button
          type="button"
          className="screening-apply"
          aria-label="使用此封面"
          title="使用此封面"
          onClick={onConfirm}
          disabled={!readyPreview || busy}
        >
          <LuPlay aria-hidden="true" />
          <span>{busy ? "放映中" : "使用此封面"}</span>
        </button>
      </div>
    </section>
  );
}
