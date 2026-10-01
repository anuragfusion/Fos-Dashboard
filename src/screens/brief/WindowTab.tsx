import { useDash } from '../../App';
import { derive, backlogMove, backlogState } from '../../lib/derive';
import { whyMap } from '../../lib/derivations';
import { dd } from '../../lib/dates';
import { WhyToggle } from '../../components/WhyToggle';
import type { DayStats } from '../../api/types';

// keys whose "up is bad" (positive Move = red)
const UP_BAD = new Set(['util_below85', 'util_near0', 'tickets_opened']);

type RowDef = { label: string; unit: string; key: keyof DayStats };

export function WindowTab() {
  const { data } = useDash();
  if (!data) return null;
  const d = derive(data);
  const why = whyMap(data);

  const cols = (data.window ?? []).map((s) => String(s).slice(0, 10));
  const today = String(data.today).slice(0, 10);

  function cell(day: string, key: keyof DayStats): number | null {
    const s = d.byDay[day];
    if (!s || !(s.claims > 0)) return null;
    if (day === today) return null;
    const v = s[key];
    return v == null ? null : (v as number);
  }

  const rows: RowDef[] = [
    { label: 'Team Lead reports received', unit: `of ${data.expected.tl}`, key: 'tl_recv' },
    { label: 'Umbrella Manager reports', unit: `of ${data.expected.um}`, key: 'um_recv' },
    { label: 'Associate reports', unit: 'volume', key: 'va_recv' },
    { label: 'Utilisation average', unit: '%', key: 'util_avg' },
    { label: 'People below the 85% target', unit: 'count', key: 'util_below85' },
    { label: 'Near-zero utilisation', unit: 'count', key: 'util_near0' },
    { label: 'People at exactly 100%', unit: 'count', key: 'util_100' },
    { label: 'Tickets opened', unit: 'count', key: 'tickets_opened' },
  ];

  const s = d.latestS;
  const tot = s ? Math.max(1, s.util_people) : 1;

  const bl = data.backlog ?? [];

  return (
    <>
      <h2>Five reporting days, side by side</h2>
      <div className="sub">
        Each column is one working day. A day that did not report reads n/r — the whole argument of this product is
        that n/r and 0 must never be the same colour.
      </div>
      <div className="card tw">
        <table>
          <thead>
            <tr>
              <th>Measure</th>
              {cols.map((day) => (
                <th key={day} className="n">
                  {dd(day)}
                  {day === today ? ' (today)' : ''}
                </th>
              ))}
              <th>Move</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const vals = cols.map((day) => cell(day, r.key));
              const mv = backlogMove(vals);
              const upBad = UP_BAD.has(String(r.key));
              let mvNode;
              if (mv == null) mvNode = <span className="mv fl">—</span>;
              else if (mv === 0) mvNode = <span className="mv fl">flat</span>;
              else {
                const positive = mv > 0;
                const bad = positive === upBad; // positive+upBad => bad; negative+!upBad => bad
                mvNode = <span className={`mv ${bad ? 'up' : 'dn'}`}>{(mv > 0 ? '+' : '') + mv}</span>;
              }
              return (
                <tr key={r.key as string}>
                  <td>
                    <b>{r.label}</b>{' '}
                    <span className="nr" style={{ fontStyle: 'normal' }}>
                      {r.unit}
                    </span>
                  </td>
                  {vals.map((v, i) => (
                    <td key={i} className="n">
                      {v == null ? <span className="nr">n/r</span> : String(v)}
                    </td>
                  ))}
                  <td>{mvNode}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="note">
        n/r means not reported that day. It does not mean zero. Today’s column stays n/r until the day is complete.{' '}
        <WhyToggle label="Where every cell comes from" text={why.matrix} />
      </div>

      <h2>Utilisation, as a distribution</h2>
      <div className="sub">
        {s
          ? `The ${s.util_avg == null ? 'n/r' : s.util_avg + '%'} average on ${dd(data.latest_data_day)} sits between populations and describes none of them. ${s.util_people} people reported a figure.`
          : 'No complete day in the window.'}
      </div>
      <div className="card dist">
        <DistBar label="Exactly 100.0%" n={s ? s.util_100 : null} tot={tot} note="A field this many people fill in identically is not a measurement." />
        <DistBar label="Below 85% target" n={s ? s.util_below85 : null} tot={tot} note="Below the target band." />
        <DistBar label="Near zero" n={s ? s.util_near0 : null} tot={tot} note="Starved of work while others report saturation." />
        <div className="warn">
          <b>Attested, not measured. </b>
          Every utilisation figure here is typed by the reporter. It becomes a measurement once it is derived from
          production-tracker task counts.
        </div>
      </div>

      <h2>Client backlogs — which ones are actually moving</h2>
      <div className="sub">
        Pending-volume figures stated for a named account. A frozen number is a different problem from a growing one.
      </div>
      {bl.length ? (
        <div className="card tw">
          <table>
            <thead>
              <tr>
                <th>Account</th>
                {cols.map((day) => (
                  <th key={day} className="n">
                    {dd(day)}
                  </th>
                ))}
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {bl.map((b) => {
                const vals = b.v.map((x) => x.v);
                const st = backlogState(vals);
                const stLabel = st === 'single' ? 'single reading' : st;
                const stKind = st === 'frozen' ? 'amb' : '';
                return (
                  <tr key={b.acct}>
                    <td>
                      <b>{b.acct}</b>
                    </td>
                    {vals.map((v, i) => (
                      <td key={i} className="n">
                        {v == null ? <span className="nr">n/r</span> : String(v)}
                      </td>
                    ))}
                    <td>
                      <span className={`tag ${stKind}`}>{stLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card empty">
          No account-level backlog figures in the window. This needs pending counts tagged with an account in the EODR
          extraction.
        </div>
      )}
      <div className="note">
        Where an account was not listed on a day the cell reads n/r. Most of this grid is missing rather than stable.
      </div>
    </>
  );
}

function DistBar({ label, n, tot, note }: { label: string; n: number | null; tot: number; note: string }) {
  const pct = Math.round((100 * (n ?? 0)) / tot);
  return (
    <div className="db">
      <div style={{ color: 'var(--ink3)', textAlign: 'right' }}>{label}</div>
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      <b style={{ textAlign: 'right' }}>{n == null ? 'n/r' : String(n)}</b>
      <small>{note}</small>
    </div>
  );
}
