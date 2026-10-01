# FOS Founder Dashboard — React build specification

Owner: Anurag (FBSPL AI/ML) · Audience of the product: the founders (MD, CEO)
Status of backend: live (n8n + Supabase/Postgres + Gemini agents). This spec is for the **frontend only**.

---

## 0. Package contents

| Path | What it is |
|---|---|
| `SPEC.md` | this document |
| `CLAUDE_CODE_PROMPT.md` | the prompt to paste into Claude Code |
| `contract/types.ts` | the exact JSON contract of the API — copy into `src/api/types.ts` |
| `mock/dashboard.sample.json` | a realistic payload for local dev without n8n (numbers are real, a few rows are illustrative) |
| `reference/current_app_reference.html` | the **working** single-file version of this dashboard. Every screen, copy line and formula below exists there. When this spec is unclear, the reference wins. |
| `reference/app_data.sql` | the SQL that produces the payload (read-only context; do not run from the frontend) |
| `n8n/FOS_API.n8n.json` | n8n workflow exposing the JSON API (import into n8n) |

---

## 1. Product principles (non-negotiable)

1. **Unknown ≠ green.** Missing data is shown as `n/r` (not reported) or "unknown" in a neutral/amber style. It is **never** rendered as `0`, never as "no issues", never green.
2. **Every number is traceable.** Each headline number has a "↗ Where this comes from" toggle explaining exactly how it was counted.
3. **Evidence over opinion.** Ticket and client rows open to *the line a named person wrote* (quote + name + role + date).
4. **Agents create and close tickets; humans don't.** There is **no close/edit button anywhere**. The only founder action is **"Take this"** (flag for founder attention).
5. **No invented money.** Revenue is not in any system. Show FTE only. "Revenue at risk" always reads **Cannot answer**. Never multiply FTE by a rate. Never add currencies together.
6. **Capped ranking.** "What needs you" shows at most **7** items.
7. **Complete days only.** Coverage/confidence is computed on the last *complete* shift day (`latest_data_day`), never on today (today is "in progress").

---

## 2. Architecture

```
React (Vite + TS)  localhost:5173
   │  GET  {API}/app    header x-fos-key   → DashboardData
   │  POST {API}/take   header x-fos-key   body {ticket_id} → {ok, ticket_id}
   ▼
n8n "FOS API" workflow (localhost:5678/webhook/fos-api/…)
   ▼
Supabase Postgres (tables, views; agents write tickets every 2h)
```

- The frontend **never** talks to Supabase directly and never contains SQL or DB keys.
- Data refreshes: on load, every **5 minutes**, on window focus, and right after a successful "Take this".
- Backend timing (for copy/UX): ingestion `:00`, creator `:20`, verifier `:35`, attention `:50`, every 2 hours.

### Env
```
VITE_FOS_API=http://localhost:5678/webhook/fos-api
VITE_FOS_KEY=<same secret as the n8n Header Auth credential>
VITE_USE_MOCK=false          # true => load mock/dashboard.sample.json instead of the API
```
Security note to surface in README: `VITE_*` values are visible in the browser bundle. Fine for localhost. Before anyone else uses it, put real auth in front (Cloudflare Access / Supabase Auth) — out of scope here.

---

## 3. Tech stack & structure

- Vite + React 18 + TypeScript (strict). React Router v6. No UI kit; plain CSS with CSS variables (tokens below) or CSS modules. Charts are hand-drawn **SVG** (no chart library needed). Optional: TanStack Query for fetching (or a small custom hook).
- No `dangerouslySetInnerHTML` anywhere. All server strings render as text nodes.

```
src/
  main.tsx, App.tsx, router.tsx
  api/
    types.ts            (copy of contract/types.ts)
    client.ts           fetchDashboard(), takeTicket(id); adds x-fos-key; timeouts; typed errors
    normalize.ts        Number() coercion, derived fields (see §5)
    mock.ts             loads mock json when VITE_USE_MOCK=true
  hooks/useDashboard.ts polling, focus refetch, error/loading state
  lib/
    dates.ts            dd(), dlong(), deadline(), relDue(), hoursSince(), ago()
    derive.ts           confidence, gapDays, reportDays, ranking helpers, client helpers
    derivations.ts      the "Where this comes from" texts (WHY map)
    labels.ts           type/domain/state labels
  theme/tokens.css, base.css
  components/
    Rail.tsx, TopBar.tsx, ConfidenceStrip.tsx, CoverageDetail.tsx
    Card.tsx, Tag.tsx, Kpi.tsx, Tabs.tsx, WhyToggle.tsx, Accordion.tsx, Table.tsx
    EvidenceBlock.tsx, ClosureSearch.tsx, AgentTrail.tsx, CaseFile.tsx
    TicketRow.tsx, TicketDetail.tsx, ClientRow.tsx, ClientDetail.tsx
    Sparkline.tsx, BarRow.tsx, NR.tsx (renders "n/r")
    AskPanel.tsx
  screens/
    brief/BriefScreen.tsx (+ TodayTab, WindowTab, RecurringTab)
    ClientsScreen.tsx, LedgerScreen.tsx, SourcesScreen.tsx, InboxScreen.tsx
  states/ Loading.tsx, ErrorState.tsx, Empty.tsx
```

Routes: `/brief` (default, `?tab=today|window|recurring`), `/clients` (`?tab=attention|growing|all|noreports`), `/ledger`, `/sources`, `/inbox`. Deep-linkable. Cmd/Ctrl+K opens Ask, Esc closes.

---

## 4. Design system

### Tokens
```
--blue:#002cce  --orange:#fc921f
--bg:#fafafc  --surf:#ffffff  --line:#e6e6e8  --rail:#f3f3f5
--ink:#221f1f  --ink2:#474444  --ink3:#6d6e71
--red:#d92d20   --red-bg:#fdf3f2
--amb:#a3620a   --amb-bg:#fff8ee
--grn:#0e8f55   --grn-bg:#f0f9f4
--blue-bg:#eef1fd
```
Font: `"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif`; body 14px/1.5; H1 25px; H2 18px; eyebrow 11px, letter-spacing .14em, uppercase, `--ink3`.

### Semantic colour rules
- Red = critical / contradiction / at risk / past deadline / no data at all.
- Amber = watch / attested-not-measured / unknown-but-important / still being reported.
- Green = closed on evidence / growing / stable **only when a line said so**.
- Blue = navigation, links, "flagged for you", needs review.
- `n/r` = italic `--ink3`, never coloured.

### Components (match the reference)
Card (12px radius, 1px `--line`), Tag (11px bold, pill 5px radius, bordered, tinted bg per colour), KPI strip (grid of cells separated by 1px lines), Tabs (segmented, active = blue filled), Accordion row (chevron rotates 90° when open), Evidence block (header "The line someone actually wrote", italic quote with left bar, meta line **Name · ROLE · EODR date**), Warn callout (orange left border), Note (light blue-grey box).

### Layout
240px left rail (sticky, full height) + main. Top bar sticky: Ask field (opens panel), `CONFIDENTIAL` pill (red), `LIVE` pill (blue), right side "MSD · Founder view". Confidence strip under the top bar. Content max-width ~1240px, 28px side padding. Responsive: below 1000px rail stacks on top, grids go 2-col/1-col.

---

## 5. Derived logic (exact rules)

Put all of this in `lib/derive.ts` and unit-test it.

- `dd(date)` → `"28 Sep"`; `dlong(date)` → `"Monday 28 September 2026"` (en-GB).
- `byDay` = map of `days` by `day`.
- `latest` = `latest_data_day`; `latestS = byDay[latest]`.
- `reportDays` = days with `claims > 0` and `day < today`.
- `gapDays` = days with `claims == 0` and `day < today` (pipeline gap → "No data at all").
- A matrix cell for day D is `n/r` if `claims(D)==0` **or** `D == today`.
- `open` = tickets with `status != 'closed'`; `pastDue` = open with `past_sla`; `founderQueue` = open with `needs_founder`; `recurring` = `event_count >= 2 || reopened`; `reopened` = `reopened == true`.
- `deadline(t)` = `opened_date + sla_days` days. `relDue(t)` (open only): `diff = today - deadline`; `>0` → red "Nd past"; `0` → amber "due today"; `<0` → green "in Nd".
- **Pipeline freshness:** `lastRun = max(freshness.teams_ingest, freshness.rnn_ingest)`; `stale = !lastRun || hoursSince(lastRun) > 6`.
- **Confidence:** `tlMiss = latestS ? max(0, expected.tl - latestS.tl_recv) : expected.tl`; `ratio = tlMiss / expected.tl`.
  `Low` if `stale || !latestS || ratio > 0.30`; else `Medium` if `ratio > 0.10 || gapDays.length > 0`; else `High`. Strip colour: Low red-tint, Medium amber-tint, High green-tint.
- **Confidence strip text:** "Built from **{Σ claims of reportDays}** claims across {n} reporting day(s) ({dates}). **{tlMiss} of {expected.tl} Team Leads** did not report on {dd(latest)} — those pods read **unknown**, not *no issues*." + " No data at all on {gapDays}." if any + " Pipeline last ran {ago}." if stale. If no latest: "No complete reporting day in the window. Everything on this screen is unknown."
- **Closure badge** (ticket): closed+evidence → green "Closed — evidence found"; closed other → neutral "Closed — {reason}"; `reopened` → red "Fix applied, did not work"; `needs_review` → blue "Needs review"; `still_open` → amber "Still being reported"; else neutral "No evidence either way".
- **Priority label:** `contradiction` → red "HIGH"/"Critical"; `review` → amber "MATERIAL"/"High".
- **Ticket title:** `Cap(type) — {account} · {subject_name}` (omit account part if null). Type label = replace `_` with space.
- **Evidence line** = `source.span ?? source.text`. If both null → neutral message "Source line not stored for this ticket (created before evidence pointers were added). The agent will re-check it against later reports."
- **Closure search** (open tickets): `still_open` → amber "Still being reported. The same issue appeared again on {last_seen}."; `needs_review` → amber "Needs review. {verify_note}"; else red-left "Found: nothing, in either direction. No later line closes it and no line contradicts it. The verdict is no evidence of closure — deliberately not the same claim as not done." Closed → green "Closed on evidence." + quote or rule + date.
- **Client owner:** `owner ?? (n_tls > 1 ? "{n_tls} TLs share this client" : "owner unknown")`.
- **Client state labels:** at_risk "At risk" (red), watch "Watch" (amber), growing "Growing" (green), stable "Stable" (green), mentioned "Mentioned, no status" (neutral), silent "Went quiet 14+ days" (blue), no_reports "No reports reach FOS" (red).
- **Money-signal caution:** if a client row has `state == 'watch'` and `state_type == 'money_signal'` show the amber callout: *"Read the line before acting. This came from a money signal. In insurance work "cancellation", "non-renewal" and "payment" usually describe the insured's policy, not the client leaving FBSPL — so it is Watch, not At risk."*
- **Domain tier:** `insurance_ops` → green "pipeline · traceable"; `msgs_window > 0` → amber "partial · Teams EODR"; else neutral "connected · silent". Domain display names: insurance_ops→Insurance operations, sales_calls→Sales calls, sales_marketing→Sales & marketing, qa→QA, hr→HR, ai_ml→AI / ML, accounts→Accounts & finance, training→L&D / training, admin_mis→Admin · MIS, admin_facility→Admin · facility, process_excellence_audit→Process excellence · audit, process_excellence_summary→Process excellence · summary; unknown → capitalised with spaces.
- **Backlog state:** fewer than 2 non-null readings → "single reading"; first == last → amber "frozen"; else "moving".
- **Matrix "Move" column:** last non-null minus first non-null (1 dp). For rows where up is bad (below85, near0, tickets opened) positive = red chip; for others positive = green chip; 0 → "flat"; <2 readings → "—".

---

## 6. Screens

### 6.1 Rail
Brand "FBSPL" + "FOUNDER'S OPERATING SYSTEM". Section "WHERE TO LOOK". Nav items (label / sub-label / badge):
- Brief / What needs me today / red badge = `min(7, open.length)`
- Clients / Who might leave, who is quiet / red badge = count of `at_risk` rows
- Ledger / What the agents are tracking / red badge = `pastDue.length`
- Sources / How much can I believe
- Inbox / Waiting for me / blue badge = `founderQueue.length`
Badges hidden when 0. Footer: "Live · {dd(today)}", "Built from Teams + RNN EODRs through the FOS pipeline. Tickets from {dd(start_date)}. Generated {generated_at in IST}."

### 6.2 Top bar + confidence
See §4 layout and §5 confidence. "Coverage detail ↓" toggles a table: Layer | Expected | Received on {latest} | Today so far — rows Team Leads (expected.tl, tl_recv, today_in_progress.tl), Umbrella Managers, Associates (VA) (expected "roster-free"). Below: "Last Teams ingest {ago} · last RNN ingest {ago} · newest claim {date}."

### 6.3 Brief
Eyebrow `BRIEF · {dlong(today)}`. H1:
- if pastDue: "{open} open item(s) — {pastDue} past their deadline with no closure evidence."
- elif open: "{open} open item(s), none past deadline yet."
- else: "Nothing is open on the board yet."
Lede: "Ranked items are capped at seven — the cap forces the ranking to be honest. Every item opens in place to the line a named person wrote. Where a pod did not report, this screen says unknown — it will not say no issues."
Tabs: Today / Last 5 days / Recurring.

**Today tab**
1. Three hero cards:
   - *Am I about to lose a client?* — big red number = at_risk client count; unit "clients at risk · {money.fte_at_risk} FTE"; line = first at-risk client "{company} — {reason} · {watch count} more on watch" (or "{n} on watch, none at risk"); link "Open the clients →" (navigates); Why toggle (text §7 `risk`).
   - *Is anyone hiding something from me?* — amber text "Not measured"; line "Suppression detector not connected — this is unknown, not zero."; Why "Why this is blank" (§7 `hide`).
   - *What did I ask for that never came back?* — big red = pastDue.length; unit "of {tickets.length} tickets past deadline"; line "No closure evidence in any later report"; Why (§7 `never`).
2. Secondary strip (3 cells): *Am I about to lose money?* → "{fte_at_risk} FTE" + "at risk · revenue is not in any system" (Why `money`); *People at exactly 100% utilisation* → `latestS.util_100` or `n/r` + "Attested, not measured · {latest}" (Why `util100`); *Defects recurring after a fix* → reopened count + accounts list or "None reopened yet" (Why `reopen`).
3. Two columns: left "What needs you — ranked, capped at seven" (sub: "Ranked by what changes if you act today: flagged for you first, then contradictions, then how long and how often it has repeated.") listing `open.slice(0,7)` as TicketRow accordions; empty state "Nothing ranked yet. Tickets appear here once the creator agent finds a signal on or after {start_date}." Right aside:
   - Card "What I am blind to": "{tlMiss} of {expected.tl} Team Leads did not report on {latest}. Their pods read unknown." + names joined with " · " + if gapDays: "No data at all: {dates}" + "Pipeline did not run or nothing was ingested. Treat as unknown."
   - Card "Only you can decide these": placeholder copy (process-rule proposals arrive in next phase; nothing decided for you). No buttons.

**TicketRow** (collapsed): rank square (1–3 red if contradiction, else blue-tint), title, tags: severity, "Owner: {name}", "Due {deadline}", relDue, "{n}-day chain" if event_count≥2, "flagged for you" if needs_founder. **Expanded** (TicketDetail): summary sentence ("Raised {opened} about {subject} on {account}. Owner: {owner} ({LEVEL}). Reported on {n} day(s); last seen {date}."), EvidenceBlock, "SEARCH FOR CLOSURE" + ClosureSearch, CaseFile if `agent_case` (What happened / Why it matters / What to change / Draft nudge (not sent) + verified evidence quotes + "N evidence item(s) dropped: quote not found verbatim" if >0), "AGENT TRAIL" list (`ts event — actor`, underscores → spaces), **Take this** button when `status != closed && !needs_founder`.

**Last 5 days tab**
- H2 "Five reporting days, side by side" + sub. Table: Measure | one column per window day (header `dd`, today suffixed "(today)") | Move. Rows: Team Lead reports received (of {expected.tl}) · Umbrella Manager reports (of {expected.um}) · Associate reports (volume) · Utilisation average % · People below the 85% target · Near-zero utilisation · People at exactly 100% · Tickets opened. Cells per §5.
- Note: "n/r means not reported that day. It does not mean zero. Today's column stays n/r until the day is complete." + Why (`matrix`).
- H2 "Utilisation, as a distribution": sub "The {util_avg}% average on {latest} sits between populations and describes none of them. {util_people} people reported a figure." Three bars (Exactly 100.0% / Below 85% target / Near zero), width = n / util_people, with captions; orange callout "Attested, not measured. Every utilisation figure here is typed by the reporter…".
- H2 "Client backlogs — which ones are actually moving": table Account | days | State; empty → "No account-level backlog figures in the window. This needs pending counts tagged with an account in the EODR extraction." + note.

**Recurring tab**: H2 "{n} thing(s) that repeat — and {m} fix(es) that did not hold" (or "Nothing has repeated yet"), list of `recurring` as accordions with tags HIGH/MATERIAL, "FIX APPLIED — NOT WORKING" (reopened) or "OPEN · STILL REPORTED", "{opened} → {last_seen} · {n} day(s)". Empty copy: "A ticket lands here when the same issue is reported on two or more days, or comes back after it was closed."

### 6.4 Clients
Eyebrow "CLIENTS · LAST 30 DAYS". H1 "{n} client(s) at risk ({fte_at_risk} FTE). {watch n} more on watch." (or "No client is at risk in the last 30 days."). Lede (see reference). KPI strip (5): At risk / Watch / Growing / Went quiet 14+ days / No reports reach FOS — each shows count from `clients.summary` + "{fte} FTE".
Tabs:
- **Needs attention** = rows where state ∈ {at_risk, watch, silent}
- **Growing** = state growing
- **All named** = all rows
- **No reports reach FOS** = sub "{n} clients ({fte} FTE) have never been named in any EODR that reaches FOS. The teams below serve them — their reports are not in the pipeline." + table Team | Clients | FTE | Largest (from `no_reports_by_team`).
Client table columns: Client | Team | FTE | State (tag) | Owner | Latest (`{reason} · {state_date}` or `last named {last_mention}`). Row expands to ClientDetail: evidence box "The line that set this state" (quote + `{type} · {reason} · {date}`) or text for silent ("Nobody has named this client in an EODR for {days_silent} days. That is unknown, not stable.") / mentioned ("Named in reports, but no line states how the client is doing."); money-signal caution (§5); "LAST 30 DAYS" counts sentence; "WHO OWNS IT" `{owner} · team {teams} · {fte} FTE (ERP)`.
Footer note: "Client names in reports are matched to ERP companies automatically ({matched_mentions} mentions matched). {needs_confirm} names match more than one company and wait for a human to confirm; {unmatched_mentions} mentions did not match any ERP client — internal work, abbreviations, or names the matcher missed."

### 6.5 Ledger
Eyebrow "LEDGER · {n} TICKETS SINCE {start_date}". H1 "The agents opened {n} ticket(s). {pastDue} are past deadline with no closure evidence." Lede about agents-only and "no evidence of closure ≠ not done". KPI strip (5): Tickets opened · Past deadline, no evidence (red) · Fixed and still broken (red, reopened) · Closed on evidence (green) · Simply unknown (amber = open, not past SLA, verify null/unverified/needs_review). Red callout "Every row opens…". Table: Ref (`T-{id}` blue bold) | Ticket (title + "{opened} · subject {name}") | Owner (+ level) | Priority | Deadline (`dd` + relDue) | Closure evidence (badge). Clicking a row toggles a detail row with sections: WHERE THIS TICKET CAME FROM ("Opened by the creator agent on {date} from a/an {type} signal on {account}."), THE FINDING UNDERNEATH IT (EvidenceBlock), THE SEARCH FOR CLOSURE EVIDENCE (ClosureSearch), DEADLINE ("Opened {date} + {sla}-day SLA = {deadline}. Today is {today}." + if past: "That is past the deadline set by the ticket rule, not by a target this dashboard invented."), AGENT TRAIL. Empty: "The creator agent has not opened any ticket since {start_date}."

### 6.6 Sources
Eyebrow "SOURCES · PROVENANCE AND COVERAGE". H1 "{live} of {domains.length} reporting functions is/are fully in the pipeline. That is why confidence reads {conf}." KPI (3): In the pipeline / Partial / Connected, silent this window. Note: "This table lists every Teams channel marked as a reporting channel. A function with no channel at all does not appear here — tell the system which functions are expected so their absence becomes a visible gap." (Do **not** hardcode "no feed" functions.)
Money section (two cards):
- **From the pipeline** (green tag "pipeline · traceable"): "Revenue at risk, by named account" → **Cannot answer** + "The EODR stream names accounts at risk but carries no contract value for any of them."; "FTE by client state (ERP)": at risk / watch / growing / no-reports / total; "Clients at risk, named" list with quotes; "Money figures reported in EODRs (not reconciled)": each `currency_lines` item as quote + "{sender} · {account} · {date}"; footer "Shown as written. Currencies are never converted or added up."
- **Manual entry** (amber tag "manual · not pipeline-fed"): "No manual figures are connected yet… never summed with the pipeline column."
Table "Functions and the honest status of their feed": Function | Teams | Tier | Messages in window | Last message.
Table "What I am blind to": Day | TL reports received ("{recv} / {expected}", today → "in progress", no data → n/r) | Missing | Read (today "Day not complete"; no data → red tag "no data — pipeline gap"; full → "Complete"; else "Never complete").

### 6.7 Inbox
H1 "{n} ticket(s) flagged for your attention." or "Nothing is waiting for you." Lede explains triggers (past SLA while still reported, 3+ days, or "Take this"). List of founder tickets as TicketRow.

### 6.8 Ask panel (slide-over, right, 560px)
Opens from top-bar field or Cmd/Ctrl+K; overlay click / Esc / × closes. Contains a text input (Enter → message: "Free-text questions need the Ask agent, which is not connected yet. The questions below are answered from live data.") and 5 deterministic questions, each rendering a verdict chip (YES green / NEEDS YOU red / CANNOT ANSWER amber) + one-line answer + bullet list + "← Other questions":
1. What did I ask for that never came back? → pastDue list (`T-id · title · owner`).
2. Which Team Leads did not report on the last complete day? → `missing_tl_latest`.
3. Show me utilisation as a distribution, not an average → latestS numbers + "attested, not measured".
4. Which clients are at risk right now? → at_risk rows (`company — reason · fte FTE · date`).
5. What is my revenue at risk this quarter, by named account? → always CANNOT ANSWER: "Contract value is not in the pipeline, so any number here would be invented."

### 6.9 "Take this"
Button (blue) inside open ticket detail when allowed. On click: disable, `POST {API}/take {ticket_id}`, then:
- `ok:true` → toast "Ticket #{id} flagged for founder attention. The attention agent builds the case file on its next run (every 2 hours)." and refetch.
- `ok:false` → toast "Nothing changed — it may already be flagged, closed, or outside the active board."
- error → toast with retry. Never optimistic-close anything.

---

## 7. "Where this comes from" texts (WHY map)
Use these verbatim (fill placeholders):
- `risk`: "Counted: ERP clients whose latest status line in the last 30 days is at risk — client-health cancellation, cancellation risk, work moving in-house, POC leaving, or automation risk. Report names are matched to ERP companies; FTE comes from the ERP deal hierarchy. Money-signal cancellations are excluded: in insurance work they usually describe a policy, not the client."
- `hide`: "Not measured yet. This needs the suppression detector (associate raised it, the layer above did not carry it up). A naive account-level matcher flagged 91–98% of cases and was rejected, so this card reads "not measured" instead of a false 0."
- `never`: "Counted: open tickets whose SLA (opened date + SLA days) has passed and that have no closure evidence yet. Closure needs a later "resolved" claim or an agent-verified verbatim quote. Tickets start from {start_date}."
- `money`: "No system holds billing rates or contract values, so revenue at risk cannot be computed and is never estimated. FTE is the only money unit the pipeline supports: the sum of ERP FTE for clients currently at risk."
- `util100`: "Counted on {latest}: people whose utilisation for the day is exactly 100.0 (one number per person, averaged across RNN and Teams). This is a typed field — attested, not measured."
- `reopen`: "Counted: tickets that were closed on evidence and then the same issue came back (a linked "#2" ticket was opened)."
- `matrix`: "Each cell is counted from the claim table for that day. A day with no claims at all reads n/r (not reported) — never 0. Team Lead and UM counts only include people on the reporting_edge roster ({tl} TLs, {um} UMs)."

---

## 8. States & errors
- **Loading:** skeleton cards; keep previous data visible during refetch with a small "Refreshing…" indicator.
- **API error / 401 / CORS / network:** full-page ErrorState with the message, "Retry", and hints: check `VITE_FOS_API`, `x-fos-key`, n8n workflow active, Allowed Origins. Never show fake/cached numbers as live without a "stale" banner (show "Showing data from {generated_at}" if a refetch fails but old data exists).
- **Stale data:** if `generated_at` older than 15 minutes (client clock) show an amber banner.
- **Empty board:** all screens must render with `tickets: []`, `clients.rows: []`, all-zero `days`.

## 9. Security rules
- No `dangerouslySetInnerHTML`, no `eval`, no `new Function`. Server text is data only.
- Only render hrefs you build yourself; no server-provided URLs.
- API key only in `.env` (never committed; add `.env` to `.gitignore`, ship `.env.example`).
- Timeout fetches at 20s; handle non-JSON responses.

## 10. Acceptance checklist
1. `VITE_USE_MOCK=true npm run dev` renders every screen from `mock/dashboard.sample.json` with zero console errors.
2. With the API: all numbers equal the reference page for the same payload (open `reference/current_app_reference.html` after replacing `__DATA_JSON__` with the payload to compare).
3. `n/r` appears for 23–25 Sep and today in the matrix; never `0`.
4. Confidence reads Low/Medium/High per §5 given the payload.
5. Hostile strings (`<script>`, `<img onerror>`, `$&`, very long text) in any field render as text; no layout break (long words wrap).
6. "Take this" flags a ticket (verify in Ledger/Inbox after refetch); it is hidden for closed and already-flagged tickets.
7. No button anywhere closes or edits a ticket.
8. Cmd/Ctrl+K opens Ask, Esc closes; deep links `/clients?tab=noreports` work.
9. Unit tests (Vitest) for `lib/derive.ts` and `lib/dates.ts` cover every rule in §5, including: confidence thresholds, relDue boundaries, n/r cells, closure badge precedence, backlog states, owner fallback.
10. Lighthouse accessibility ≥ 90 (buttons are buttons, rows are keyboard-toggleable, focus visible).

## 11. Out of scope (show honestly, don't fake)
Suppression detector, deadline-based action ledger (owner + deadline extraction), manual money entries, process-rule Approve/Defer, free-text Ask (LLM), auth/SSO, multi-user. Each has its placeholder copy above.

## 12. Backend facts the UI must not contradict
- Tickets: fingerprint = type|subject|account; one issue = one ticket; recurrence bumps `event_count`/`last_seen_date`; re-appearance after close opens a linked `#2` ticket (`reopened=true`).
- Closing: only the verifier agent, only with evidence (later "resolved/closed/completed" claim, or an LLM verdict whose quote was verified verbatim in SQL). No stale auto-close.
- Attention agent flags founder when past SLA and still reported, or reported on 3+ days; builds a case file with verified quotes; drafts a nudge but never sends it.
- Client state = latest status-bearing line in 30 days; only client-health cancellation / cancellation-risk / in-house move / POC exit create tickets. Money-signal "cancellation/payment" is Watch (usually the insured's policy).
- Shift date: report posted before 10:00 IST counts for the previous day.
- ERP has no billing/pricing data.
