import type { Ticket } from '../api/types';
import { dd } from '../lib/dates';

export function ClosureSearch({ ticket }: { ticket: Ticket }) {
  if (ticket.status === 'closed') {
    const ce = ticket.close_evidence ?? {};
    return (
      <div className="found g">
        <b>Closed on evidence. </b>
        {ce.quote ? `“${ce.quote}”` : ce.rule ? String(ce.rule).replace(/_/g, ' ') : ''}
        {ce.report_date ? ` — ${dd(ce.report_date)}` : ''}
      </div>
    );
  }
  if (ticket.verify_status === 'still_open') {
    return (
      <div className="found a">
        <b>Still being reported. </b>
        The same issue appeared again on {dd(ticket.last_seen_date)}.
      </div>
    );
  }
  if (ticket.verify_status === 'needs_review') {
    return (
      <div className="found a">
        <b>Needs review. </b>
        {ticket.verify_note ?? 'The agent could not verify a closing line.'}
      </div>
    );
  }
  return (
    <div className="found">
      <b>Found: nothing, in either direction. </b>
      No later line closes it and no line contradicts it. The verdict is no evidence of closure — deliberately not the same claim as not done.
    </div>
  );
}
