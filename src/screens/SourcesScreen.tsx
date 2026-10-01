import { useDash } from '../App';
import { derive } from '../lib/derive';
import { dd } from '../lib/dates';
import { domainName, domainTier, typeName } from '../lib/labels';
import { OrgCensus, OrgGaps } from '../components/OrgCensus';

export function SourcesScreen() {
  const { data } = useDash();
  if (!data) return null;

  const doms = data.domains ?? [];
  const tiers = { live: 0, partial: 0, silent: 0 };
  for (const d of doms) {
    const k = domainTier(d).kind;
    if (k === 'grn') tiers.live++;
    else if (k === 'amb') tiers.partial++;
    else tiers.silent++;
  }

  const { conf } = derive(data);
  const money = data.money;
  const clRisk = (data.clients?.rows ?? []).filter((r) => r.state === 'at_risk');
  const currencyLines = money?.currency_lines ?? [];
  const today = String(data.today).slice(0, 10);
  const exp = data.expected;

  return (
    <div className="sheet">
      <div className="eyebrow">Sources · provenance and coverage</div>
      <h1>
        {tiers.live} of {doms.length} reporting functions {tiers.live === 1 ? 'is' : 'are'} fully in the
        pipeline. That is why confidence reads {conf}.
      </h1>
      <p className="lede">
        Pipeline figures are traceable to a named reporter. Gaps are listed as gaps rather than left as white
        space.
      </p>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div>
          <div className="sub" style={{ margin: 0 }}>In the pipeline</div>
          <div className="v grn">{tiers.live}</div>
        </div>
        <div>
          <div className="sub" style={{ margin: 0 }}>Partial</div>
          <div className="v amb">{tiers.partial}</div>
        </div>
        <div>
          <div className="sub" style={{ margin: 0 }}>Connected, silent this window</div>
          <div className="v">{tiers.silent}</div>
        </div>
      </div>

      <div className="note">
        This table lists every Teams channel marked as a reporting channel. A function with no channel at all
        does not appear here — tell the system which functions are expected so their absence becomes a
        visible gap.
      </div>

      <h2>Money</h2>
      <div className="sub">
        Split deliberately. The first column is what the reporting stream supports. The second is anything
        typed in by hand — labelled and never totalled with the first.
      </div>

      <div className="heroes" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card" style={{ padding: 16 }}>
          <h3>
            From the pipeline <span className="tag grn">pipeline · traceable</span>
          </h3>

          <div className="lbl">Revenue at risk, by named account</div>
          <b>Cannot answer</b>
          <div className="sub">
            The EODR stream names accounts at risk but carries no contract value for any of them.
          </div>

          <div className="lbl">FTE by client state (ERP)</div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <b style={{ color: '#d92d20' }}>{money?.fte_at_risk ?? 0} FTE</b> at risk ·{' '}
            <b>{money?.fte_watch ?? 0} FTE</b> on watch ·{' '}
            <b style={{ color: '#0e8f55' }}>{money?.fte_growing ?? 0} FTE</b> growing ·{' '}
            <b>{money?.fte_no_reports ?? 0} FTE</b> with no reports reaching FOS · of{' '}
            {money?.fte_total ?? 0} FTE total.
          </div>

          <div className="lbl">Clients at risk, named</div>
          {clRisk.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {clRisk.map((c) => (
                <li key={c.company_name}>
                  <b>{c.company_name}</b> — {typeName(c.state_reason)} · {c.fte} FTE ·{' '}
                  {dd(c.state_date)}
                  {c.state_line && (
                    <div
                      className="sub"
                      style={{ margin: '2px 0 6px', fontStyle: 'italic' }}
                    >
                      “{c.state_line}”
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="sub">None in the last 30 days.</div>
          )}

          <div className="lbl">Money figures reported in EODRs (not reconciled)</div>
          {currencyLines.length ? (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {currencyLines.map((m, i) => (
                <li key={i}>
                  “{m.line}”
                  <div className="sub" style={{ margin: '0 0 6px' }}>
                    {m.sender ?? 'unknown'} · {m.account ?? 'no account'} · {dd(m.report_date)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="sub">None in the last 30 days.</div>
          )}

          <div className="sub" style={{ marginTop: 6 }}>
            Shown as written. Currencies are never converted or added up.
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <h3>
            Manual entry <span className="tag amb">manual · not pipeline-fed</span>
          </h3>
          <div className="sub">
            No manual figures are connected yet (revenue targets, FTE billing, errors per FTE). When they
            are, they appear here with their origin and are never summed with the pipeline column.
          </div>
        </div>
      </div>

      <h2>Functions and the honest status of their feed</h2>
      <div className="card tw" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Function</th>
              <th>Teams</th>
              <th>Tier</th>
              <th>Messages in window</th>
              <th>Last message</th>
            </tr>
          </thead>
          <tbody>
            {doms.map((d) => {
              const t = domainTier(d);
              return (
                <tr key={d.domain}>
                  <td>
                    <b>{domainName(d.domain)}</b>
                  </td>
                  <td>{d.channels}</td>
                  <td>
                    <span className={`tag ${t.kind}`}>{t.label}</span>
                  </td>
                  <td className="n">{d.msgs_window}</td>
                  <td>{dd(d.last_msg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>What I am blind to</h2>
      <div className="card tw" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>TL reports received</th>
              <th>Missing</th>
              <th>Read</th>
            </tr>
          </thead>
          <tbody>
            {data.days.map((d) => {
              const day = String(d.day).slice(0, 10);
              const none = !(d.claims > 0);
              const isToday = day === today;
              return (
                <tr key={day}>
                  <td>{dd(day)}</td>
                  <td className="n">
                    {none || isToday ? (
                      <span className="nr">{isToday ? 'in progress' : 'n/r'}</span>
                    ) : (
                      `${d.tl_recv} / ${exp.tl}`
                    )}
                  </td>
                  <td className="n">
                    {none || isToday ? <span className="nr">—</span> : String(exp.tl - d.tl_recv)}
                  </td>
                  <td>
                    {isToday
                      ? 'Day not complete'
                      : none
                      ? <span className="tag red">no data — pipeline gap</span>
                      : d.tl_recv === exp.tl
                      ? 'Complete'
                      : 'Never complete'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <OrgCensus data={data} />
      <OrgGaps data={data} />
    </div>
  );
}
