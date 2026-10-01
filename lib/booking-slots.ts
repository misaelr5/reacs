import { bookingConfig, type ProfessionalId } from './booking-config.ts';
import { dayRules, professionalAgenda, type AgendaState } from './agenda-rules.ts';
export type Schedule = { timezone: string; weekdays: readonly number[]; startMinute: number; endMinute: number; durationMinutes: number; bufferMinutes: number; minimumNoticeMinutes: number; horizonDays: number };
export type Busy = { start: string; end: string };
export type Slot = { start: string; end: string; date: string; label: string };
export function dateInZone(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant);
}
// Resolve a wall-clock time through IANA rules, not a hardcoded UTC offset.
// Nonexistent/ambiguous DST times are omitted instead of guessing.
export function wallTime(date: string, minute: number, timezone: string): Date | null {
  const target = `${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00`;
  const nominal = Date.parse(target + 'Z');
  const formatter = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const probe = new Date(nominal + delta);
    offsets.add(Date.parse(formatter.format(probe).replace(' ', 'T') + 'Z') - probe.getTime());
  }
  const matches = [...offsets].map(offset => new Date(nominal - offset)).filter(value => formatter.format(value).replace(' ', 'T') === target);
  return matches.length === 1 ? matches[0]! : null;
}
export function generateSlots(now: Date, busy: Busy[] = [], schedule: Schedule | AgendaState = bookingConfig, professionalId?: ProfessionalId): Slot[] {
  // Both professionals inherit weekly unless an explicit override is supplied.
  const state = 'version' in schedule ? professionalId ? professionalAgenda(schedule, professionalId) : schedule : null;
  const config = state ? state.config : schedule as Schedule;
  const before = state ? state.config.bufferBefore : (schedule as Schedule).bufferMinutes;
  const after = state ? state.config.bufferAfter : (schedule as Schedule).bufferMinutes;
  const today = dateInZone(now, config.timezone);
  const slots: Slot[] = [];
  for (let day = 0; day < config.horizonDays; day++) {
    const calendarDay = new Date(Date.parse(today + 'T12:00:00Z') + day * 86400000);
    const date = calendarDay.toISOString().slice(0, 10);
    const legacy = schedule as Schedule;
    const rules = state ? dayRules(state, date) : { windows: legacy.weekdays.includes(calendarDay.getUTCDay()) ? [{ start: legacy.startMinute, end: legacy.endMinute }] : [], blocks: [] };
    for (const window of rules.windows) for (let minute = window.start; minute + config.durationMinutes <= window.end; minute += config.durationMinutes + (state ? 0 : legacy.bufferMinutes)) {
      const start = wallTime(date, minute, config.timezone);
      const end = wallTime(date, minute + config.durationMinutes, config.timezone);
      if (!start || !end || end.getTime() - start.getTime() !== config.durationMinutes * 60000 || start.getTime() < now.getTime() + config.minimumNoticeMinutes * 60000) continue;
      if (rules.blocks.some(item => minute - before < item.end && minute + config.durationMinutes + after > item.start)) continue;
      if (busy.some(item => start.getTime() - before * 60000 < Date.parse(item.end) && end.getTime() + after * 60000 > Date.parse(item.start))) continue;
      if (state?.reservations.some(item => (!professionalId || !item.professionalId || item.professionalId === professionalId) && start.getTime() - before * 60000 < Date.parse(item.end) + item.bufferAfter * 60000 && end.getTime() + after * 60000 > Date.parse(item.start) - item.bufferBefore * 60000)) continue;
      slots.push({ start: start.toISOString(), end: end.toISOString(), date, label: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}` });
    }
  }
  return slots;
}
