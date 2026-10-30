# Project Reader And Silver Atlas

Approved in chat on 2026-10-30, initially as a local preview. After reviewing the preview, the user explicitly authorized production deployment on 2026-10-30. Publish through the protected master PR flow; preserve Cosmos as the default.

## Scope
Keep the existing project starfield, continuous browsing, bottom summary, catalogue, and all nine attributed projects. Add an explicit same-tab main-site home link. Replace only the central project-detail modal presentation with a full-viewport reading mode, with no floating outer card or large frame.

## Reader
Retain the native dialog for focus containment and Escape. Its full-width sticky toolbar has Back to Starfield (or Back to Catalogue for catalogue entries), a main-site home link, theme selection, and close. Closing restores the invoking control and does not reset the scene position, selected project, catalogue query, or catalogue scroll. Pause the scene and videos while appropriate.

Use a compact editorial project masthead: category, project title, summary, original author, and clearly differentiated source/docs/demo links. Keep a small real project image rather than a full-width first-screen screenshot. Content sections cover introduction, instructions, trial/demo, and attribution. Desktop has a sticky side index; mobile has a compact sticky section selector. Lazy-load detail media; never autoplay, load hidden iframes, request keys, or imply external demos are hosted locally.

## Themes
Keep Cosmos as the existing default and add Silver Atlas: cool silver-white surfaces, graphite type, muted rose and teal accents, fine coordinate rules, and a visible light 3D map. Both the scene and HTML surfaces change; this is not a CSS-only recolor. A two-option segmented theme control appears in the gallery and reader. Store a validated preference; blocked storage must not prevent use. Preserve scene resources and navigation on theme switches. No new animation loop or dependencies.

## Validation
Failing-first tests for reader structure, source safety, home links, and theme validation. Browser checks at desktop, tablet, mobile, and short landscape verify full-viewport bounds, no horizontal overflow, working theme controls, nonblank canvas pixels, moved camera, loaded image assets, bounded resources, paused background rendering, focus restoration, keyboard close, and responsive reader navigation. Keep the existing 500-project and reduced-motion checks. Build the standalone app and leave a local preview server running.
