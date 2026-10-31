import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { LuArrowLeft, LuFlower2, LuX } from "react-icons/lu";
import CoverFan from "./CoverFan";
import CoverQuadrants from "./CoverQuadrants";
import {
  getRandomCoverIndex,
  resolveCoverBrightness,
  updateCoverPreviewTrigger,
  getHighlightedCoverIndex,
} from "./coverState.js";
import "./cover-picker.css";

gsap.registerPlugin(Flip);
const FAN_START_CLIP =
  "polygon(3% 8%,25% 3%,75% 3%,97% 8%,58% 97%,50% 100%,42% 97%,3% 8%)";
const FAN_END_CLIP =
  "polygon(0% 0%,25% 0%,75% 0%,100% 0%,100% 100%,50% 100%,0% 100%,0% 0%)";

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
  const revealRef = useRef(null);
  const projectionTimeline = useRef(null);
  const latestApply = useRef(onApply);
  latestApply.current = onApply;
  const confirming = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cleanView, setCleanView] = useState(false);
  const [selection, setSelection] = useState(null);
  const [brightness, setBrightness] = useState(() =>
    resolveCoverBrightness(currentBrightness),
  );
  const [previewIndex, setPreviewIndex] = useState(currentIndex);
  const [previewTriggers, setPreviewTriggers] = useState([]);
  const available = covers
    .filter(({ index }) => readyIndexes.has(index) && !failedIndexes.has(index))
    .map(({ index }) => index);
  const highlightedIndex =
    selection?.index ?? getHighlightedCoverIndex(previewTriggers, available);
  const activePreviewIndex = highlightedIndex ?? previewIndex;
  const nextCover = covers.find(
    ({ index }) => index === activePreviewIndex && available.includes(index),
  );
  const displayedCover =
    nextCover ?? covers.find(({ index }) => available.includes(index));

  // A restored focus/command must be both the visible preview and the apply target.
  useLayoutEffect(() => {
    if (
      !confirming.current &&
      highlightedIndex !== null &&
      highlightedIndex !== previewIndex
    )
      setPreviewIndex(highlightedIndex);
  }, [highlightedIndex, previewIndex]);

  useEffect(() => {
    setPreviewTriggers((previous) => {
      const valid = previous.filter(
        ({ index }) => readyIndexes.has(index) && !failedIndexes.has(index),
      );
      return valid.length === previous.length ? previous : valid;
    });
  }, [readyIndexes, failedIndexes]);

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
    if (cleanView) cleanReturnRef.current?.focus({ preventScroll: true });
    else if (editorFocus.current?.isConnected)
      editorFocus.current.focus({ preventScroll: true });
  }, [cleanView]);
  const enterCleanView = () => {
    if (confirming.current) return;
    editorFocus.current = document.activeElement;
    setPreviewIndex(activePreviewIndex);
    setPreviewTriggers([]);
    setCleanView(true);
  };
  const returnToEditor = () => setCleanView(false);
  const previewCover = (index, source = "pointer") => {
    if (!confirming.current && available.includes(index)) {
      setPreviewIndex(index);
      setPreviewTriggers((previous) =>
        updateCoverPreviewTrigger(previous, source, index),
      );
    }
  };
  const endPreview = (index, source) => {
    if (!confirming.current)
      setPreviewTriggers((previous) =>
        updateCoverPreviewTrigger(previous, source, index, false),
      );
  };
  const shuffleCover = () => {
    if (confirming.current) return;
    const index = getRandomCoverIndex(available, activePreviewIndex);
    if (index !== null) previewCover(index, "command");
  };
  const changeBrightness = (value) => {
    if (!confirming.current) {
      setBrightness(resolveCoverBrightness(value));
      previewCover(activePreviewIndex, "command");
    }
  };
  const confirmCover = (requestedIndex = activePreviewIndex, source) => {
    const index = requestedIndex;
    if (confirming.current || !available.includes(index)) return;
    confirming.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onApply(index, brightness, { skipTransition: true });
      return;
    }
    setBusy(true);
    setPreviewIndex(index);
    setSelection({
      index,
      brightness,
      src: covers.find((cover) => cover.index === index).src,
      source:
        source ??
        dialogRef.current.querySelector(`[data-cover-index="${index}"]`),
    });
  };

  useLayoutEffect(() => {
    if (!selection) return;
    const { index, brightness, source } = selection;
    const reveal = revealRef.current;
    gsap.set(reveal, {
      x: 0,
      y: 0,
      rotation: 0,
      skewX: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      transformOrigin: "50% 50%",
    });
    const from = source?.isConnected
      ? Flip.fit(reveal, source, { getVars: true, scale: false })
      : {
          x: window.innerWidth * 0.3,
          y: window.innerHeight * 0.3,
          width: window.innerWidth * 0.4,
          height: window.innerHeight * 0.4,
        };
    projectionTimeline.current = gsap
      .timeline({
        onComplete: () => {
          if (confirming.current)
            latestApply.current(index, brightness, { skipTransition: true });
        },
      })
      .fromTo(
        reveal,
        { ...from, opacity: 1, clipPath: FAN_START_CLIP },
        {
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight,
          rotation: 0,
          skewX: 0,
          scaleX: 1,
          scaleY: 1,
          clipPath: FAN_END_CLIP,
          duration: 0.7,
          ease: "power3.inOut",
        },
      );
    return () => projectionTimeline.current?.kill();
  }, [selection]);

  return (
    <dialog
      ref={dialogRef}
      className="cover-picker"
      aria-labelledby="cover-picker-title"
      data-clean={cleanView}
      data-phase={busy ? "unfolding" : "select"}
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
        <CoverQuadrants
          covers={covers}
          readyIndexes={readyIndexes}
          failedIndexes={failedIndexes}
          highlightedIndex={highlightedIndex}
          previewIndex={activePreviewIndex}
          hidden={cleanView}
        />
        {cleanView && displayedCover && (
          <img
            className="cover-picker__preview"
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
            <LuFlower2 aria-hidden="true" />
            <h2 id="cover-picker-title">扇面画屏</h2>
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
        <CoverFan
          covers={covers}
          previewIndex={activePreviewIndex}
          highlightedIndex={highlightedIndex}
          currentIndex={currentIndex}
          readyIndexes={readyIndexes}
          failedIndexes={failedIndexes}
          busy={busy}
          brightness={brightness}
          onPreview={previewCover}
          onPreviewEnd={endPreview}
          onSelect={confirmCover}
          onShuffle={shuffleCover}
          onBrightness={changeBrightness}
          onResetBrightness={() => changeBrightness(100)}
          onCleanView={enterCleanView}
          onConfirm={() => confirmCover()}
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
      {selection && (
        <>
          <div
            className="cover-picker__reveal"
            ref={revealRef}
            aria-hidden="true"
          >
            <img
              src={selection.src}
              alt=""
              style={{ filter: `brightness(${selection.brightness / 100})` }}
            />
          </div>
          <div className="cover-picker__petal-burst" aria-hidden="true">
            {[
              [-210, -130],
              [180, -100],
              [-135, 20],
              [230, 80],
              [-80, -180],
              [110, 40],
            ].map(([x, y], index) => (
              <i
                key={index}
                style={{
                  "--petal-x": `${x}px`,
                  "--petal-y": `${y}px`,
                  "--petal-delay": `${index * 22}ms`,
                  "--petal-rotation": `${70 + index * 41}deg`,
                }}
              />
            ))}
          </div>
        </>
      )}
    </dialog>
  );
}

export default function CoverPicker({ open, ...props }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<CoverPickerSession {...props} />, document.body);
}
