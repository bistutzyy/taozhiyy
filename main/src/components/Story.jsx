import clsx from "clsx";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

import Button from "./Button";
import AnimatedTitle from "./AnimatedTitle";
import { cosAsset } from "../lib/cosAsset.js";

const entranceImageSrc = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main/img/entrance.webp"
);

const FloatingImage = () => {
  const frameRef = useRef(null);
  const envelopeRef = useRef(null);
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

  useEffect(() => {
    const node = envelopeRef.current;
    if (!node) return undefined;

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setEnvelopeOpen(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setEnvelopeOpen(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const element = frameRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const xPos = clientX - rect.left;
    const yPos = clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((yPos - centerY) / centerY) * -10;
    const rotateY = ((xPos - centerX) / centerX) * 10;

    gsap.to(element, {
      duration: 0.3,
      rotateX,
      rotateY,
      transformPerspective: 500,
      ease: "power1.inOut",
    });
  };

  const handleMouseLeave = () => {
    const element = frameRef.current;

    if (element) {
      gsap.to(element, {
        duration: 0.3,
        rotateX: 0,
        rotateY: 0,
        ease: "power1.inOut",
      });
    }
  };

  return (
    <div
      id="contact"
      className="min-h-dvh w-screen bg-[linear-gradient(180deg,#f6fbff_0%,#fff8f1_48%,#ffeef5_100%)] text-[#241322]"
    >
      <div className="flex size-full flex-col items-center py-8 pb-20 md:py-10 md:pb-24">
        <p className="font-general text-sm uppercase tracking-[0.35em] text-[#b76e79] md:text-[10px]">
          FOLLOW-UP PLAN
        </p>

        <div className="relative size-full">
          <AnimatedTitle
            title="L<b>O</b>OK FORWARD <br /> TO IT TO THE F<b>U</b>LLEST"
            containerClass="mt-5 pointer-events-none relative z-10 !text-[#241322]"
          />

          <div className="story-img-container">
            <div className="story-note-tape story-note-tape-left" />
            <div className="story-note-tape story-note-tape-right" />
            <div className="story-img-mask">
              <div className="story-note-label">FOLLOW-UP NOTE</div>
              <div className="story-img-content">
                <img
                  ref={frameRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseLeave}
                  onMouseEnter={handleMouseLeave}
                  src={entranceImageSrc}
                  alt="entrance.webp"
                  className="object-contain"
                />
              </div>
            </div>

            <svg
              className="invisible absolute size-0"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="flt_tag">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="8"
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
                    result="flt_tag"
                  />
                  <feComposite
                    in="SourceGraphic"
                    in2="flt_tag"
                    operator="atop"
                  />
                </filter>
              </defs>
            </svg>
          </div>
        </div>

        <div className="relative z-30 -mt-48 flex w-full justify-center px-6 md:-mt-72 md:me-36 md:justify-end">
          <section aria-labelledby="story-envelope-heading" className="w-full max-w-md md:max-w-lg">
            <article
              ref={envelopeRef}
              className={clsx("story-envelope-cta", envelopeOpen && "story-envelope-cta--open")}
            >
              <div className="story-envelope-arc" aria-hidden="true" />

              <div className="story-envelope-body">
                <p className="story-envelope-meta">№ 01 · Live panel</p>
                <p className="story-envelope-salutation">数据中心</p>
                <h2 id="story-envelope-heading" className="story-envelope-title">
                  site pulse<br />
                  in view.
                </h2>
                <p className="story-envelope-desc">
                  Real-time server telemetry and AI traffic are collected here,
                  so you can check uptime, resource health, and recent activity.
                </p>
                <p className="story-envelope-signoff">
                  <span className="story-envelope-signoff-line">Live from:</span>
                  <span className="story-envelope-signoff-name">taozhiyy.top</span>
                </p>
                <Button
                  id="realm-btn"
                  title="Open data center →"
                  containerClass="story-envelope-btn"
                  to="/ai-traffic"
                />
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  );
};

export default FloatingImage;
