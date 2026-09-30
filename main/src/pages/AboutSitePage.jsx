import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import ServerInfoPanel from "../components/ServerInfoPanel";
import { rewriteAboutPreviewAssets } from "./aboutPreviewAssets.js";

const ABOUT_PREVIEW_URL = "/about-preview.html";
const ABOUT_PREVIEW_VERSION = "20260930-server-status";

const getAboutPreviewUrl = () =>
  `${ABOUT_PREVIEW_URL}?${new URLSearchParams({ v: ABOUT_PREVIEW_VERSION })}`;

const extractBetween = (source, startPattern, endPattern) => {
  const start = source.match(startPattern);
  if (!start || start.index === undefined) return "";
  const contentStart = start.index + start[0].length;
  const end = source.slice(contentStart).match(endPattern);
  if (!end || end.index === undefined) return "";
  return source.slice(contentStart, contentStart + end.index);
};

const scopePreviewCSS = (css) =>
  css
    .replace(/:root\s*\{/g, ":host {")
    .replace(/\*\s*\{\s*box-sizing:\s*border-box;\s*\}/g, ":host, .about-shadow-shell, .about-shadow-shell * { box-sizing: border-box; }")
    .replace(/html,\s*body\s*\{/g, ":host, .about-shadow-shell {")
    .replace(/body::before/g, ".about-shadow-shell::before")
    .replace(/body::after/g, ".about-shadow-shell::after")
    .replace(/\bbody\s*\{/g, ".about-shadow-shell {");

const prepareMarkup = (html) => {
  const headLinks = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /fonts\.googleapis|fonts\.gstatic|preconnect/i.test(tag));
  const style = extractBetween(html, /<style>/i, /<\/style>/i);
  const body = extractBetween(html, /<body>/i, /<\/body>/i).replace(
    /<script\b[\s\S]*?<\/script>/gi,
    "",
  );

  return rewriteAboutPreviewAssets(`
    ${headLinks.join("\n")}
    <style>${scopePreviewCSS(style)}</style>
    <div class="about-shadow-shell">${body}</div>
  `);
};

const sameTextGroup = (left, right) =>
  left.length === right.length &&
  left.every((item, index) => item.textContent.trim() === right[index].textContent.trim());

const wireMarquees = (root) => {
  const rows = Array.from(root.querySelectorAll(".marquee"));
  if (!rows.length) return () => {};

  const prepareRow = (row) => {
    const track = row.querySelector(".marquee-track");
    if (!track) return;

    if (!track._baseItems) {
      const items = Array.from(track.children);
      const half = items.length / 2;
      const base =
        items.length % 2 === 0 && sameTextGroup(items.slice(0, half), items.slice(half))
          ? items.slice(0, half)
          : items;
      track._baseItems = base.map((item) => item.cloneNode(true));
    }

    track.innerHTML = "";
    track._baseItems.forEach((item) => track.appendChild(item.cloneNode(true)));

    while (
      track.children.length < track._baseItems.length * 2 ||
      track.scrollWidth < row.clientWidth * 2
    ) {
      track._baseItems.forEach((item) => track.appendChild(item.cloneNode(true)));
    }

    requestAnimationFrame(() => {
      const first = track.children[0];
      const next = track.children[track._baseItems.length];
      if (!first || !next) return;
      const distance = next.getBoundingClientRect().left - first.getBoundingClientRect().left;
      track.style.setProperty("--loop-offset", `-${Math.max(1, Math.round(distance))}px`);
    });
  };

  const prepareAllRows = () => rows.forEach(prepareRow);
  prepareAllRows();
  window.addEventListener("resize", prepareAllRows);
  window.setTimeout(prepareAllRows, 120);

  return () => window.removeEventListener("resize", prepareAllRows);
};

const wireProjectCards = (root) => {
  const removers = Array.from(root.querySelectorAll(".project")).flatMap((card) => {
    const onMove = (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    };
    const onLeave = () => {
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    return [
      () => card.removeEventListener("mousemove", onMove),
      () => card.removeEventListener("mouseleave", onLeave),
    ];
  });

  return () => removers.forEach((remove) => remove());
};

const wireGameShelf = (root) => {
  const shelf = root.querySelector(".game-shelf");
  if (!shelf) return () => {};
  let raf = null;
  const onMove = (event) => {
    const rect = shelf.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      shelf.style.setProperty("--rx", ((x - 0.5) * 2).toFixed(3));
      shelf.style.setProperty("--ry", ((y - 0.5) * 2).toFixed(3));
    });
  };
  const onLeave = () => {
    shelf.style.setProperty("--rx", "0");
    shelf.style.setProperty("--ry", "0");
  };
  shelf.addEventListener("mousemove", onMove);
  shelf.addEventListener("mouseleave", onLeave);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    shelf.removeEventListener("mousemove", onMove);
    shelf.removeEventListener("mouseleave", onLeave);
  };
};

const AboutSitePage = () => {
  const hostRef = useRef(null);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [serverStatusReady, setServerStatusReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    let alive = true;
    let cleanup = () => {};

    setServerStatusReady(false);
    shadow.innerHTML = '<div class="about-route-loading">正在打开关于本站...</div>';

    fetch(getAboutPreviewUrl(), { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (!alive) return;
        shadow.innerHTML = prepareMarkup(html);
        const onClick = (event) => {
          const link = event.target.closest?.("a[href]");
          if (!link) return;
          const href = link.getAttribute("href");
          if (!href || !href.startsWith("/about/")) return;
          event.preventDefault();
          navigate(href);
        };
        shadow.addEventListener("click", onClick);
        const removeMarquees = wireMarquees(shadow);
        const removeProjectCards = wireProjectCards(shadow);
        const removeGameShelf = wireGameShelf(shadow);
        cleanup = () => {
          shadow.removeEventListener("click", onClick);
          removeMarquees();
          removeProjectCards();
          removeGameShelf();
        };
        setServerStatusReady(true);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        shadow.innerHTML = '<div class="about-route-loading">关于页暂时没有加载出来。</div>';
      });

    return () => {
      alive = false;
      cleanup();
    };
  }, [navigate]);

  return (
    <section className="about-route-page" aria-label="关于我">
      <div ref={hostRef} className="about-route-shadow">
        {serverStatusReady ? (
          <div slot="server-status">
            <ServerInfoPanel />
          </div>
        ) : null}
      </div>
      {error ? <p className="about-route-error">关于页加载失败：{error}</p> : null}
    </section>
  );
};

export default AboutSitePage;
