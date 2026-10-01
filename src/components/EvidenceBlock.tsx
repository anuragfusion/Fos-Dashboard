import type { Ticket } from '../api/types';
import { dd } from '../lib/dates';

export function EvidenceBlock({ ticket }: { ticket: Ticket }) {
  const s = ticket.source;
  const line = s?.span ?? s?.text ?? null;
  if (!line) {
    return (
      <div className="box">
        <div className="bh">The line someone actually wrote</div>
        <div className="quote" style={{ fontStyle: 'normal', color: 'var(--ink3)' }}>
          Source line not stored for this ticket (created before evidence pointers were added). The agent will re-check it against later reports.
        </div>
      </div>
    );
  }
  return (
    <div className="box">
      <div className="bh">The line someone actually wrote</div>
      <div className="quote">“{line}”</div>
      <div className="meta">
        <b>{s?.sender_name ?? 'Unknown'}</b> · {s?.role ?? 'role unknown'}   ·   EODR {dd(s?.report_date)}
      </div>
    </div>
  );
}
