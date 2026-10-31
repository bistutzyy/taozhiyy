# Folding Fan Cover Implementation Plan

**Goal:** Preview a shared-pivot folding fan with direct leaf selection and restrained ornamental transitions.

**Architecture:** Keep Hero/state helpers and native modal lifecycle. Replace CoverScreening with CoverFan and scoped CSS. CoverFan emits onPreview(index) for hover/focus and onSelect(index,element) for explicit selection; CoverPicker uses a captured index and GSAP Flip to expand a temporary selected-image layer to the viewport, then calls onApply(index,brightness). Existing commands stay available.

**Tech Stack:** React, existing GSAP/Flip, Lucide icons, SVG clip geometry, CSS and Playwright. No added packages.

- [ ] Update source/SSR tests before implementation: require shared fan geometry, fine-pointer hover, keyboard focus, direct selection, selected-image Flip expansion, decorations and reduced motion. Keep state/modal tests.
- [ ] Add `main/src/components/cover-picker/CoverFan.jsx` and `fan-screen.css`: four clipped curved leaves with one transform origin, smaller mobile angles, ready-only hover/focus and explicit onSelect. Retain native command controls and truthful retry states. Add small ribs, pivot/tassel and gold arc ornament.
- [ ] Update CoverPicker to capture the selected index/element, prepare a real image overlay and animate from `Flip.fit(overlay,source,{getVars:true})` to fullscreen. Cancel clears its timeline; reduced motion bypasses it. Add finite peach petal burst. Preserve native lifecycle, drafts and clean-view controls.
- [ ] Remove unused rejected screening component/CSS and run focused tests/lint/build.
- [ ] Adapt browser tests: focus/hover previews without applying, explicit leaf click/tap directly applies, correct captured index, expansion and cancellation, all retained controls, failed/slow images, blocked storage and exact body styles.
- [ ] Check screenshots/bounds at desktop, tablet, phones and short landscape, including 320x568 and 500x400; run independent review and fix actionable issues.
- [ ] Save scoped local commits and leave port5202 preview running. No push, PR, merge or deployment.
