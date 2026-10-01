# Founder OS (FOS) — open work items

Exported from Plane project **Founder OS (FOS)** on 29 Sep 2026. Contains every item not yet marked Done: **17 build items** (6 urgent, 11 high) and **8 founder decisions** (2 urgent). Items are sorted by priority, then by ticket number.

## Context for whoever builds this

- **Spec vs. what exists.** The tickets were written against a Next.js app with new migrations `0032`+ (the "phase-10-evidence-layer" handoff). The system actually running today is:
  - **Frontend:** React + Vite app (`fos-dashboard`) with Brief, Clients, Ledger, Sources and Inbox screens.
  - **API:** n8n webhooks `GET /webhook/fos-api/app` (one big SQL → JSON) and `POST /webhook/fos-api/take`, protected by an `x-fos-key` header.
  - **Database:** Supabase Postgres. Main tables: `messages`, `extractions`, `claim` (has `source_span`, `data_tier`), `task_ticket`, `ticket_event`, `person_registry`, `reporting_edge`, `client_alias`, `client_master`, `deal_hierarchy`; view `client_health`.
  - **Ingest:** live Teams + RNN EODRs through n8n, running daily.
- Decide whether to build the evidence layer as specified or adapt the tickets to the current stack before starting.
- **Already Done in Plane:** FOS-10 live ingest, FOS-16 overdue badge, FOS-17 Brief, FOS-18 Ledger, FOS-19 Sources.
- **Security note:** 29 public tables in Supabase have Row Level Security off (including `task_ticket`, `ticket_event`, `client_alias`, `reporting_edge`).

## Summary

| # | Title | Priority | State |
|---|---|---|---|
| FOS-1 | Data Model - Create migrations 0032 to 0035 for the evidence layer schema | Urgent | Todo |
| FOS-2 | Evidence Spine - Capture the verbatim span at parse time | Urgent | Todo |
| FOS-3 | Evidence Spine - Make evidence survive the retention purge | Urgent | Todo |
| FOS-12 | Live Ingest - Give coverage a real, effective-dated denominator | Urgent | Todo |
| FOS-21 | Guardrails - Fail the build on a figure with no evidence path | Urgent | Todo |
| FOS-22 | Guardrails - Fail the build on a secret or on personal content | Urgent | Todo |
| FOS-4 | Evidence Spine - Serve one provenance record by key | High | Todo |
| FOS-5 | Evidence Spine - Label every figure with its tier | High | Todo |
| FOS-6 | Evidence Spine - Show a dash where no evidence exists | High | Todo |
| FOS-7 | Derivations - Define a derivation without storing its answer | High | Todo |
| FOS-8 | Derivations - Show every row a derivation counted | High | Todo |
| FOS-9 | Derivations - Require a stated caveat on every derivation | High | Todo |
| FOS-11 | Live Ingest - Ingest RMM error data with provenance | High | Todo |
| FOS-13 | Action Ledger - Extract actions from the report into a tracked table | High | Todo |
| FOS-14 | Action Ledger - Detect closure evidence in later reports | High | Todo |
| FOS-15 | Action Ledger - Surface actions issued with no written reason | High | Todo |
| FOS-20 | Inbox Surface - Build the Inbox | High | Todo |
| FOS-23 | Decision - Decide who else gets access: MSD only, or a company view with no Money | Urgent | Backlog |
| FOS-25 | Decision - Decide whether uploaded contracts, financials and PII may be sent through the model | Urgent | Backlog |
| FOS-24 | Decision - Decide whether an action may be issued without a written reason | High | Backlog |
| FOS-28 | Decision - Name the source of truth and cadence for revenue data | High | Backlog |
| FOS-26 | Decision - Mandate the single-EODR migration and name who enforces submission compliance | Medium | Backlog |
| FOS-27 | Decision - Hand over the 10 to 15 standard MBP questions as the acceptance suite | Medium | Backlog |
| FOS-29 | Decision - Approve the escalation rule and remediation verified for QA closure | Medium | Backlog |
| FOS-30 | Decision - Confirm the six-month scope and the team | Low | Backlog |

## Build items

### FOS-1 · Data Model - Create migrations 0032 to 0035 for the evidence layer schema

**Priority:** Urgent · **State:** Todo

> **Current status (checked 29 Sep):** Not started: none of `evidence_spans`, `evidence_tiers`, `derivation_defs`, `actions`, `action_outcomes`, `submitter_registry` exist in the database.

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Requirement

Five new tables and one new column, numbered `0032` onward, as up and down pairs.

| Migration | Contents |
| --- | --- |
| `0032` | `evidence_spans` (the provenance record) and `evidence_tiers` (the five tiers) |
| `0033` | `derivation_defs` (the counting rules) |
| `0034` | `actions` and `action_outcomes` |
| `0035` | `submitter_registry` |
| - | New column on `parsed_reports` |
| - | Founder-only views following the `0031` pattern |

#### Acceptance criteria

- All five tables and the new column exist as specified in section 3 of the handoff.
- Each migration has an up and a down pair.
- `python verify_migrations.py` passes in both directions, as the existing repo convention requires.
- Every new view uses `WITH (security_invoker = true)` with anon revoked, authenticated granted SELECT, and no service\_role grant.
- `outcome` on `action_outcomes` is a CHECK on one column, so adding a value later is a cheap migration.

#### Note

This item is not one of the 21 stories in section 5 of the handoff - the story index begins at A1 and assumes the tables exist. The week-one gate requires these migrations plus a passing `verify_migrations.py` in both directions, so it is raised separately to keep that deliverable tracked.

---

### FOS-2 · Evidence Spine - Capture the verbatim span at parse time

**Priority:** Urgent · **State:** Todo

> **Current status (checked 29 Sep):** Partly there: `claim.source_span` exists but is filled on only ~32% of claims (since 21 Sep).

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want every figure the system extracts to keep the exact sentence it came from, so that when I disagree with a number I am disagreeing with a specific person's specific words rather than with a database.

#### Why this is new work

`parsed_reports` (migration `0008`) stores `tasks_planned`, `tasks_completed`, `volume_received`, `escalations_count`, `sla_status`, `tat_status` and three free-text blobs (`blockers`, `escalation_notes`, `additional_notes`). It stores what the number was. It does not store the sentence that said so, which section of which report it was in, or who wrote it.

Across all 31 existing migrations there is no column holding a verbatim quoted span, and none holding a resolvable link back to the source Teams message or Outlook mail. `raw_reports.source_reference` carries the column comment "Opaque external message/thread id used for de-duplication. Never a mailbox address or credential." - a de-duplication handle, not a link.

#### Acceptance criteria

- Every figure extracted by the n8n pipeline writes an accompanying evidence span into `evidence_spans`.
- The span holds the verbatim sentence, the report and section it came from, the submitter, and the time it was written.
- The span is written at parse time, in the same pipeline pass as the extraction.
- The quote stored contains the figure that was extracted from it.

#### Dependency

Every surface story depends on this one. Build it before any surface.

#### Governing rule for the phase

Every figure rendered anywhere in the product resolves to exactly one of three things, and the UI states which:

1. **A source line** - the figure is one sentence, written by one named person, in one identified report, at a known time. Shown verbatim.
2. **A derivation** - the figure is counted or computed from lines. The panel shows the counting rule, every row counted, and what the rule could be getting wrong.
3. **A dash** - neither can be produced honestly, so no number is shown. `-` is a valid, shippable answer and must not be replaced with an estimate.

A fourth option - a number with no path back - is a defect of the same severity as a wrong number.

---

### FOS-3 · Evidence Spine - Make evidence survive the retention purge

**Priority:** Urgent · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want a source line captured months ago to still resolve with its verbatim quote today, so that the evidence layer does not quietly stop working on a schedule.

#### The problem

Migration `0025` creates `purge_expired_report_data()`, which sets `raw_reports.raw_text = NULL` once a row passes `retention_purge_at`. That is correct data minimisation and should stay. But it means any evidence layer that quotes from `raw_reports.raw_text` at read time will go dark on a schedule - the founder clicks a figure in November and the source line is gone, silently, because a cron job did its job.

#### Acceptance criteria

- The evidence layer stores its own immutable quoted span at parse time, in `evidence_spans`, not by reference to `raw_reports.raw_text`.
- `evidence_spans` has its own retention rule, set deliberately rather than inherited from `raw_reports`.
- A span captured before a purge still resolves with its verbatim quote intact after `purge_expired_report_data()` has run.
- `purge_expired_report_data()` continues to null `raw_reports.raw_text` as it does today - this story does not weaken the purge.

#### Week-one gate

A span survives a simulated purge with its quote intact.

---

### FOS-12 · Live Ingest - Give coverage a real, effective-dated denominator

**Priority:** Urgent · **State:** Todo

> **Current status (checked 29 Sep):** Related gap: 6 TL/UM people in `person_registry` have empty `emp_id` and 4 people reporting as TL are missing from `reporting_edge`, so coverage undercounts.

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want coverage to be measured against who was actually expected to report on a given date, so that the percentage means something as the team changes.

#### Acceptance criteria

- The expected-submitter count comes from `submitter_registry` and is effective-dated, so a historical date uses the roster as it was then.
- Coverage is expressed as received over expected for the date in question.
- A received count exceeding the expected count is flagged as a registry gap rather than clamped to the expected figure.
- Coverage is allowed to read below 100% - for example 25 of 31 - and the Brief surfaces the missing submitters as a finding rather than assuming completeness.

#### Week-one item

Built in week one alongside A1 and A2.

---

### FOS-21 · Guardrails - Fail the build on a figure with no evidence path

**Priority:** Urgent · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Requirement

A CI gate. A rendered figure with no evidence path is a defect of the same severity as a wrong number, and this makes that enforceable.

#### Acceptance criteria

- CI fails the build when any rendered figure has no evidence path.
- The evidence audit prints its assertion count rather than showing a green tick.
- Every source-line panel's quote is asserted to contain the figure shown above it.
- The audit covers all four surfaces.

---

### FOS-22 · Guardrails - Fail the build on a secret or on personal content

**Priority:** Urgent · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Requirement

A CI gate covering credentials and personal material.

#### Acceptance criteria

- CI fails the build if any credential or `.env` content appears in any artifact.
- CI fails the build if any MSD personal, health or Jyotish material appears in any artifact.
- The scan covers committed code, migrations, fixtures and generated output.

---

### FOS-4 · Evidence Spine - Serve one provenance record by key

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want clicking any figure to open the one provenance record behind it, so that the path from number to source is a single lookup rather than a search.

#### Acceptance criteria

- Every figure rendered on any surface carries an evidence key.
- The key resolves to exactly one provenance record.
- The provenance record returns the verbatim quote, the report it came from, the named submitter, and the time it was written.
- Resolution goes through a founder-only view following the `0031` pattern (`security_invoker = true`, anon revoked).
- The panel opened by a figure is the panel for that figure - asserted, not assumed.

---

### FOS-5 · Evidence Spine - Label every figure with its tier

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want each figure to state how strong its evidence is, so that I can tell a quoted sentence from a computed estimate at a glance.

#### Acceptance criteria

- The five tiers are held in `evidence_tiers` as data, not hard-coded.
- Every figure rendered on any surface carries a tier.
- The tier is displayed with the figure, not only inside the evidence panel.
- Tier labels and their meanings are consistent across all four surfaces.

---

### FOS-6 · Evidence Spine - Show a dash where no evidence exists

**Priority:** High · **State:** Todo

> **Current status (checked 29 Sep):** Partly there: the app SQL already returns null → UI shows "n/r"/"not measured" instead of 0, but not for every figure and without a stated reason everywhere.

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want the product to refuse to answer where it cannot answer honestly, so that I never act on a number that was filled in to avoid an empty space.

#### Acceptance criteria

- Where neither a source line nor a derivation can be produced, the figure renders as `-`.
- The dash states its reason in words next to it.
- A dash is never replaced with an estimate, a zero, a placeholder or a last-known value.
- The dash is treated as a valid shippable state, not an error state.

#### Governing rule for the phase

Every figure rendered anywhere in the product resolves to exactly one of three things, and the UI states which:

1. **A source line** - the figure is one sentence, written by one named person, in one identified report, at a known time. Shown verbatim.
2. **A derivation** - the figure is counted or computed from lines. The panel shows the counting rule, every row counted, and what the rule could be getting wrong.
3. **A dash** - neither can be produced honestly, so no number is shown. `-` is a valid, shippable answer and must not be replaced with an estimate.

A fourth option - a number with no path back - is a defect of the same severity as a wrong number.

---

### FOS-7 · Derivations - Define a derivation without storing its answer

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want a computed figure to carry its counting rule rather than a stored result, so that what I see is always what the rule currently produces.

#### Acceptance criteria

- Counting rules are held in `derivation_defs` as data.
- A derivation stores its rule, not its answer.
- The figure is recomputed on render rather than read from a cached total.
- A change to a rule changes the figure on the next render, with no backfill step.

---

### FOS-8 · Derivations - Show every row a derivation counted

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want to see every row that went into a computed number, so that I can check the count myself rather than trusting it.

#### Acceptance criteria

- Opening a derivation panel lists every row the rule counted.
- Each listed row resolves to its own provenance record.
- The count of listed rows equals the figure displayed.
- No row contributing to the figure is omitted from the list.

---

### FOS-9 · Derivations - Require a stated caveat on every derivation

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want each computed figure to tell me what its rule could be getting wrong, so that I know the limits of the number before I act on it.

#### Acceptance criteria

- Every derivation in `derivation_defs` carries a stated caveat describing what the rule could be missing or over-counting.
- The caveat is displayed in the derivation panel alongside the rule and the counted rows.
- A derivation with no caveat cannot be rendered - the caveat is required, not optional.

---

### FOS-11 · Live Ingest - Ingest RMM error data with provenance

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want RMM error data to arrive with the same provenance as report data, so that an error count resolves to a source the same way a task count does.

#### Acceptance criteria

- RMM error data is ingested on the live cadence.
- Each ingested error carries an evidence span, per P10-A1.
- Error figures on any surface resolve to a source line or a derivation, never to a bare number.
- The existing `error_events` structures are reused rather than replaced.

---

### FOS-13 · Action Ledger - Extract actions from the report into a tracked table

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want every action stated in a report to become a tracked row, so that what was asked for is visible after the report is read.

#### Acceptance criteria

- Actions stated in an ingested report are extracted into `actions`.
- Each action carries an evidence span for the sentence that stated it.
- Each action records who it was issued to and when it was issued.
- `reason_span_id` is nullable - see P10-B6 for the decision on whether reasons are mandatory.

---

### FOS-14 · Action Ledger - Detect closure evidence in later reports

**Priority:** High · **State:** Todo

> **Current status (checked 29 Sep):** Partly there: `task_ticket` has `close_reason` / `close_evidence` and the UI shows "Search for closure". No `action_outcomes` table yet.

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want an action to close only when a later report says in writing that it was done, so that silence is never mistaken for completion.

#### Acceptance criteria

- An action closes only when a later report states an outcome in writing.
- The closing statement is captured as an evidence span against `action_outcomes`.
- Absence of mention is never treated as closure.
- An action with no closure evidence says so in words on the Ledger, rather than showing as open with no explanation.

#### Blocked on

Blocker B5 (escalation rule and "remediation verified" for QA closure). Build against the rule above until MSD says otherwise. If "remediation verified" is later approved it becomes a fourth `outcome` value plus a migration.

---

### FOS-15 · Action Ledger - Surface actions issued with no written reason

**Priority:** High · **State:** Todo

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Story

As the founder, I want to see which actions were issued without a stated reason, so that the gap is visible rather than invisible.

#### Current position

Thirteen of twenty-four current actions have no written reason.

#### Acceptance criteria

- Every action lacking a `reason_span_id` is surfaced on the Ledger as a finding.
- The finding states that no written reason exists, rather than leaving the field blank.
- The count of actions with no written reason is visible on the Ledger.

#### Blocked on

Blocker B6 (whether an action may be issued without a written reason). Reasons stay nullable in the schema until answered.

---

### FOS-20 · Inbox Surface - Build the Inbox

**Priority:** High · **State:** Todo

> **Current status (checked 29 Sep):** The current Inbox screen is a founder-flagged ticket queue, not the document-upload flow this item describes.

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Requirement

One of the four surfaces. Demonstrates document upload and extraction.

#### Acceptance criteria

- The Inbox demonstrates the full interaction against the three fixture files.
- No real contract, financial statement or PII is sent to Gemini.
- The model call in the upload path is a single, clearly-named, feature-flagged step that stays off - not woven through the extraction code.
- Every figure produced carries an evidence key and a tier.

#### Blocked on

Blocker B8 (whether uploaded contracts, financials and PII may be sent through the model). Real documents do not flow until it is answered.

---

## Founder decisions (blockers)

### FOS-23 · Decision - Decide who else gets access: MSD only, or a company view with no Money

**Priority:** Urgent · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Whether the product serves MSD only, or also a wider company audience with the Money panel removed.

#### What it blocks

**The data model.** A second audience means a second access tier, which means the money and people figures need column- or row-level scoping, not just a hidden panel. Retrofitting that after four weeks of building is materially more expensive than deciding now. This should be decided before the phase starts rather than during it.

#### Build against until answered

Single founder user; `is_founder()` from `0024` continues to gate everything. Do not build a second role, but do keep every money-adjacent and person-adjacent figure behind a single named predicate in one place, so adding a tier later is one change rather than forty.

---

### FOS-25 · Decision - Decide whether uploaded contracts, financials and PII may be sent through the model

**Priority:** Urgent · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Whether uploaded contracts, financial statements and PII may be sent through the model.

#### What it blocks

The Inbox surface for real documents. This is a new egress route for confidential material that does not exist in the system today - the current Gemini data-use-terms verification in `docs/ops-runbook.md` covered manager report text, not client contracts.

#### Build against until answered

The Inbox demonstrates the full interaction against the three fixture files. No real contract, financial statement or PII is sent to Gemini. Build the upload path so the model call is a single, clearly-named, feature-flagged step that stays off.

---

### FOS-24 · Decision - Decide whether an action may be issued without a written reason

**Priority:** High · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Whether an action may be issued without a written reason.

#### What it blocks

D3's behaviour, and the honesty of the whole Ledger. Thirteen of twenty-four current actions have no written reason.

#### Build against until answered

Reasons stay optional in the schema (`reason_span_id` nullable), and D3 surfaces every action lacking one as a finding.

#### Note

This is a form field, not a feature. If MSD says reasons are mandatory, making the field required removes thirteen unanswerable rows for roughly an hour of work.

---

### FOS-28 · Decision - Name the source of truth and cadence for revenue data

**Priority:** High · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

The source of truth and the refresh cadence for revenue data.

#### What it blocks

The money tile only.

#### Build against until answered

The money tile ships as `-` with "cannot answer from EODR" as its stated reason, and the revenue question refuses to price the exposure. Do not wire `clients.monthly_revenue` (`0019`) into a founder-facing figure on its own - `dashboard_revenue_at_risk_summary` already carries a `clients_missing_revenue_data` count precisely because a NULL there must never read as zero.

---

### FOS-26 · Decision - Mandate the single-EODR migration and name who enforces submission compliance

**Priority:** Medium · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Whether the single-EODR migration is mandated, and who enforces submission compliance.

#### What it blocks

Nothing in the build. Determines whether coverage ever reaches 100% in reality.

#### Build against until answered

Multiple report shapes continue to arrive; coverage stays a live figure that is allowed to read 25 of 31, and the Brief surfaces missing submitters as a finding rather than assuming completeness.

---

### FOS-27 · Decision - Hand over the 10 to 15 standard MBP questions as the acceptance suite

**Priority:** Medium · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

The list of 10-15 standard MBP questions, to serve as the acceptance suite.

#### What it blocks

Final acceptance sign-off. Does not block any story.

#### Build against until answered

The seven questions already in the Sources surface. Keep the question registry data-driven so adding MSD's list later is a data change, not a code change.

---

### FOS-29 · Decision - Approve the escalation rule and remediation verified for QA closure

**Priority:** Medium · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Approval of the escalation rule, and whether "remediation verified" is a distinct closure state.

#### What it blocks

The closure logic in D2.

#### Build against until answered

An action closes only when a later report states an outcome in writing. Absence of mention is never closure. If "remediation verified" is later approved it becomes a fourth `outcome` value plus a migration - cheap, because the outcome enum is a CHECK on one column.

---

### FOS-30 · Decision - Confirm the six-month scope and the team

**Priority:** Low · **State:** Backlog

**Source:** Founder's Dashboard v2 Phase 1 Engineering Handoff (repo phase name `phase-10-evidence-layer`), Saurabh Sakkarwal, 09 Sep 2026. Reference prototype `Founders-Dashboard-v2.html`.

#### Decision needed from MSD

Confirmation of the six-month scope and the team allocated to it.

#### What it blocks

Nothing in Phase 10.

#### Build against until answered

Four weeks, this scope, no write-back and no natural-language query. Keep the surfaces and the evidence layer decoupled so the six-month path extends them rather than rewrites them.

---
