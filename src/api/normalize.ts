import type { DashboardData } from './types';

// Postgres numerics may arrive as strings; coerce shallow numeric fields with Number().
// Not exhaustive — narrowed to the fields the UI reads as numbers.
const n = (v: unknown): number => (v == null ? 0 : Number(v) || 0);
const nOrNull = (v: unknown): number | null => (v == null ? null : Number(v));

export function normalize(d: DashboardData): DashboardData {
  return {
    ...d,
    expected: { tl: n(d.expected?.tl), um: n(d.expected?.um) },
    days: (d.days ?? []).map((x) => ({
      ...x,
      claims: n(x.claims),
      tl_recv: n(x.tl_recv),
      um_recv: n(x.um_recv),
      va_recv: n(x.va_recv),
      util_avg: nOrNull(x.util_avg),
      util_100: n(x.util_100),
      util_below85: n(x.util_below85),
      util_near0: n(x.util_near0),
      util_people: n(x.util_people),
      tickets_opened: n(x.tickets_opened),
    })),
    today_in_progress: d.today_in_progress
      ? {
          claims: n(d.today_in_progress.claims),
          va: n(d.today_in_progress.va),
          tl: n(d.today_in_progress.tl),
          um: n(d.today_in_progress.um),
        }
      : null,
    tickets: (d.tickets ?? []).map((t) => ({
      ...t,
      event_count: n(t.event_count),
      age: n(t.age),
      sla_days: n(t.sla_days),
    })),
    clients: {
      ...d.clients,
      summary: (d.clients?.summary ?? []).map((s) => ({ ...s, n: n(s.n), fte: n(s.fte) })),
      silence: d.clients?.silence
        ? d.clients.silence.map((s) => ({ ...s, n: n(s.n), fte: n(s.fte) }))
        : undefined,
      rows: (d.clients?.rows ?? []).map((r) => ({
        ...r,
        fte: n(r.fte),
        mentions_30d: n(r.mentions_30d),
        n_risk_30d: n(r.n_risk_30d),
        n_watch_30d: n(r.n_watch_30d),
        n_growing_30d: n(r.n_growing_30d),
        n_tls: n(r.n_tls),
        days_silent: nOrNull(r.days_silent),
      })),
      no_reports_by_team: (d.clients?.no_reports_by_team ?? []).map((t) => ({
        ...t,
        companies: n(t.companies),
        fte: n(t.fte),
      })),
      alias: {
        needs_confirm: n(d.clients?.alias?.needs_confirm),
        unmatched_mentions: n(d.clients?.alias?.unmatched_mentions),
        matched_mentions: n(d.clients?.alias?.matched_mentions),
      },
    },
    money: {
      fte_at_risk: n(d.money?.fte_at_risk),
      fte_watch: n(d.money?.fte_watch),
      fte_growing: n(d.money?.fte_growing),
      fte_total: n(d.money?.fte_total),
      fte_no_reports: n(d.money?.fte_no_reports),
      currency_lines: d.money?.currency_lines ?? [],
    },
    backlog: d.backlog ?? [],
    domains: (d.domains ?? []).map((x) => ({ ...x, n_channels: n(x.n_channels), msgs_window: n(x.msgs_window) })),
    blind_by_day: (d.blind_by_day ?? []).map((x) => ({ ...x, recv: n(x.recv), claims: n(x.claims) })),
    missing_tl_latest: d.missing_tl_latest ?? [],
    window: d.window ?? [],
  };
}
