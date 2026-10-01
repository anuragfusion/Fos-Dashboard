# FOS Founder Dashboard (React)

React port of the FBSPL Founder's Operating System dashboard. See `context/pkg_react/SPEC.md`.

## Run

```bash
cp .env.example .env      # set N8N_URL and FOS_KEY (or VITE_USE_MOCK=true)
npm install
npm run dev               # http://localhost:5173
npm test
```

Mock mode without n8n: set `VITE_USE_MOCK=true` in `.env`. No backend needed.

## How the key stays out of the browser

- `.env` holds `FOS_KEY` **without** a `VITE_` prefix. Vite refuses to inline non-`VITE_` vars into the bundle, so it never reaches the client.
- The Vite dev server proxies `/fos-api/*` → `${N8N_URL}/webhook/fos-api/*` and injects `x-fos-key: ${FOS_KEY}` server-side (see `vite.config.ts`).
- The browser calls same-origin `/fos-api/app` and `/fos-api/take` — no key in the payload, no CORS from n8n needed for dev.

## Production auth

The dev proxy only runs under `npm run dev`. For any real deployment put proper auth (Cloudflare Access / Supabase Auth) in front of both the app and the API — out of scope here.
