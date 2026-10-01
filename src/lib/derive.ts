import type { ClientRow, DashboardData, DayStats, Ticket } from '../api/types';
import { daysBetween, deadline, hoursSince } from './dates';

export type Confidence = 'Low' | 'Medium' | 'High';

export interface Derived {
  byDay: Record<string, DayStats>;
  latestS: DayStats | null;
  reportDays: DayStats[];
  gapDays: DayStats[];
  open: Ticket[];
  pastDue: Ticket[];
  founderQueue: Ticket[];
  recurring: Ticket[];
  reopened: Ticket[];
  tlMiss: number;
  missRatio: number;
  lastRun: string | null;
  stale: boolean;
  conf: Confidence;
}

export function derive(d: DashboardData, now: number = Date.now()): Derived {
  const days = d.days ?? [];
  const today = String(d.today).slice(0, 10);
  const byDay: Record<string, DayStats> = {};
  for (const x of days) byDay[String(x.day).slice(0, 10)] = x;
  const latest = d.latest_data_day ? String(d.latest_data_day).slice(0, 10) : null;
  const latestS = latest ? byDay[latest] ?? null : null;

  const reportDays = days.filter((x) => x.claims > 0 && String(x.day).slice(0, 10) < today);
  const gapDays = days.filter((x) => x.claims === 0 && String(x.day).slice(0, 10) < today);

  const tickets = d.tickets ?? [];
  const open = tickets.filter((t) => t.status !== 'closed');
  const pastDue = open.filter((t) => t.past_sla);
  const founderQueue = open.filter((t) => t.needs_founder);
  const recurring = tickets.filter((t) => t.event_count >= 2 || t.reopened);
  const reopened = tickets.filter((t) => t.reopened);

  const tlMiss = latestS ? Math.max(0, d.expected.tl - latestS.tl_recv) : d.expected.tl;
  const missRatio = d.expected.tl ? tlMiss / d.expected.tl : 1;

  const lastRun =
    [d.freshness?.teams_ingest, d.freshness?.rnn_ingest]
      .filter((x): x is string => Boolean(x))
      .sort()
      .pop() ?? null;
  const lastRunH = hoursSince(lastRun, now);
  const stale = lastRunH == null || lastRunH > 6;

  const conf: Confidence =
    stale || !latestS || missRatio > 0.3 ? 'Low' : missRatio > 0.1 || gapDays.length > 0 ? 'Medium' : 'High';

  return { byDay, latestS, reportDays, gapDays, open, pastDue, founderQueue, recurring, reopened, tlMiss, missRatio, lastRun, stale, conf };
}

/** Relative-due, open tickets only. Returns null for closed. */
export type RelDue = { text: string; kind: 'red' | 'amb' | 'grn' };
export function relDue(t: Ticket, today: string): RelDue | null {
  if (t.status === 'closed') return null;
  const diff = daysBetween(today, deadline(t.opened_date, t.sla_days));
  if (diff > 0) return { text: `${diff}d past`, kind: 'red' };
  if (diff === 0) return { text: 'due today', kind: 'amb' };
  return { text: `in ${-diff}d`, kind: 'grn' };
}

export type ClosureBadge = { text: string; kind: '' | 'red' | 'amb' | 'grn' | 'blue' };
export function closureBadge(t: Ticket): ClosureBadge {
  if (t.status === 'closed' && t.close_reason === 'evidence') return { text: 'Closed — evidence found', kind: 'grn' };
  if (t.status === 'closed') return { text: `Closed — ${t.close_reason ?? 'stale'}`, kind: '' };
  if (t.reopened) return { text: 'Fix applied, did not work', kind: 'red' };
  if (t.verify_status === 'needs_review') return { text: 'Needs review', kind: 'blue' };
  if (t.verify_status === 'still_open') return { text: 'Still being reported', kind: 'amb' };
  return { text: 'No evidence either way', kind: '' };
}

export function ticketTitle(t: Ticket): string {
  const type = String(t.canonical_type).replace(/_/g, ' ');
  const cap = type.charAt(0).toUpperCase() + type.slice(1);
  return `${cap}${t.account_canonical ? ` — ${t.account_canonical}` : ''} · ${t.subject_name}`;
}

export function ownerLabel(c: ClientRow): string {
  return c.owner ?? (c.n_tls > 1 ? `${c.n_tls} TLs share this client` : 'owner unknown');
}

/** last non-null minus first non-null, 1dp; null if fewer than 2 readings. */
export function backlogMove(values: (number | null)[]): number | null {
  const nn = values.filter((v): v is number => v != null);
  if (nn.length < 2) return null;
  return Math.round((nn[nn.length - 1] - nn[0]) * 10) / 10;
}

export function backlogState(values: (number | null)[]): 'single' | 'frozen' | 'moving' {
  const nn = values.filter((v): v is number => v != null);
  if (nn.length < 2) return 'single';
  return nn[0] === nn[nn.length - 1] ? 'frozen' : 'moving';
}
