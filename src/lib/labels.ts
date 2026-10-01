import type { ClientState, DomainRow, OrgLevel, SilenceReason, TeamCoverage } from '../api/types';

export function typeName(t: string | null | undefined): string {
  return String(t ?? '').replace(/_/g, ' ');
}

export function cap(s: string | null | undefined): string {
  const x = String(s ?? '');
  return x.charAt(0).toUpperCase() + x.slice(1);
}

const DOMAIN_NAMES: Record<string, string> = {
  insurance_ops: 'Insurance operations',
  sales_calls: 'Sales calls',
  sales_marketing: 'Sales & marketing',
  qa: 'QA',
  hr: 'HR',
  ai_ml: 'AI / ML',
  accounts: 'Accounts & finance',
  training: 'L&D / training',
  admin_mis: 'Admin · MIS',
  admin_facility: 'Admin · facility',
  process_excellence_audit: 'Process excellence · audit',
  process_excellence_summary: 'Process excellence · summary',
};
export function domainName(d: string): string {
  return DOMAIN_NAMES[d] ?? cap(typeName(d));
}

export type Tier = { label: string; kind: 'grn' | 'amb' | '' };
export function domainTier(row: DomainRow): Tier {
  if (row.domain === 'insurance_ops') return { label: 'pipeline · traceable', kind: 'grn' };
  if (row.msgs_window > 0) return { label: 'partial · Teams EODR', kind: 'amb' };
  return { label: 'connected · silent', kind: '' };
}

export type ClientStateLabel = { text: string; kind: 'red' | 'amb' | 'grn' | 'blue' | '' };
export function clientStateLabel(s: ClientState | 'no_reports'): ClientStateLabel {
  switch (s) {
    case 'at_risk': return { text: 'At risk', kind: 'red' };
    case 'watch': return { text: 'Watch', kind: 'amb' };
    case 'growing': return { text: 'Growing', kind: 'grn' };
    case 'stable': return { text: 'Stable', kind: 'grn' };
    case 'mentioned': return { text: 'Mentioned, no status', kind: '' };
    case 'stale': return { text: 'Stale', kind: 'amb' };
    case 'silent': return { text: 'Went quiet 14+ days', kind: 'blue' };
    case 'no_reports': return { text: 'No reports reach FOS', kind: 'red' };
  }
}

/** Human copy per silence_reason (2026-10-01 split). */
export function silenceReasonLabel(r: SilenceReason): { text: string; kind: 'red' | 'amb' | 'blue' } {
  switch (r) {
    case 'no_activity_logged': return { text: 'FTE allocated, no activity ever logged', kind: 'amb' };
    case 'team_dark': return { text: 'No reports reach FOS', kind: 'red' };
    case 'went_quiet': return { text: 'Named before, nothing for 14+ days', kind: 'blue' };
  }
}

export function teamCoverageLabel(c: TeamCoverage): string {
  return c === 'reporting' ? 'team reporting' : c === 'mixed' ? 'team partly reporting' : 'team dark';
}

const ORG_LEVEL_NAMES: Record<OrgLevel, string> = {
  dh: 'Delivery heads',
  manager: 'Managers',
  um: 'Umbrella managers',
  tl: 'Team leads',
};
export function orgLevelName(l: OrgLevel): string { return ORG_LEVEL_NAMES[l] ?? l; }
