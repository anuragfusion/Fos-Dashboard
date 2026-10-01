import { NavLink } from 'react-router-dom';
import { useDash } from '../App';
import { derive } from '../lib/derive';
import { dd } from '../lib/dates';

export function Rail() {
  const { data } = useDash();
  if (!data) return null;
  const d = derive(data);
  const openN = Math.min(7, d.open.length);
  const atRiskN = data.clients.summary.find((s) => s.state === 'at_risk')?.n ?? 0;

  const items: Array<[string, string, string, number, 'red' | 'blue']> = [
    ['/brief', 'Brief', 'What needs me today', openN, 'red'],
    ['/clients', 'Clients', 'Who might leave, who is quiet', atRiskN, 'red'],
    ['/ledger', 'Ledger', 'What the agents are tracking', d.pastDue.length, 'red'],
    ['/sources', 'Sources', 'How much can I believe', 0, 'red'],
    ['/inbox', 'Inbox', 'Waiting for me', d.founderQueue.length, 'blue'],
  ];

  const istGen = new Date(data.generated_at).toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });

  return (
    <aside className="rail">
      <div className="brand">
        <b>FBSPL</b>
        <small>FOUNDER'S OPERATING SYSTEM</small>
      </div>
      <div className="navh">WHERE TO LOOK</div>
      <nav className="nav">
        {items.map(([to, label, sub, cnt, color]) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'on' : '')}>
            <div>
              <b>{label}</b>
              <small>{sub}</small>
            </div>
            {cnt > 0 && <span className={`cnt${color === 'blue' ? ' b' : ''}`}>{cnt}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="foot">
        <div>
          Live · <b>{dd(data.today)}</b>
        </div>
        <div style={{ marginTop: 6 }}>
          Built from Teams + RNN EODRs through the FOS pipeline. Tickets from{' '}
          <b>{dd(data.start_date)}</b>. Generated {istGen} IST.
        </div>
      </div>
    </aside>
  );
}
