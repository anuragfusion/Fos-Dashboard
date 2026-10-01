const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-09-28' → '28 Sep'. */
export function dd(s: string | null | undefined): string {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  if (p.length !== 3) return String(s);
  return `${+p[2]} ${MON[+p[1] - 1] ?? '?'}`;
}

/** '2026-09-28' → 'Monday 28 September 2026' (en-GB). */
export function dlong(s: string | null | undefined): string {
  if (!s) return '—';
  const dt = new Date(String(s).slice(0, 10) + 'T00:00:00');
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** Add `sla_days` to opened_date, return 'YYYY-MM-DD' (UTC-anchored for timezone-safe date math). */
export function deadline(opened_date: string, sla_days: number): string {
  const ms = Date.parse(String(opened_date).slice(0, 10) + 'T00:00:00Z') + sla_days * 864e5;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Signed day-diff `today - target`, UTC-anchored so time zone can't shift the answer. */
export function daysBetween(today: string, target: string): number {
  const a = Date.parse(String(today).slice(0, 10) + 'T00:00:00Z');
  const b = Date.parse(String(target).slice(0, 10) + 'T00:00:00Z');
  return Math.round((a - b) / 864e5);
}

/** Hours since an ISO timestamp; null if input is null/invalid. */
export function hoursSince(iso: string | null | undefined, now: number = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? (now - t) / 36e5 : null;
}

export function ago(hh: number | null): string {
  if (hh == null) return 'never';
  if (hh < 1) return `${Math.round(hh * 60)} min ago`;
  if (hh < 48) return `${Math.round(hh)} h ago`;
  return `${Math.round(hh / 24)} days ago`;
}
