# Home Cover Session Refinement

**Goal:** Apply the requested first-visit cover rule, simplify cover controls, connect the console cover action, and record the release in the timeline.

**Design:** Preserve the accepted fan/quadrant desktop picker and mobile four-choice grid. Remove brightness editing and ignore old brightness preferences. New browsing sessions start at cover 1; later reloads in that tab choose a random cover. Read the session marker without mutation during React state initialization; mark the visit after mounting so StrictMode does not consume the first visit twice. A console cover button closes its modal before opening the homepage picker, navigating to `/?cover=select` from subpages. Keep the existing close icon and Escape action.

**Scope:** The real Bili endpoint currently has no successful production snapshot (`ready:false`). Existing verified video data must remain visible and honestly labelled. Add owner-scoped persisted attempt diagnostics (state, timestamp, allowlisted reason and optional numeric upstream code) to this existing cached GET so the next production attempt can explain its failure without SSH. Never expose raw errors, headers, response bodies, credentials or local paths. This is observability, not an upstream-access workaround. No firewall, credentials, or production environment changes.

## Tasks

- [x] Add failing tests for first-session cover 1, later random samples, blocked storage, read-only initialization, and console switch-cover wiring.
- [x] Implement session marker helpers in `main/src/components/cover-picker/coverState.js`, update `Hero.jsx`, remove brightness persistence from the active UI, and pass a simple `onApply(index, options)` callback.
- [x] Remove brightness controls/state/styles from `CoverFan.jsx` and `CoverPicker.jsx`; keep compact random/clean/apply commands and preserve modal lifecycle and transitions.
- [x] Wire `Navbar.jsx` and `SiteConsole.jsx` so the new cover action works both from home and subpages after console cleanup.
- [x] Add accurate 2026-11-01 timeline/article content and concise newest-first console updates. Do not describe pending Bili ingestion as successful automatic synchronization.
- [ ] Add sanitized backend attempt diagnostics, verify persistence/owner isolation/retained snapshots, and display accurate failed-sync notices without clearing known videos.
- [ ] Run focused Node tests, scoped lint, main/build production builds, and browser checks for fresh-session/refresh behavior, mobile grid, desktop fan, console handoff, focus, body scroll restoration, and overflow.
- [ ] Review the diff, commit, use protected-master PR validation, and verify the deployed release and public pages.

## Verification Commands

```powershell
node --test src/components/cover-picker/coverState.test.js src/components/cover-picker/CoverPicker.test.js src/components/site-console/siteConsole.test.js
npx.cmd eslint src/components/Hero.jsx src/components/Navbar.jsx src/components/site-console/SiteConsole.jsx src/components/cover-picker
npm.cmd run build
node tools/verify-mobile-home.cjs http://127.0.0.1:5203
node tools/verify-home-covers.cjs http://127.0.0.1:5203
```

Browser verification uses mocked API responses to avoid writes to production. Real production Bili checks use GET only. New session checks use a new browser context; reload checks keep sessionStorage and deterministic random samples. Storage failures fall back to cover 1.

**Frontend milestone:** 55 focused Node tests and seven release-content tests passed. Main/project build passed including 25 project-gallery tests; the build timeline production build passed. Browser checks passed for first cover/reload at 320/390/430/1440, home/subpage console handoff, picker behavior at eight viewports, blocked storage and image failure/recovery, Bili feed/error/fallback states at 390/1440, all four console themes at 1366x768, and bilingual 20-record timelines at 390/1366. Scoped lint has zero errors and existing custom-class warnings. Independent review and production verification remain required.
