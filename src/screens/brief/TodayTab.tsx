import { useNavigate } from 'react-router-dom';
import { useDash } from '../../App';
import { derive } from '../../lib/derive';
import { whyMap } from '../../lib/derivations';
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
        {/* Hero 1: clients. Reads `risk` (the reports themselves), not the
            client_health view — see derive.ts for the three places that view
            drops a signal. */}
        <div className="card hero">
          <div className="q">Am I about to lose a client?</div>
          <div className="big">
            <b>{d.riskRecent.length}</b>
            <span>
              account{d.riskRecent.length === 1 ? '' : 's'} flagged
              {d.riskFrom ? ` since ${dd(d.riskFrom)}` : ''}
              {d.riskRecentFte > 0 ? ` · ${d.riskRecentFte} FTE named` : ''}
            </span>
          </div>
          <div className="line">
            {d.riskRecent[0] ? (
              <>
                <b>{d.riskRecent[0].acct}</b> — {d.riskRecent[0].kinds}
                {d.riskRecent[0].quote ? ` · “${d.riskRecent[0].quote}”` : ''}
              </>
            ) : (
              'Nothing flagged in the last three reporting days.'
            )}
          </div>
          {d.riskRecent.length > 1 && (
            <div className="sub" style={{ margin: '6px 0 0' }}>
              {d.riskRecent.slice(1, 5).map((r) => r.acct).join(' · ')}
              {d.riskRecent.length > 5 ? ` · +${d.riskRecent.length - 5} more` : ''}
            </div>
          )}
          {d.riskRecentUnpriced > 0 && (
            <div className="sub" style={{ margin: '6px 0 0' }}>
              {d.riskRecentUnpriced} of these carry no FTE — the name never matched an ERP company, so the
              exposure is unknown, not zero.
            </div>
          )}
          {clRisk.length !== d.riskRecent.length && (
            <div className="sub" style={{ margin: '6px 0 0' }}>
              The client list shows {clRisk.length} at risk ({fteRisk} FTE) over 30 days. It only counts accounts
              that matched an ERP company and whose status word exists in the signal map, so it reads lower.
            </div>
          )}
          <div className="why" style={{ borderTop: 0, paddingTop: 0 }}>
            <button
              type="button"
              className="whyb"
              onClick={() => navigate('/clients?tab=attention')}
            >
              Open the clients →
            </button>
          </div>
          <WhyToggle
            label={`Where the ${d.riskRecent.length} comes from`}
            text={
              `Every account the EOD reports themselves flagged on the last three reporting days` +
              `${d.riskFrom ? ` (${dd(d.riskFrom)} onwards)` : ''}, taken straight from the extracted claims: ` +
              `client-health lines of any kind, plus money signals for cancellation, non-renewal or a payment issue. ` +
              `No ERP match is required, so an account that exists only in the reports still appears — with its FTE ` +
              `left blank rather than counted as zero. ` +
              `The clients list answers a different question over 30 days and will not match this number; ` +
              `where they disagree, this one is closer to what people actually wrote.`
            }
          />
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

            {/* Coverage first: how much of the org this Brief actually read.
                A blank screen reads as "all clear"; this says what was read. */}
            <div className="sub">
              {latest && d.latestS
                ? `Built from ${d.latestS.tl_recv} of ${data.expected.tl} pods reporting on ${dd(latest)}.`
                : 'No complete reporting day in the window.'}
            </div>

            {/* 1. The real gap — and ONLY the real gap. Names appear here and
                   nowhere else on this card, because this is the only list the
                   founder should act on person by person. */}
            {latest && d.tlMiss > 0 && (
              <div className="it">
                <b>
                  {d.tlMiss} pod{d.tlMiss === 1 ? '' : 's'} had no Team Lead report on {dd(latest)}
                </b>
                {missingTL.length > 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.7, marginTop: 4 }}>
                    {missingTL.join(' · ')}
                  </div>
                )}
                <div className="sub" style={{ margin: '4px 0 0' }}>
                  Nothing can be said about their pods for that day.
                </div>
              </div>
            )}

            {/* 2. Our own defect. Deliberately unnamed: a person whose record is
                   split in two did file a report, and listing them as absent is
                   a false accusation the founder may act on. */}
            {data.coverage && data.coverage.claims_unattributed_30d > 0 && (
              <div className="it">
                <b>
                  {data.coverage.claims_unattributed_30d.toLocaleString()} claims in 30 days could not be matched to a
                  person
                </b>
                <div className="sub" style={{ margin: '4px 0 0' }}>
                  {data.coverage.senders_unresolved_30d} sender
                  {data.coverage.senders_unresolved_30d === 1 ? '' : 's'} unresolved ·{' '}
                  {data.coverage.half_records} half-record{data.coverage.half_records === 1 ? '' : 's'} in the registry.
                  The work was reported; the pipeline could not say by whom. This is ours to fix, not theirs.
                </div>
              </div>
            )}

            {/* 3. So "37" is never mistaken for the headcount. */}
            {data.coverage && data.coverage.tl_without_pod > 0 && (
              <div className="it">
                <b>
                  {data.coverage.tl_with_pod} pods · {data.coverage.tl_total} Team Leads in all
                </b>
                <div className="sub" style={{ margin: '4px 0 0' }}>
                  {data.coverage.tl_without_pod} lead specialist teams with no VA pod
                  {data.coverage.tl_without_pod_reported > 0
                    ? `, ${data.coverage.tl_without_pod_reported} of whom reported on ${dd(latest)}`
                    : ''}
                  . They are not counted above.
                </div>
              </div>
            )}

            {/* 4. Work that belongs to nobody. A decision, not a gap. */}
            {data.coverage && data.coverage.orphan_tickets > 0 && (
              <div className="it">
                <b>
                  {data.coverage.orphan_tickets} open ticket{data.coverage.orphan_tickets === 1 ? '' : 's'} belong to
                  people who have left
                </b>
                <div className="sub" style={{ margin: '4px 0 0' }}>
                  No one is working these until they are reassigned.
                </div>
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
