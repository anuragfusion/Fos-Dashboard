import type { DashboardData } from '../api/types';
import { dd } from './dates';

/** "Where this comes from" copy. Uses live payload for the placeholders. */
export function whyMap(d: DashboardData): Record<string, string> {
  const latest = d.latest_data_day ? dd(d.latest_data_day) : 'the last complete day';
  return {
    risk:
      'Counted: ERP clients whose latest status line in the last 30 days is at risk — client-health cancellation, cancellation risk, work moving in-house, POC leaving, or automation risk. Report names are matched to ERP companies; FTE comes from the ERP deal hierarchy. Money-signal cancellations are excluded: in insurance work they usually describe a policy, not the client.',
    hide:
      'Not measured yet. This needs the suppression detector (associate raised it, the layer above did not carry it up). A naive account-level matcher flagged 91–98% of cases and was rejected, so this card reads "not measured" instead of a false 0.',
    never:
      'Counted: open tickets whose SLA (opened date + SLA days) has passed and that have no closure evidence yet. Closure needs a later "resolved" claim or an agent-verified verbatim quote. Tickets start from ' +
      dd(d.start_date) + '.',
    money:
      'No system holds billing rates or contract values, so revenue at risk cannot be computed and is never estimated. FTE is the only money unit the pipeline supports: the sum of ERP FTE for clients currently at risk.',
    util100:
      'Counted on ' + latest +
      ': people whose utilisation for the day is exactly 100.0 (one number per person, averaged across RNN and Teams). This is a typed field — attested, not measured.',
    reopen:
      'Counted: tickets that were closed on evidence and then the same issue came back (a linked "#2" ticket was opened).',
    matrix:
      'Each cell is counted from the claim table for that day. A day with no claims at all reads n/r (not reported) — never 0. Team Lead and UM counts only include people on the reporting_edge roster (' +
      d.expected.tl + ' TLs, ' + d.expected.um + ' UMs).',
  };
}
