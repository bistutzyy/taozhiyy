# Homepage Aperture Dial Preview

Approved in chat on 2026-10-31 after the filmstrip preview was rejected as too conventional. Local preview only; no push, PR, merge or deployment.

## Experience
Replace the bottom filmstrip with a centered optical selector over a sharp, full-screen preview of the existing four covers. Four small image frames orbit a finely engraved dark-metal ring. A fixed peach marker and restrained metal highlights make it feel like a camera control, without fake camera readings, poetry, decorative orbs or new images.

Dragging the outer ring rotates the four frames. Use the installed GSAP Draggable and InertiaPlugin for rotational input and short inertia, snapping to ready covers in 90-degree steps. Keep thumbnail pictures upright while rotating. Clicking a thumbnail previews and aligns it; keyboard arrows on the accessible dial select the adjacent ready cover. There is no automatic rotation. Clicking the central image confirms. Closing or Escape cancels.

Confirmation runs one short mechanical shutter close/open animation, then applies the preview through the existing Hero callback. Reduced motion applies immediately. While committing, prevent duplicate confirmation; closing or Escape cancels any pending callback. Preserve native modal focus/scroll restoration, saved cover handling, image readiness/retry and previous-image crossfade. Loading and failed covers cannot be applied and have truthful statuses with retry icons.

## Layout
Use a restrained instrument layout with a small header, centered circular control, frame count and status below. The dial size is constrained by both viewport width and available height; short landscape remains usable without scrolling. Four image buttons orbit the ring with stable dimensions and comfortable touch targets. All imagery comes from the current cover assets. No 3D engine is needed for this flat mechanical control.

## Verification
Test angular snapping, wraparound, unavailable covers, keyboard and pointer rotation, preview versus apply, no accidental apply after drag, shutter timing/cancellation, persistence, fallback/retry, blocked storage, reduced motion, focus containment and exact scroll restoration. Capture desktop/mobile/landscape screenshots and validate the control stays within viewport bounds. Preserve the existing homepage content and run the main Vite build and focused regression tests.
