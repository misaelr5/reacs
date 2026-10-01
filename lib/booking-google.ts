import { randomUUID } from 'node:crypto';
import { bookingConfig, professionalById, type ProfessionalId } from './booking-config.ts';
import type { Busy, Slot } from './booking-slots.ts';
import type { AgendaConfig } from './agenda-rules.ts';
export type BookingInput = { requestId: string; professionalId: ProfessionalId; start: string; end?: string; name: string; email: string; company: string; phone: string; service: string; message: string; consent: true };
export type CalendarEvent = { id: string; status?: string; summary?: string; hangoutLink?: string; attendees?: { email?: string }[]; start?: { dateTime?: string; timeZone?: string }; end?: { dateTime?: string; timeZone?: string }; extendedProperties?: { private?: { bookingFingerprint?: string; professionalId?: ProfessionalId; environment?: string; bookingRequestId?: string } }; conferenceData?: { createRequest?: { status?: { statusCode?: string } } } };
export class GoogleProviderError extends Error {
  code: string;
  phase: 'oauth' | 'freebusy' | 'read' | 'insert';
  definitelyNotCreated: boolean;
  constructor(code: string, phase: GoogleProviderError['phase'], definitelyNotCreated: boolean) { super(code); this.code = code; this.phase = phase; this.definitelyNotCreated = definitelyNotCreated; }
}
function statusCode(status: number, phase: GoogleProviderError['phase']) {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'calendar_not_found';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'upstream_unavailable';
  return phase === 'insert' && status === 409 ? 'event_conflict' : 'provider_rejected';
}
export interface CalendarProvider {
  busy(slots: Slot[]): Promise<Busy[]>;
  get(id: string): Promise<CalendarEvent | null>;
  insert(id: string, fingerprint: string, input: BookingInput, slot: Slot): Promise<CalendarEvent>;
}
export interface GoogleTestProvider extends CalendarProvider {
  deleteTestEvent(id: string, fingerprint: string, bookingRequestId: string, professionalId: ProfessionalId): Promise<'deleted' | 'already-absent'>;
}
export function googleProvider(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch, config: Pick<AgendaConfig, 'timezone' | 'bufferBefore' | 'bufferAfter'> = { timezone: bookingConfig.timezone, bufferBefore: bookingConfig.bufferMinutes, bufferAfter: bookingConfig.bufferMinutes }): GoogleTestProvider {
  let token: Promise<string> | undefined;
  async function accessToken(): Promise<string> {
    token ??= (async () => {
      let result: Response;
      try { result = await fetchImpl('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(6000), body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: env.GOOGLE_REFRESH_TOKEN!, grant_type: 'refresh_token' }) }); }
      catch { throw new GoogleProviderError('oauth_unreachable', 'oauth', true); }
      if (!result.ok) {
        const body = await result.json().catch(() => null) as { error?: unknown } | null;
        throw new GoogleProviderError(body?.error === 'invalid_grant' ? 'invalid_grant' : statusCode(result.status, 'oauth'), 'oauth', true);
      }
      const data = await result.json().catch(() => null) as { access_token?: string } | null;
      if (!data?.access_token) throw new GoogleProviderError('oauth_invalid_response', 'oauth', true);
      return data.access_token;
    })();
    return token;
  }
  const base = 'https://www.googleapis.com/calendar/v3';
  const events = '/calendars/' + encodeURIComponent(env.GOOGLE_CALENDAR_ID!) + '/events';
  async function request(path: string, phase: GoogleProviderError['phase'], body?: unknown, method = body ? 'POST' : 'GET'): Promise<Response> {
    const access = await accessToken();
    try { return await fetchImpl(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(6000), headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
    catch { throw new GoogleProviderError('network_timeout', phase, phase !== 'insert'); }
  }
  const provider: GoogleTestProvider = {
    async busy(slots) {
      if (!slots.length) return [];
      const result = await request('/freeBusy', 'freebusy', { timeMin: new Date(Date.parse(slots[0]!.start) - config.bufferBefore * 60000).toISOString(), timeMax: new Date(Date.parse(slots.at(-1)!.end) + config.bufferAfter * 60000).toISOString(), timeZone: config.timezone, items: [{ id: env.GOOGLE_CALENDAR_ID }] });
      if (!result.ok) throw new GoogleProviderError(statusCode(result.status, 'freebusy'), 'freebusy', true);
      const data = await result.json().catch(() => null) as { calendars?: Record<string, { errors?: unknown[]; busy?: Busy[] }> } | null;
      const calendar = data?.calendars?.[env.GOOGLE_CALENDAR_ID!];
      if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy) || calendar.busy.some(item => !Number.isFinite(Date.parse(item.start)) || !Number.isFinite(Date.parse(item.end)) || Date.parse(item.end) <= Date.parse(item.start))) throw new GoogleProviderError('freebusy_invalid_response', 'freebusy', true);
      return calendar.busy;
    },
    async get(id) {
      const result = await request(events + '/' + id, 'read');
      if (result.status === 404) return null;
      if (!result.ok) throw new GoogleProviderError(statusCode(result.status, 'read'), 'read', true);
      const data = await result.json().catch(() => null) as CalendarEvent | null;
      if (!data?.id) throw new GoogleProviderError('event_invalid_response', 'read', true);
      return data;
    },
    async insert(id, fingerprint, input, slot) {
      // Escape HTML because Calendar event descriptions support markup.
      const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
      const description = ['Reserva realizada desde Reac Studio', 'Environment: GOOGLE_TEST', 'Profesional: ' + professionalById(input.professionalId)!.name, 'Especialidad: ' + professionalById(input.professionalId)!.specialty, 'Nombre: ' + input.name, 'Empresa: ' + input.company, 'Email: ' + input.email, 'Teléfono: ' + input.phone, 'Servicio: ' + input.service, 'Mensaje: ' + input.message, 'Fecha de creación: ' + new Date().toISOString(), 'Origen: Web Reac Studio'].map(escape).join('\n');
      const result = await request(events + '?conferenceDataVersion=1&sendUpdates=none', 'insert', {
        id, summary: '[TEST] Llamada de diagnóstico — Reac Studio × ' + (input.company || input.name), description,
        start: { dateTime: slot.start, timeZone: config.timezone }, end: { dateTime: slot.end, timeZone: config.timezone },
        attendees: [{ email: input.email, displayName: input.name }],
        guestsCanModify: false, guestsCanInviteOthers: false, guestsCanSeeOtherGuests: false,
        extendedProperties: { private: { bookingFingerprint: fingerprint, professionalId: input.professionalId, environment: 'google_test', bookingRequestId: input.requestId } },
        conferenceData: { createRequest: { requestId: randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      });
      if (result.status === 409) {
        const existing = await provider.get(id);
        if (existing) return existing;
        throw new GoogleProviderError('event_conflict', 'insert', false);
      }
      if (!result.ok) throw new GoogleProviderError(statusCode(result.status, 'insert'), 'insert', result.status >= 400 && result.status < 500);
      const event = await result.json().catch(() => null) as CalendarEvent | null;
      if (!event?.id) throw new GoogleProviderError('event_invalid_response', 'insert', false);
      return event;
    },
    async deleteTestEvent(id, fingerprint, bookingRequestId, professionalId) {
      const event = await provider.get(id);
      if (!event) return 'already-absent';
      const privateData = event.extendedProperties?.private;
      if (event.id !== id || !event.summary?.startsWith('[TEST] ') || privateData?.environment !== 'google_test' || privateData?.professionalId !== professionalId || privateData.bookingRequestId !== bookingRequestId || privateData.bookingFingerprint !== fingerprint) throw new GoogleProviderError('test_event_identity_mismatch', 'read', true);
      const result = await request(events + '/' + encodeURIComponent(id) + '?sendUpdates=none', 'insert', undefined, 'DELETE');
      if (result.status === 404) return 'already-absent';
      if (!result.ok) throw new GoogleProviderError(statusCode(result.status, 'insert'), 'insert', false);
      return 'deleted';
    },
  };
  return provider;
}
