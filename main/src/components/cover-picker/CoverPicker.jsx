import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { LuArrowLeft, LuClapperboard, LuX } from "react-icons/lu";
import CoverScreening from "./CoverScreening";
import { getRandomCoverIndex, resolveCoverBrightness } from "./coverState.js";
import "./cover-picker.css";

function CoverPickerSession({
  covers,
  currentIndex,
  currentBrightness = 100,
  readyIndexes,
  failedIndexes,
  onApply,
  onClose,
  onRetry,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const cleanReturnRef = useRef(null);
  const editorFocus = useRef(null);
  const projectionRef = useRef(null);
  const projectionTimeline = useRef(null);
  const confirming = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cleanView, setCleanView] = useState(false);
  const [brightness, setBrightness] = useState(() =>
    resolveCoverBrightness(currentBrightness),
  );
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
  const available = covers
    .filter(({ index }) => readyIndexes.has(index) && !failedIndexes.has(index))
    .map(({ index }) => index);

  useEffect(() => {
    if (failedIndexes.has(previewIndex) && previewIndex !== currentIndex)
      setPreviewIndex(currentIndex);
  }, [currentIndex, failedIndexes, previewIndex]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    const body = document.body;
    const scrollX = window.scrollX,
      scrollY = window.scrollY;
    const properties = [
      "overflow",
      "overflow-x",
      "overflow-y",
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
    if (scrollbarWidth > 0)
      body.style.setProperty(
        "padding-right",
        `${paddingRight + scrollbarWidth}px`,
      );
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      projectionTimeline.current?.kill();
      confirming.current = false;
      // Ignore native close events left behind by StrictMode's effect cleanup.
      if (dialog.open) dialog.close();
      savedStyles.forEach(({ property, value, priority }) => {
        if (value) body.style.setProperty(property, value, priority);
        else body.style.removeProperty(property);
      });
      if (opener?.isConnected && typeof opener.focus === "function")
        opener.focus({ preventScroll: true });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
    };
  }, []);

  useEffect(() => {
    if (!nextCover || nextCover.index === displayedCover?.index) return;
    setPreviousCover(displayedCover);
    setDisplayedCover(nextCover);
  }, [nextCover, displayedCover]);
  useEffect(() => {
    if (!previousCover) return;
    const timeout = window.setTimeout(() => setPreviousCover(null), 320);
    return () => window.clearTimeout(timeout);
  }, [previousCover, displayedCover]);

  useEffect(() => {
    if (cleanView) cleanReturnRef.current?.focus({ preventScroll: true });
    else if (editorFocus.current?.isConnected)
      editorFocus.current.focus({ preventScroll: true });
  }, [cleanView]);
  const enterCleanView = () => {
    if (confirming.current) return;
    editorFocus.current = document.activeElement;
    setCleanView(true);
  };
  const returnToEditor = () => setCleanView(false);
  const previewCover = (index) => {
    if (!confirming.current && available.includes(index))
      setPreviewIndex(index);
  };
  const shuffleCover = () => {
    if (confirming.current) return;
    const index = getRandomCoverIndex(available, previewIndex);
    if (index !== null) setPreviewIndex(index);
  };
  const changeBrightness = (value) => {
    if (!confirming.current) setBrightness(resolveCoverBrightness(value));
  };
  const confirmCover = () => {
    const index = previewIndex;
    if (confirming.current || !available.includes(index)) return;
    confirming.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onApply(index, brightness);
      return;
    }
    setBusy(true);
    projectionTimeline.current = gsap
      .timeline({
        onComplete: () => {
          if (confirming.current) onApply(index, brightness);
        },
      })
      .to(projectionRef.current, {
        opacity: 0.2,
        duration: 0.14,
        ease: "power2.out",
      })
      .to(
        projectionRef.current,
        { opacity: 0, duration: 0.28, ease: "power1.out" },
        "+=0.08",
      );
  };

  return (
    <dialog
      ref={dialogRef}
      className="cover-picker"
      aria-labelledby="cover-picker-title"
      data-clean={cleanView}
      data-phase={busy ? "projecting" : "select"}
      onCancel={(event) => {
        event.preventDefault();
        if (cleanView) returnToEditor();
        else onClose();
      }}
    >
      <div
        className="cover-picker__media"
        aria-hidden="true"
        style={{ filter: `brightness(${brightness / 100})` }}
      >
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
      <div className="cover-picker__content" hidden={cleanView}>
        <header className="cover-picker__header">
          <div className="cover-picker__heading">
            <LuClapperboard aria-hidden="true" />
            <h2 id="cover-picker-title">封面放映室</h2>
            <span>TAOZHIYO</span>
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
        <CoverScreening
          covers={covers}
          previewIndex={previewIndex}
          currentIndex={currentIndex}
          readyIndexes={readyIndexes}
          failedIndexes={failedIndexes}
          busy={busy}
          brightness={brightness}
          onPreview={previewCover}
          onShuffle={shuffleCover}
          onBrightness={changeBrightness}
          onResetBrightness={() => changeBrightness(100)}
          onCleanView={enterCleanView}
          onConfirm={confirmCover}
          onRetry={onRetry}
        />
      </div>
      {cleanView && (
        <button
          ref={cleanReturnRef}
          type="button"
          className="cover-picker__return"
          aria-label="返回封面编辑"
          title="返回封面编辑"
          onClick={returnToEditor}
        >
          <LuArrowLeft aria-hidden="true" />
          <span>返回编辑</span>
        </button>
      )}
      <div
        className="cover-picker__projection"
        ref={projectionRef}
        aria-hidden="true"
      />
    </dialog>
  );
}

export default function CoverPicker({ open, ...props }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<CoverPickerSession {...props} />, document.body);
}
