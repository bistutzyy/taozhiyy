# Home Cover Screening Room

Approved in chat on 2026-10-31. The user rejected the heavy mechanical dial and approved a small explorable screening scene instead. Local preview only; do not push, merge or deploy.

Keep four existing cover images, the homepage shell and wordmark. Replace the dial with four offset floating image slides, a small illustrated projector and a compact functional control bar. Use translucent white/charcoal surfaces, fine borders and peach/mint accents drawn from the site. No large dark disk, compass, radial menu, poetry, starfield or seasonal backdrop. The existing sharp cover image fills the viewport behind the tool. Use flat CSS transforms and Lucide object details; no 3D engine or generated bitmap is needed.

Image slides have stable dimensions and slight staggered rotations; hover/focus lifts them without silently changing selection. Click/tap selects a ready cover for full-screen preview. Failed slides expose retry controls and loading status. The projector's lens lights and its reels briefly run when a picture is selected or applied. The projector and control bar share one explicit apply action; clicking applies the selected index and brightness only after a short transition. Closing or Escape cancels pending confirmation and all edits.

Provide a shuffle icon that chooses a different ready image, a labelled brightness slider (70-115%, default 100) with reset, and a clean-view icon. Clean view hides the header, slides, projector and controls, leaving the selected picture and one return button; Escape first returns to editing, then closes. On apply, persist validated cover and brightness safely, update the homepage image without changing text brightness, and remember both on reload. Preview/shuffle/brightness changes never write storage. Respect blocked storage and reduced motion.

Use a fullscreen native dialog outside the clipped Hero, preserving focus, inline body styles and scroll position exactly. Layout should stay within desktop, tablet, phone and short-landscape viewports, including 320x568 and 500x400, without horizontal scrolling or cropped status text. Keep existing fallback/retry safeguards. Kill pending animations on close; no automatic carousel or idle heavy rendering.

Verify real rendered images, all controls, random exclusion/readiness, apply versus cancel, clean mode keyboard/focus, brightness persistence, reduced motion, slow/failed assets, body restoration and responsive screenshots. No backend or server changes.
