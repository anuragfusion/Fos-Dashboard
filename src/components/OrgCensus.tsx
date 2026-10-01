import type { DashboardData, OrgCensusRow, OrgLevel } from '../api/types';
import { dd } from '../lib/dates';
import { orgLevelName } from '../lib/labels';

/**
 * Reporting-roster view from the new `org_census` view (2026-10-01).
 *
 * Headline fix (item 2): the old UI labelled 37 as "Total TL" when it was really "TLs who
 * lead a team". `org_census` exposes `headcount` (people at this rank) separately from
 * `leads_a_team`. We render both so the label can't lie.
 *
 * The reference payload (as of 2026-10-01) is one row per level, DH → Manager → UM → TL.
 */
const LEVEL_ORDER: OrgLevel[] = ['dh', 'manager', 'um', 'tl'];

export function OrgCensus({ data }: { data: DashboardData }) {
  const rows = data.org_census;
  if (!rows || rows.length === 0) {
    return (
      <>
        <h2>Reporting roster</h2>
        <div className="note">
          Awaiting backend: the <code>org_census</code> view (headcount, leads a team, EODRs
          filed in 14d) will show here once n8n includes it in <code>/app</code>.
        </div>
      </>
    );
  }
  const byLevel: Partial<Record<OrgLevel, OrgCensusRow>> = {};
  for (const r of rows) byLevel[r.level] = r;
  const ordered = LEVEL_ORDER.filter((l) => byLevel[l]).map((l) => byLevel[l]!);
  return (
    <>
      <h2>Reporting roster</h2>
      <div className="sub">
        Two numbers per level, not one. <b>Headcount</b> is people who hold the rank;{' '}
        <b>leads a team</b> is the subset with direct reports. Collapsing these is how
        "37 TLs" started meaning two different things.
      </div>
      <div className="card tw" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th className="n">Headcount</th>
              <th className="n">Leads a team</th>
              <th className="n">Direct reports (sum)</th>
              <th className="n">Filed EODR (14d)</th>
              <th className="n">Missing EODR</th>
              <th className="n">Blocked on identity</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr key={r.level}>
                <td>
                  <b>{orgLevelName(r.level)}</b>
                </td>
                <td className="n">{r.headcount}</td>
                <td className="n">{r.leads_a_team}</td>
                <td className="n">{r.direct_reports}</td>
                <td className="n">{r.filed_eodr_14d}</td>
                <td className="n">{r.missing_eodr}</td>
                <td className="n">{r.blocked_on_identity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 8 }}>
        <code>filed_eodr_14d</code> can legitimately exceed <code>leads_a_team</code> — e.g.
        audit teams whose TLs file EODRs without having direct reports.
      </div>

      <CoverageTile rows={ordered} />
    </>
  );
}

/** Item 3: EODR coverage per level, computed from org_census as filed_eodr_14d / headcount. */
function CoverageTile({ rows }: { rows: OrgCensusRow[] }) {
  return (
    <>
      <h3 style={{ marginTop: 18 }}>EODR coverage, last 14 days</h3>
      <div className="sub">The weakest rung is the ceiling on everything above it.</div>
      <div className="kpis" style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
        {rows.map((r) => {
          const pct = r.headcount > 0 ? Math.round((r.filed_eodr_14d / r.headcount) * 100) : null;
          const kind = pct == null ? '' : pct >= 80 ? 'grn' : pct >= 50 ? 'amb' : 'red';
          return (
            <div key={r.level}>
              <div className="sub" style={{ margin: 0 }}>{orgLevelName(r.level)}</div>
              <div className={`v ${kind}`}>{r.filed_eodr_14d} / {r.headcount}</div>
              <div className="sub" style={{ margin: 0 }}>{pct == null ? '—' : `${pct}%`}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Item 3 companion: actionable per-person gap list from org_eodr_gaps.
 *
 * HARD RULE (do not relax): rows with gap_type === 'blocked_on_identity' MUST render as a
 * neutral "identity linking pending" bucket — never as a non-submission, miss, or anything
 * accusatory. Those people HAVE filed; their claims sit on duplicate identity rows that
 * have no emp_id yet. Showing them as non-reporters would be a false accusation from the
 * system whose purpose is detecting false reporting.
 */
export function OrgGaps({ data }: { data: DashboardData }) {
  const gaps = data.org_eodr_gaps;
  if (!gaps) {
    return (
      <>
        <h2>Reporting gaps</h2>
        <div className="note">
          Awaiting backend: the <code>org_eodr_gaps</code> view will populate the per-person
          gap list here (never-filed, stopped-filing, and the separate identity-linking
          queue) once n8n includes it in <code>/app</code>.
        </div>
      </>
    );
  }
  const genuine = gaps.filter((g) => g.gap_type === 'never_filed' || g.gap_type === 'stopped_filing');
  const blocked = gaps.filter((g) => g.gap_type === 'blocked_on_identity');
  return (
    <>
      <h2>Reporting gaps</h2>
      <div className="sub">
        Genuine gaps need a conversation with the owner. Identity-linking is an admin
        queue, not a performance signal — kept separate so the system never accuses
        someone who did file.
      </div>

      <div className="card tw" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Level</th>
              <th className="n">Direct reports</th>
              <th>Status</th>
              <th>Last EODR</th>
              <th className="n">Claims ever</th>
            </tr>
          </thead>
          <tbody>
            {genuine.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty">No genuine gaps right now.</td>
              </tr>
            ) : (
              genuine.map((g) => (
                <tr key={`${g.gap_type}-${g.emp_id ?? g.real_name}`}>
                  <td>
                    <b>{g.real_name}</b>
                  </td>
                  <td>{orgLevelName(g.level)}</td>
                  <td className="n">{g.direct_reports}</td>
                  <td>
                    <span className={`tag ${g.gap_type === 'never_filed' ? 'red' : 'amb'}`}>
                      {g.gap_type === 'never_filed' ? 'Never filed' : 'Stopped filing'}
                    </span>
                  </td>
                  <td>{g.last_eodr ? dd(g.last_eodr) : <span className="nr">never</span>}</td>
                  <td className="n">{g.claims_ever}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Identity-linking queue — neutral copy, separate panel. Never a "miss". */}
      {blocked.length > 0 && (
        <>
          <h3 style={{ marginTop: 18 }}>Identity linking pending ({blocked.length})</h3>
          <div className="sub">
            These people have filed. Their claims are attached to duplicate identity rows
            that have no <code>emp_id</code> yet. This is a data-quality queue, not a
            reporting gap — never surface it as one.
          </div>
          <div className="card tw" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Level</th>
                  <th className="n">Reports on unlinked rows</th>
                  <th className="n">Claims on unlinked rows</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {blocked.map((g) => (
                  <tr key={`blk-${g.real_name}`}>
                    <td><b>{g.real_name}</b></td>
                    <td>{orgLevelName(g.level)}</td>
                    <td className="n">{g.direct_reports}</td>
                    <td className="n">{g.claims_ever}</td>
                    <td>{g.last_eodr ? dd(g.last_eodr) : <span className="nr">unknown</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
