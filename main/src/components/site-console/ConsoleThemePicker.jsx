import { useEffect, useRef, useState } from "react";
import { LuCheck, LuPalette } from "react-icons/lu";
import { CONSOLE_THEMES } from "./consoleThemes.js";

export default function ConsoleThemePicker({ theme, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (!expanded) return undefined;
    rootRef.current
      .querySelector('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    const onPointer = (event) => {
      if (!rootRef.current.contains(event.target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [expanded]);

  return (
    <div
      className="console-theme-tool"
      ref={rootRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          setExpanded(false);
          triggerRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="console-tool-key"
        aria-label="主题预览"
        aria-expanded={expanded}
        aria-controls={expanded ? "console-theme-picker" : undefined}
        onClick={() => setExpanded((current) => !current)}
        title="切换控制台主题"
      >
        <LuPalette />
        <span>主题预览</span>
      </button>
      {expanded && (
        <div
          id="console-theme-picker"
          className="console-theme-picker"
          role="group"
          aria-label="控制台主题"
        >
          <div className="console-theme-picker-heading">
            <LuPalette aria-hidden="true" />
            <span>控制台主题</span>
            <small>
              0{CONSOLE_THEMES.findIndex(({ id }) => id === theme) + 1} / 04
            </small>
          </div>
          <div className="console-theme-options">
            {CONSOLE_THEMES.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-label={item.label}
                aria-pressed={theme === item.id}
                onClick={() => onChange(item.id)}
              >
                <span
                  className="console-theme-swatch"
                  style={{
                    backgroundColor: item.swatch,
                    borderColor: item.accent,
                  }}
                  aria-hidden="true"
                >
                  <i style={{ backgroundColor: item.accent }} />
                  {theme === item.id && <LuCheck />}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
