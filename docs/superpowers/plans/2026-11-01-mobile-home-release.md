# Homepage Cover and Mobile Release Plan

**Goal:** Deploy the approved irregular desktop four-panel cover picker with random homepage entry and focused mobile improvements.

**Design:** Desktop retains the folding fan and the four dim image regions. Each fresh homepage mount randomly chooses one of the four existing wallpapers without restoring a fixed cover; brightness is still remembered. Below 768px the same picker becomes a simple 2x2 image grid with direct selection, no fan decorations or fan reveal. Mobile navigation omits the console, while desktop keeps it. Bili cards use two columns on phones with the original proportions. Friends comments keep the winter design but use compact avatars, shallow reply indentation, wrapping metadata/URLs and accessible actions/emoji.

**Architecture:** Reuse current cover readiness, retry, brightness and modal lifecycle. Add scoped mobile CSS rather than alter the seasonal theme. Separate Bili/comments work into disjoint files; no backend, secrets or infrastructure changes.

- [ ] Add failing assertions for random entry, mobile cover shape, and console exclusion.
- [ ] Implement random Hero initialization, rectangular mobile picker and console removal.
- [ ] Implement and test two-column mobile Bili cards and compact friends comments.
- [ ] Verify desktop four-panel behavior and mobile 320/390/430 layouts, touch/keyboard, image errors, emoji/replies and absence of overflow using Playwright screenshots.
- [ ] Run focused tests, lint, full frontend/project packaging build and scoped review.
- [ ] Commit/push the release branch, create and merge a protected-master PR after checks, then verify the pull deployment on the public website.

**Validation commands:** `node --test src/components/cover-picker/*.test.js` (expand paths in PowerShell), scoped ESLint, `npm run build` in `main`, plus `tools/verify-home-covers.cjs`, `tools/verify-cover-quadrants.cjs` and the new mobile checks using Playwright/Edge. Production verification is read-only; do not submit comments or alter user data.
