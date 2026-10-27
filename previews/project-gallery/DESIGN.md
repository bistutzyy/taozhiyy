# Digital exhibition preview

Approved direction (2026-10-28): silver-white and graphite architecture with a
small coral accent. Replace the miniature garden, not just its colors. Keep
the existing catalogue, project details, screenshot assets, and camera controls.
Local preview only; no production route, deployment, or remote Git changes.

Implementation sequence:
1. Extend browser verification to require neutral silver surface colors.
2. Replace the circular platform, arch, benches, plants, and brass poster stands
   in src/scene.js with staggered full-height exhibition walls, aluminum edges,
   real screenshot displays, and a rectangular architectural floor.
3. Add an isolated digital theme stylesheet for graphite typography, neutral
   controls, coral selection indicators, and unobstructed reading surfaces.
4. Run npm test, npm run build, and tools/verify.cjs. Inspect desktop/mobile
   screenshots, project textures, focus transitions, and canvas pixels.
5. Save a local Git checkpoint and open the loopback preview for design review.

Do not add neon effects, decorative particles, seasonal objects, external demo
APIs, or new dependencies. Preserve reduced-motion and WebGL fallback behavior.
