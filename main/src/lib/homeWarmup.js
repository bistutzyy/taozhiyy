import { getBangumiList } from "../services/acgApi.js";

const ABOUT_PREVIEW_URL = "/about-preview.html?v=20260930-server-status";

let aboutTask = null;
let bangumiTask = null;

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
