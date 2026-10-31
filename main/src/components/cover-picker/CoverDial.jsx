import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import {
  LuAperture,
  LuCheck,
  LuLoaderCircle,
  LuRotateCw,
} from "react-icons/lu";
import { getDialIndex, getDialRotation, snapDialRotation } from "./dialMath.js";
import "./aperture-dial.css";

gsap.registerPlugin(Draggable, InertiaPlugin);

export default function CoverDial({
  covers,
  previewIndex,
  currentIndex,
  readyIndexes,
  failedIndexes,
  busy,
  onPreview,
  onConfirm,
  onRetry,
}) {
  const bodyRef = useRef(null);
  const rotorRef = useRef(null);
  const gripRef = useRef(null);
  const draggableRef = useRef(null);
  const latest = useRef(null);
  const available = covers
    .filter(({ index }) => readyIndexes.has(index) && !failedIndexes.has(index))
    .map(({ index }) => index);
  latest.current = { available, onPreview, busy };
  const active = covers.find(({ index }) => index === previewIndex);
  const readyPreview = available.includes(previewIndex);

  const paintRotation = useCallback(() => {
    const rotation =
      Number(gsap.getProperty(rotorRef.current, "rotation")) || 0;
    bodyRef.current?.style.setProperty("--counter-rotation", `${-rotation}deg`);
    return rotation;
  }, []);

  useEffect(() => {
    const rotor = rotorRef.current;
    const body = bodyRef.current;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    gsap.set(rotor, { rotation: getDialRotation(previewIndex, 0) });
    const update = () => {
      const rotation = Number(gsap.getProperty(rotor, "rotation")) || 0;
      body.style.setProperty("--counter-rotation", `${-rotation}deg`);
      const index = getDialIndex(rotation, latest.current.available);
      if (index !== null && !latest.current.busy)
        latest.current.onPreview(index);
    };
    body.style.setProperty(
      "--counter-rotation",
      `${-getDialRotation(previewIndex, 0)}deg`,
    );
    const [drag] = Draggable.create(rotor, {
      type: "rotation",
      trigger: gripRef.current,
      inertia: !reduced,
      throwResistance: 2200,
      minDuration: 0.18,
      maxDuration: 0.65,
      overshootTolerance: 0,
      snap: {
        rotation: (value) => snapDialRotation(value, latest.current.available),
      },
      onDrag: update,
      onThrowUpdate: update,
      onThrowComplete: update,
      onDragEnd() {
        if (reduced) {
          gsap.set(rotor, {
            rotation: snapDialRotation(this.rotation, latest.current.available),
          });
          this.update();
          update();
        }
      },
    });
    draggableRef.current = drag;
    return () => {
      drag.tween?.kill();
      drag.kill();
      gsap.killTweensOf(rotor);
      draggableRef.current = null;
    };
    // A session owns one Draggable; live readiness/callbacks are read from latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const drag = draggableRef.current;
    if (!drag) return;
    if (busy || !available.length) {
      drag.tween?.kill();
      gsap.killTweensOf(rotorRef.current);
      drag.disable();
    } else drag.enable();
  }, [busy, available.length]);

  const alignTo = useCallback(
    (index) => {
      const rotor = rotorRef.current;
      const drag = draggableRef.current;
      drag?.tween?.kill();
      gsap.killTweensOf(rotor);
      const rotation = Number(gsap.getProperty(rotor, "rotation")) || 0;
      gsap.to(rotor, {
        rotation: getDialRotation(index, rotation),
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 0.42,
        ease: "power3.out",
        onUpdate: paintRotation,
        onComplete: () => drag?.update(),
      });
    },
    [paintRotation],
  );

  useEffect(() => {
    const drag = draggableRef.current;
    if (!busy && drag && !drag.isDragging && !drag.isThrowing)
      alignTo(previewIndex);
  }, [previewIndex, busy, alignTo]);
  const selectCover = (index) => {
    if (busy || !available.includes(index)) return;
    onPreview(index);
    alignTo(index);
  };
  const handleKey = (event) => {
    const directions = {
      ArrowLeft: -1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowDown: 1,
    };
    if (
      !(event.key in directions) &&
      event.key !== "Home" &&
      event.key !== "End"
    )
      return;
    event.preventDefault();
    if (busy || !available.length) return;
    const position = Math.max(0, available.indexOf(previewIndex));
    const index =
      event.key === "Home"
        ? available[0]
        : event.key === "End"
          ? available.at(-1)
          : available[
              (position + directions[event.key] + available.length) %
                available.length
            ];
    selectCover(index);
  };

  return (
    <section
      className={`aperture-dial${busy ? " is-busy" : ""}`}
      aria-label="光圈选景"
    >
      <div className="aperture-dial__body" ref={bodyRef}>
        <div className="aperture-dial__bezel" aria-hidden="true" />
        <div
          ref={gripRef}
          className="aperture-dial__grip"
          role="slider"
          tabIndex={0}
          aria-label="旋转光圈选择封面"
          aria-valuemin={1}
          aria-valuemax={covers.length}
          aria-valuenow={previewIndex}
          aria-valuetext={`${active?.label ?? ""}${readyPreview ? "" : "，图片尚未就绪"}`}
          aria-disabled={busy || !available.length}
          onKeyDown={handleKey}
          title="旋转光圈选择封面"
        />
        <div className="aperture-dial__rotor" ref={rotorRef}>
          <div className="aperture-dial__ticks" aria-hidden="true" />
          <div className="aperture-dial__track" aria-hidden="true" />
          {covers.map(({ index, src, label }, position) => {
            const ready = available.includes(index);
            const failed = failedIndexes.has(index);
            const selected = previewIndex === index;
            const angle = (position * Math.PI) / 2;
            const status = failed
              ? "加载失败"
              : !ready
                ? "加载中"
                : currentIndex === index
                  ? "使用中"
                  : selected
                    ? "预览中"
                    : "";
            return (
              <div
                className={`aperture-dial__frame${selected ? " is-preview" : ""}`}
                key={index}
                style={{
                  "--frame-x": `${50 + Math.sin(angle) * 38}%`,
                  "--frame-y": `${50 - Math.cos(angle) * 38}%`,
                }}
              >
                <button
                  className="aperture-dial__thumbnail"
                  type="button"
                  data-cover-index={index}
                  aria-label={`预览封面：${label}`}
                  aria-pressed={selected}
                  aria-describedby={`cover-picker-status-${index}`}
                  aria-busy={!ready && !failed}
                  disabled={!ready || busy}
                  onClick={() => selectCover(index)}
                >
                  {ready && <img src={src} alt="" draggable="false" />}
                  <span className="aperture-dial__number">
                    {String(index).padStart(2, "0")}
                  </span>
                  {currentIndex === index && (
                    <LuCheck
                      className="aperture-dial__current"
                      aria-hidden="true"
                    />
                  )}
                  {!ready && !failed && (
                    <LuLoaderCircle
                      className="aperture-dial__loader"
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
                    disabled={busy}
                    onClick={() => onRetry(index)}
                  >
                    <LuRotateCw aria-hidden="true" />
                  </button>
                )}
                <div
                  className="aperture-dial__caption"
                  id={`cover-picker-status-${index}`}
                >
                  <span>{status}</span>
                </div>
              </div>
            );
          })}
        </div>
        <span className="aperture-dial__marker" aria-hidden="true" />
        <button
          className="cover-picker__apply aperture-dial__lens"
          type="button"
          aria-label="使用此封面"
          disabled={!readyPreview || busy}
          onClick={onConfirm}
        >
          {readyPreview && (
            <img
              className="aperture-dial__lens-image"
              key={active.src}
              src={active.src}
              alt=""
              draggable="false"
            />
          )}
          <span className="aperture-dial__blades" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <i key={index} style={{ "--blade": index }} />
            ))}
          </span>
          <span className="aperture-dial__confirm">
            <LuAperture aria-hidden="true" />
            <span>{busy ? "换景中" : "使用此封面"}</span>
          </span>
        </button>
      </div>
      <div
        className="aperture-dial__readout"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="aperture-dial__readout-line" />
        <strong>{String(previewIndex).padStart(2, "0")}</strong>
        <span>/ {String(covers.length).padStart(2, "0")}</span>
        <span className="aperture-dial__readout-state">
          {readyPreview
            ? currentIndex === previewIndex
              ? "当前封面"
              : "封面预览"
            : failedIndexes.has(previewIndex)
              ? "加载失败"
              : "加载中"}
        </span>
        <span className="aperture-dial__readout-line" />
      </div>
    </section>
  );
}
