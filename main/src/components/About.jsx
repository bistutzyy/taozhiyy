import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/all";

import AnimatedTitle from "./AnimatedTitle";
import DeferredImage from "./DeferredImage";
import { cosAsset } from "../lib/cosAsset.js";

gsap.registerPlugin(ScrollTrigger);

const About = () => {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(min-width: 768px)", () => {
      const revealTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: "#taoyao-screen-reveal",
          start: "center center",
          end: "+=900 center",
          scrub: 0.5,
          pin: true,
          pinSpacing: true,
        },
      });

      revealTimeline
        .to(".taoyao-screen-window", {
          width: "100vw",
          height: "100vh",
          borderRadius: 0,
          clipPath: "inset(0 round 0px)",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        })
        .to(
          ".taoyao-postcard-detail",
          {
            autoAlpha: 0,
            y: -18,
          },
          0
        )
        .to(
          ".taoyao-screen-image",
          {
            scale: 1,
          },
          0
        );
    });

    mm.add("(max-width: 767px)", () => {
      const revealTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: "#taoyao-screen-reveal",
          start: "top 16%",
          end: "+=520 top",
          scrub: 0.45,
          pin: true,
          pinSpacing: true,
        },
      });

      revealTimeline
        .to(".taoyao-screen-window", {
          width: "100vw",
          height: "100dvh",
          borderRadius: 0,
          clipPath: "inset(0 round 0px)",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        })
        .to(
          ".taoyao-postcard-detail",
          {
            autoAlpha: 0,
            y: -12,
          },
          0
        )
        .to(
          ".taoyao-screen-image",
          {
            scale: 1.04,
          },
          0
        );
    });

    return () => mm.revert();
  });

  return (
    <section id="about" className="min-h-screen w-screen bg-[#fff8f1]">
      <div className="relative mb-8 mt-36 flex flex-col items-center gap-5 px-5">
        <p className="font-general text-sm uppercase tracking-[0.35em] text-[#b76e79] md:text-[10px]">
          Welcome to 桃之夭夭
        </p>

        <AnimatedTitle
          title="FEEL FRE<b>E</b> TO KEEP <br /> SCROLLING D<b>O</b>WN"
          containerClass="mt-5 !text-black text-center"
        />

        <div className="about-subtext text-[#5f4b52]">
          <p>
            Here are more of my creations. I hope you can fully enjoy these
            things
          </p>
        </div>
      </div>

      <div className="taoyao-screen-reveal w-screen" id="taoyao-screen-reveal">
        <div className="taoyao-screen-window">
          <div className="taoyao-postcard-detail absolute left-5 right-5 top-5 z-30 flex items-center justify-between text-blue-50">
            <span className="rounded-full border border-white/35 bg-white/18 px-4 py-2 font-general text-[10px] uppercase tracking-[0.35em] backdrop-blur-md">
              Welcome to 桃之夭夭
            </span>
            <span className="font-general text-[10px] uppercase tracking-[0.35em] text-white/78">
              No. 2026
            </span>
          </div>

          <DeferredImage
            src={cosAsset(
              "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main/img/about.webp"
            )}
            alt="Background"
            className="taoyao-screen-image absolute left-0 top-0 size-full scale-100 object-cover md:scale-[1.08]"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#160d14]/60 via-transparent to-white/10" />
          <div className="taoyao-postcard-detail pointer-events-none absolute inset-5 z-30 border border-white/30" />
          <div className="taoyao-postcard-detail pointer-events-none absolute bottom-8 left-6 right-6 text-blue-50 md:left-10 md:right-auto md:max-w-xl">
            <p className="font-general text-xs uppercase tracking-[0.35em] text-pink-100/80">
              Scroll to immerse
            </p>
            <p className="mt-3 font-circular-web text-lg leading-relaxed md:text-2xl">
              Here are more of my creations. I hope you can fully enjoy these
              things
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
