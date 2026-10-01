import { useSearchParams } from 'react-router-dom';
import { useDash } from '../App';
import { ClientRow } from '../components/ClientRow';
import { clientStateLabel, silenceReasonLabel } from '../lib/labels';
import type { ClientRow as C, ClientStateOrNoReports, SilenceReason } from '../api/types';

const TABS = ['attention', 'growing', 'all', 'noreports'] as const;
type Tab = (typeof TABS)[number];

// Added 'stale' per 2026-10-01 schema; dropped 'no_reports' from the strip — superseded by the
// silence_reason split rendered inside the noreports tab.
const KPI_STATES: ClientStateOrNoReports[] = ['at_risk', 'watch', 'growing', 'stale', 'silent'];

function vClass(kind: string): string {
  if (kind === 'red' || kind === 'amb' || kind === 'grn') return `v ${kind}`;
  return 'v';
}

interface Bucket { n: number; fte: number; biggest?: C | null }

/** Split silent rows by silence_reason. Returns null when the field is unpopulated across the board. */
function silenceBuckets(rows: C[]): Record<SilenceReason, Bucket> | null {
  const silent = rows.filter((r) => r.state === 'silent');
  if (!silent.length) return null;
  const populated = silent.some((r) => r.silence_reason != null);
  if (!populated) return null;
  const base: Record<SilenceReason, Bucket> = {
    no_activity_logged: { n: 0, fte: 0, biggest: null },
    team_dark: { n: 0, fte: 0, biggest: null },
    went_quiet: { n: 0, fte: 0, biggest: null },
  };
  for (const r of silent) {
    if (!r.silence_reason) continue;
    const b = base[r.silence_reason];
    b.n += 1;
    b.fte += r.fte;
    if (!b.biggest || r.fte > b.biggest.fte) b.biggest = r;
  }
  for (const k of Object.keys(base) as SilenceReason[]) {
    base[k].fte = Math.round(base[k].fte * 10) / 10;
  }
  return base;
}

export function ClientsScreen() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? '') ? (rawTab as Tab) : 'attention';
  const { data } = useDash();
  if (!data) return null;

  const rows = data.clients.rows;
  const summary = data.clients.summary;
  const alias = data.clients.alias;
  const money = data.money;

  const sumOf = (s: ClientStateOrNoReports) =>
    summary.find((r) => r.state === s) ?? { state: s, n: 0, fte: 0 };

  const atRisk = rows.filter((r) => r.state === 'at_risk');
  const watch = rows.filter((r) => r.state === 'watch');
  const buckets = silenceBuckets(rows);
  const nr = sumOf('no_reports'); // legacy fallback until silence_reason populates

  const h1 = atRisk.length
    ? `${atRisk.length} client${atRisk.length === 1 ? '' : 's'} at risk (${money.fte_at_risk} FTE). ${watch.length} more on watch.`
    : 'No client is at risk in the last 30 days.';

  return (
    <div className="sheet">
      <div className="eyebrow">Clients · last 30 days</div>
      <h1>{h1}</h1>
      <p className="lede">
        Each client's state comes from the latest line that says how it is doing — never from a score. A client nobody
        has named for 14 days reads "went quiet", and a client whose team's reports never reach FOS reads "no reports"
        — neither is "stable".
      </p>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {KPI_STATES.map((s) => {
          const x = sumOf(s);
          const label = clientStateLabel(s);
          return (
            <div key={s}>
              <div className="sub" style={{ margin: 0 }}>{label.text}</div>
              <div className={vClass(label.kind)}>{x.n}</div>
              <div className="sub" style={{ margin: 0 }}>{x.fte} FTE</div>
            </div>
          );
        })}
      </div>

      <div className="tabs">
        {(
          [
            ['attention', 'Needs attention'],
            ['growing', 'Growing'],
            ['all', 'All named'],
            ['noreports', 'Silence, split by reason'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? 'on' : ''}
            onClick={() => setParams({ tab: k })}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'attention' && (
        <ClientTable
          rows={rows.filter(
            (r) => r.state === 'at_risk' || r.state === 'watch' || r.state === 'stale' || r.state === 'silent',
          )}
        />
      )}
      {tab === 'growing' && <ClientTable rows={rows.filter((r) => r.state === 'growing')} />}
      {tab === 'all' && <ClientTable rows={rows} />}
      {tab === 'noreports' && (buckets ? <SilenceTiles buckets={buckets} /> : <LegacyNoReports nr={nr} byTeam={data.clients.no_reports_by_team} />)}

      <div className="note">
        Client names in reports are matched to ERP companies automatically ({alias.matched_mentions} mentions matched).{' '}
        {alias.needs_confirm} names match more than one company and wait for a human to confirm;{' '}
        {alias.unmatched_mentions} mentions did not match any ERP client — internal work, abbreviations, or names the
        matcher missed.
      </div>
    </div>
  );
}

function SilenceTiles({ buckets }: { buckets: Record<SilenceReason, Bucket> }) {
  // Order: no_activity_logged (biggest number, ERP question), team_dark (real blind spot),
  // went_quiet (recently fallen silent).
  const order: SilenceReason[] = ['no_activity_logged', 'team_dark', 'went_quiet'];
  return (
    <>
      <div className="sub">
        Silent clients split by why we don't hear about them. Only "team dark" is a pipeline failure.
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {order.map((k) => {
          const b = buckets[k];
          const l = silenceReasonLabel(k);
          return (
            <div key={k}>
              <div className="sub" style={{ margin: 0 }}>{l.text}</div>
              <div className={vClass(l.kind)}>{b.n}</div>
              <div className="sub" style={{ margin: 0 }}>{b.fte} FTE</div>
            </div>
          );
        })}
      </div>
      {buckets.team_dark.biggest && (
        <div className="warn" style={{ borderColor: 'var(--red)', background: 'var(--red-bg)' }}>
          <b>Largest team-dark account: </b>
          {buckets.team_dark.biggest.company_name}
          {buckets.team_dark.biggest.teams ? ` · ${buckets.team_dark.biggest.teams}` : ''} ·{' '}
          {buckets.team_dark.biggest.fte} FTE · zero reports ever.
        </div>
      )}
    </>
  );
}

function LegacyNoReports({ nr, byTeam }: { nr: { n: number; fte: number }; byTeam: { team: string; companies: number; fte: number; biggest: string[] }[] }) {
  // Shown until n8n ships silence_reason in the payload. Copy stays accurate for the pure team_dark slice,
  // but flags that the breakdown is not yet available.
  return (
    <>
      <div className="sub">
        {nr.n} clients ({nr.fte} FTE) have never been named in any EODR that reaches FOS. The teams below serve them —
        their reports are not in the pipeline.
      </div>
      <div className="note" style={{ marginTop: 8 }}>
        Awaiting backend: the three-way split by <code>silence_reason</code> (no activity logged / team dark / went
        quiet) will show here once n8n includes the column in <code>/app</code>.
      </div>
      <div className="card tw">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th className="n">Clients</th>
              <th className="n">FTE</th>
              <th>Largest</th>
            </tr>
          </thead>
          <tbody>
            {byTeam.map((t) => (
              <tr key={t.team}>
                <td><b>{t.team}</b></td>
                <td className="n">{t.companies}</td>
                <td className="n">{t.fte}</td>
                <td>{t.biggest.join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ClientTable({ rows }: { rows: C[] }) {
  if (!rows.length) return <div className="card empty">None.</div>;
  return (
    <div className="card tw">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Team</th>
            <th className="n">FTE</th>
            <th>State</th>
            <th>Owner</th>
            <th>Latest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <ClientRow key={c.company_name} client={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
