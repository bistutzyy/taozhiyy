# Homepage Cover Filmstrip Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the isolated picker component and scoped CSS, with Hero/state integration performed locally. No deployment.

**Goal:** Replace the compass with a cinematic filmstrip cover picker, remove its poetry, and unify desktop/mobile selection.

**Architecture:** Keep Hero media/wordmark/scroll composition. Move selection UI into `cover-picker/CoverPicker.jsx` and scoped CSS. Share four image records and validated storage helpers in a small module. Use existing GSAP for a restrained cover crossfade; native dialog handles focus containment. Reuse original COS assets and current icons.

**Tech Stack:** Existing React, GSAP, react-icons/lu, CSS, Node tests, Playwright.

## Tasks
- [ ] Add failing-first state/integration tests for four covers, validated saved selection, no compass or poetry, visible mobile entry, and picker mounting. Update only the obsolete mobile-next-image contract.
- [ ] Implement the isolated picker and CSS. Props: `open`, `covers` (`index`, `src`, `label`), `currentIndex`, `readyIndexes`, `failedIndexes`, `onApply(index)`, `onClose()`, `onRetry(index)`. Pointer hover and keyboard focus preview ready images. Thumbnail click applies directly. Cancel/Escape preserves the applied image. Provide loading/failure feedback and retry controls without selecting broken images.
- [ ] Implement state/persistence helpers and replace Hero compass integration, preserving the homepage shell, wordmark, sections, and COS proxy. Expose the same entry on mobile. Keep image decoding/readiness checks, safe failure handling, and reduced-motion transitions.
- [ ] Run focused Node tests, Vite build, browser assertions/screenshots across desktop, tablet, mobile and short landscape. Check real image previews, no layout overflow, cancel/apply, keyboard, persistence, blocked storage, slow/failing media and reduced motion.
- [ ] Review and fix actionable issues, save scoped local commits, and leave a local preview server running. No push or deployment.
