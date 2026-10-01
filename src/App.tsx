import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useDashboard, type DashboardState } from './hooks/useDashboard';
import { Rail } from './components/Rail';
import { TopBar } from './components/TopBar';
import { ConfidenceStrip } from './components/ConfidenceStrip';
import { AskPanel } from './components/AskPanel';
import { ToastProvider } from './components/Toast';
import { Loading } from './states/Loading';
import { ErrorState } from './states/ErrorState';

const DashCtx = createContext<DashboardState | null>(null);
export function useDash(): DashboardState {
  const v = useContext(DashCtx);
  if (!v) throw new Error('useDash outside provider');
  return v;
}

const AskCtx = createContext<{ open: () => void; close: () => void; isOpen: boolean } | null>(null);
export function useAsk() {
  const v = useContext(AskCtx);
  if (!v) throw new Error('useAsk outside provider');
  return v;
}

export default function App() {
  const state = useDashboard();
  const [askOpen, setAskOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAskOpen(true);
      } else if (e.key === 'Escape') {
        setAskOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (state.loading && !state.data) return <Loading />;
  if (state.error && !state.data) return <ErrorState error={state.error} onRetry={state.refetch} />;
  if (!state.data) return <Loading />;

  const ask = { open: () => setAskOpen(true), close: () => setAskOpen(false), isOpen: askOpen };

  return (
    <DashCtx.Provider value={state}>
      <AskCtx.Provider value={ask}>
        <ToastProvider>
          <div className="app">
            <Rail />
            <div className="main">
              <TopBar />
              <StaleBanner />
              <ConfidenceStrip />
              <Outlet />
              <PageFoot />
            </div>
            <AskPanel />
          </div>
        </ToastProvider>
      </AskCtx.Provider>
    </DashCtx.Provider>
  );
}

function PageFoot() {
  return (
    <div className="pagefoot">
      <span>
        <b>Live</b> — reads the FOS database on every load.
      </span>
      <span>Agents create and close tickets; nothing on this screen is edited by hand.</span>
      <span>Every figure is traceable to a line a named person wrote, or says n/r.</span>
    </div>
  );
}

function StaleBanner() {
  const { data } = useDash();
  if (!data?.generated_at) return null;
  const age = Date.now() - new Date(data.generated_at).getTime();
  if (age < 15 * 60 * 1000) return null;
  return (
    <div className="stale">
      Showing data from {new Date(data.generated_at).toLocaleString('en-GB')} — pipeline may be delayed.
    </div>
  );
}
