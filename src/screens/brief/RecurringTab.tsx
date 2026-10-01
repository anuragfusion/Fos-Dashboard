import { useDash } from '../../App';
import { derive } from '../../lib/derive';
import { TicketRow } from '../../components/TicketRow';

export function RecurringTab() {
  const { data } = useDash();
  if (!data) return null;
  const d = derive(data);

  const heading = d.recurring.length
    ? `${d.recurring.length} thing${d.recurring.length === 1 ? '' : 's'} that repeat` +
      (d.reopened.length
        ? ` — and ${d.reopened.length} fix${d.reopened.length === 1 ? '' : 'es'} that did not hold`
        : '')
    : 'Nothing has repeated yet';

  return (
    <>
      <h2>{heading}</h2>
      <div className="sub">
        A recurring problem and a new problem need different responses. This view is why the ledger tracks closure
        rather than issuance.
      </div>
      <div className="card">
        {d.recurring.length ? (
          d.recurring.map((t, i) => (
            <TicketRow key={t.ticket_id} ticket={t} index={i} today={data.today} variant="recurring" />
          ))
        ) : (
          <div className="empty">
            A ticket lands here when the same issue is reported on two or more days, or comes back after it was closed.
          </div>
        )}
      </div>
    </>
  );
}
