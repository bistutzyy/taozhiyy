# Homepage Aperture Dial Implementation Plan

> **For agentic workers:** Use subagent-driven-development for the independent angular math module and its tests. Implement UI, integration and verification locally. Local preview only.

**Goal:** Replace the conventional filmstrip with an interactive mechanical aperture selector.

**Architecture:** Keep Hero's cover loading, persistence and transitions unchanged. CoverPicker retains its native modal and preview layers; a focused CoverDial component handles rotation and radial UI. Pure angle helpers keep snap behavior deterministic. Existing GSAP Draggable/InertiaPlugin supplies drag physics, and a cancellable short shutter timeline confirms the selection.

**Tech Stack:** Existing React, GSAP/Draggable/InertiaPlugin, react-icons/lu, CSS, Node tests and Playwright. No dependencies added.

## Task 1: Snap Math
- [ ] Add failing tests in `main/src/components/cover-picker/dialMath.test.js` for `getDialIndex(rotation, available)`, `getDialRotation(index, fromRotation)` and `snapDialRotation(rotation, available)`.
- [ ] Run `node --test src/components/cover-picker/dialMath.test.js` from main and observe the missing-module assertion.
- [ ] Implement `dialMath.js`: index 1 is rotation 0, index 2 is -90, wrap by 360, select the nearest available index, return null if none, and choose the nearest equivalent target angle. For example `getDialIndex(-89,[1,2,3,4]) === 2`, `getDialRotation(1,-359) === -360`.
- [ ] Run the test command again and save a scoped local milestone.

## Task 2: Dial And Modal
- [ ] Update `CoverPicker.test.js` source contracts before implementation: preserve native dialog, safe cleanup, sharp preview layers and retry; require CoverDial and a cancellable `gsap.timeline` confirmation instead of direct thumbnail apply.
- [ ] Add `CoverDial.jsx` and `aperture-dial.css`. Props: covers, previewIndex, currentIndex, readyIndexes, failedIndexes, busy, onPreview, onConfirm, onRetry. Initialize the rotor at `getDialRotation(previewIndex,0)` and call `Draggable.create(rotor,{type:'rotation',trigger:grip,inertia:true,snap:{rotation:value=>snapDialRotation(value,available)}})` inside an effect, killing it on cleanup. Arrow keys step through ready covers, Home/End select extremes. A central image button calls onConfirm; ring thumbnails call onPreview only.
- [ ] Keep the existing modal lifecycle in `CoverPicker.jsx`; replace the tool/viewfinder markup with CoverDial. Confirmation guards readiness, captures its index, starts a short close/open shutter timeline and calls onApply once at completion. Cleanup kills the timeline; reduced motion confirms synchronously. Escape/X remains available and cancels pending work by unmounting.
- [ ] Replace obsolete filmstrip CSS with scoped full-screen preview/header/shutter rules. Use `--dial-size:min(500px,calc(100vw - 32px),calc(100dvh - 172px))` and constrain radial frames/lens sizes proportionally; no viewport-scaled fonts or background blur.
- [ ] Run focused Node tests and targeted ESLint, then save a local milestone.

## Task 3: Browser Verification
- [ ] Adapt `tools/verify-home-covers.cjs`: frame clicks/focus only preview; central confirmation applies. Verify mouse drag and touch pointer rotation, ready-only snapping, arrow/Home/End keys, no persistence during previews, delayed confirmation, cancellation during shutter, no continuing inertia after closing and reduced motion.
- [ ] Retain existing delayed/failed media, actual failed Hero image retry, saved-cover fallback and exact body style restoration cases.
- [ ] Run at 1440x900, 1024x768, 768x1024, 390x844, 320x568, 844x390 and 667x375. Inspect screenshots and assert bounds, real images and lack of runtime errors.
- [ ] Run focused Node tests, main Vite build and independent code review; fix actionable findings.
- [ ] Save scoped local commits and leave the existing local preview server running on 5202. No push or deployment.
