import { useState } from 'react';
import { useDash } from '../App';
import { derive } from '../lib/derive';
import { dd, ago, hoursSince } from '../lib/dates';

export function ConfidenceStrip() {
  const { data } = useDash();
  const [open, setOpen] = useState(false);
  if (!data) return null;
  const d = derive(data);
  const cls = d.conf === 'High' ? 'high' : d.conf === 'Low' ? 'low' : '';

  const parts: string[] = [];
  if (d.latestS) {
    const claimsSum = d.reportDays.reduce((s, r) => s + r.claims, 0);
    const dates = d.reportDays.map((r) => dd(r.day)).join(', ');
    parts.push(
      `Built from ${claimsSum} claims across ${d.reportDays.length} reporting day(s) (${dates}). ${d.tlMiss} of ${data.expected.tl} Team Leads did not report on ${dd(data.latest_data_day!)} — those pods read unknown, not no issues.`,
    );
    if (d.gapDays.length) parts.push(`No data at all on ${d.gapDays.map((g) => dd(g.day)).join(', ')}.`);
    if (d.stale) parts.push(`Pipeline last ran ${ago(hoursSince(d.lastRun))}.`);
  } else {
    parts.push('No complete reporting day in the window. Everything on this screen is unknown.');
  }

  return (
    <>
      <div className={`cstrip ${cls}`}>
        <div className="lvl">
          CONFIDENCE <b>{d.conf}</b>
        </div>
        <div>{parts.join(' ')}</div>
        <button className="dt" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Coverage detail {open ? '↑' : '↓'}
        </button>
      </div>
      {open && <CoverageDetail />}
    </>
  );
}

function CoverageDetail() {
  const { data } = useDash();
  if (!data) return null;
  const latest = data.latest_data_day;
  const latestS = latest ? data.days.find((x) => x.day === latest) : null;
  const tip = data.today_in_progress ?? { tl: 0, um: 0, va: 0, claims: 0 };
  return (
    <div className="cdetail">
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Expected</th>
              <th>Received on {latest ? dd(latest) : '—'}</th>
              <th>Today so far</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Team Leads</td>
              <td>{data.expected.tl}</td>
              <td>{latestS ? latestS.tl_recv : 'n/r'}</td>
              <td>{tip.tl}</td>
            </tr>
            <tr>
              <td>Umbrella Managers</td>
              <td>{data.expected.um}</td>
              <td>{latestS ? latestS.um_recv : 'n/r'}</td>
              <td>{tip.um}</td>
            </tr>
            <tr>
              <td>Associates (VA)</td>
              <td>
                <span className="nr">roster-free</span>
              </td>
              <td>{latestS ? latestS.va_recv : 'n/r'}</td>
              <td>{tip.va}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, color: 'var(--ink3)', fontSize: 12.5 }}>
        Last Teams ingest {ago(hoursFromNow(data.freshness.teams_ingest))} · last RNN ingest{' '}
        {ago(hoursFromNow(data.freshness.rnn_ingest))} · newest claim{' '}
        {data.freshness.latest_claim ? dd(data.freshness.latest_claim) : 'never'}.
      </div>
    </div>
  );
}

function hoursFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? (Date.now() - t) / 36e5 : null;
}
