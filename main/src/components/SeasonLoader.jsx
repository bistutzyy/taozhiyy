import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cosAsset } from "../lib/cosAsset.js";

const avatarSrc = `${cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main",
)}/img/logo.png`;

const kickers = {
  spring: "SPRING",
  summer: "SUMMER",
  autumn: "AUTUMN",
  winter: "WINTER",
};

const winterFlakes = Array.from({ length: 18 }, (_, index) => {
  const left = (index * 17 + 5) % 100;
  const size = 0.92 + ((index * 7) % 10) / 10;
  const duration = 7.5 + ((index * 5) % 8) / 2;
  const delay = -((index * 11) % 12);
  const drift = (index % 2 === 0 ? 1 : -1) * (3 + ((index * 3) % 8));
  const rotate = (index * 29) % 80 - 40;

  return {
    id: `loader-snow-${index + 1}`,
    style: {
      "--snow-left": `${left}vw`,
      "--snow-size": `${size.toFixed(2)}rem`,
      "--snow-duration": `${duration.toFixed(1)}s`,
      "--snow-delay": `${delay}s`,
      "--snow-drift": `${drift}vw`,
      "--snow-rotate": `${rotate}deg`,
    },
  };
});

const wave = (fill) => (
  <>
    <path fill={fill} d="M0 90C240 40 480 40 720 90S1200 140 1440 90V180H0Z" />
    <path fill={fill} d="M1440 90C1680 40 1920 40 2160 90S2640 140 2880 90V180H1440Z" />
  </>
);

const SeasonLoader = ({ season }) => {
  const [phase, setPhase] = useState("run");
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("done");
      return undefined;
    }

    const started = performance.now();
    let frame = 0;
    let fadeTimer = 0;
    let outTimer = 0;
    const step = (now) => {
      const t = Math.min(1, (now - started) / 2200);
      const shown = Math.round((1 - (1 - t) ** 3) * 100);
      setPercent(shown);
      if (shown < 100) {
        frame = requestAnimationFrame(step);
        return;
      }
      fadeTimer = window.setTimeout(() => setPhase("fade"), 320);
      outTimer = window.setTimeout(() => setPhase("out"), 620);
    };
    frame = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(outTimer);
    };
  }, []);

  if (phase === "done" || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`season-loader season-loader--${season}${phase === "fade" || phase === "out" ? " is-fade" : ""}${phase === "out" ? " is-out" : ""}`}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "transform") {
          setPhase("done");
        }
      }}
    >
      <div className="season-loader__motif" aria-hidden="true">
        {season === "spring" &&
          [8, 22, 40, 63, 78, 90].map((left, index) => (
            <i key={left} className="season-loader__petal" style={{ left: `${left}%`, animationDelay: `-${index * 0.8}s` }} />
          ))}
        {season === "summer" && (
          <>
            <svg className="season-loader__wave season-loader__wave--back" viewBox="0 0 2880 180" preserveAspectRatio="none">
              {wave("#d5eef3")}
            </svg>
            <svg className="season-loader__wave season-loader__wave--front" viewBox="0 0 2880 180" preserveAspectRatio="none">
              {wave("#c5e3ea")}
            </svg>
          </>
        )}
        {season === "autumn" && (
          <>
            <svg className="season-loader__wave season-loader__wave--back" viewBox="0 0 2880 180" preserveAspectRatio="none">
              {wave("#f3c9a2")}
            </svg>
            <svg className="season-loader__wave season-loader__wave--front" viewBox="0 0 2880 180" preserveAspectRatio="none">
              {wave("#e7b48c")}
            </svg>
          </>
        )}
        {season === "winter" &&
          winterFlakes.map((flake) => (
            <span key={flake.id} className="winter-floating-snow" style={flake.style} />
          ))}
      </div>
      <div className="season-loader__inner">
        <p className="season-loader__kicker">{kickers[season]}</p>
        <img className="season-loader__avatar" src={avatarSrc} alt="桃之夭夭" />
        <div className="season-loader__track">
          <i style={{ width: `${percent}%` }} />
        </div>
        <p className="season-loader__count">
          <b>{percent}</b>
          <span>%</span>
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default SeasonLoader;
