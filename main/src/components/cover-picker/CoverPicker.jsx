import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LuCheck,
  LuImages,
  LuLoaderCircle,
  LuRotateCw,
  LuX,
} from "react-icons/lu";
import "./cover-picker.css";

function CoverPickerSession({
  covers,
  currentIndex,
  readyIndexes,
  failedIndexes,
  onApply,
  onClose,
  onRetry,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const [previewIndex, setPreviewIndex] = useState(currentIndex);
  const [displayedCover, setDisplayedCover] = useState(
    () =>
      covers.find(
        ({ index }) =>
          index === currentIndex &&
          readyIndexes.has(index) &&
          !failedIndexes.has(index),
      ) ?? null,
  );
  const [previousCover, setPreviousCover] = useState(null);
  const nextCover = covers.find(
    ({ index }) =>
      index === previewIndex &&
      readyIndexes.has(index) &&
      !failedIndexes.has(index),
  );

  useEffect(() => {
    if (failedIndexes.has(previewIndex) && previewIndex !== currentIndex) {
      setPreviewIndex(currentIndex);
    }
  }, [currentIndex, failedIndexes, previewIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const body = document.body;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const properties = [
      "overflow",
      "position",
      "top",
      "left",
      "width",
      "padding-right",
    ];
    const savedStyles = properties.map((property) => ({
      property,
      value: body.style.getPropertyValue(property),
      priority: body.style.getPropertyPriority(property),
    }));
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const paddingRight =
      parseFloat(window.getComputedStyle(body).paddingRight) || 0;

    dialog.showModal();
    body.style.setProperty("overflow", "hidden");
    body.style.setProperty("position", "fixed");
    body.style.setProperty("top", `${-scrollY}px`);
    body.style.setProperty("left", `${-scrollX}px`);
    body.style.setProperty("width", "100%");
    if (scrollbarWidth > 0) {
      body.style.setProperty(
        "padding-right",
        `${paddingRight + scrollbarWidth}px`,
      );
    }
    closeRef.current?.focus({ preventScroll: true });

    return () => {
      // Native close events can arrive after StrictMode has reopened the dialog.
      if (dialog.open) dialog.close();
      savedStyles.forEach(({ property, value, priority }) => {
        if (value) body.style.setProperty(property, value, priority);
        else body.style.removeProperty(property);
      });
      if (opener?.isConnected && typeof opener.focus === "function") {
        opener.focus({ preventScroll: true });
      }
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, []);

  useEffect(() => {
    if (
      !nextCover ||
      (nextCover.index === displayedCover?.index &&
        nextCover.src === displayedCover.src)
    ) {
      return;
    }
    setPreviousCover(displayedCover);
    setDisplayedCover(nextCover);
  }, [nextCover, displayedCover]);

  useEffect(() => {
    if (!previousCover) return undefined;
    // Also release the retained layer when reduced motion disables animation events.
    const timeout = window.setTimeout(() => setPreviousCover(null), 320);
    return () => window.clearTimeout(timeout);
  }, [previousCover, displayedCover]);

  const isReady = (index) =>
    readyIndexes.has(index) && !failedIndexes.has(index);
  const previewCover = (index) => {
    if (isReady(index)) setPreviewIndex(index);
  };
  const applyCover = (index) => {
    if (isReady(index)) onApply(index);
  };
  const previewPosition = covers.findIndex(
    ({ index }) => index === displayedCover?.index,
  );
  const previewReady = displayedCover && isReady(displayedCover.index);

  return (
    <dialog
      ref={dialogRef}
      className="cover-picker"
      aria-labelledby="cover-picker-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="cover-picker__media" aria-hidden="true">
        {previousCover && (
          <img
            className="cover-picker__preview cover-picker__preview--previous"
            src={previousCover.src}
            alt=""
            draggable="false"
          />
        )}
        {displayedCover && (
          <img
            key={displayedCover.src}
            className={`cover-picker__preview${previousCover ? " cover-picker__preview--entering" : ""}`}
            data-preview-index={displayedCover.index}
            src={displayedCover.src}
            alt=""
            draggable="false"
          />
        )}
      </div>

      <div className="cover-picker__content">
        <header className="cover-picker__header">
          <div className="cover-picker__heading">
            <LuImages aria-hidden="true" />
            <h2 id="cover-picker-title">首页封面</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="cover-picker__close"
            aria-label="关闭封面选择"
            title="关闭封面选择"
            onClick={onClose}
          >
            <LuX aria-hidden="true" />
          </button>
        </header>

        <div className="cover-picker__viewfinder" aria-hidden="true">
          <span className="cover-picker__corner cover-picker__corner--tl" />
          <span className="cover-picker__corner cover-picker__corner--tr" />
          <span className="cover-picker__corner cover-picker__corner--bl" />
          <span className="cover-picker__corner cover-picker__corner--br" />
        </div>

        <section className="cover-picker__tool" aria-label="封面选片">
          <div className="cover-picker__tool-heading">
            <div
              className="cover-picker__selection"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="cover-picker__counter">
                {String(Math.max(0, previewPosition + 1)).padStart(2, "0")}
                <span> / {String(covers.length).padStart(2, "0")}</span>
              </span>
              <span className="cover-picker__selection-label">
                {displayedCover?.label ??
                  (failedIndexes.has(currentIndex) ? "加载失败" : "加载中")}
              </span>
            </div>
            <button
              type="button"
              className="cover-picker__apply"
              disabled={!previewReady}
              onClick={() => applyCover(displayedCover.index)}
            >
              <LuCheck aria-hidden="true" />
              <span>使用此封面</span>
            </button>
          </div>

          <div
            className="cover-picker__frames"
            role="group"
            aria-label="封面列表"
          >
            {covers.map(({ index, src, label }, position) => {
              const failed = failedIndexes.has(index);
              const ready = isReady(index);
              const previewed = index === displayedCover?.index;
              const status = failed
                ? "加载失败"
                : !ready
                  ? "加载中"
                  : currentIndex === index
                    ? "使用中"
                    : previewed
                      ? "预览中"
                      : "可用";
              return (
                <div
                  key={index}
                  className={`cover-picker__frame${previewed ? " is-preview" : ""}${failed ? " is-failed" : ""}`}
                >
                  <div className="cover-picker__thumbnail">
                    <button
                      type="button"
                      className="cover-picker__thumbnail-button"
                      data-cover-index={index}
                      disabled={!ready}
                      aria-pressed={currentIndex === index}
                      aria-label={`使用封面：${label}`}
                      aria-describedby={`cover-picker-status-${index}`}
                      aria-busy={!ready && !failed}
                      title={label}
                      onMouseEnter={() => {
                        if (
                          window.matchMedia(
                            "(hover: hover) and (pointer: fine)",
                          ).matches
                        ) {
                          previewCover(index);
                        }
                      }}
                      onFocus={() => previewCover(index)}
                      onClick={() => applyCover(index)}
                    >
                      {ready && <img src={src} alt="" draggable="false" />}
                      <span
                        className="cover-picker__frame-number"
                        aria-hidden="true"
                      >
                        {String(position + 1).padStart(2, "0")}
                      </span>
                      {ready && currentIndex === index && (
                        <span
                          className="cover-picker__current-mark"
                          aria-hidden="true"
                        >
                          <LuCheck />
                        </span>
                      )}
                      {!ready && !failed && (
                        <LuLoaderCircle
                          className="cover-picker__loader"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                    {failed && (
                      <button
                        type="button"
                        className="cover-picker__retry"
                        aria-label={`重试加载：${label}`}
                        title={`重试加载：${label}`}
                        onClick={() => onRetry(index)}
                      >
                        <LuRotateCw aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="cover-picker__caption">
                    <span className="cover-picker__frame-label">{label}</span>
                    <span
                      className="cover-picker__status"
                      id={`cover-picker-status-${index}`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </dialog>
  );
}

export default function CoverPicker({
  open,
  covers,
  currentIndex,
  readyIndexes,
  failedIndexes,
  onApply,
  onClose,
  onRetry,
}) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <CoverPickerSession
      covers={covers}
      currentIndex={currentIndex}
      readyIndexes={readyIndexes}
      failedIndexes={failedIndexes}
      onApply={onApply}
      onClose={onClose}
      onRetry={onRetry}
    />,
    document.body,
  );
}
