import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchDashboard, ApiError } from '../api/client';
import { normalize } from '../api/normalize';
import type { DashboardData } from '../api/types';

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

const POLL_MS = 5 * 60 * 1000;

export function useDashboard(): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const inflight = useRef(false);

  const load = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const hadData = data !== null;
    if (hadData) setRefreshing(true);
    try {
      const d = await fetchDashboard();
      setData(normalize(d));
      setError(null);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError((e as Error).message);
      // On refetch failure keep old data (stale banner surfaces via generated_at)
      if (!hadData) setError(err);
      else setError(err);
    } finally {
      inflight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return { data, loading, refreshing, error, refetch: load };
}
