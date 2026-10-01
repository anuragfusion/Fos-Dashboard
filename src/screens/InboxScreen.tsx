import { useDash } from '../App';
import { derive } from '../lib/derive';
import { TicketRow } from '../components/TicketRow';

export function InboxScreen() {
  const { data } = useDash();
  if (!data) return null;
  const d = derive(data);
  const q = d.founderQueue;
  return (
    <div className="sheet">
      <div className="eyebrow">Inbox · waiting for you</div>
      <h1>
        {q.length
          ? `${q.length} ticket${q.length === 1 ? '' : 's'} flagged for your attention.`
          : 'Nothing is waiting for you.'}
      </h1>
      <p className="lede">
        A ticket arrives here when it passes its SLA while still being reported, repeats on three or more
        days, or you press “Take this”. The attention agent attaches a case file with verified quotes.
      </p>
      <div className="card">
        {q.length ? (
          q.map((t, i) => (
            <TicketRow key={t.ticket_id} ticket={t} index={i} today={data.today} />
          ))
        ) : (
          <div className="empty">Empty.</div>
        )}
      </div>
    </div>
  );
}
