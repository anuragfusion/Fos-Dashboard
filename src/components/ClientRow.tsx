import { useState } from 'react';
import type { ClientRow as C } from '../api/types';
import { dd } from '../lib/dates';
import { ownerLabel } from '../lib/derive';
import { clientStateLabel, silenceReasonLabel, teamCoverageLabel, typeName } from '../lib/labels';

/** Short Owner-cell copy: never blank. "3 TLs" when multiple TLs share, "owner unknown" fallback. */
function ownerCell(c: C): string {
  if (c.owner) return c.owner;
  if (c.n_tls > 1) return `${c.n_tls} TLs`;
  return 'owner unknown';
}

/** Latest cell copy — handles stale (new 2026-10-01 state) with its own date. */
function latestCell(c: C): string {
  if (c.state === 'stale') return c.state_date ? `stale · ${dd(c.state_date)}` : 'stale';
  if (c.state === 'silent' && c.last_team_report) {
    return `last team report ${dd(c.last_team_report)}`;
  }
  if (c.state_date) return `${typeName(c.state_reason)} · ${dd(c.state_date)}`;
  return `last named ${dd(c.last_mention)}`;
}

export function ClientRow({ client }: { client: C }) {
  const [open, setOpen] = useState(false);
  const label = clientStateLabel(client.state);
  return (
    <>
      <tr
        className="lrow"
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <td>
          <b>{client.company_name}</b>
        </td>
        <td>{client.teams ?? '—'}</td>
        <td className="n">{client.fte}</td>
        <td>
          <span className={`tag ${label.kind}`}>{label.text}</span>
        </td>
        <td>{ownerCell(client)}</td>
        <td>{latestCell(client)}</td>
      </tr>
      {open && (
        <tr className="ldet">
          <td colSpan={6}>
            <ClientDetail client={client} />
          </td>
        </tr>
      )}
    </>
  );
}

function silentCopy(c: C): string {
  // When silence_reason is populated the panel below carries the detail; the lede stays short.
  if (c.silence_reason) return `This client is silent — see the note below for why.`;
  return `Nobody has named this client in an EODR for ${c.days_silent} days. That is unknown, not stable.`;
}

function ClientDetail({ client }: { client: C }) {
  const moneyNote = client.state_type === 'money_signal' && client.state === 'watch';
  return (
    <>
      {client.state_line ? (
        <div className="box">
          <div className="bh">The line that set this state</div>
          <div className="quote">“{client.state_line}”</div>
          <div className="meta">
            {typeName(client.state_type)} · {typeName(client.state_reason)} · {dd(client.state_date)}
          </div>
        </div>
      ) : (
        <div className="sub">
          {client.state === 'silent'
            ? silentCopy(client)
            : client.state === 'stale'
              ? `Last status line was ${client.state_date ? dd(client.state_date) : 'before the window'}. The state has not been reconfirmed since.`
              : 'Named in reports, but no line states how the client is doing.'}
        </div>
      )}
      {client.state === 'silent' && client.silence_reason && (
        <div className="note" style={{ marginTop: 8 }}>
          <b>{silenceReasonLabel(client.silence_reason).text}.</b>{' '}
          {client.team_coverage && <>Team coverage: {teamCoverageLabel(client.team_coverage)}. </>}
          {client.last_team_report && <>Last team report {dd(client.last_team_report)}.</>}
        </div>
      )}
      {moneyNote && (
        <div className="found a">
          <b>Read the line before acting. </b>
          This came from a money signal. In insurance work "cancellation", "non-renewal" and "payment" usually describe
          the insured's policy, not the client leaving FBSPL — so it is Watch, not At risk.
        </div>
      )}
      <div className="lbl">Last 30 days</div>
      <div style={{ fontSize: 13 }}>
        {client.mentions_30d} mention(s) · {client.n_risk_30d} at-risk · {client.n_watch_30d} watch ·{' '}
        {client.n_growing_30d} growing signals. Last named {dd(client.last_mention)}
        {client.days_silent != null ? ` (${client.days_silent} days ago)` : ''}.
      </div>
      <div className="lbl">Who owns it</div>
      <div style={{ fontSize: 13 }}>
        {ownerLabel(client)} · team {client.teams ?? '—'} · {client.fte} FTE (ERP)
      </div>
    </>
  );
}
