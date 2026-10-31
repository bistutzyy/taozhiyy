# Homepage Cover Filmstrip Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated picker component and scoped CSS, with Hero/state integration performed locally. No deployment.

**Goal:** Replace the compass with a cinematic filmstrip cover picker, remove its poetry, and unify desktop/mobile selection.

**Architecture:** Keep Hero media/wordmark/scroll composition. Move selection UI into `cover-picker/CoverPicker.jsx` and scoped CSS. Share four image records and validated storage helpers in a small module. Use existing GSAP for a restrained cover crossfade; native dialog handles focus containment. Reuse original COS assets and current icons.

**Tech Stack:** Existing React, GSAP, react-icons/lu, CSS, Node tests, Playwright.

## Tasks
- [x] Add failing-first state/integration tests for four covers, validated saved selection, no compass or poetry, visible mobile entry, and picker mounting. Update only the obsolete mobile-next-image contract.
- [x] Implement the isolated picker and CSS. Props: `open`, `covers` (`index`, `src`, `label`), `currentIndex`, `readyIndexes`, `failedIndexes`, `onApply(index)`, `onClose()`, `onRetry(index)`. Pointer hover and keyboard focus preview ready images. Thumbnail click applies directly. Cancel/Escape preserves the applied image. Provide loading/failure feedback and retry controls without selecting broken images.
- [x] Implement state/persistence helpers and replace Hero compass integration, preserving the homepage shell, wordmark, sections, and COS proxy. Expose the same entry on mobile. Keep image decoding/readiness checks, safe failure handling, and reduced-motion transitions.
- [x] Run focused Node tests, Vite build, browser assertions/screenshots across desktop, tablet, mobile and short landscape. Check real image previews, no layout overflow, cancel/apply, keyboard, persistence, blocked storage, slow/failing media and reduced motion.
- [x] Review and fix actionable issues, save scoped local commits, and leave a local preview server running. No push or deployment.

## Verification (2026-10-31)
- 43 focused Node tests passed. Targeted ESLint passed for Hero, CoverPicker and cover state.
- Main Vite build passed. Existing shared AI-assistant asset and bundle-size warnings remain; the unrelated project-gallery pipeline was not rerun.
- Playwright passed at 1440x900, 1024x768, 768x1024, 390x844, 320x568, 844x390 and 667x375, including loaded image screenshots, keyboard/hover previews, apply/cancel, persistence, focus and scroll restoration.
- Additional browser cases passed for blocked storage, reduced motion, delayed media, failed media/retry, exact inline body style restoration, saved-cover fallback and retrying the actual failed homepage image.
- Independent review found one applied-image retry issue; reproduced it, fixed the DOM image remount and verified the regression. No remaining findings after re-review.
- Local preview: http://127.0.0.1:5202/?cover=select. No push, PR, merge or server deployment.
