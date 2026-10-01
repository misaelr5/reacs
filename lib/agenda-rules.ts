import { randomUUID } from 'node:crypto';
import type { CalendarEvent } from './booking-google.ts';
import { bookingConfig, type ProfessionalId } from './booking-config.ts';
export type Interval = { start: number; end: number };
export type AgendaConfig = { timezone: string; durationMinutes: number; bufferBefore: number; bufferAfter: number; minimumNoticeMinutes: number; horizonDays: number };
export type Audit = { createdAt: string; updatedAt: string; updatedBy: string };
export type Exception = Audit & { id: string; kind: 'closed' | 'custom' | 'block'; from: string; through: string; intervals: Interval[]; reason: string };
export type Reservation = { professionalId?: ProfessionalId; slotKeyVersion?: 2 | 3; id: string; fingerprint: string; start: string; end: string; bufferBefore: number; bufferAfter: number; status: 'pending' | 'confirmed'; createdAt: string; event?: CalendarEvent; mode?: 'mock' | 'google_test'; client?: { name: string; email: string; company: string; phone: string; service: string; message: string } };
export type ProfessionalAgenda = { config: AgendaConfig; weekly: Interval[][]; exceptions: Exception[] };
export type AgendaState = Audit & { version: 1 | 2; revision: number; config: AgendaConfig; weekly: Interval[][]; weeklyByProfessional?: Partial<Record<ProfessionalId, Interval[][]>>; professionalAgendas?: Partial<Record<ProfessionalId, ProfessionalAgenda>>; exceptions: Exception[]; reservations: Reservation[] };
// Root rules are the preserved migration template. Admin changes materialize an
// independent agenda for the selected person; they never edit this template.
export function professionalAgenda(state: AgendaState, id: ProfessionalId): AgendaState {
  const own = state.professionalAgendas?.[id];
  return { ...state, ...(own || {}), weekly: own?.weekly || state.weeklyByProfessional?.[id] || state.weekly,
    reservations: state.reservations.filter(record => !record.professionalId || record.professionalId === id) };
}
export function editProfessionalAgenda(state: AgendaState, id: ProfessionalId): ProfessionalAgenda {
  state.professionalAgendas ||= {};
  const effective = professionalAgenda(state, id);
  return state.professionalAgendas[id] ||= structuredClone({ config: effective.config, weekly: effective.weekly, exceptions: effective.exceptions });
}
export class AgendaError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function initialAgenda(): AgendaState {
  const stamp = new Date().toISOString();
  return { version: 2, revision: 0, createdAt: stamp, updatedAt: stamp, updatedBy: 'initial-test', professionalAgendas: {},
    config: { timezone: bookingConfig.timezone, durationMinutes: 30, bufferBefore: 15, bufferAfter: 15, minimumNoticeMinutes: 120, horizonDays: 30 },
    weekly: Array.from({ length: 7 }, (_, day) => day > 0 && day < 6 ? [{ start: bookingConfig.startMinute, end: bookingConfig.endMinute }] : []), exceptions: [], reservations: [] };
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AgendaError('Datos inválidos.');
  return value as Record<string, unknown>;
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}
export function intervals(value: unknown): Interval[] {
  if (!Array.isArray(value) || value.length > 8) throw new AgendaError('Usá hasta ocho franjas por día.');
  const sorted = value.map(item => { const d = object(item); if (Object.keys(d).some(key => !['start','end'].includes(key)) || !Number.isInteger(d.start) || !Number.isInteger(d.end) || Number(d.start) < 0 || Number(d.end) > 1440 || Number(d.start) >= Number(d.end) || Number(d.start) % 5 || Number(d.end) % 5) throw new AgendaError('Las franjas deben avanzar dentro del día, en pasos de 5 minutos.'); return { start: Number(d.start), end: Number(d.end) }; }).sort((a,b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const item of sorted) { const last = merged.at(-1); if (last && item.start <= last.end) last.end = Math.max(last.end, item.end); else merged.push({ ...item }); }
  return merged;
}
export function validateConfig(value: unknown): AgendaConfig {
  const d = object(value);
  const options: Record<string, number[]> = { durationMinutes: [15,30,45,60], bufferBefore: [0,5,10,15,30], bufferAfter: [0,5,10,15,30], minimumNoticeMinutes: [60,120,360,720,1440], horizonDays: [7,14,30,60] };
  if (Object.keys(d).some(key => !['timezone', ...Object.keys(options)].includes(key)) || d.timezone !== 'America/Argentina/Cordoba' || Object.entries(options).some(([key, values]) => !values.includes(d[key] as number))) throw new AgendaError('Configuración inválida. Elegí valores de las opciones disponibles.');
  return d as AgendaConfig;
}
export function validateWeekly(value: unknown): Interval[][] {
  if (!Array.isArray(value) || value.length !== 7) throw new AgendaError('La semana debe tener siete días.');
  return value.map(intervals);
}
export function validateException(value: unknown, prior?: Exception): Exception {
  const d = object(value);
  if (Object.keys(d).some(key => !['kind','from','through','intervals','reason'].includes(key)) || !['closed','custom','block'].includes(String(d.kind)) || !validDate(d.from) || !validDate(d.through) || d.from > d.through || Date.parse(d.through) - Date.parse(d.from) > 366 * 86400000 || d.from < '2020-01-01' || d.through > '2100-12-31' || (d.kind !== 'closed' && d.from !== d.through)) throw new AgendaError('Revisá tipo y fechas de la excepción (máximo 367 días).');
  if (typeof d.reason !== 'string' || d.reason.length > 200 || /[\u0000-\u001f<>]/u.test(d.reason)) throw new AgendaError('El motivo debe tener hasta 200 caracteres sin etiquetas.');
  const ranges = intervals(d.intervals);
  if (d.kind === 'closed' ? ranges.length !== 0 : ranges.length === 0) throw new AgendaError('Completá las franjas para el tipo de excepción elegido.');
  const stamp = new Date().toISOString();
  return { id: prior?.id || randomUUID(), kind: d.kind as Exception['kind'], from: d.from, through: d.through, intervals: ranges, reason: d.reason.trim(), createdAt: prior?.createdAt || stamp, updatedAt: stamp, updatedBy: 'booking-admin' };
}
export function dayRules(state: AgendaState, date: string): { windows: Interval[]; blocks: Interval[]; label: string } {
  const rules = state.exceptions.filter(item => item.from <= date && item.through >= date);
  if (rules.some(item => item.kind === 'closed')) return { windows: [], blocks: [], label: 'Bloqueado' };
  const custom = rules.find(item => item.kind === 'custom');
  const windows = custom?.intervals || state.weekly[new Date(date + 'T12:00:00Z').getUTCDay()]!;
  const blocks: Interval[] = [];
  // Multiple overlapping blocks are a union: a candidate must clear every block.
  blocks.push(...rules.filter(item => item.kind === 'block').flatMap(item => item.intervals));
  return { windows, blocks, label: custom ? 'Horario especial' : blocks.length ? 'Franja bloqueada' : windows.length ? 'Habitual' : 'Cerrado' };
}
export function assertCustomUnique(state: AgendaState, exception: Exception) {
  if (exception.kind === 'custom' && state.exceptions.some(item => item.id !== exception.id && item.kind === 'custom' && item.from === exception.from)) throw new AgendaError('Ya existe un horario personalizado para esa fecha. Editalo desde Excepciones.', 409);
}
