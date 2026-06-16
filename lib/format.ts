import type { Match } from '../types';
import { NOW } from '../data/worldcup';

// The 2026 World Cup is hosted across North America; we show times in US Eastern
// (the tournament's reference timezone) and group fixtures by their Eastern date.
const TZ = 'America/New_York';
const TIME_FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const DAY_FMT = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
const KEY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export function kickoffTime(iso: string): string {
  return `${TIME_FMT.format(new Date(iso))} ET`;
}

/** YYYY-MM-DD in Eastern time, so late-night ET games stay on the right day. */
export function dayKey(iso: string): string {
  return KEY_FMT.format(new Date(iso));
}

export function todayKey(): string {
  return dayKey(NOW.toISOString());
}

export function dayLabel(iso: string): string {
  const key = dayKey(iso);
  const today = todayKey();
  const tomorrow = dayKey(new Date(NOW.getTime() + 86400000).toISOString());
  const yesterday = dayKey(new Date(NOW.getTime() - 86400000).toISOString());
  if (key === today) return 'Today';
  if (key === tomorrow) return 'Tomorrow';
  if (key === yesterday) return 'Yesterday';
  return DAY_FMT.format(new Date(iso));
}

export interface DaySection {
  key: string;
  label: string;
  data: Match[];
}

export function groupByDay(matches: Match[]): DaySection[] {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const key = dayKey(m.kickoff);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => ({ key, label: dayLabel(data[0].kickoff), data }));
}

function normalizePlace(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function venueLabel(match: Pick<Match, 'venue' | 'city'>): string {
  const venue = match.venue?.trim();
  const city = match.city?.trim();

  if (!venue) return city || 'Venue TBA';
  if (!city || normalizePlace(venue) === normalizePlace(city)) return venue;

  return `${venue} · ${city}`;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
