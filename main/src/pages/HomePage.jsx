import { useEffect } from "react";
import About from "../components/About";
import Hero from "../components/Hero";
import Features from "../components/Features";
import Story from "../components/Story";
import Contact from "../components/Contact";

const HomePage = () => {
  useEffect(() => {
    if (window.location.hash !== "#end") return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById("end")?.scrollIntoView({ behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <Hero />
      <About />
      <Features />
      <Story />
      <Contact />
    </>
  );
};

export default HomePage;
