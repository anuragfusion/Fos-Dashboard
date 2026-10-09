import { useNavigate } from 'react-router-dom';
import { useDash } from '../../App';
import { derive } from '../../lib/derive';
import { whyMap } from '../../lib/derivations';
import { typeName } from '../../lib/labels';
import { dd } from '../../lib/dates';
import { WhyToggle } from '../../components/WhyToggle';
import { TicketRow } from '../../components/TicketRow';

export function TodayTab() {
  const { data } = useDash();
  const navigate = useNavigate();
  if (!data) return null;
  const d = derive(data);
  const why = whyMap(data);

  const rows = data.clients?.rows ?? [];
  const clRisk = rows.filter((c) => c.state === 'at_risk');
  const clWatch = rows.filter((c) => c.state === 'watch');
  const fteRisk = data.money?.fte_at_risk ?? 0;
  const missingTL = data.missing_tl_latest ?? [];
  const latest = data.latest_data_day;
  // Only what was reported in the last two days of data. See derive.ts for why
  // this is not a plain `today` filter and why needs_founder tickets drop out.
  const ranked = d.fresh.slice(0, 7);
  const parked = d.open.length - d.fresh.length;

  return (
    <>
      <div className="heroes">
        {/* Hero 1: clients */}
        <div className="card hero">
          <div className="q">Am I about to lose a client?</div>
          <div className="big">
            <b>{clRisk.length}</b>
            <span>
              client{clRisk.length === 1 ? '' : 's'} at risk · {fteRisk} FTE
            </span>
          </div>
          <div className="line">
            {clRisk[0]
              ? `${clRisk[0].company_name} — ${typeName(clRisk[0].state_reason)} · ${clWatch.length} more on watch`
              : `${clWatch.length} on watch, none at risk`}
          </div>
          <div className="why" style={{ borderTop: 0, paddingTop: 0 }}>
            <button
              type="button"
              className="whyb"
              onClick={() => navigate('/clients?tab=attention')}
            >
              Open the clients →
            </button>
          </div>
          <WhyToggle label={`Where the ${clRisk.length} comes from`} text={why.risk} />
        </div>

        {/* Hero 2: hiding */}
        <div className="card hero">
          <div className="q">Is anyone hiding something from me?</div>
          <div className="big">
            <b className="nm">Not measured</b>
          </div>
          <div className="line">Suppression detector not connected — this is unknown, not zero.</div>
          <WhyToggle label="Why this is blank" text={why.hide} />
        </div>

        {/* Hero 3: past deadline */}
        <div className="card hero">
          <div className="q">What did I ask for that never came back?</div>
          <div className="big">
            <b>{d.pastDue.length}</b>
            <span>of {data.tickets.length} tickets past deadline</span>
          </div>
          <div className="line">No closure evidence in any later report</div>
          <WhyToggle label={`Where the ${d.pastDue.length} comes from`} text={why.never} />
        </div>
      </div>

      {/* Secondary strip */}
      <div className="card strip2">
        <div>
          <div className="q">Am I about to lose money?</div>
          <div className="v">{fteRisk} FTE</div>
          <div className="sub" style={{ margin: 0 }}>at risk · revenue is not in any system</div>
          <WhyToggle text={why.money} />
        </div>
        <div>
          <div className="q">People at exactly 100% utilisation</div>
          <div className="v">{d.latestS ? String(d.latestS.util_100) : 'n/r'}</div>
          <div className="sub" style={{ margin: 0 }}>
            Attested, not measured{d.latestS && latest ? ` · ${dd(latest)}` : ''}
          </div>
          <WhyToggle text={why.util100} />
        </div>
        <div>
          <div className="q">Defects recurring after a fix</div>
          <div className="v">{d.reopened.length}</div>
          <div className="sub" style={{ margin: 0 }}>
            {d.reopened.length
              ? d.reopened.map((t) => t.account_canonical || t.subject_name).join(' · ')
              : 'None reopened yet'}
          </div>
          <WhyToggle text={why.reopen} />
        </div>
      </div>

      {/* Ranked + aside */}
      <h2>What needs you today — ranked, capped at seven</h2>
      <div className="sub">
        Only tickets something was reported about on {d.freshFrom ? `${dd(d.freshFrom)} or later` : 'the latest reporting day'}.
        Within that, ranked by contradictions first, then how often it has repeated.
        {parked > 0 && (
          <>
            {' '}
            {parked} older open ticket{parked === 1 ? '' : 's'} {parked === 1 ? 'is' : 'are'} not shown here — nothing new
            was said about {parked === 1 ? 'it' : 'them'}.{' '}
            <button type="button" className="whyb" onClick={() => navigate('/ledger')}>
              See all in the Ledger →
            </button>
          </>
        )}
      </div>
      <div className="cols">
        <div className="card">
          {ranked.length ? (
            ranked.map((t, i) => (
              <TicketRow key={t.ticket_id} ticket={t} index={i} today={data.today} />
            ))
          ) : (
            <div className="empty">
              Nothing reported recently. Tickets appear here once the creator agent finds a signal on or after {dd(data.start_date)}.
            </div>
          )}
        </div>
        <div className="aside">
          <div className="card">
            <h3>What I am blind to</h3>
            <div className="sub">
              {latest
                ? `${d.tlMiss} of ${data.expected.tl} Team Leads did not report on ${dd(latest)}. Their pods read unknown.`
                : 'No complete reporting day in the window.'}
            </div>
            {missingTL.length > 0 && (
              <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.7 }}>
                {missingTL.join(' · ')}
              </div>
            )}
            {d.gapDays.length > 0 && (
              <div className="it">
                <b>No data at all: </b>
                {d.gapDays.map((g) => dd(g.day)).join(', ')}
                <div className="sub" style={{ margin: '4px 0 0' }}>
                  Pipeline did not run or nothing was ingested. Treat as unknown.
                </div>
              </div>
            )}
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3>Only you can decide these</h3>
            <div className="sub">
              Process-rule proposals (48-hour client-block rule, auto-surface with a no-blame window…) with Approve /
              Defer arrive in the next phase. Nothing here is decided for you.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
