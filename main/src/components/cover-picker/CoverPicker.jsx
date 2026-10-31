import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { LuAperture, LuX } from "react-icons/lu";
import CoverDial from "./CoverDial";
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
  const shutterRef = useRef(null);
  const shutterTimeline = useRef(null);
  const confirming = useRef(false);
  const [busy, setBusy] = useState(false);
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
    if (failedIndexes.has(previewIndex) && previewIndex !== currentIndex)
      setPreviewIndex(currentIndex);
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
    if (scrollbarWidth > 0)
      body.style.setProperty(
        "padding-right",
        `${paddingRight + scrollbarWidth}px`,
      );
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      shutterTimeline.current?.kill();
      confirming.current = false;
      // Native close events may arrive after StrictMode has reopened the dialog.
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

  const previewCover = (index) => {
    if (
      !confirming.current &&
      readyIndexes.has(index) &&
      !failedIndexes.has(index)
    )
      setPreviewIndex(index);
  };
  const confirmCover = () => {
    const index = previewIndex;
    if (
      confirming.current ||
      !readyIndexes.has(index) ||
      failedIndexes.has(index)
    )
      return;
    confirming.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onApply(index);
      return;
    }
    setBusy(true);
    shutterTimeline.current = gsap
      .timeline({
        onComplete: () => {
          if (confirming.current) onApply(index);
        },
      })
      .to(shutterRef.current, {
        "--iris": "0vmax",
        duration: 0.22,
        ease: "power2.in",
      })
      .to(
        shutterRef.current,
        { "--iris": "150vmax", duration: 0.3, ease: "power2.out" },
        "+=0.06",
      );
  };

  return (
    <dialog
      ref={dialogRef}
      className="cover-picker"
      aria-labelledby="cover-picker-title"
      data-phase={busy ? "shutter" : "select"}
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
            <LuAperture aria-hidden="true" />
            <h2 id="cover-picker-title">首页封面</h2>
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
        <CoverDial
          covers={covers}
          previewIndex={previewIndex}
          currentIndex={currentIndex}
          readyIndexes={readyIndexes}
          failedIndexes={failedIndexes}
          busy={busy}
          onPreview={previewCover}
          onConfirm={confirmCover}
          onRetry={onRetry}
        />
      </div>
      <div
        className="cover-picker__shutter"
        ref={shutterRef}
        aria-hidden="true"
      />
    </dialog>
  );
}

export default function CoverPicker({ open, ...props }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<CoverPickerSession {...props} />, document.body);
}
