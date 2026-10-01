import { useState } from 'react';
import type { Ticket } from '../api/types';
import { dd, deadline } from '../lib/dates';
import { relDue, ticketTitle } from '../lib/derive';
import { EvidenceBlock } from './EvidenceBlock';
import { ClosureSearch } from './ClosureSearch';
import { AgentTrail } from './AgentTrail';
import { useToast } from './Toast';
import { takeTicket, ApiError } from '../api/client';
import { useDash } from '../App';

interface Props {
  ticket: Ticket;
  index: number;
  today: string;
  variant?: 'default' | 'recurring';
}

export function TicketRow({ ticket, index, today, variant = 'default' }: Props) {
  const [open, setOpen] = useState(false);
  const rankRed = variant === 'recurring' ? ticket.reopened : index < 3 && ticket.severity === 'contradiction';
  return (
    <div className={`row${open ? ' open' : ''}`}>
      <button
        className="rh"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ background: 'transparent', border: 0, width: '100%', textAlign: 'left' }}
      >
        <span className={`rank${rankRed ? ' r' : ''}`}>{index + 1}</span>
        <div className="rt">
          <b>{ticketTitle(ticket)}</b>
          <div className="tags">
            <span className={`tag ${ticket.severity === 'contradiction' ? 'red' : 'amb'}`}>
              {ticket.severity === 'contradiction' ? 'HIGH' : 'MATERIAL'}
            </span>
            {variant === 'recurring' && (
              ticket.reopened ? (
                <span className="tag red">FIX APPLIED — NOT WORKING</span>
              ) : (
                <span className="tag amb">OPEN · STILL REPORTED</span>
              )
            )}
            {variant === 'recurring' ? (
              <span className="tag">
                {dd(ticket.opened_date)} → {dd(ticket.last_seen_date)} · {ticket.event_count} day(s)
              </span>
            ) : (
              <>
                <span className="tag">Owner: {ticket.owner_name}</span>
                <span className="tag">Due {dd(deadline(ticket.opened_date, ticket.sla_days))}</span>
                {(() => {
                  const rd = relDue(ticket, today);
                  return rd ? <span className={`tag ${rd.kind}`}>{rd.text}</span> : null;
                })()}
                {ticket.event_count >= 2 && (
                  <span className="tag amb">{ticket.event_count}-day chain</span>
                )}
                {ticket.needs_founder && <span className="tag blue">flagged for you</span>}
              </>
            )}
          </div>
        </div>
        <span className="chev">›</span>
      </button>
      {open && (
        <div className="rb">
          <TicketDetail ticket={ticket} />
        </div>
      )}
    </div>
  );
}

export function TicketDetail({ ticket }: { ticket: Ticket }) {
  const c = ticket.agent_case;
  return (
    <>
      <p style={{ margin: 0, color: 'var(--ink2)' }}>
        Raised {dd(ticket.opened_date)} about {ticket.subject_name}
        {ticket.account_canonical ? ` on ${ticket.account_canonical}` : ''}. Owner: {ticket.owner_name} (
        {String(ticket.owner_level ?? '').toUpperCase()}). Reported on {ticket.event_count} day(s); last seen{' '}
        {dd(ticket.last_seen_date)}.
      </p>
      <EvidenceBlock ticket={ticket} />
      <div className="lbl">Search for closure</div>
      <ClosureSearch ticket={ticket} />
      {c && (
        <div className="box">
          <div className="bh">Case file (attention agent)</div>
          <div style={{ padding: '10px 12px', fontSize: 13 }}>
            {c.what_happened && (
              <p style={{ margin: '0 0 6px' }}>
                <b>What happened. </b>
                {c.what_happened}
              </p>
            )}
            {c.why_it_matters && (
              <p style={{ margin: '0 0 6px' }}>
                <b>Why it matters. </b>
                {c.why_it_matters}
              </p>
            )}
            {c.recommended_decision && (
              <p style={{ margin: '0 0 6px' }}>
                <b>What to change. </b>
                {c.recommended_decision}
              </p>
            )}
            {c.draft_nudge && (
              <p style={{ margin: 0, color: 'var(--ink3)' }}>
                <b>Draft nudge (not sent). </b>
                {c.draft_nudge}
              </p>
            )}
            {c.evidence && c.evidence.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="lbl" style={{ margin: '0 0 4px' }}>
                  Verified quotes
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {c.evidence.map((e, i) => (
                    <li key={i}>
                      “{e.quote}”
                      {e.date && <span className="nr"> · {dd(e.date)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.evidence_dropped_unverifiable != null && c.evidence_dropped_unverifiable > 0 && (
              <div className="sub" style={{ margin: '8px 0 0' }}>
                {c.evidence_dropped_unverifiable} evidence item(s) dropped: quote not found verbatim.
              </div>
            )}
          </div>
        </div>
      )}
      <div className="lbl">Agent trail</div>
      <AgentTrail ticket={ticket} />
      <TakeThisButton ticket={ticket} />
    </>
  );
}

function TakeThisButton({ ticket }: { ticket: Ticket }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { refetch } = useDash();
  if (ticket.status === 'closed' || ticket.needs_founder) return null;
  return (
    <button
      className="take"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await takeTicket(ticket.ticket_id);
          if (r.ok) {
            toast(
              `Ticket #${ticket.ticket_id} flagged for founder attention. The attention agent builds the case file on its next run (every 2 hours).`,
            );
            await refetch();
          } else {
            toast('Nothing changed — it may already be flagged, closed, or outside the active board.');
          }
        } catch (e) {
          const msg = e instanceof ApiError ? e.message : 'Take this failed. Try again.';
          toast(msg);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Flagging…' : 'Take this'}
    </button>
  );
}
