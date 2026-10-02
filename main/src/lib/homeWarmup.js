import { getBangumiList } from "../services/acgApi.js";
import { fetchGuestbookMessages } from "../services/guestbookMessagesApi.js";

const ABOUT_PREVIEW_URL = "/about-preview.html?v=20260930-server-status";
const OCEAN_VIDEO = "/seasonal/ocean/ocean.mp4";
const TASK_LIMIT_MS = 12000;

export const HOME_FIGURE_SRC =
  "https://tzyy-1330068502.cos.ap-beijing.myqcloud.com/AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/build/hero.png";

let aboutTask = null;
let bangumiTask = null;

const withLimit = (task) =>
  Promise.race([
    task.catch(() => undefined),
    new Promise((resolve) => {
      window.setTimeout(resolve, TASK_LIMIT_MS);
    }),
  ]);

export function preloadAboutPreview() {
  if (!aboutTask) {
    aboutTask = fetch(ABOUT_PREVIEW_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.text() : ""))
      .catch(() => "");
  }
  return aboutTask;
}

export function peekAboutPreview() {
  return aboutTask;
}

export function preloadBangumiList() {
  if (!bangumiTask) bangumiTask = getBangumiList();
  return bangumiTask;
}

const waitImage = (src) =>
  new Promise((resolve) => {
    const image = new Image();
    const done = () => resolve();
    image.onload = done;
    image.onerror = done;
    image.src = src;
  });

const waitVideo = (src) =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      video.load();
      resolve();
    };
    video.preload = "auto";
    video.muted = true;
    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", done, { once: true });
    video.src = src;
  });

export function preloadHomeEntry() {
  return [
    withLimit(waitImage(HOME_FIGURE_SRC)),
    withLimit(preloadAboutPreview()),
    withLimit(waitVideo(OCEAN_VIDEO)),
    withLimit(preloadBangumiList()),
    withLimit(fetchGuestbookMessages(1, 50, { channel: "friends" })),
  ];
}
