import { resolveCoverIndex } from "./cover-picker/coverState.js";

export const HERO_WORDMARK_THEMES = {
  1: {
    name: "moon-blue",
    text: "#f7fbff",
    subtitle: "#f3f8ff",
    signature: "#f1f9ff",
    edge: "rgba(6, 19, 38, 0.7)",
    shadow: "rgba(3, 13, 31, 0.8)",
    stroke: "rgba(246, 252, 255, 0.98)",
    strokeMid: "rgba(214, 241, 255, 0.98)",
    strokeEnd: "rgba(246, 249, 255, 0.98)",
    fill: "rgba(246, 252, 255, 0.98)",
    fillMid: "rgba(214, 241, 255, 0.98)",
    fillEnd: "rgba(246, 249, 255, 0.98)",
    glow: "rgba(174, 221, 255, 0.16)",
    veil: "rgba(7, 16, 34, 0.2)",
    wordmarkEdge: "rgba(10, 25, 48, 0.85)",
    wordmarkShadow: "rgba(3, 14, 32, 0.65)",
  },
  2: {
    name: "coral-ink",
    text: "#262238",
    subtitle: "#242335",
    signature: "#fff8ee",
    edge: "rgba(255, 252, 241, 0.8)",
    shadow: "rgba(255, 250, 238, 0.72)",
    stroke: "rgba(42, 34, 50, 0.98)",
    strokeMid: "rgba(57, 33, 52, 0.98)",
    strokeEnd: "rgba(28, 38, 53, 0.98)",
    fill: "rgba(42, 34, 50, 0.98)",
    fillMid: "rgba(57, 33, 52, 0.98)",
    fillEnd: "rgba(28, 38, 53, 0.98)",
    glow: "rgba(255, 250, 238, 0.12)",
    veil: "rgba(255, 250, 238, 0.15)",
    wordmarkEdge: "rgba(255, 249, 238, 0.95)",
    wordmarkShadow: "rgba(255, 245, 222, 0.8)",
  },
  3: {
    name: "rain-blue",
    text: "#f7f7ff",
    subtitle: "#f3f6ff",
    signature: "#f7f7ff",
    edge: "rgba(9, 16, 32, 0.8)",
    shadow: "rgba(3, 9, 20, 0.85)",
    stroke: "rgba(247, 249, 255, 0.98)",
    strokeMid: "rgba(217, 234, 255, 0.98)",
    strokeEnd: "rgba(255, 244, 229, 0.98)",
    fill: "rgba(247, 249, 255, 0.98)",
    fillMid: "rgba(217, 234, 255, 0.98)",
    fillEnd: "rgba(255, 244, 229, 0.98)",
    glow: "rgba(184, 216, 255, 0.15)",
    veil: "rgba(9, 16, 32, 0.2)",
    wordmarkEdge: "rgba(7, 14, 29, 0.95)",
    wordmarkShadow: "rgba(3, 9, 20, 0.78)",
  },
  4: {
    name: "star-rose",
    text: "#fff6fb",
    subtitle: "#fff4fa",
    signature: "#fff7fb",
    edge: "rgba(24, 10, 30, 0.8)",
    shadow: "rgba(12, 5, 24, 0.85)",
    stroke: "rgba(255, 246, 252, 0.98)",
    strokeMid: "rgba(255, 217, 235, 0.98)",
    strokeEnd: "rgba(238, 227, 255, 0.98)",
    fill: "rgba(255, 246, 252, 0.98)",
    fillMid: "rgba(255, 217, 235, 0.98)",
    fillEnd: "rgba(238, 227, 255, 0.98)",
    glow: "rgba(247, 188, 221, 0.16)",
    veil: "rgba(24, 10, 30, 0.2)",
    wordmarkEdge: "rgba(23, 9, 32, 0.9)",
    wordmarkShadow: "rgba(11, 5, 24, 0.75)",
  },
};

export const getHeroWordmarkTheme = (index) =>
  HERO_WORDMARK_THEMES[resolveCoverIndex(index)];

export const getHeroWordmarkStyle = (index) => {
  const theme = getHeroWordmarkTheme(index);
  return {
    "--hero-wordmark-stroke": theme.stroke,
    "--hero-wordmark-stroke-mid": theme.strokeMid,
    "--hero-wordmark-stroke-end": theme.strokeEnd,
    "--hero-wordmark-fill": theme.fill,
    "--hero-wordmark-fill-mid": theme.fillMid,
    "--hero-wordmark-fill-end": theme.fillEnd,
    "--hero-wordmark-glow": theme.glow,
    "--hero-wordmark-veil": theme.veil,
    "--hero-wordmark-edge": theme.wordmarkEdge,
    "--hero-wordmark-shadow": theme.wordmarkShadow,
  };
};

export const getHeroTextStyle = (index) => {
  const theme = getHeroWordmarkTheme(index);
  return {
    "--hero-title-ink": theme.text,
    "--hero-description-ink": theme.subtitle,
    "--hero-signature-ink": theme.signature,
    "--hero-copy-edge": theme.edge,
    "--hero-copy-shadow": theme.shadow,
    "--hero-nav-ink": theme.text,
    "--hero-nav-shadow": `0 1px 2px ${theme.edge}, 0 2px 4px ${theme.shadow}`,
  };
};
