import clsx from "clsx";
import { FaGithub, FaEnvelope } from "react-icons/fa";
import { SiBilibili, SiVercel } from "react-icons/si";
import { useLocation } from "react-router-dom";

const socialLinks = [
  { href: "https://github.com/bistutzyy", icon: <FaGithub />, label: "GitHub" },
  {
    href: "https://space.bilibili.com/1061280173?spm_id_from=333.1007.0.0",
    icon: <SiBilibili />,
    label: "Bilibili",
  },
  { href: "https://tzyy11.vercel.app/", icon: <SiVercel />, label: "Vercel" },
  {
    href: "mailto:nzc173236231@gmail.com",
    icon: <FaEnvelope />,
    label: "nzc173236231@gmail.com",
  },
];

const footerThemes = {
  default: {
    shell:
      "border-t border-[#F2E6C9] bg-gradient-to-r from-[#FFF8E7] via-[#FFEAF4] to-[#EAF6FF] text-[#2B2B2B]",
    copy: "text-[#5F4B52]",
    icon: "text-[#2B2B2B] hover:text-[#FF8FAB]",
    tip: "border border-[#F2E6C9] bg-white/95 text-[#2B2B2B]",
  },
  bili: {
    shell:
      "border-t border-[#E8DFFB] bg-gradient-to-r from-[#EAF6FF] via-[#FFEAF4] to-[#F3E8FF] text-[#2D2A3A]",
    copy: "text-[#2D2A3A]/85",
    icon: "text-[#2D2A3A] hover:text-[#7C5CFF]",
    tip: "border border-[#E8DFFB] bg-white/95 text-[#2D2A3A]",
  },
  ai: {
    shell: "border-t border-[#F2E6C9] bg-[#FFF8E7] text-[#2B2B2B]",
    copy: "text-[#6B7280]",
    icon: "text-[#2B2B2B] hover:text-[#FF8FAB]",
    tip: "border border-[#F2E6C9] bg-white text-[#2B2B2B]",
  },
  guestbook: {
    shell:
      "border-t border-[#F2E6C9] bg-gradient-to-r from-[#FFF8E7] via-[#FFFDF5] to-[#EAF6FF] text-[#2B2B2B]",
    copy: "text-[#6B7280]",
    icon: "text-[#2B2B2B] hover:text-[#FF8FAB]",
    tip: "border border-[#F2E6C9] bg-white text-[#2B2B2B]",
  },
  friends: {
    shell:
      "border-t border-[#F2E6C9] bg-gradient-to-r from-[#FFF7ED] via-[#FFFDF7] to-[#EEF7FF] text-[#2B2B2B]",
    copy: "text-[#6B7280]",
    icon: "text-[#5F4B52] hover:text-[#74C0FC]",
    tip: "border border-[#F2E6C9] bg-[#FFFEFA]/95 text-[#5F4B52]",
  },
  moments: {
    shell:
      "border-t border-[#E8DFFB] bg-gradient-to-r from-[#FFFDFD] via-[#FFF4F8] to-[#F1FFFC] text-[#4A4456]",
    copy: "text-[#6A6674]",
    icon: "text-[#4A4456] hover:text-[#9B8FD4]",
    tip: "border border-[#E8DFFB] bg-white/95 text-[#4A4456]",
  },
};

const Footer = () => {
  const { pathname } = useLocation();
  const variant = pathname.startsWith("/bili")
    ? "bili"
    : pathname.startsWith("/ai-traffic")
      ? "ai"
      : pathname.startsWith("/guestbook")
        ? "guestbook"
        : pathname.startsWith("/friends")
          ? "friends"
          : pathname.startsWith("/moments") || pathname.startsWith("/glimmer")
            ? "moments"
            : "default";
  const theme = footerThemes[variant];

  return (
    <footer className={clsx("w-full py-4 md:py-5", theme.shell)}>
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <p className={clsx("text-center text-sm font-light md:text-left", theme.copy)}>
          @bistutzyy
        </p>

        <div className="flex justify-center gap-4 md:justify-start">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={clsx(
                "group relative flex items-center gap-2 text-lg transition-colors duration-300 ease-in-out",
                theme.icon
              )}
            >
              {link.icon}
              <span
                className={clsx(
                  "pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100",
                  theme.tip
                )}
              >
                {link.label}
              </span>
            </a>
          ))}
        </div>

        <p className={clsx("text-center text-sm font-light md:text-right", theme.copy)}>
          本站仅作学习使用，感谢开源
        </p>
      </div>
    </footer>
  );
};

export default Footer;
