import type { DashboardData, TakeResponse } from './types';

// Default to the Vite dev proxy path. FOS_KEY is injected server-side by the proxy,
// so no secret ships in the browser bundle.
const API = (import.meta.env.VITE_FOS_API ?? '/fos-api').replace(/\/+$/, '');
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? '').toLowerCase() === 'true';

const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.status = status;
  }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: ctl.signal,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status);
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError('Non-JSON response from API');
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') throw new ApiError('Request timed out after 20s');
    throw new ApiError((e as Error).message || 'Network error');
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDashboard(): Promise<DashboardData> {
  if (USE_MOCK) {
    const mod = await import('./dashboard.sample.json');
    return mod.default as DashboardData;
  }
  return req<DashboardData>('/app');
}

export async function takeTicket(ticket_id: number): Promise<TakeResponse> {
  if (USE_MOCK) return { ok: true, ticket_id };
  return req<TakeResponse>('/take', { method: 'POST', body: JSON.stringify({ ticket_id }) });
}
