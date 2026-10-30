# Home Console Preview Implementation Plan

> **For agentic workers:** Use executing-plans for the tightly coupled navigation and dialog changes. Keep all work local; do not push or deploy.

**Goal:** Add a visitor-facing control panel next to HOME, with tactile controls, three fragment entrances, announcements, updates, a reserved lottery station, and quick links.

**Architecture:** Mount one fixed, horizontally and vertically centered React dialog through a portal from Navbar. Reuse its music state, while keeping the homepage cover control separate. Keep public content in a small data module; do not connect owner APIs. Retain the homepage and existing lottery implementation. Use dedicated scoped stylesheets, existing react-icons, text-and-icon fragment controls without cover images, and focus trapping with background scroll locking. Only the continuous journal feed scrolls.

**Tech Stack:** React 18, react-router-dom, react-icons, CSS, Node test runner, Playwright with Edge.

## Tasks
- [x] Add failing content and integration contracts in `main/src/components/site-console/siteConsole.test.js`; run `node --test src/components/site-console/siteConsole.test.js` from main and verify missing functionality fails.
- [x] Add `consoleContent.js` and `SiteConsole.jsx` with semantic buttons, a continuous announcement/update journal, real public destinations, a clearly reserved lottery position, copy feedback, music toggle, cover switch, and top/close controls.
- [x] Add `site-console.css` with a light rose/white/ice-blue palette, compact unframed sections, numbered text-and-icon entrances, 8px framed items, tactile buttons, responsive fixed-height layout, and reduced-motion support.
- [x] Integrate the control immediately after HOME in desktop and mobile navigation. Close mutually exclusive overlays, restore focus/scroll, and preserve route-specific navigation themes.
- [x] Unify homepage fragment 01 with the shared ExhibitCard presentation, retaining its video and destination; update the existing regression test to reflect the new requirement.
- [x] Verify the focused Node tests, Vite build, and Playwright screenshots at desktop/tablet/mobile sizes. Check independent feed scrolling, center coordinates, focus containment, Escape/backdrop close, clipboard, scroll locking, music state, correct hrefs, and no clipped right-hand controls.
- [x] Save a local commit containing only this feature; leave the unrelated build-time plan untouched. Launch a hidden local server on an available port and open the preview, without creating a PR or changing production.

## Acceptance
The panel opens from a real control after HOME, with visible clickable controls rather than text-only navigation. Both entry and close paths work with mouse and keyboard. The mobile menu can open the same panel. The three existing destinations remain unchanged. The lottery block has no draw request or misleading working draw button. Public UI never references `/app` or owner APIs. Existing homepage content remains reachable.

## Final Layout Revision
- The user rejected vertical scrolling inside the control panel. Reproduced 153px of overflow at 1366x768 and a substantially longer stack on mobile.
- Keep the existing desktop arrangement but size its grid tracks to the available viewport. Do not merely conceal a scrollbar or crop working controls.
- The latest user request requires exact two-axis centering, no fragment images, and a continuous scrollable log on the left. This supersedes the temporary view tabs and per-entry message selection. There are no tab or message-picker controls in the final revision.
- Keep the journal feed separate from the stationary right-hand entries and bottom controls. At phone widths the feed occupies its own fixed-height upper region; only its contents scroll.
- Verify vertical overflow, horizontal overflow, center coordinates, and bounding rectangles of right-hand controls, including short portrait and landscape viewports. Verify that scrolling the feed does not move the panel or right side.

## Verification Record
- 28 focused Node tests passed, including theme validation/rotation and existing hero/compass/image-state tests.
- Vite production build passed, retaining existing assistant-asset and bundle-size warnings.
- Browser checks passed at 1366x768, 1440x900, 1280x720, 1920x1080, 1024x768, 1024x600, 768x1024, 390x844, 320x740, 320x568, 390x500, and 844x390. Exact centering, no fragment images, independent journal scrolling, stationary right-side controls, real music playback, cover switching, clipboard, focus containment, and cross-page destinations passed.
- UI browser tests return valid 503 JSON for API calls because no local backend runs on port 8787. No production API write requests are made. The existing AI assistant has an unrelated JSON parsing error when opened without this test isolation; it does not affect the console controls.
- The full main test suite has four pre-existing failures: about mobile game-card rules, the Story editorial greeting expectation, and two owner-console blueprint expectations. Their source and tests are unchanged from origin/master. No merge or deployment is requested.

## Accepted Themes And Rotation
- Replace the console Data Center shortcut with About at `/about`. The homepage Data Center entrance is unchanged.
- The user approved all four themes: Night, Paper, Titanium, and Arcade. They vary typography, material, border treatment, and tactile key styling, not just palette. All CSS is scoped to the console.
- Replace the console cover-control button with a swatch theme picker. The original homepage cover switch remains independent.
- First normal opening uses Arcade. Subsequent openings cycle Arcade -> Night -> Paper -> Titanium -> Arcade. Manual selection becomes the previous choice, so the next opening still differs. Persist the previous theme in a versioned localStorage key; fall back to in-memory rotation if storage is blocked.
- Advance on an actual closed-to-open edge only. Use a layout effect and a ref guard to avoid StrictMode duplicate advances and prevent a theme flash before paint. A direct theme-preview query is validated, applied once, and consumed so it cannot pin subsequent openings.
- Dismiss the swatch picker when keyboard focus leaves it; Escape within it closes only the picker and returns focus to its trigger.
- Theme verification covers four modes at seven viewport sizes, including small portrait and landscape. Check 4.5:1 small-text/control contrast, exact centering, right-side control bounds, theme picker bounds, and material/typography variation.
- Rotation verification covers eight repeated openings, multiple close methods, browser reload continuity, manual selection, one-shot preview queries, and blocked storage on desktop/mobile. The implementation remains local-only.
- Final verification on 2026-10-30 passed: 28 focused tests, all four themes at seven viewport sizes, desktop/mobile rotation checks, and a fresh Vite production build. Existing assistant-asset and bundle-size warnings remain. Read-only review found no actionable issues in the rotation or picker behavior.
