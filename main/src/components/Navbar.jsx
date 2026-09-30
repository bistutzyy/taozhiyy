import clsx from "clsx";
import gsap from "gsap";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWindowScroll } from "react-use";
import { cosAsset } from "../lib/cosAsset.js";
import VisitorNetworkBadge from "./VisitorNetworkBadge";

const navLinks = [
  { label: "HOME", to: "/", end: true },
  { label: "关于我", to: "/about", end: true },
  { label: "浮光集", to: "/glimmer", end: true },
  { label: "哔哩BILI", to: "/bili", end: true },
  { label: "数据中心", to: "/ai-traffic", end: true },
  { label: "Friends", to: "/friends", end: true },
];

const DRAWER_MS = 220;
const MAIN_ASSET_BASE = cosAsset(
  "AI%E8%87%AA%E5%8A%A8%E5%8C%96%E5%8D%9A%E5%AE%A2%E5%9B%BE%E7%89%87/main"
);
const logoSrc = `${MAIN_ASSET_BASE}/img/logo.png`;
const loopAudioSrc = `${MAIN_ASSET_BASE}/audio/loop.mp3`;

const getNavTheme = (pathname) => {
  if (pathname === "/bili" || pathname.startsWith("/bili/")) return "bili";
  if (pathname === "/ai-traffic" || pathname.startsWith("/ai-traffic/")) return "ai";
  if (pathname === "/friends" || pathname.startsWith("/friends/")) return "friends";
  if (pathname === "/guestbook" || pathname.startsWith("/guestbook/")) return "guestbook";
  if (pathname === "/glimmer" || pathname.startsWith("/glimmer/")) return "moments";
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) return "gallery";
  if (pathname === "/moments" || pathname.startsWith("/moments/")) return "moments";
  if (pathname === "/about" || pathname.startsWith("/about/")) return "about";
  return "dark";
};

const NavBar = () => {
  const { pathname } = useLocation();
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const audioElementRef = useRef(null);
  const navContainerRef = useRef(null);
  const menuBtnRef = useRef(null);
  const closeBtnRef = useRef(null);

  const { y: currentScrollY } = useWindowScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const isBiliPage = pathname === "/bili" || pathname.startsWith("/bili/");
  const isAiTrafficPage =
    pathname === "/ai-traffic" || pathname.startsWith("/ai-traffic/");
  const isFriendsPage =
    pathname === "/friends" || pathname.startsWith("/friends/");
  const isGuestbookPage =
    pathname === "/guestbook" || pathname.startsWith("/guestbook/");
  const isGlimmerPage =
    pathname === "/glimmer" || pathname.startsWith("/glimmer/");
  const isGalleryPage =
    pathname === "/gallery" || pathname.startsWith("/gallery/");
  const isAiGalleryPage =
    pathname === "/ai-gallery" || pathname.startsWith("/ai-gallery/");
  const isMomentsPage =
    pathname === "/moments" || pathname.startsWith("/moments/");
  const isAboutPage =
    pathname === "/about" || pathname.startsWith("/about/");
  const isSubPage =
    isBiliPage ||
    isAiTrafficPage ||
    isFriendsPage ||
    isGuestbookPage ||
    isGlimmerPage ||
    isGalleryPage ||
    isAiGalleryPage ||
    isMomentsPage ||
    isAboutPage;
  const navTheme = getNavTheme(pathname);
  const isLightNav = navTheme !== "dark";

  const closeMobile = useCallback(() => {
    setDrawerVisible(false);
    menuBtnRef.current?.focus();
    window.setTimeout(() => {
      setMobileOpen(false);
      setDrawerMounted(false);
      document.body.style.overflow = "";
    }, DRAWER_MS);
  }, []);

  const openMobile = useCallback(() => {
    setMobileOpen(true);
    setDrawerMounted(true);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerVisible(true));
    });
  }, []);

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  useEffect(() => {
    setDrawerVisible(false);
    setMobileOpen(false);
    setDrawerMounted(false);
    document.body.style.overflow = "";
  }, [pathname]);

  useEffect(() => {
    if (!drawerMounted) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerMounted, closeMobile]);

  useEffect(() => {
    if (!drawerVisible) return undefined;
    const id = window.setTimeout(() => closeBtnRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [drawerVisible]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (isAudioPlaying) {
      audioElementRef.current?.play();
    } else {
      audioElementRef.current?.pause();
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    if (!navContainerRef.current) return;

    const removeClasses = () => {
      navContainerRef.current.classList.remove(
        "floating-nav",
        "floating-nav-bili",
        "floating-nav-ai",
        "floating-nav-friends",
        "floating-nav-guestbook",
        "floating-nav-gallery",
        "floating-nav-moments",
        "floating-nav-about"
      );
    };

    const addThemeClass = () => {
      if (navTheme === "bili") {
        navContainerRef.current.classList.add("floating-nav-bili");
      } else if (navTheme === "ai") {
        navContainerRef.current.classList.add("floating-nav-ai");
      } else if (navTheme === "friends") {
        navContainerRef.current.classList.add("floating-nav-friends");
      } else if (navTheme === "guestbook") {
        navContainerRef.current.classList.add("floating-nav-guestbook");
      } else if (navTheme === "gallery") {
        navContainerRef.current.classList.add("floating-nav-gallery");
      } else if (navTheme === "moments") {
        navContainerRef.current.classList.add("floating-nav-moments");
      } else if (navTheme === "about") {
        navContainerRef.current.classList.add("floating-nav-about");
      } else {
        navContainerRef.current.classList.add("floating-nav");
      }
    };

    if (currentScrollY === 0) {
      setIsNavVisible(true);
      removeClasses();
    } else if (currentScrollY > lastScrollY) {
      setIsNavVisible(false);
      removeClasses();
      addThemeClass();
    } else if (currentScrollY < lastScrollY) {
      setIsNavVisible(true);
      removeClasses();
      addThemeClass();
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY, navTheme]);

  useEffect(() => {
    if (!navContainerRef.current) return;
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.2,
    });
  }, [isNavVisible]);

  const desktopLinkClass = (active) =>
    clsx("nav-hover-btn", isLightNav && `nav-hover-btn--${navTheme}`, {
      "text-[#7C5CFF]": active && navTheme === "bili",
      "text-[#FF8FAB]":
        active &&
        (navTheme === "ai" ||
          navTheme === "guestbook" ||
          navTheme === "gallery" ||
          navTheme === "moments" ||
          navTheme === "about"),
      "text-[#102A24]": active && navTheme === "friends",
      "text-yellow-300": active && navTheme === "dark",
    });

  const isLinkActive = (item) =>
    (item.to === "/" && pathname === "/") ||
    (item.to === "/glimmer" && (isGlimmerPage || isGalleryPage || isMomentsPage)) ||
    (item.to === "/gallery" && isGalleryPage) ||
    (item.to === "/bili" && isBiliPage) ||
    (item.to === "/ai-traffic" && isAiTrafficPage) ||
    (item.to === "/friends" && isFriendsPage) ||
    (item.to === "/guestbook" && isGuestbookPage) ||
    (item.to === "/moments" && isMomentsPage) ||
    (item.to === "/about" && isAboutPage);

  const handleNavClick = (item) => {
    if (item.to === "/" && pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderDesktopLink = (item) => (
    <Link
      key={item.label}
      to={item.to}
      className={desktopLinkClass(isLinkActive(item))}
      onClick={() => handleNavClick(item)}
    >
      {item.label}
    </Link>
  );

  const renderMobileLink = (item) => {
    const active = isLinkActive(item);
    return (
      <Link
        key={item.label}
        to={item.to}
        className={clsx(
          "nav-mobile-link",
          `nav-mobile-link--${navTheme}`,
          active && `nav-mobile-link--active-${navTheme}`
        )}
        onClick={() => {
          handleNavClick(item);
          closeMobile();
        }}
      >
        {item.label}
      </Link>
    );
  };

  const mobileDrawer =
    drawerMounted &&
    createPortal(
      <div className="nav-mobile-root md:hidden" aria-hidden={!drawerVisible}>
        <button
          type="button"
          className={clsx(
            "nav-mobile-backdrop",
            `nav-mobile-backdrop--${navTheme}`,
            drawerVisible && "is-open"
          )}
          aria-label="关闭导航菜单"
          tabIndex={drawerVisible ? 0 : -1}
          onClick={closeMobile}
        />
        <div
          id="site-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="站点导航"
          aria-hidden={!drawerVisible}
          className={clsx(
            "nav-mobile-drawer",
            `nav-mobile-drawer--${navTheme}`,
            drawerVisible && "is-open"
          )}
        >
          <div className="nav-mobile-drawer-head">
            <span className="nav-mobile-drawer-title">菜单</span>
            <button
              ref={closeBtnRef}
              type="button"
              className="nav-mobile-close"
              aria-label="关闭菜单"
              onClick={closeMobile}
            >
              <span aria-hidden>x</span>
            </button>
          </div>
          <nav className="nav-mobile-links">{navLinks.map((item) => renderMobileLink(item))}</nav>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <div
        ref={navContainerRef}
        className={clsx(
          "fixed inset-x-0 top-2 z-50 h-14 border-none transition-all duration-700 sm:inset-x-4 sm:top-4 sm:h-16 md:inset-x-6",
          navTheme === "bili" && currentScrollY === 0 && "floating-nav-bili",
          navTheme === "ai" && currentScrollY === 0 && "floating-nav-ai",
          navTheme === "friends" && currentScrollY === 0 && "floating-nav-friends",
          navTheme === "guestbook" && currentScrollY === 0 && "floating-nav-guestbook",
          navTheme === "gallery" && currentScrollY === 0 && "floating-nav-gallery",
          navTheme === "moments" && currentScrollY === 0 && "floating-nav-moments",
          navTheme === "about" && currentScrollY === 0 && "floating-nav-about"
        )}
      >
        <header className="absolute top-1/2 w-full -translate-y-1/2">
          <nav className="flex size-full min-w-0 items-center justify-between gap-2 px-2 sm:gap-3 sm:p-4">
            <div className="nav-left-tools">
              <Link
                to="/"
                className="block shrink-0"
                aria-label="Home"
                onClick={() => handleNavClick({ to: "/" })}
              >
                <img
                  src={logoSrc}
                  alt="logo"
                  className="h-8 w-8 sm:h-10 sm:w-10"
                />
              </Link>
              {currentScrollY === 0 && !isSubPage && (
                <>
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("showHeroPreview"))}
                    className={clsx(
                      "nav-hover-btn hidden md:inline",
                      isLightNav && `nav-hover-btn--${navTheme}`
                    )}
                  >
                    SWITCH COVER
                  </button>
                  <VisitorNetworkBadge className="nav-left-network" />
                </>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
              <div className="hidden items-center justify-end md:flex">
                {navLinks.map((item) => renderDesktopLink(item))}
              </div>

              <button
                ref={menuBtnRef}
                type="button"
                className={clsx(
                  "nav-menu-btn md:hidden",
                  navTheme !== "dark" && `nav-menu-btn--${navTheme}`
                )}
                aria-label="打开导航菜单"
                aria-expanded={mobileOpen}
                aria-controls="site-mobile-nav"
                onClick={openMobile}
              >
                <span className="nav-menu-btn-bar" />
                <span className="nav-menu-btn-bar" />
                <span className="nav-menu-btn-bar" />
              </button>

              <button
                onClick={toggleAudioIndicator}
                className="ml-0.5 flex shrink-0 items-center space-x-0.5 sm:ml-2 md:ml-4"
                type="button"
                aria-label="Toggle background music"
              >
                <audio
                  ref={audioElementRef}
                  className="hidden"
                  src={loopAudioSrc}
                  loop
                />
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={clsx("indicator-line", {
                      active: isIndicatorActive,
                      "indicator-line-bili": navTheme === "bili",
                      "indicator-line-friends": navTheme === "friends",
                      "indicator-line-ai":
                        navTheme === "ai" ||
                        navTheme === "guestbook" ||
                        navTheme === "gallery" ||
                        navTheme === "moments" ||
                        navTheme === "about",
                    })}
                    style={{
                      animationDelay: `${bar * 0.1}s`,
                    }}
                  />
                ))}
              </button>
            </div>
          </nav>
        </header>
      </div>
      {mobileDrawer}
    </>
  );
};

export default NavBar;
