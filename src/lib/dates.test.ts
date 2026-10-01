import { describe, it, expect } from 'vitest';
import { dd, dlong, deadline, daysBetween, hoursSince, ago } from './dates';

describe('dates', () => {
  it('dd formats yyyy-mm-dd', () => {
    expect(dd('2026-09-28')).toBe('28 Sep');
    expect(dd('2026-01-05')).toBe('5 Jan');
  });
  it('dd handles null and empty', () => {
    expect(dd(null)).toBe('—');
    expect(dd(undefined)).toBe('—');
    expect(dd('')).toBe('—');
  });
  it('dlong returns en-GB long format', () => {
    // en-GB is deterministic for this specific date; guard just the shape.
    const s = dlong('2026-09-28');
    expect(s).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    expect(s).toContain('September');
    expect(s).toContain('2026');
  });
  it('deadline adds sla_days to opened_date', () => {
    expect(deadline('2026-09-22', 2)).toBe('2026-09-24');
    expect(deadline('2026-01-31', 1)).toBe('2026-02-01');
  });
  it('daysBetween signs correctly', () => {
    expect(daysBetween('2026-09-28', '2026-09-24')).toBe(4);
    expect(daysBetween('2026-09-24', '2026-09-28')).toBe(-4);
    expect(daysBetween('2026-09-28', '2026-09-28')).toBe(0);
  });
  it('hoursSince returns null for null input', () => {
    expect(hoursSince(null)).toBeNull();
    expect(hoursSince('not a date')).toBeNull();
  });
  it('hoursSince computes hours', () => {
    const now = new Date('2026-09-28T12:00:00Z').getTime();
    expect(hoursSince('2026-09-28T10:00:00Z', now)).toBeCloseTo(2, 5);
  });
  it('ago rounds sensibly', () => {
    expect(ago(null)).toBe('never');
    expect(ago(0.25)).toBe('15 min ago');
    expect(ago(3)).toBe('3 h ago');
    expect(ago(72)).toBe('3 days ago');
  });
});
