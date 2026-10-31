import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";
import { TiLocationArrow } from "react-icons/ti";
import { LuRotateCw } from "react-icons/lu";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";
import HeroWordmark from "./HeroWordmark";
import CoverPicker from "./cover-picker/CoverPicker";
import {
  COVER_INDEXES,
  readCoverBrightness,
  readCoverPreference,
  resolveCoverBrightness,
  writeCoverBrightness,
  writeCoverPreference,
} from "./cover-picker/coverState";
import { isHeroImageReady } from "./heroImageState";
import { cosAsset } from "../lib/cosAsset.js";

gsap.registerPlugin(ScrollTrigger);
const COS = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main",
);
const getImgSrc = (index) => `${COS}/img/hero-${index}.webp`;
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
      return readCoverPreference(window.localStorage);
    } catch {
      return 1;
    }
  });
  const [currentBrightness, setCurrentBrightness] = useState(() => {
    try {
      return readCoverBrightness(window.localStorage);
    } catch {
      return 100;
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
  const mounted = useRef(false);

  const requestImage = useCallback((index) => {
    if (!COVER_INDEXES.includes(index) || pending.current.has(index)) return;
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
    [
      initialIndex.current,
      ...COVER_INDEXES.filter((index) => index !== initialIndex.current),
    ].forEach(requestImage);
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
    if (
      currentIndex !== 1 &&
      failedIndexes.has(currentIndex) &&
      loadedHeroIndexes.has(1)
    ) {
      setCurrentIndex(1);
      setPreviousIndex(1);
    }
  }, [currentIndex, failedIndexes, loadedHeroIndexes]);

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

  const applyCover = (
    index,
    brightness = currentBrightness,
    { skipTransition = false } = {},
  ) => {
    if (!isHeroImageReady(index, loadedHeroIndexes)) return;
    const nextBrightness = resolveCoverBrightness(brightness);
    try {
      writeCoverPreference(window.localStorage, index);
      writeCoverBrightness(window.localStorage, nextBrightness);
    } catch {
      /* Preserve in-memory selection. */
    }
    setCurrentBrightness(nextBrightness);
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
    <div className="relative h-dvh w-screen overflow-hidden">
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
              style={{ filter: `brightness(${currentBrightness / 100})` }}
            />
          )}
          {/* A decoded retry must replace a previously failed DOM image. */}
          <img
            key={`${currentIndex}-${loadedHeroIndexes.has(currentIndex)}`}
            src={getImgSrc(currentIndex)}
            id="bg-image"
            alt="首页封面"
            className="absolute left-0 top-0 size-full object-cover object-center"
            style={{ filter: `brightness(${currentBrightness / 100})` }}
            {...heroImagePriority}
            decoding="async"
          />
        </div>
        <HeroWordmark heroIndex={currentIndex} />
        <h1 className="special-font hero-heading absolute bottom-5 right-5 z-40 text-blue-75">
          桃之<b>夭</b>夭
        </h1>
        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="special-font hero-heading text-blue-100">WELCOME</h1>
            <p className="mb-5 max-w-64 font-robert-regular text-blue-100">
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
                <span className="animate-pulse font-circular-web text-sm tracking-[0.3em] text-blue-75/85 md:text-base">
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
        currentBrightness={currentBrightness}
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
