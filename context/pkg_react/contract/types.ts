/**
 * FOS dashboard — data contract.
 * This is EXACTLY the JSON returned by  GET /webhook/fos-api/app
 * (built by reference/app_data.sql). Do not rename fields in the client;
 * map them in one place (src/api/normalize.ts) if you need derived values.
 *
 * Conventions
 *  - Dates are 'YYYY-MM-DD' strings in IST *shift days* (a report posted before 10:00 IST
 *    belongs to the previous day's shift). Timestamps are ISO strings with offset.
 *  - `null` means NOT KNOWN / NOT REPORTED. Never render null as 0.
 *  - Postgres numeric values may arrive as numbers OR numeric strings -> always parse with Number().
 */

export type ISODate = string;      // '2026-09-28'
export type ISOTime = string;      // '2026-09-28T09:43:49.866+00:00'

export interface DashboardData {
  generated_at: ISOTime;
  today: ISODate;                  // current IST date; today's shift is still in progress
  start_date: ISODate;             // ticketing starts here; older tickets are archive (not in this payload)
  window: ISODate[];               // last 5 working days (Mon–Fri), ascending, includes today
  expected: { tl: number; um: number };   // roster size from reporting_edge (TLs, UMs)
  days: DayStats[];                // one row per window day, ascending
  missing_tl_latest: string[];     // TL names with NO report on latest_data_day
  latest_data_day: ISODate | null; // latest COMPLETE day (< today) that has any claims
  today_in_progress: { claims: number; va: number; tl: number; um: number } | null;
  freshness: {
    teams_ingest: ISOTime | null;
    rnn_ingest: ISOTime | null;
    extraction: ISOTime | null;
    latest_claim: ISODate | null;
  };
  /** legacy block, superseded by clients — ignore in the React app */
  risk?: unknown;
  tickets: Ticket[];               // board tickets (origin='signal', opened_date >= start_date), pre-ranked
  backlog: BacklogRow[];
  domains: DomainRow[];
  blind_by_day: { day: ISODate; recv: number; claims: number }[];
  clients: {
    summary: { state: ClientStateOrNoReports; n: number; fte: number }[];
    rows: ClientRow[];             // only clients named at least once (last_mention not null)
    no_reports_by_team: { team: string; companies: number; fte: number; biggest: string[] }[];
    alias: { needs_confirm: number; unmatched_mentions: number; matched_mentions: number };
  };
  money: {
    fte_at_risk: number;
    fte_watch: number;
    fte_growing: number;
    fte_total: number;
    fte_no_reports: number;
    currency_lines: { report_date: ISODate; account: string | null; line: string; sender: string | null }[];
  };
}

export interface DayStats {
  day: ISODate;
  claims: number;                  // 0 => the day is NOT REPORTED (render every cell as "n/r")
  tl_recv: number;                 // distinct TLs (on roster) who reported
  um_recv: number;
  va_recv: number;
  util_avg: number | null;         // % ; one number per person per day, averaged
  util_100: number;                // people at exactly 100.0 (attested, not measured)
  util_below85: number;
  util_near0: number;              // < 10
  util_people: number;
  tickets_opened: number;
}

export type Severity = 'contradiction' | 'review';
export type TicketStatus = 'open' | 'in_progress' | 'escalated' | 'closed';
export type VerifyStatus = 'unverified' | 'still_open' | 'needs_review' | 'resolved' | null;

export interface Ticket {
  ticket_id: number;
  canonical_type: 'concern' | 'error' | 'escalation' | 'client_risk' | string;
  severity: Severity;
  account_canonical: string | null;   // client name as written in the report (may be a person like "brian r")
  subject_name: string;               // who the issue is about
  owner_name: string;                 // accountable TL/UM (never a VA)
  owner_level: 'tl' | 'um' | null;
  status: TicketStatus;
  verify_status: VerifyStatus;
  verify_note: string | null;
  needs_founder: boolean;
  founder_reason: 'past_sla_still_live' | 'recurring_3plus_days' | 'founder_request' | string | null;
  opened_date: ISODate;
  last_seen_date: ISODate;
  closed_date: ISODate | null;
  close_reason: 'evidence' | 'stale' | 'manual' | null;
  close_evidence: {
    rule?: 'later_claim_status' | 'llm_verified_quote' | string;
    quote?: string; message_id?: string; claim_id?: number; status?: string;
    report_date?: ISODate; value_text?: string; reason?: string;
  } | null;
  event_count: number;                // distinct days the issue was reported
  age: number;                        // days since opened_date (today - opened)
  sla_days: number;                   // deadline = opened_date + sla_days
  reopened: boolean;                  // "fix applied, did not work" (fingerprint had a '#n')
  past_sla: boolean;                  // open and age > sla_days
  rank_key?: number;                  // server-side rank; array is already sorted
  agent_case: AgentCase | null;       // attention agent case file (only for founder-flagged tickets)
  source: {
    sender_name: string | null;
    role: 'VA' | 'TL' | 'UM' | 'MANAGER' | string | null;
    report_date: ISODate | null;
    text: string | null;              // cleaned message excerpt (<=600 chars)
    span: string | null;              // the exact line the claim came from (<=400 chars) — PREFER this
  } | null;
  events: TicketEvent[];              // audit trail, ascending
}

export interface AgentCase {
  what_happened?: string;
  why_it_matters?: string;
  evidence?: { message_id: string; quote: string; date?: ISODate }[];   // every quote verified verbatim server-side
  owner_status?: string;
  recommended_decision?: string;
  draft_nudge?: string;               // NEVER sent automatically; show as draft
  evidence_dropped_unverifiable?: number;
  generated_at?: ISOTime;
}

export interface TicketEvent {
  ts: string;                         // 'DD Mon HH24:MI' IST, preformatted
  event: 'created' | 'recurred' | 'verified_resolved' | 'verified_open' | 'flagged_founder' | 'agent_case' | 'voided' | 'manual' | string;
  actor: 'creator_agent' | 'verifier_agent' | 'attention_agent' | 'founder' | 'system' | string;
  detail: Record<string, unknown> | null;
}

export interface BacklogRow {
  acct: string;
  v: { day: ISODate; v: number | null }[];   // one per window day; null => n/r
}

export interface DomainRow {
  domain: string;                     // e.g. 'insurance_ops', 'qa', 'ai_ml'
  channels: string;                   // comma-separated team names
  n_channels: number;
  msgs_window: number;
  last_msg: ISODate | null;
}

export type ClientState = 'at_risk' | 'watch' | 'growing' | 'stable' | 'mentioned' | 'silent';
export type ClientStateOrNoReports = ClientState | 'no_reports';

export interface ClientRow {
  company_name: string;
  teams: string | null;
  fte: number;
  state: ClientState;
  state_reason: string | null;        // raw status, e.g. 'cancellation_risk', 'upsell'
  state_type: 'client_health' | 'money_signal' | 'client_update' | 'account_update' | null;
  state_date: ISODate | null;
  state_line: string | null;          // the line that set the state (only for at_risk/watch/growing/stable)
  last_mention: ISODate;
  days_silent: number | null;
  mentions_30d: number;
  n_risk_30d: number;
  n_watch_30d: number;
  n_growing_30d: number;
  n_tls: number;                      // >1 => owner is null, show "N TLs share this client"
  owner: string | null;
  ord?: number;                       // server sort key
}

/** POST /webhook/fos-api/take  body: { ticket_id: number }  ->  */
export interface TakeResponse { ok: boolean; ticket_id: number }
