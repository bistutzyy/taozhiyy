import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { HOME_FIGURE_SRC, preloadHomeEntry } from "../lib/homeWarmup.js";

const HomeIntro = () => {
  const [phase, setPhase] = useState("run");
  const [percent, setPercent] = useState(0);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      preloadHomeEntry();
      setPhase("done");
      return undefined;
    }

    let frame = 0;
    let openTimer = 0;
    let alive = true;
    const tasks = preloadHomeEntry();
    let done = 0;
    tasks.forEach((task) => {
      task.then(() => {
        if (alive) done += 1;
      });
    });

    const started = performance.now();
    const step = (now) => {
      if (!alive) return;
      const real = done / tasks.length;
      const shown = Math.min(real, (now - started) / 900);
      const next = Math.round(shown * 100);
      setPercent(next);
      if (shown < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      setEntering(true);
      openTimer = window.setTimeout(() => setPhase("open"), 700);
    };
    frame = requestAnimationFrame(step);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(openTimer);
    };
  }, []);

  if (phase === "done" || typeof document === "undefined") return null;

  return createPortal(
    <div className={`home-intro${phase === "open" ? " is-open" : ""}`}>
      <div
        className="home-intro__half home-intro__half--left"
        onAnimationEnd={(event) => {
          if (event.animationName === "homeIntroLeaveLeft") setPhase("done");
        }}
      >
        <img className="home-intro__figure" src={HOME_FIGURE_SRC} alt="" />
      </div>
      <div className="home-intro__half home-intro__half--right">
        <div className="home-intro__meter">
          <div className="home-intro__track">
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="home-intro__status">{entering ? "开始进入中..." : "等待中..."}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default HomeIntro;
