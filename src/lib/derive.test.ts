import { describe, it, expect } from 'vitest';
import type { DashboardData, Ticket, ClientRow } from '../api/types';
import { derive, relDue, closureBadge, ticketTitle, ownerLabel, backlogMove, backlogState } from './derive';

function baseData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    generated_at: '2026-09-28T10:00:00+00:00',
    today: '2026-09-28',
    start_date: '2026-09-21',
    window: ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28'],
    expected: { tl: 10, um: 5 },
    days: [
      { day: '2026-09-22', claims: 100, tl_recv: 9, um_recv: 5, va_recv: 20, util_avg: 85, util_100: 3, util_below85: 2, util_near0: 1, util_people: 10, tickets_opened: 2 },
      { day: '2026-09-23', claims: 0, tl_recv: 0, um_recv: 0, va_recv: 0, util_avg: null, util_100: 0, util_below85: 0, util_near0: 0, util_people: 0, tickets_opened: 0 },
      { day: '2026-09-28', claims: 20, tl_recv: 0, um_recv: 0, va_recv: 4, util_avg: 80, util_100: 0, util_below85: 1, util_near0: 0, util_people: 4, tickets_opened: 0 },
    ],
    missing_tl_latest: [],
    latest_data_day: '2026-09-22',
    today_in_progress: { claims: 20, va: 4, tl: 0, um: 0 },
    freshness: { teams_ingest: '2026-09-28T09:00:00+00:00', rnn_ingest: '2026-09-28T09:00:00+00:00', extraction: null, latest_claim: '2026-09-28' },
    tickets: [],
    backlog: [],
    domains: [],
    blind_by_day: [],
    clients: { summary: [], rows: [], no_reports_by_team: [], alias: { needs_confirm: 0, unmatched_mentions: 0, matched_mentions: 0 } },
    money: { fte_at_risk: 0, fte_watch: 0, fte_growing: 0, fte_total: 0, fte_no_reports: 0, currency_lines: [] },
    ...overrides,
  };
}

function ticket(o: Partial<Ticket> = {}): Ticket {
  return {
    ticket_id: 1, canonical_type: 'error', severity: 'contradiction',
    account_canonical: 'acme', subject_name: 'Alice', owner_name: 'Bob', owner_level: 'tl',
    status: 'open', verify_status: null, verify_note: null, needs_founder: false, founder_reason: null,
    opened_date: '2026-09-22', last_seen_date: '2026-09-22', closed_date: null, close_reason: null, close_evidence: null,
    event_count: 1, age: 6, sla_days: 2, reopened: false, past_sla: true,
    agent_case: null, source: null, events: [],
    ...o,
  };
}

describe('derive', () => {
  it('reportDays and gapDays exclude today; n/r when claims=0', () => {
    const d = derive(baseData(), new Date('2026-09-28T10:00:00Z').getTime());
    expect(d.reportDays.map((r) => r.day)).toEqual(['2026-09-22']);
    expect(d.gapDays.map((r) => r.day)).toEqual(['2026-09-23']);
  });

  it('confidence: high when TL coverage strong and pipeline fresh', () => {
    const d = derive(
      baseData({
        expected: { tl: 10, um: 5 },
        days: [
          { day: '2026-09-22', claims: 100, tl_recv: 10, um_recv: 5, va_recv: 20, util_avg: 80, util_100: 0, util_below85: 0, util_near0: 0, util_people: 10, tickets_opened: 0 },
          { day: '2026-09-28', claims: 20, tl_recv: 0, um_recv: 0, va_recv: 4, util_avg: null, util_100: 0, util_below85: 0, util_near0: 0, util_people: 0, tickets_opened: 0 },
        ],
        window: ['2026-09-22', '2026-09-28'],
      }),
      new Date('2026-09-28T10:00:00Z').getTime(),
    );
    expect(d.conf).toBe('High');
  });

  it('confidence: low when pipeline stale', () => {
    const d = derive(
      baseData({ freshness: { teams_ingest: '2026-09-26T00:00:00+00:00', rnn_ingest: '2026-09-26T00:00:00+00:00', extraction: null, latest_claim: null } }),
      new Date('2026-09-28T10:00:00Z').getTime(),
    );
    expect(d.conf).toBe('Low');
  });

  it('confidence: medium when small TL gap and pipeline fresh', () => {
    const d = derive(
      baseData({ expected: { tl: 10, um: 5 } }), // 9/10 recv = 10% missing but a gap day too
      new Date('2026-09-28T10:00:00Z').getTime(),
    );
    expect(d.conf).toBe('Medium');
  });

  it('open/pastDue/founderQueue/recurring/reopened split', () => {
    const tickets: Ticket[] = [
      ticket({ ticket_id: 1, status: 'open', past_sla: true }),
      ticket({ ticket_id: 2, status: 'open', past_sla: false, needs_founder: true }),
      ticket({ ticket_id: 3, status: 'closed', past_sla: false }),
      ticket({ ticket_id: 4, status: 'open', past_sla: false, event_count: 3 }),
      ticket({ ticket_id: 5, status: 'open', past_sla: false, reopened: true }),
    ];
    const d = derive(baseData({ tickets }));
    expect(d.open.map((t) => t.ticket_id)).toEqual([1, 2, 4, 5]);
    expect(d.pastDue.map((t) => t.ticket_id)).toEqual([1]);
    expect(d.founderQueue.map((t) => t.ticket_id)).toEqual([2]);
    expect(d.recurring.map((t) => t.ticket_id).sort()).toEqual([4, 5]);
    expect(d.reopened.map((t) => t.ticket_id)).toEqual([5]);
  });
});

describe('relDue boundaries', () => {
  const today = '2026-09-28';
  it('past → red Nd past', () => {
    expect(relDue(ticket({ opened_date: '2026-09-22', sla_days: 2 }), today)).toEqual({ text: '4d past', kind: 'red' });
  });
  it('exactly on deadline → amber due today', () => {
    expect(relDue(ticket({ opened_date: '2026-09-26', sla_days: 2 }), today)).toEqual({ text: 'due today', kind: 'amb' });
  });
  it('future → green in Nd', () => {
    expect(relDue(ticket({ opened_date: '2026-09-27', sla_days: 3 }), today)).toEqual({ text: 'in 2d', kind: 'grn' });
  });
  it('closed → null', () => {
    expect(relDue(ticket({ status: 'closed' }), today)).toBeNull();
  });
});

describe('closureBadge precedence', () => {
  it('closed + evidence → green', () => {
    expect(closureBadge(ticket({ status: 'closed', close_reason: 'evidence' }))).toEqual({ text: 'Closed — evidence found', kind: 'grn' });
  });
  it('closed other → neutral', () => {
    expect(closureBadge(ticket({ status: 'closed', close_reason: 'manual' }))).toEqual({ text: 'Closed — manual', kind: '' });
  });
  it('reopened → red', () => {
    expect(closureBadge(ticket({ reopened: true }))).toEqual({ text: 'Fix applied, did not work', kind: 'red' });
  });
  it('needs_review → blue', () => {
    expect(closureBadge(ticket({ verify_status: 'needs_review' }))).toEqual({ text: 'Needs review', kind: 'blue' });
  });
  it('still_open → amber', () => {
    expect(closureBadge(ticket({ verify_status: 'still_open' }))).toEqual({ text: 'Still being reported', kind: 'amb' });
  });
  it('unknown → neutral no evidence either way', () => {
    expect(closureBadge(ticket({ verify_status: 'unverified' }))).toEqual({ text: 'No evidence either way', kind: '' });
  });
});

describe('ticketTitle', () => {
  it('formats with account', () => {
    expect(ticketTitle(ticket({ canonical_type: 'client_risk', account_canonical: 'acme', subject_name: 'Bo' }))).toBe('Client risk — acme · Bo');
  });
  it('omits account when null', () => {
    expect(ticketTitle(ticket({ canonical_type: 'error', account_canonical: null, subject_name: 'Bo' }))).toBe('Error · Bo');
  });
});

describe('ownerLabel fallback', () => {
  const base: ClientRow = {
    company_name: 'x', teams: null, fte: 0, state: 'stable', state_reason: null, state_type: null,
    state_date: null, state_line: null, last_mention: '2026-09-22', days_silent: 0, mentions_30d: 0,
    n_risk_30d: 0, n_watch_30d: 0, n_growing_30d: 0, n_tls: 1, owner: null,
  };
  it('uses owner when present', () => {
    expect(ownerLabel({ ...base, owner: 'Ana' })).toBe('Ana');
  });
  it('N TLs share this client when n_tls > 1', () => {
    expect(ownerLabel({ ...base, owner: null, n_tls: 3 })).toBe('3 TLs share this client');
  });
  it('owner unknown otherwise', () => {
    expect(ownerLabel({ ...base, owner: null, n_tls: 1 })).toBe('owner unknown');
  });
});

describe('backlog helpers', () => {
  it('move: fewer than 2 readings → null', () => {
    expect(backlogMove([null, 1, null, null, null])).toBeNull();
  });
  it('move: last minus first non-null, 1dp', () => {
    expect(backlogMove([1, 2, null, 3.15])).toBeCloseTo(2.2, 5);
  });
  it('state: single → single', () => {
    expect(backlogState([1, null, null])).toBe('single');
  });
  it('state: first === last → frozen', () => {
    expect(backlogState([5, null, 5])).toBe('frozen');
  });
  it('state: moving', () => {
    expect(backlogState([5, 6, 7])).toBe('moving');
  });
});
