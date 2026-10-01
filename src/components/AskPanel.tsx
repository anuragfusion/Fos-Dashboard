import { useState } from 'react';
import { useAsk, useDash } from '../App';
import { derive } from '../lib/derive';
import { dd } from '../lib/dates';
import type { Ticket } from '../api/types';

type Verdict = 'y' | 'n' | 'c';
type Q = { id: string; text: string };
const Qs: Q[] = [
  { id: 'never', text: 'What did I ask for that never came back?' },
  { id: 'missing', text: 'Which Team Leads did not report on the last complete day?' },
  { id: 'util', text: 'Show me utilisation as a distribution, not an average.' },
  { id: 'risk', text: 'Which clients are at risk right now?' },
  { id: 'money', text: 'What is my revenue at risk this quarter, by named account?' },
];

export function AskPanel() {
  const { isOpen, close } = useAsk();
  const { data } = useDash();
  const [picked, setPicked] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  if (!data) return null;
  const d = derive(data);

  const answer = () => {
    if (!picked) return null;
    if (picked === 'never') {
      return card(d.pastDue.length ? 'n' : 'y', d.pastDue.length ? 'These tickets are past deadline:' : 'Nothing is past deadline.',
        d.pastDue.map((t: Ticket) => `T-${t.ticket_id} · ${t.canonical_type.replace(/_/g, ' ')} — ${t.subject_name} · owner ${t.owner_name}`));
    }
    if (picked === 'missing') {
      return card(data.missing_tl_latest.length ? 'n' : 'y', data.missing_tl_latest.length ? `${data.missing_tl_latest.length} did not report on ${data.latest_data_day ? dd(data.latest_data_day) : 'the last complete day'}.` : 'Every TL on roster reported.',
        data.missing_tl_latest);
    }
    if (picked === 'util') {
      const s = d.latestS;
      return card('c',
        s ? `On ${dd(data.latest_data_day!)}: ${s.util_100} at exactly 100%, ${s.util_below85} below 85%, ${s.util_near0} near zero — of ${s.util_people} people who reported.` : 'No complete day in the window.',
        ['These figures are attested, not measured.']);
    }
    if (picked === 'risk') {
      const rows = data.clients.rows.filter((r) => r.state === 'at_risk');
      return card(rows.length ? 'n' : 'y', rows.length ? `${rows.length} at risk right now.` : 'No client is at risk.',
        rows.map((r) => `${r.company_name} — ${r.state_reason?.replace(/_/g, ' ') ?? 'unknown'} · ${r.fte} FTE · ${r.state_date ? dd(r.state_date) : 'no date'}`));
    }
    if (picked === 'money') {
      return card('c', 'Cannot answer.', [
        'Contract value is not in the pipeline, so any number here would be invented.',
      ]);
    }
    return null;
  };

  const card = (v: Verdict, headline: string, bullets: string[]) => (
    <div>
      <div className={`verdict ${v}`}>{v === 'y' ? 'YES' : v === 'n' ? 'NEEDS YOU' : 'CANNOT ANSWER'}</div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{headline}</div>
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b, i) => (
            <li key={i} style={{ marginBottom: 4 }}>{b}</li>
          ))}
        </ul>
      )}
      <button className="whyb" style={{ marginTop: 12 }} onClick={() => setPicked(null)}>
        ← Other questions
      </button>
    </div>
  );

  return (
    <>
      <div className={`ovl${isOpen ? ' on' : ''}`} onClick={close} aria-hidden={!isOpen} />
      <aside className={`panel${isOpen ? ' on' : ''}`} aria-hidden={!isOpen}>
        <div className="ph">
          <div>
            <div className="eyebrow">Ask</div>
            <h2 style={{ margin: 0 }}>Answers from live data</h2>
          </div>
          <button aria-label="Close ask panel" onClick={close}>×</button>
        </div>
        <div className="pb">
          <input
            className="askin"
            placeholder="Type a question (Enter)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setFlash('Free-text questions need the Ask agent, which is not connected yet. The questions below are answered from live data.');
                setTimeout(() => setFlash(null), 4000);
              }
            }}
          />
          {flash && <div className="warn">{flash}</div>}
          {!picked ? (
            Qs.map((q) => (
              <button key={q.id} className="qbtn" onClick={() => setPicked(q.id)}>
                <b>{q.text}</b>
                <small>Answered from the current payload.</small>
              </button>
            ))
          ) : (
            answer()
          )}
        </div>
      </aside>
    </>
  );
}
