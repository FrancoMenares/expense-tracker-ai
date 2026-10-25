import { formatTime } from './time';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Cadence {
  frequency: Frequency;
  /** 0 = Sunday. Used by weekly schedules. */
  weekday: number;
  /** 1–28 so every month has the day. Used by monthly schedules. */
  monthDay: number;
  /** Local time, HH:MM. */
  time: string;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${suffix}`;
}

export function describeCadence(c: Cadence): string {
  const at = formatTime(c.time);
  if (c.frequency === 'daily') return `Every day at ${at}`;
  if (c.frequency === 'weekly') return `Every ${WEEKDAYS[c.weekday]} at ${at}`;
  return `Monthly on the ${ordinal(c.monthDay)} at ${at}`;
}

/** The first run strictly after `from`. */
export function nextRun(c: Cadence, from: Date): Date {
  const [h, m] = c.time.split(':').map(Number);
  const at = (y: number, mo: number, d: number) => new Date(y, mo, d, h, m, 0, 0);
  const y = from.getFullYear();
  const mo = from.getMonth();
  const d = from.getDate();

  if (c.frequency === 'daily') {
    const today = at(y, mo, d);
    return today > from ? today : at(y, mo, d + 1);
  }
  if (c.frequency === 'weekly') {
    const ahead = (c.weekday - from.getDay() + 7) % 7;
    const candidate = at(y, mo, d + ahead);
    return candidate > from ? candidate : at(y, mo, d + ahead + 7);
  }
  const thisMonth = at(y, mo, c.monthDay);
  return thisMonth > from ? thisMonth : at(y, mo + 1, c.monthDay);
}
