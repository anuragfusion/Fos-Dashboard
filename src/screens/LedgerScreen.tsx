import { useState } from 'react';
import { useDash } from '../App';
import type { Ticket } from '../api/types';
import { dd, deadline } from '../lib/dates';
import { closureBadge, derive, relDue } from '../lib/derive';
import { cap, typeName } from '../lib/labels';
import { EvidenceBlock } from '../components/EvidenceBlock';
import { ClosureSearch } from '../components/ClosureSearch';
import { AgentTrail } from '../components/AgentTrail';

export function LedgerScreen() {
  const { data } = useDash();
  if (!data) return null;

  const today = String(data.today).slice(0, 10);
  const tickets = data.tickets ?? [];
  const { open, pastDue, reopened } = derive(data);
  const closedEv = tickets.filter((t) => t.status === 'closed' && t.close_reason === 'evidence');
  const unknown = open.filter(
    (t) =>
      !t.past_sla &&
      (t.verify_status == null || t.verify_status === 'unverified' || t.verify_status === 'needs_review'),
  );

  const n = tickets.length;
  const nPD = pastDue.length;
  const h1 = n
    ? `The agents opened ${n} ticket${n === 1 ? '' : 's'}. ${nPD} ${nPD === 1 ? 'is' : 'are'} past deadline with no closure evidence.`
    : 'No tickets yet.';

  return (
    <div className="sheet">
      <div className="eyebrow">Ledger · {n} tickets since {dd(data.start_date)}</div>
      <h1>{h1}</h1>
      <p className="lede">
        Tickets are created and closed by agents only. The honest verdict on most open rows is no evidence of closure — which is a different statement from not done, and this screen keeps them separate.
      </p>

      <div className="kpis">
        <Kpi label="Tickets opened" value={n} />
        <Kpi label="Past deadline, no evidence" value={nPD} kind="red" />
        <Kpi label="Fixed and still broken" value={reopened.length} kind="red" />
        <Kpi label="Closed on evidence" value={closedEv.length} kind="grn" />
        <Kpi label="Simply unknown" value={unknown.length} kind="amb" />
      </div>

      <div
        className="warn"
        style={{ borderColor: 'var(--red)', background: 'var(--red-bg)' }}
      >
        <b>Every row opens. </b>
        Click a ticket to see the line that caused it, what the verifier searched for, and the deadline arithmetic.
      </div>

      {n ? (
        <div className="card tw" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Ref</th>
                <th>Ticket</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Deadline</th>
                <th>Closure evidence</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <LedgerRow key={t.ticket_id} ticket={t} today={today} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty" style={{ marginTop: 14 }}>
          The creator agent has not opened any ticket since {dd(data.start_date)}.
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, kind }: { label: string; value: number; kind?: 'red' | 'amb' | 'grn' }) {
  return (
    <div>
      <div className="sub" style={{ margin: 0 }}>{label}</div>
      <div className={`v${kind ? ' ' + kind : ''}`}>{value}</div>
    </div>
  );
}

function LedgerRow({ ticket: t, today }: { ticket: Ticket; today: string }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((v) => !v);
  const badge = closureBadge(t);
  const rd = relDue(t, today);
  const dueStr = dd(deadline(t.opened_date, t.sla_days));
  const title = `${cap(typeName(t.canonical_type))}${t.account_canonical ? ` — ${t.account_canonical}` : ''}`;
  const type = typeName(t.canonical_type);
  const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
  const past = t.status !== 'closed' && t.past_sla;

  return (
    <>
      <tr
        className="lrow"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <td>
          <b style={{ color: 'var(--blue)' }}>T-{t.ticket_id}</b>
        </td>
        <td>
          <b>{title}</b>
          <div className="sub" style={{ margin: 0 }}>
            {dd(t.opened_date)} · subject {t.subject_name}
          </div>
        </td>
        <td>
          {t.owner_name}
          <div className="sub" style={{ margin: 0 }}>{String(t.owner_level ?? '').toUpperCase()}</div>
        </td>
        <td>
          <span className={`tag ${t.severity === 'contradiction' ? 'red' : 'amb'}`}>
            {t.severity === 'contradiction' ? 'Critical' : 'High'}
          </span>
        </td>
        <td>
          {dueStr}
          {rd ? <> <span className={`tag ${rd.kind}`}>{rd.text}</span></> : null}
        </td>
        <td>
          <span className={`tag ${badge.kind}`}>{badge.text}</span>
        </td>
      </tr>
      {open && (
        <tr className="ldet">
          <td colSpan={6}>
            <div className="lbl" style={{ marginTop: 4 }}>Where this ticket came from</div>
            <div className="sub" style={{ margin: 0 }}>
              Opened by the creator agent on {dd(t.opened_date)} from {article} {type} signal
              {t.account_canonical ? ` on ${t.account_canonical}` : ''}.
            </div>
            <div className="lbl">The finding underneath it</div>
            <EvidenceBlock ticket={t} />
            <div className="lbl">The search for closure evidence</div>
            <ClosureSearch ticket={t} />
            <div className="lbl">Deadline</div>
            <div style={{ fontSize: 13 }}>
              Opened {dd(t.opened_date)} + {t.sla_days}-day SLA = {dueStr}. Today is {dd(today)}.
              {past ? ' That is past the deadline set by the ticket rule, not by a target this dashboard invented.' : ''}
            </div>
            <div className="lbl">Agent trail</div>
            <AgentTrail ticket={t} />
          </td>
        </tr>
      )}
    </>
  );
}
