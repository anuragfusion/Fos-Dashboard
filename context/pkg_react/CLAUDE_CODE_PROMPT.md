# How to use this package

## A. Backend first (n8n, ~5 min)
1. n8n → Import from file → `n8n/FOS_API.n8n.json`.
2. Credentials → New → **Header Auth**: Name `x-fos-key`, Value = a long random string (e.g. `openssl rand -hex 32`). Select it on **both** Webhook nodes.
3. On both Webhook nodes, Options → **Allowed Origins (CORS)** = `http://localhost:5173` (already set; confirm).
4. Postgres node credential: re-select if n8n shows a warning.
5. **Activate** the workflow.
6. Test:
   ```bash
   curl -s -H "x-fos-key: <secret>" http://localhost:5678/webhook/fos-api/app | head -c 400
   curl -s -X POST -H "x-fos-key: <secret>" -H "Content-Type: application/json" \
        -d '{"ticket_id": 0}' http://localhost:5678/webhook/fos-api/take      # -> {"ok":false,"ticket_id":0}
   ```

## B. Frontend with Claude Code
Create an empty folder, copy this whole package into `./context/`, open Claude Code there, and paste:

---
You are building the **FOS Founder Dashboard** as a React app.

Read these first, fully, before writing code:
- `context/SPEC.md` — the specification (source of truth for behaviour, copy and formulas)
- `context/contract/types.ts` — the exact API JSON contract
- `context/reference/current_app_reference.html` — a working single-file implementation of the same dashboard (vanilla JS). Port its behaviour, copy and styling to React; when SPEC and reference differ, follow SPEC.
- `context/mock/dashboard.sample.json` — sample payload

Build:
1. Vite + React 18 + TypeScript (strict) + React Router v6 + Vitest. Plain CSS with the tokens in SPEC §4. No UI library, no chart library (SVG by hand).
2. Folder structure exactly as SPEC §3. Copy `contract/types.ts` to `src/api/types.ts`.
3. `src/api/client.ts` reading `VITE_FOS_API`, `VITE_FOS_KEY`, `VITE_USE_MOCK` (mock loads the sample json). Header `x-fos-key`. 20s timeout. Typed errors.
4. `src/lib/derive.ts`, `dates.ts`, `derivations.ts`, `labels.ts` implementing SPEC §5 and §7 exactly, with Vitest unit tests for every rule.
5. All screens in SPEC §6 (Brief with 3 tabs, Clients with 4 tabs, Ledger, Sources, Inbox, Ask panel, Take this), plus loading/error/stale/empty states from §8.
6. Security rules in §9 (no dangerouslySetInnerHTML anywhere).
7. `.env.example`, `.gitignore` (includes .env), README with run steps and the auth warning.

Work in this order and show me progress after each step: (1) scaffold + types + api client + mock mode, (2) derive/dates + tests passing, (3) layout (rail, top bar, confidence strip, coverage detail), (4) Brief, (5) Ledger, (6) Clients, (7) Sources + Inbox, (8) Ask panel + Take this, (9) states, a11y pass, run the SPEC §10 checklist and report results.

Do not invent data, do not add close/edit actions on tickets, never render missing values as 0.
---

## C. Run
```bash
cp .env.example .env    # fill VITE_FOS_API=http://localhost:5678/webhook/fos-api and VITE_FOS_KEY
npm install
npm run dev             # http://localhost:5173
npm test
```
Mock mode without n8n: set `VITE_USE_MOCK=true`.

## D. Comparing against the reference page
`reference/current_app_reference.html` has three placeholders. To view it with any payload, replace `__DATA_JSON__` with the JSON (escape `<` as `\u003c`), `__BASE_ATTR__` and `__BASE__` with an empty string, then open it in a browser.
