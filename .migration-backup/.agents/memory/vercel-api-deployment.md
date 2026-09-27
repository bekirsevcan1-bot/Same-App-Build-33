---
name: Vercel API deployment
description: Constraint for the separately deployed Usta Cepte Vercel frontend and Replit API.
---

The Vercel frontend must be built with a live `VITE_API_URL`, and the corresponding API deployment must have a successful production build before browser login can work. An unpublished Replit API domain returns a platform 404 (“This app isn’t live yet”), which appears to the frontend as a fetch failure.

**Why:** The frontend and API are separate deployments; a successful Vercel static build does not make the API available.

**How to apply:** Publish the API artifact first, set its public URL as Vercel’s `VITE_API_URL`, keep the Vercel origin in API `CORS_ORIGINS`/allowed origins, then redeploy the frontend.