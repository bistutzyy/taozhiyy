# Homepage Cover Filmstrip

Approved in chat on 2026-10-30. The user chose the recommended filmstrip/viewfinder direction, explicitly removed poetry, and requested local preview only. No push, PR, merge, or deployment.

Keep all four existing real cover images and the homepage composition. Replace the compass overlay with a full-bleed image preview and a compact film-selection tool near the bottom. Desktop pointer hover and keyboard focus preview ready images without changing the applied cover. Clicking a thumbnail applies it and closes; a clear apply command can confirm the current preview. Closing or Escape cancels uncommitted preview. On mobile the same picker is available with a compact two-column thumbnail grid and direct tap selection.

Use restrained film perforations, frame numbers, fine viewfinder corners, and small image-led controls. No poem, compass, decorative orbs, large blurred illustration, auto-rotation, fake camera readings, or extra 3D engine. Keep homepage wordmark and surrounding content unchanged. Navigation exposes an icon-plus-label cover control on desktop and an icon with an accessible label on mobile, without crowding the existing avatar/network/music tools.

Persist only explicitly applied, validated cover indices. Preserve the currently displayed image until the next image is ready. Respect reduced motion and handle blocked storage and failed image loads without trapping the visitor behind the cover picker. Use a native modal dialog portalled outside the clipped hero for keyboard focus containment and reliable mobile interaction. Restore focus and body scrolling after close.

Verify the four choices, preview versus apply/cancel, persistence, slow/failed media, reduced motion, keyboard focus, mobile touch, background scroll locking, responsive bounds, real loaded images, and no poetry. Leave a local Vite URL for review.
