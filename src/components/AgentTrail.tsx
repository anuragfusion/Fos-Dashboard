import type { Ticket } from '../api/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sp = (s: string) => s.replace(/_/g, ' ');

export function AgentTrail({ ticket }: { ticket: Ticket }) {
  const events = ticket.events ?? [];
  if (!events.length) return <div className="sub">No agent activity recorded yet.</div>;
  return (
    <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
      {events.map((e, i) => (
        <li key={i}>
          <span className="nr">{e.ts}  </span>
          {cap(sp(e.event))} — {sp(e.actor)}
        </li>
      ))}
    </ul>
  );
}
