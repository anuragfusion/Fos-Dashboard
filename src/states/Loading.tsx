export function Loading() {
  return (
    <div style={{ padding: 40, color: 'var(--ink3)' }}>
      <div style={{ fontSize: 13, letterSpacing: '.12em', fontWeight: 700 }}>LOADING</div>
      <div style={{ marginTop: 8 }}>Fetching FOS payload…</div>
    </div>
  );
}
