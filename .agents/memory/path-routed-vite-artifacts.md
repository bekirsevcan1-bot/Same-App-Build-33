---
name: Path-routed Vite artifacts
description: Base-path behavior for Vite apps served behind Replit artifact path routing
---

For a Vite web artifact served below a path prefix, keep the HTML module entry and public asset references relative so Vite and the artifact proxy apply the prefix exactly once. Avoid manually prepending `BASE_URL` to public links or using injected root-relative development scripts when the proxy is path-routed.

**Why:** A manually prefixed module URL was resolved by Vite as `/prefix/src/main.tsx`, and manually prefixed manifest/icon links became `/prefix/prefix/...`; both caused blank previews or 404s.

**How to apply:** Use a relative `src="src/main.tsx"` and relative `href` values for files in `public`; verify the proxied URL and browser console after changing the artifact base path.