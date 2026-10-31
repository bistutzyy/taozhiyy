# Home Cover Screening Room Implementation Plan

> **For agentic workers:** Use subagent-driven-development for isolated state/Hero brightness integration; implement the modal scene and browser verification locally. Do not deploy.

**Goal:** Build an image-led screening room with floating slides, a small projector and useful controls instead of a dial.

**Architecture:** CoverPicker retains native modal isolation, decoded-image previews and a cancellable apply timeline. CoverScreening owns only scene presentation and command inputs. coverState validates brightness and selects a non-current ready random image. Hero remains the single applied state owner and persists only explicit confirmations.

**Tech Stack:** Existing React, GSAP, react-icons/lu, scoped CSS, Node tests and Playwright. No added dependencies.

## State And Hero
- [x] Add failing tests for read/write/validation of brightness and different-ready-image shuffle in `main/src/components/cover-picker/coverState.test.js`.
- [x] Implement `COVER_BRIGHTNESS_KEY`, `resolveCoverBrightness(value)`, `readCoverBrightness(storage)`, `writeCoverBrightness(storage,value)`, and `getRandomCoverIndex(available,current,random=Math.random())`. Brightness is an integer 70-115, invalid values default100; no eligible alternate image returnsnull.
- [x] Add Hero's applied brightness state; pass `currentBrightness` to CoverPicker. `onApply(index,brightness)` persists both values and updates brightness even if the cover index is unchanged. Apply CSS brightness only to actual current/previous image nodes, not text; do not clear that style during reduced-motion transitions.
- [x] Run state/integration tests and save a scoped local commit.

## Screening Scene
- [x] Replace dial-specific test contracts before implementation. Retain modal lifecycle/image retry tests and require image-only preview selection, shuffle/range/reset/clean-view controls, and cancellable apply.
- [x] Create `CoverScreening.jsx` and `screening-room.css`. Props: covers, previewIndex, currentIndex, readyIndexes, failedIndexes, busy, brightness, onPreview(index), onShuffle(), onBrightness(number), onResetBrightness(), onCleanView(), onConfirm(), onRetry(index). Use real images with `data-cover-index`, native range input and Lucide command icons/tooltips.
- [x] Replace CoverDial in CoverPicker. Keep draft brightness per opening and invoke `onApply(previewIndex,brightness)` only on explicit apply completion. Add clean view: inert/hidden editing content, one focusable return control, Escape restores editor first, then closes. Kill timeline on unmount/cancel.
- [x] Replace obsolete dial/shutter styling with fullscreen media/header/projector/scene/toolbar rules. Use stable slide positions and dimensions with responsive constraints and at most8px frame radii. No oversized headings, fake camera values, decorative orbs or in-app instructions.
- [x] Delete rejected, now-unused `CoverDial.jsx`, `aperture-dial.css`, `dialMath.js` and `dialMath.test.js`; preserve unrelated work.
- [x] Run focused Node tests and targeted lint, then save a local milestone.

## Verification
- [x] Update `tools/verify-home-covers.cjs` to exercise click-preview, alternate shuffle, brightness change/reset/apply/cancel/persistence, clean mode return/Escape/focus and cancelled pending apply.
- [x] Retain blocked storage, reduced motion, delayed/failed cover and actual failed Hero-image retry tests. Bounds checks include all visible labels/readouts, not only buttons.
- [x] Capture and inspect 1440x900, 1024x768, 768x1024, 390x844, 320x568, 844x390, 667x375 and 500x400 screenshots, with loaded real imagery and no runtime errors.
- [x] Run focused tests, Vite build, independent code review and fix actionable findings. Save scoped local commits and leave a local preview URL on5202, without push/PR/deployment.

## Verification (2026-10-31)
- 50 focused Node tests passed; targeted ESLint passed for Hero, CoverPicker, CoverScreening and coverState.
- Main Vite build passed. Existing shared AI-assistant asset and bundle-size warnings remain; the unrelated project-gallery deployment pipeline was not run.
- Eight viewport browser matrix passed, including actual image loading, labels/control bounds, touch selection, shuffle exclusion, brightness/reset/cancel/persistence, both apply entries, clean-mode focus/Escape and full-aspect-ratio viewing.
- Additional cases passed for blocked storage, reduced motion, delayed/failed media and retries, saved-cover fallback, same-index brightness changes, subsequent GSAP transitions and exact body/axis-specific overflow priority restoration.
- Independent review's overflow-axis finding was reproduced and fixed, then re-reviewed with no remaining concerns in the bounded review.
- Local preview server remains on http://127.0.0.1:5202/?cover=select&v=screening-room. No push, PR, merge or deployment.
