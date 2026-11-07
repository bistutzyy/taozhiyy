# Original Media Traffic Reduction

Approved scope: preserve both sites, all original image URLs, original image bytes and the cover-picker design. Do not delete bucket objects or block external friend avatars.

- [x] Test and defer unused homepage covers until picker open, and defer two offscreen homepage image sources while preserving refs/layout.
- [x] Add a bounded Nginx cache for anonymous public image GET/HEAD requests only and verify the origin TLS certificate. Disable the cache for Range, authorization headers, queries and non-images; do not store non-200 responses.
- [x] Back up the active Nginx snippet before inserting one managed include. Validate configuration before reload and roll back if validation/reload fails.
- [x] Verify image MISS/HIT, byte hashes, query bypass and the upstream's own video Range response through an owner-password-authenticated session.
- [x] Build and check the frontend on desktop and mobile.
- [ ] Release the frontend through the protected-branch PR workflow.
- [ ] COS log capture and direct-object Cache-Control metadata changes need authenticated COS access; do not claim them complete from UCloud-only work.
