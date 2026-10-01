import type { ApiError } from '../api/client';

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  return (
    <div style={{ padding: 40, maxWidth: 640 }}>
      <div style={{ fontSize: 11, letterSpacing: '.14em', fontWeight: 700, color: 'var(--red)' }}>ERROR</div>
      <h1 style={{ marginTop: 8 }}>Could not load dashboard.</h1>
      <p style={{ color: 'var(--ink2)' }}>{error.message}</p>
      <ul style={{ color: 'var(--ink2)', fontSize: 13 }}>
        <li>Check <code>VITE_FOS_API</code> and <code>VITE_FOS_KEY</code> in <code>.env</code>.</li>
        <li>Confirm the n8n workflow is active.</li>
        <li>Confirm CORS Allowed Origins includes <code>http://localhost:5173</code>.</li>
      </ul>
      <button className="take" onClick={onRetry}>Retry</button>
    </div>
  );
}
