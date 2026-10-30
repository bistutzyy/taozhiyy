export const CONSOLE_THEME_STORAGE = "taozhiyy.console-theme.rotation.v1";

export const CONSOLE_THEMES = [
  { id: "night", label: "夜航", swatch: "#292834", accent: "#eda5bf" },
  { id: "paper", label: "晴笺", swatch: "#fafaf7", accent: "#bb526a" },
  { id: "titanium", label: "银钛", swatch: "#c8d4db", accent: "#477b87" },
  { id: "arcade", label: "游艺", swatch: "#efc9d4", accent: "#315a51" },
];

export function resolveConsoleTheme(value) {
  return CONSOLE_THEMES.some(({ id }) => id === value) ? value : "arcade";
}

export function nextConsoleTheme(previous) {
  const index = CONSOLE_THEMES.findIndex(({ id }) => id === previous);
  return index < 0
    ? "arcade"
    : CONSOLE_THEMES[(index + 1) % CONSOLE_THEMES.length].id;
}
