# Asymmetric Four-Panel Cover Preview

**Approved direction:** A 2x2 background split with designed, irregular boundaries, not a rectangular grid. Keep the existing folding fan. All four wallpapers begin dim; hover or keyboard focus lights only the corresponding region. Selection still expands the captured leaf to the homepage.

**Design:** Four convex image regions meet at an off-center junction, with slanted seam endpoints and fine, warm divider lines. Each image is centered inside its own region bounds. No new assets, fetched APIs, blur, decorative orbs or continuous animation. Clean view still shows the chosen full image without split lines.

**Implementation:** Isolate background geometry/presentation in a small component. Track pointer, focus and explicit toolbar preview sources in recency order, so leaving a leaf restores any still-focused leaf. A new session starts with no lit region. Failed/loading images remain unselectable. Preserve brightness, cancellation, focus/scroll restoration, reduced motion and the existing Flip handoff.

- [x] Add failing geometry, interaction and component tests.
- [x] Implement the four irregular regions and link fan hover/focus/leave/blur events.
- [x] Verify dim/lit pixels, full panel coverage, real assets, keyboard/touch, clean view, failed media, cancellation and captured-index application across desktop/mobile.
- [x] Run the production build and scoped review, save a local Git checkpoint, and provide the local preview. Do not push or deploy until the user approves this visual revision.

Verification: 54 focused tests, scoped ESLint, the Vite frontend production build, four-panel pixel checks and real-asset desktop/mobile screenshots passed. The existing cover regression passed all eight viewports plus reduced motion, blocked storage, delayed/failed media, retry, cancellation and exact body restoration. A review caught a restored focus/command preview targeting mismatch; a failing browser assertion reproduced it, and the fix and independent follow-up review passed. Preview: http://127.0.0.1:5203/?cover=select&v=quad-fan-preview. No push or deployment.
