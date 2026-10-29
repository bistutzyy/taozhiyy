# Home Console Preview Implementation Plan

> **For agentic workers:** Use executing-plans for the tightly coupled navigation and dialog changes. Keep all work local; do not push or deploy.

**Goal:** Add a visitor-facing control panel next to HOME, with tactile controls, three fragment entrances, announcements, updates, a reserved lottery station, and quick links.

**Architecture:** Mount one React dialog through a portal from Navbar. Reuse its music state and existing cover-switch event. Keep public content in a small data module; do not connect owner APIs. Retain the homepage and existing lottery implementation. Use one dedicated stylesheet, existing react-icons, static screenshots of the actual destinations, and focus trapping with background scroll locking.

**Tech Stack:** React 18, react-router-dom, react-icons, CSS, Node test runner, Playwright with Edge.

## Tasks
- [x] Add failing content and integration contracts in `main/src/components/site-console/siteConsole.test.js`; run `node --test src/components/site-console/siteConsole.test.js` from main and verify missing functionality fails.
- [x] Add `consoleContent.js` and `SiteConsole.jsx` with semantic buttons, announcement/update tabs, real public destinations, a clearly reserved lottery position, copy feedback, music toggle, cover switch, and top/close controls.
- [x] Add `site-console.css` with a light rose/white/ice-blue palette, compact unframed sections, image entrances, 8px framed items, tactile buttons, responsive single-column layout, and reduced-motion support.
- [x] Integrate the control immediately after HOME in desktop and mobile navigation. Close mutually exclusive overlays, restore focus/scroll, and preserve route-specific navigation themes.
- [x] Unify homepage fragment 01 with the shared ExhibitCard presentation, retaining its video and destination; update the existing regression test to reflect the new requirement.
- [x] Verify the focused Node tests, Vite build, and Playwright screenshots at desktop/tablet/mobile sizes. Check tab switching, focus containment, Escape/backdrop close, clipboard, scroll locking, music state, correct hrefs, image loading, and no horizontal overflow.
- [x] Save a local commit containing only this feature; leave the unrelated build-time plan untouched. Launch a hidden local server on an available port and open the preview, without creating a PR or changing production.

## Acceptance
The panel opens from a real control after HOME, with visible clickable controls rather than text-only navigation. Both entry and close paths work with mouse and keyboard. The mobile menu can open the same panel. The three existing destinations remain unchanged. The lottery block has no draw request or misleading working draw button. Public UI never references `/app` or owner APIs. Existing homepage content remains reachable.

## Verification Record
- 23 focused Node tests passed, including existing hero/compass/image-state tests.
- Vite production build passed, retaining existing assistant-asset and bundle-size warnings.
- Browser checks passed at 1440x1000, 1920x1080, 1024x768, 768x1024, 390x844, and 320x740. Real music playback and desktop/mobile cover switching passed. Cross-page lottery scrolling and journal action destinations passed at desktop and mobile sizes.
- UI browser tests return valid 503 JSON for API calls because no local backend runs on port 8787. No production API write requests are made. The existing AI assistant has an unrelated JSON parsing error when opened without this test isolation; it does not affect the console controls.
- The full main test suite has four pre-existing failures: about mobile game-card rules, the Story editorial greeting expectation, and two owner-console blueprint expectations. Their source and tests are unchanged from origin/master. No merge or deployment is requested.
