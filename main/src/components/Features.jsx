import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TiLocationArrow } from "react-icons/ti";
import LazyVideo from "./LazyVideo";
import { cosAsset } from "../lib/cosAsset.js";

const COS = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main"
);

const ARCHIVE_ITEMS = [
  {
    index: "01",
    title: "开场影像",
    subtitle: "片段一",
    src: `${COS}/videos/feature-1.mp4`,
    note: "这一组影像里的第一枚碎片，被安静地留作开场。",
  },
  {
    index: "02",
    title: "碎片独处",
    subtitle: "进入花园",
    src: `${COS}/videos/feature-2.mp4`,
    note: "一个收纳日常念头、随手灵感与短暂心绪的温柔角落。",
    linkUrl: "https://bistutzyy.github.io/",
    linkText: "进入花园",
  },
  {
    index: "03",
    title: "创造纪事",
    subtitle: "进入实验室",
    src: `${COS}/videos/feature-3.mp4`,
    note: "记录这个网站从想法到落地的搭建过程，也把一路上的调整与打磨慢慢收进来。",
    linkUrl: "/build/",
    linkText: "进入实验室",
  },
  {
    index: "04",
    title: "安静影像",
    subtitle: "片段四",
    src: `${COS}/videos/feature-4.mp4`,
    note: "一枚适合停下来多看一会儿的安静影像碎片。",
  },
  {
    index: "05",
    title: "More coming soon.",
    subtitle: "Feature Five",
    src: `${COS}/videos/feature-5.mp4`,
    note: "More coming soon.",
  },
];

export const ExhibitTilt = ({ children, className = "" }) => {
  const [transformStyle, setTransformStyle] = useState("");
  const itemRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!itemRef.current) return;

    const { left, top, width, height } =
      itemRef.current.getBoundingClientRect();
    const relativeX = (event.clientX - left) / width;
    const relativeY = (event.clientY - top) / height;
    const tiltX = (relativeY - 0.5) * 4;
    const tiltY = (relativeX - 0.5) * -4;

    setTransformStyle(
      `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px) scale3d(.985, .985, .985)`
    );
  };

  return (
    <div
      ref={itemRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTransformStyle("")}
      style={{ transform: transformStyle }}
    >
      {children}
    </div>
  );
};

export const ExhibitCard = ({
  src,
  index,
  title,
  description,
  linkUrl,
  linkText,
  videoPriority = false,
  visualOnly = false,
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoverOpacity, setHoverOpacity] = useState(0);
  const hoverButtonRef = useRef(null);

  const handleMouseMove = (event) => {
    if (!hoverButtonRef.current) return;
    const rect = hoverButtonRef.current.getBoundingClientRect();

    setCursorPosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  if (visualOnly) {
    return (
      <div className="group relative size-full overflow-hidden">
        <LazyVideo src={src} priority={videoPriority} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
        {index && (
          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/20 bg-white/12 px-4 py-2 font-general text-[10px] uppercase tracking-[0.35em] text-blue-50/80 backdrop-blur-md">
            片段 {index}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="group relative size-full overflow-hidden">
      <div className="absolute inset-0 z-0">
        <LazyVideo src={src} priority={videoPriority} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-black/20 via-black/5 to-[#160d14]/78" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-pink-100/60 to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="pointer-events-none absolute -left-1/3 top-0 z-10 h-full w-1/3 skew-x-[-18deg] bg-white/12 blur-xl transition duration-700 group-hover:left-full" />

      <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 text-blue-50 md:p-5">
        <div className="max-w-full rounded-2xl border border-white/15 bg-black/42 px-4 py-3 shadow-[0_18px_58px_rgba(0,0,0,0.25)] backdrop-blur-md">
          <p className="font-general text-[10px] uppercase tracking-[0.35em] text-pink-100/80">
            片段 {index}
          </p>
          <h1 className="bento-title mt-2 break-words text-2xl font-black leading-none text-[#ffe7ef] md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="features-bento-card-copy mt-3 break-words text-sm font-semibold leading-relaxed text-white/90 md:text-base">
              {description}
            </p>
          )}
        </div>

        {linkUrl && (
          <a
            className="w-fit"
            href={linkUrl}
            {...(String(linkUrl).startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            <div
              ref={hoverButtonRef}
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setHoverOpacity(1)}
              onMouseLeave={() => setHoverOpacity(0)}
              className="border-hsla relative flex w-fit cursor-pointer items-center gap-1 overflow-hidden rounded-full bg-[#ffe7ef] px-5 py-2 text-xs font-bold uppercase text-[#241322]"
            >
              <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
                style={{
                  opacity: hoverOpacity,
                  background: `radial-gradient(110px circle at ${cursorPosition.x}px ${cursorPosition.y}px, #ffffffcc, #ff9eb866)`,
                }}
              />
              <TiLocationArrow className="relative z-20" />
              <p className="relative z-20">{linkText}</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
};

const ArchiveBook = ({ open, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItem = ARCHIVE_ITEMS[activeIndex];

  if (!open) return null;

  const turnPage = (direction) => {
    setActiveIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return ARCHIVE_ITEMS.length - 1;
      if (next >= ARCHIVE_ITEMS.length) return 0;
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#120b10]/72 px-4 py-8 backdrop-blur-md md:px-10">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="关闭影像档案"
        onClick={onClose}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center">
        <div className="mb-5 flex items-center justify-between text-blue-50">
          <p className="font-general text-xs uppercase tracking-[0.45em] text-pink-100/75">
            影像档案
          </p>
          <button
            type="button"
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-blue-50 backdrop-blur-md"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        <div className="relative min-h-[76vh] overflow-hidden rounded-[2rem] border border-[#f6d8c8]/60 bg-[linear-gradient(120deg,#fff8ef,#ffe9df)] shadow-[0_34px_120px_rgba(0,0,0,0.38)]">
          <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#d8bba9] to-transparent opacity-70" />
          <div className="absolute inset-6 rounded-[1.5rem] border border-[#f4d5c8]/70" />

          <div className="grid h-full min-h-[76vh] md:grid-cols-[1.7fr_0.42fr]">
            <div className="relative flex items-center justify-center overflow-hidden p-3 md:p-5 [perspective:1600px]">
              <div className="absolute inset-5 rounded-[1.5rem] bg-[#241322]/5" />
              <div className="relative h-[62vh] w-full max-w-6xl [transform-style:preserve-3d]">
                {ARCHIVE_ITEMS.map((item, itemIndex) => {
                  const offset = itemIndex - activeIndex;
                  const absoluteOffset = Math.abs(offset);
                  const isActive = offset === 0;
                  const visible = absoluteOffset <= 1;

                  return (
                    <button
                      key={item.index}
                      type="button"
                      className={`absolute left-1/2 top-[47%] aspect-video w-[100%] max-w-[980px] overflow-hidden rounded-[1.6rem] border bg-[#241322] text-left shadow-[0_26px_80px_rgba(0,0,0,0.28)] transition duration-700 [transform-style:preserve-3d] ${
                        visible ? "pointer-events-auto" : "pointer-events-none"
                      }`}
                      style={{
                        zIndex: 50 - absoluteOffset,
                        opacity: isActive ? 1 : visible ? 0.42 : 0,
                        borderColor: isActive
                          ? "#ff8fab"
                          : "rgba(255,255,255,0.28)",
                        transform: `translate(-50%, -50%) translateX(${offset * 152}px) translateY(${absoluteOffset * 18}px) rotateY(${offset * -24}deg) rotateZ(${offset * 1.6}deg) scale(${1 - absoluteOffset * 0.12})`,
                      }}
                      onClick={() => setActiveIndex(itemIndex)}
                    >
                      <LazyVideo src={item.src} priority={isActive} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/10 to-white/10" />
                      <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/14 px-4 py-2 font-general text-[10px] uppercase tracking-[0.32em] text-blue-50/85 backdrop-blur-md">
                        档案卡 {item.index}
                      </div>
                      <div className="absolute bottom-5 left-5 right-5 text-blue-50">
                        <p className="font-general text-[10px] uppercase tracking-[0.32em] text-pink-100/80">
                          {item.subtitle}
                        </p>
                        <h3 className="mt-2 text-4xl font-black leading-none md:text-6xl">
                          {item.title}
                        </h3>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="absolute bottom-6 left-6 rounded-full border border-[#ead4bf] bg-white/75 px-5 py-2 text-sm font-bold text-[#241322] shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                onClick={() => turnPage(-1)}
              >
                上一页
              </button>
              <button
                type="button"
                className="absolute bottom-6 right-6 rounded-full border border-[#ead4bf] bg-white/75 px-5 py-2 text-sm font-bold text-[#241322] shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
                onClick={() => turnPage(1)}
              >
                下一页
              </button>
            </div>

            <div className="relative flex flex-col justify-center border-t border-[#ead4bf] bg-white/46 p-5 md:border-l md:border-t-0 md:p-5">
              <p className="font-general text-[10px] uppercase tracking-[0.35em] text-[#b76e79]">
                当前片段
              </p>
              <h3 className="mt-4 text-4xl font-black leading-none text-[#241322] md:text-5xl">
                {activeItem.index}
              </h3>
              <h4 className="mt-4 text-2xl font-black leading-tight text-[#241322]">
                {activeItem.title}
              </h4>
              <p className="mt-2 text-sm uppercase tracking-[0.25em] text-[#8b6f63]">
                {activeItem.subtitle}
              </p>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-[#5f4b52]">
                {activeItem.note}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {ARCHIVE_ITEMS.map((item, itemIndex) => (
                  <button
                    key={item.index}
                    type="button"
                    className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                      itemIndex === activeIndex
                        ? "border-[#ff8fab] bg-[#ff8fab] text-white"
                        : "border-[#ead4bf] bg-white/70 text-[#241322]"
                    }`}
                    onClick={() => setActiveIndex(itemIndex)}
                  >
                    {item.index}
                  </button>
                ))}
              </div>

              {activeItem.linkUrl && (
                <a
                  href={activeItem.linkUrl}
                  className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#241322] px-5 py-2 text-xs font-bold uppercase text-[#ffe7ef]"
                  {...(String(activeItem.linkUrl).startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <TiLocationArrow />
                  {activeItem.linkText}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Features = () => {
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <section className="bg-[linear-gradient(180deg,#fff8f1_0%,#ffeef5_46%,#f6fbff_100%)] pb-16 md:pb-52">
      <ArchiveBook open={archiveOpen} onClose={() => setArchiveOpen(false)} />

      <div className="container mx-auto px-3 md:px-10">
        <div className="flex flex-col gap-10 px-5 py-32 text-[#241322] md:flex-row md:items-center md:justify-between">
          <div className="md:max-w-xl">
            <p className="font-general text-xs uppercase tracking-[0.45em] text-[#b76e79]">
              A public corner of imagination
            </p>
            <p className="mt-5 text-lg leading-relaxed text-[#5f4b52]">
              一个由访客与 AI 共写的视觉档案。每一次提示词的落笔，都会留下一张可被回望的图像。
            </p>
          </div>

          <Link to="/ai-gallery" className="ai-plaza-card group" aria-label="进入生成图广场">
            {/* outsized index — breaks the frame */}
            <span className="ai-plaza-card-numeral" aria-hidden="true">06</span>

            {/* one rule extending from outside the card */}
            <span className="ai-plaza-card-rule" aria-hidden="true" />

            <div className="ai-plaza-card-inner">
              <span className="ai-plaza-card-eyebrow">— Plaza</span>

              <h3 className="ai-plaza-card-title">
                生成图
                <em>广场</em>
              </h3>

              <p className="ai-plaza-card-sub">
                每一次提示词的落笔，<br />都留下一张可被回望的图像。
              </p>
            </div>

            {/* asymmetric CTA pinned to bottom-right */}
            <span className="ai-plaza-card-cta" aria-hidden="true">
              <span>Enter</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M13 5l7 7-7 7" />
              </svg>
            </span>
          </Link>
        </div>

        <ExhibitTilt className="border-hsla relative mb-7 h-96 w-full overflow-hidden rounded-[1.75rem] md:h-[65vh]">
          <ExhibitCard
            src={`${COS}/videos/feature-1.mp4`}
            index="01"
            videoPriority
            visualOnly
          />
        </ExhibitTilt>

        <div className="features-bento-grid grid h-[135vh] w-full grid-cols-2 grid-rows-3 gap-7">
          <ExhibitTilt className="bento-tilt_1 row-span-1 rounded-[1.75rem] md:col-span-1 md:row-span-2">
            <ExhibitCard
              src={`${COS}/videos/feature-2.mp4`}
              index="02"
              title={
                <>
                  碎片独处
                </>
              }
              description="一个收纳日常念头、随手灵感与短暂心绪的温柔角落，把路过的故事轻轻写下来。"
              linkUrl="https://bistutzyy.github.io/"
              linkText="进入花园"
            />
          </ExhibitTilt>

          <ExhibitTilt className="bento-tilt_1 row-span-1 rounded-[1.75rem] ms-32 md:col-span-1 md:ms-0">
            <ExhibitCard
              src={`${COS}/videos/feature-3.mp4`}
              index="03"
              title={
                <>
                  创造纪事
                </>
              }
              description="这里收着这个网站一路搭起来的过程，页面怎么改、交互怎么调、细节怎么慢慢磨出来，都会安静记在这里。"
              linkUrl="/build/"
              linkText="进入实验室"
            />
          </ExhibitTilt>

          <ExhibitTilt className="bento-tilt_1 rounded-[1.75rem] me-14 md:col-span-1 md:me-0">
            <ExhibitCard
              src={`${COS}/videos/feature-4.mp4`}
              index="04"
              visualOnly
            />
          </ExhibitTilt>

          <ExhibitTilt className="bento-tilt_2 rounded-[1.75rem]">
            <div className="relative flex size-full flex-col justify-between overflow-hidden bg-[#ffe7ef] p-5 text-[#241322]">
              <div className="absolute -right-14 -top-14 size-40 rounded-full bg-white/55 blur-2xl" />
              <p className="font-general text-[10px] uppercase tracking-[0.35em] text-[#b76e79]">
                片段 05
              </p>
              <h1 className="bento-title max-w-72 text-3xl font-black leading-none md:text-5xl">
                M<b>o</b>re co<b>m</b>ing s<b>o</b>on.
              </h1>
              <TiLocationArrow className="m-5 scale-[5] self-end text-[#ff8fab]" />
            </div>
          </ExhibitTilt>

          <ExhibitTilt className="bento-tilt_2 rounded-[1.75rem]">
            <ExhibitCard
              src={`${COS}/videos/feature-5.mp4`}
              index="06"
              visualOnly
            />
          </ExhibitTilt>
        </div>
      </div>
    </section>
  );
};

export default Features;
