import { useAsk, useDash } from '../App';

export function TopBar() {
  const ask = useAsk();
  const { refreshing } = useDash();
  return (
    <div className="top">
      <div
        className="ask"
        role="button"
        tabIndex={0}
        onClick={ask.open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ask.open();
          }
        }}
      >
        <span>Ask about clients, tickets, coverage…</span>
        <span className="kbd">⌘K</span>
      </div>
      <span className="pill conf">CONFIDENTIAL</span>
      <span className="pill live">{refreshing ? 'REFRESHING…' : 'LIVE'}</span>
      <div className="who">
        <b>MSD</b>Founder view
      </div>
    </div>
  );
}
