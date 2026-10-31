import { cosAsset } from "../lib/cosAsset.js";

const root = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main/img",
);
const updatedFiles = {
  2: "hero-2-20261031.webp",
  3: "hero-3-20261031.webp",
};

export const getHeroCoverSrc = (index) =>
  `${root}/${updatedFiles[index] ?? `hero-${index}.webp`}`;
