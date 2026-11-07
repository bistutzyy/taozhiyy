import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { TiLocationArrow } from "react-icons/ti";
import { LuRotateCw } from "react-icons/lu";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import HeroWordmark from "./HeroWordmark";
import { getHeroTextStyle } from "./heroWordmarkTheme.js";
import CoverPicker from "./cover-picker/CoverPicker";
import {
  COVER_INDEXES,
  getInitialCoverIndex,
  markHomeCoverVisited,
  writeCoverPreference,
} from "./cover-picker/coverState";
import { isHeroImageReady } from "./heroImageState";
import { getHeroCoverSrc as getImgSrc } from "./heroCoverAssets.js";

gsap.registerPlugin(ScrollTrigger);
const covers = COVER_INDEXES.map((index) => ({
  index,
  src: getImgSrc(index),
  label: `FRAME ${String(index).padStart(2, "0")}`,
}));
// React 18 forwards this newer HTML attribute only in lowercase.
const heroImagePriority = { fetchpriority: "high" };

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      return getInitialCoverIndex(
        window.sessionStorage,
        undefined,
        window.performance?.getEntriesByType("navigation")[0]?.type,
      );
    } catch {
      return 1;
    }
  });
  const [previousIndex, setPreviousIndex] = useState(currentIndex);
  const [hasClicked, setHasClicked] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [loadedHeroIndexes, setLoadedHeroIndexes] = useState(() => new Set());
  const [failedIndexes, setFailedIndexes] = useState(() => new Set());
  const initialIndex = useRef(currentIndex);
  const pending = useRef(new Map());
  const decoded = useRef(new Set());
  const mounted = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const colors = getHeroTextStyle(currentIndex);
    const saved = ["--hero-nav-ink", "--hero-nav-shadow"].map((property) => ({
      property,
      value: root.style.getPropertyValue(property),
      priority: root.style.getPropertyPriority(property),
    }));
    saved.forEach(({ property }) =>
      root.style.setProperty(property, colors[property]),
    );
    return () =>
      saved.forEach(({ property, value, priority }) => {
        if (value) root.style.setProperty(property, value, priority);
        else root.style.removeProperty(property);
      });
  }, [currentIndex]);

  useEffect(() => {
    try {
      markHomeCoverVisited(window.sessionStorage);
    } catch {
      /* Keep the first cover when browser session storage is unavailable. */
    }
  }, []);

  const requestImage = useCallback((index) => {
    if (
      !COVER_INDEXES.includes(index) ||
      pending.current.has(index) ||
      decoded.current.has(index)
    ) return;
    setFailedIndexes((previous) => {
      const next = new Set(previous);
      next.delete(index);
      return next;
    });
    const image = new Image();
    pending.current.set(index, image);
    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        /* A loaded browser image may already be decoded. */
      }
      if (
        !mounted.current ||
        pending.current.get(index) !== image ||
        !image.naturalWidth
      )
        return;
      pending.current.delete(index);
      decoded.current.add(index);
      setLoadedHeroIndexes((previous) => new Set(previous).add(index));
    };
    image.onerror = () => {
      if (!mounted.current || pending.current.get(index) !== image) return;
      pending.current.delete(index);
      setFailedIndexes((previous) => new Set(previous).add(index));
    };
    image.src = getImgSrc(index);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const requests = pending.current;
    requestImage(initialIndex.current);
    return () => {
      mounted.current = false;
      requests.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
      requests.clear();
    };
  }, [requestImage]);

  useEffect(() => {
    if (!selectorOpen) return;
    COVER_INDEXES.forEach(requestImage);
  }, [selectorOpen, requestImage]);

  useEffect(() => {
    if (
      currentIndex !== 1 &&
      failedIndexes.has(currentIndex) &&
      loadedHeroIndexes.has(1)
    ) {
      setCurrentIndex(1);
      setPreviousIndex(1);
    } else if (
      currentIndex !== 1 &&
      failedIndexes.has(currentIndex) &&
      !failedIndexes.has(1)
    ) {
      requestImage(1);
    }
  }, [currentIndex, failedIndexes, loadedHeroIndexes, requestImage]);

  useEffect(() => {
    const handler = () => {
      setSelectorOpen(true);
    };
    window.addEventListener("showHeroPreview", handler);
    const url = new URL(window.location.href);
    if (url.searchParams.get("cover") === "select") {
      handler();
      url.searchParams.delete("cover");
      window.history.replaceState(window.history.state, "", url);
    }
    return () => window.removeEventListener("showHeroPreview", handler);
  }, []);

  const applyCover = (index, { skipTransition = false } = {}) => {
    if (!isHeroImageReady(index, loadedHeroIndexes)) return;
    try {
      writeCoverPreference(window.localStorage, index);
    } catch {
      /* Preserve in-memory selection. */
    }
    setSelectorOpen(false);
    if (index === currentIndex) return;
    setPreviousIndex(currentIndex);
    setHasClicked(!skipTransition);
    setIsTransitioning(!skipTransition);
    setCurrentIndex(index);
  };

  useGSAP(
    () => {
      if (!hasClicked) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set("#bg-image", { opacity: 1, scale: 1 });
        setIsTransitioning(false);
        return;
      }
      gsap.set("#previous-image", { opacity: 1, scale: 1 });
      gsap.fromTo(
        "#bg-image",
        { opacity: 0, scale: 1.025 },
        { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" },
      );
      gsap.to("#previous-image", {
        opacity: 0,
        duration: 0.55,
        ease: "power1.out",
        onComplete: () => setIsTransitioning(false),
      });
    },
    { dependencies: [currentIndex], revertOnUpdate: true },
  );

  useGSAP(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.set("#video-frame", {
      clipPath: "polygon(14% 0, 72% 0, 88% 90%, 0 95%)",
      borderRadius: "0% 0% 40% 10%",
    });
    gsap.from("#video-frame", {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      borderRadius: "0% 0% 0% 0%",
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: "#video-frame",
        start: "center center",
        end: "bottom center",
        scrub: true,
      },
    });
  });

  const loading =
    !loadedHeroIndexes.has(currentIndex) && !failedIndexes.has(currentIndex);
  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      data-home-cover={currentIndex}
      style={getHeroTextStyle(currentIndex)}
    >
      {loading && (
        <div
          className="flex-center absolute z-[100] h-dvh w-screen overflow-hidden bg-violet-50"
          aria-label="封面加载中"
        >
          <div className="three-body">
            <div className="three-body__dot" />
            <div className="three-body__dot" />
            <div className="three-body__dot" />
          </div>
        </div>
      )}
      <div
        id="video-frame"
        className="relative z-10 h-dvh w-screen overflow-hidden rounded-lg bg-blue-75"
      >
        <div>
          {isTransitioning && (
            <img
              src={getImgSrc(previousIndex)}
              id="previous-image"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-30 size-full object-cover object-center"
            />
          )}
          {/* A decoded retry must replace a previously failed DOM image. */}
          <img
            key={`${currentIndex}-${loadedHeroIndexes.has(currentIndex)}`}
            src={getImgSrc(currentIndex)}
            id="bg-image"
            alt="首页封面"
            className="absolute left-0 top-0 size-full object-cover object-center"
            {...heroImagePriority}
            decoding="async"
          />
        </div>
        <HeroWordmark heroIndex={currentIndex} />
        <h1 className="hero-signature special-font hero-heading absolute bottom-5 right-5 z-40">
          桃之<b>夭</b>夭
        </h1>
        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="hero-welcome special-font hero-heading">WELCOME</h1>
            <p className="hero-description mb-5 max-w-64 font-robert-regular">
              This is only the beginning
            </p>
            <div className="flex items-center gap-4">
              <div onClick={() => setShowScrollHint(true)}>
                <Button
                  id="explore"
                  title="EXPLORE"
                  leftIcon={<TiLocationArrow />}
                  containerClass="bg-yellow-300 flex-center gap-1 cursor-pointer"
                />
              </div>
              {showScrollHint && (
                <span className="hero-description animate-pulse font-circular-web text-sm tracking-[0.3em] md:text-base">
                  ↓ 下滑探索
                </span>
              )}
            </div>
            {failedIndexes.has(currentIndex) && (
              <button
                className="hero-cover-retry"
                type="button"
                onClick={() => requestImage(currentIndex)}
              >
                <LuRotateCw aria-hidden="true" />
                重新加载封面
              </button>
            )}
          </div>
        </div>
      </div>
      <h1 className="special-font hero-heading absolute bottom-5 right-5 text-black">
        桃之<b>夭</b>夭
      </h1>
      <CoverPicker
        open={selectorOpen}
        covers={covers}
        currentIndex={currentIndex}
        readyIndexes={loadedHeroIndexes}
        failedIndexes={failedIndexes}
        onApply={applyCover}
        onClose={() => setSelectorOpen(false)}
        onRetry={requestImage}
      />
    </div>
  );
};

export default Hero;
