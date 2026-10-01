import { createHmac, randomUUID } from 'node:crypto';
import { bookingServices, publicProfessionals, publicProfessional, professionalById, professionalCalendarEnv, googleTestConfigured } from './booking-config.ts';
import { agendaRepository, memoryAgenda, updateAgenda, type AgendaRepository } from './agenda-repository.ts';
import { professionalAgenda, AgendaError } from './agenda-rules.ts';
import { generateSlots } from './booking-slots.ts';
import { googleProvider, GoogleProviderError, type BookingInput, type CalendarEvent, type CalendarProvider } from './booking-google.ts';
import { memoryBookingStore, redisBookingStore, type BookingStore } from './booking-store.ts';
import { audit, errorId } from './booking-observability.ts';
import { validEmail } from './contact.ts';
type Environment = Record<string, string | undefined>;
class BookingError extends Error {
  status: number;
  code: string;
  field?: string;
  constructor(status: number, code: string, field?: string, detail?: string) { super(detail || code); this.status = status; this.code = code; this.field = field; }
}
const messages: Record<string, string> = {
  invalid_submission: 'No pudimos validar el formulario. Revisá los campos o recargá la página si estaba abierta antes de la última actualización.',
  slot_taken: 'Ese horario acaba de ocuparse. Elegí otro.',
  invalid_slot: 'Ese horario ya no está disponible. Elegí otro.',
  idempotency_conflict: 'Esta solicitud corresponde a otra reserva. Recargá la página para empezar de nuevo.',
  processing: 'La reserva sigue procesándose. Esperá unos segundos y reintentá con los mismos datos.',
  rate_limited: 'Recibimos varios intentos. Esperá unos minutos antes de continuar.',
  unavailable: 'La agenda no está disponible en este momento. Reintentá o contactanos por WhatsApp.',
  google_error: 'No pudimos completar la reserva. Intentá nuevamente.',
  google_uncertain: 'No pudimos confirmar la respuesta de Google. Reintentá con los mismos datos para recuperar la reserva sin duplicarla.',
  test_email: 'Este email no está habilitado para pruebas.',
  forbidden: 'No pudimos verificar el origen de la solicitud.',
};
export function validateBooking(data: unknown): BookingInput {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BookingError(400, 'invalid_submission');
  const d = data as Record<string, unknown>;
  const fields = ['professionalId', 'requestId', 'start', 'end', 'name', 'email', 'company', 'phone', 'service', 'message', 'consent', '_gotcha'];
  function invalid(field: string, detail: string): never { throw new BookingError(400, 'invalid_submission', field, detail); }
  if (Object.keys(d).some(key => !fields.includes(key))) throw new BookingError(400, 'invalid_submission');
  if (d.consent !== true) invalid('consent', 'Aceptá que usemos tus datos para coordinar la reunión.');
  if (d._gotcha !== undefined && d._gotcha !== '') throw new BookingError(400, 'invalid_submission', undefined, 'La comprobación automática del formulario falló. Recargá la página y completá los campos visibles manualmente.');
  const labels: Record<string, string> = { name: 'nombre', email: 'email', company: 'empresa', phone: 'teléfono', service: 'servicio', message: 'mensaje', professionalId: 'profesional', requestId: 'identificador de reserva', start: 'horario' };
  const text = (key: string, max: number, required = false) => {
    const value = d[key] ?? '';
    const unsafe = key === 'message' ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f<>]/u : /[\u0000-\u001f\u007f-\u009f<>]/u;
    if (typeof value !== 'string') invalid(key, 'Revisá el campo ' + labels[key] + '.');
    if (value.length > max) invalid(key, 'El campo ' + labels[key] + ' admite hasta ' + max + ' caracteres.');
    if (unsafe.test(value)) invalid(key, 'Quitá los caracteres de control o los signos < y > del campo ' + labels[key] + '.');
    if (required && !value.trim()) invalid(key, 'Completá el campo ' + labels[key] + '.');
    return value.normalize('NFC').trim();
  };
  const professional = professionalById(text('professionalId', 20, true));
  if (!professional) invalid('professionalId', 'Elegí a Misael o a Tomás antes de confirmar. Si no aparecen, recargá la página.');
  const result: BookingInput = { professionalId: professional.id, requestId: text('requestId', 36, true), start: text('start', 24, true), name: text('name', 120, true), email: text('email', 254, true).toLowerCase(), company: text('company', 160), phone: text('phone', 40), service: text('service', 60, true), message: text('message', 1500), consent: true };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.requestId)) invalid('requestId', 'Recargá la página para iniciar una nueva reserva.');
  if (!validEmail(result.email)) invalid('email', 'Ingresá un email válido, por ejemplo nombre@dominio.com.');
  if (!bookingServices.some(service => service === result.service)) invalid('service', 'Elegí un servicio de la lista.');
  if (result.phone) {
    const normalized = result.phone.replace(/[\s().-]/gu, '');
    if (!/^\+?\d{7,15}$/.test(normalized)) invalid('phone', 'Ingresá un teléfono de 7 a 15 dígitos, con código de país opcional, o dejalo vacío.');
    result.phone = normalized;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(result.start) || !Number.isFinite(Date.parse(result.start)) || new Date(result.start).toISOString() !== result.start) throw new BookingError(400, 'invalid_slot');
  if (d.end !== undefined) { result.end = text('end', 24, true); if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/.test(result.end) || !Number.isFinite(Date.parse(result.end)) || new Date(result.end).toISOString() !== result.end || Date.parse(result.end) <= Date.parse(result.start)) throw new BookingError(400, 'invalid_slot'); }
  return result;
}
async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new BookingError(415, 'invalid_submission');
  if (!request.body) throw new BookingError(400, 'invalid_submission');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw new BookingError(413, 'invalid_submission'); } chunks.push(value); }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new BookingError(400, 'invalid_submission'); }
  } finally { reader.releaseLock(); }
}
export function createBookingHandler(dependencies: { store?: BookingStore; calendar?: CalendarProvider; now?: () => Date; repository?: AgendaRepository; persistent?: boolean } = {}) {
  const mockStore = memoryBookingStore();
  const memoryRepository = memoryAgenda();
  const mockEvents = new Map<string, CalendarEvent>();
  return async function handle(request: Request, env: Environment, fetchImpl: typeof fetch = fetch): Promise<Response> {
    const traceId = errorId();
    const respond = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '600' } : {}), ...(status === 405 ? { Allow: 'GET, POST' } : {}) } });
    try {
      if (!['GET', 'POST'].includes(request.method)) return respond(405, { ok: false, message: 'Método no permitido.' });
      const url = new URL(request.url);
      const local = env.NODE_ENV !== 'production' && env.VERCEL !== '1' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      const mode = env.BOOKING_MODE || 'mock';
      // Phase-one production gate: no deployed environment can create bookings.
      if (!local || !['mock', 'google_test'].includes(mode)) throw new BookingError(503, 'unavailable');
      if ((request.method === 'POST' && request.headers.get('origin') !== url.origin) || (request.headers.get('origin') && request.headers.get('origin') !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') throw new BookingError(403, 'forbidden');

      const store = dependencies.store || (mode === 'mock' ? mockStore : redisBookingStore(env, fetchImpl));
      const secret = mode === 'mock' ? 'local-mock-no-external-credentials' : env.CONTACT_RATE_LIMIT_SECRET!;
      const hash = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
      const prefix = 'reac:booking:v1:' + mode + ':' + hash(env.GOOGLE_CALENDAR_ID || 'mock') + ':';
      if (!await store.rate(prefix + 'rate:' + request.method + ':loopback', request.method === 'GET' ? 120 : 30)) throw new BookingError(429, 'rate_limited');
      const submission = request.method === 'POST' ? await readJson(request) : null;
      const input = request.method === 'POST' ? validateBooking(submission) : null;
      const selected = professionalById(input?.professionalId || url.searchParams.get('professionalId') || 'misael');
      if (!selected || !selected.enabled) throw new BookingError(400, 'invalid_submission', 'professionalId', 'Elegí a Misael o a Tomás.');
      const professionalId = selected.id;
      const calendarEnv = professionalCalendarEnv(env, professionalId);
      if (mode === 'google_test' && !googleTestConfigured(env)) throw new BookingError(503, 'unavailable');


      const now = dependencies.now?.() || new Date();
      const repository = dependencies.repository || (dependencies.persistent ? agendaRepository(env, fetchImpl) : memoryRepository);
      const rootState = await repository.read();
      const state = professionalAgenda(rootState, professionalId);
      // Duration joins the slot lock; atomic interval admission remains the authority.
      const priorReservation = input && rootState.reservations.find(item => item.id === input.requestId);
      const duration = priorReservation ? (Date.parse(priorReservation.end) - Date.parse(priorReservation.start)) / 60000 : state.config.durationMinutes;
      const slotIdentity = (start: string) => professionalId + ':' + start + ':' + duration;
      const key = (start: string) => prefix + 'slot:v3:' + hash(slotIdentity(start));
      const candidates = generateSlots(now, [], rootState, professionalId);
      const provider = dependencies.calendar || (mode === 'google_test' ? googleProvider(calendarEnv, fetchImpl, state.config) : {
        async busy() { return []; }, async get(id: string) { return mockEvents.get(id) || (await repository.read()).reservations.find(item => item.event?.id === id)?.event || null; },
        async insert(id: string, fingerprint: string) { const event = { id, extendedProperties: { private: { bookingFingerprint: fingerprint } } }; mockEvents.set(id, event); return event; },
      });
      if (request.method === 'GET') {
        audit('booking.availability.request', { requestId: traceId, professionalId, status: 200 });
        const busy = await provider.busy(candidates);
        // FreeBusy and rule generation use the same snapshot/horizon. The next
        // request reads fresh rules; POST always revalidates independently.
        const available = generateSlots(now, busy, rootState, professionalId);
        const holds = await store.getMany(available.map(slot => key(slot.start)));
        return respond(200, { ok: true, mode, professionalId, timezone: state.config.timezone, durationMinutes: state.config.durationMinutes, services: bookingServices, professionals: publicProfessionals(), slots: available.filter((_, index) => !holds[index]) });
      }
      if (!input) throw new BookingError(400, 'invalid_submission');
      if (mode === 'google_test' && !env.BOOKING_TEST_EMAILS!.split(',').map(value => value.trim().toLowerCase()).includes(input.email)) throw new BookingError(400, 'test_email');
      const previous = rootState.reservations.find(item => item.id === input.requestId);
      let fingerprint = hash(JSON.stringify(input));
      // Older v1 fingerprints included formatted telephone text. Recover the
      // same original request without weakening ownership or payload binding.
      if (previous && previous.slotKeyVersion !== 2 && previous.slotKeyVersion !== 3 && previous.fingerprint !== fingerprint) {
        const rawPhone = (submission as Record<string, unknown>).phone;
        const legacyFingerprint = hash(JSON.stringify({ ...input, phone: typeof rawPhone === 'string' ? rawPhone.normalize('NFC').trim() : '' }));
        if (legacyFingerprint === previous.fingerprint) fingerprint = legacyFingerprint;
      }
      const expiry = Math.max(600, Math.ceil((Date.parse(input.start) - now.getTime()) / 1000) + 7200);
      const requestKey = prefix + 'request:' + hash(input.requestId);
      // Bind request ID to normalized data before touching Calendar. Retain through slot expiry.
      const eligible = candidates.find(item => item.start === input.start);

      if (previous && previous.fingerprint !== fingerprint) throw new BookingError(409, 'idempotency_conflict');
      const prior = await store.getMany([requestKey, key(input.start)]);
      if (prior[0] && prior[0] !== fingerprint) throw new BookingError(409, 'idempotency_conflict');
      // Existing requests may be reconciled even after the notice window closes.
      if (!eligible && !previous) {
        if (state.reservations.some(item => (!item.professionalId || item.professionalId === professionalId) && item.start === input.start)) throw new BookingError(409, 'slot_taken');
        throw new BookingError(input.end ? 409 : 400, 'invalid_slot');
      }
      if (input.end && (eligible?.end || previous?.end) !== input.end) throw new BookingError(409, 'invalid_slot');
      const slot = eligible || { start: input.start, end: previous!.end, date: '', label: '' };
      if (!await store.claim(requestKey, fingerprint, expiry)) throw new BookingError(409, 'idempotency_conflict');
      if (!await store.claim(key(slot.start), fingerprint, expiry)) throw new BookingError(409, 'slot_taken');
      const lease = randomUUID(); const leaseKey = prefix + 'working:v2:' + hash(slotIdentity(slot.start));
      if (!await store.claim(leaseKey, lease, 120)) throw new BookingError(409, 'processing');
      let eventMayExist = false;
      let pendingInserted = false;
      try {
        await updateAgenda(repository, current => {
          const existing = current.reservations.find(item => item.id === input.requestId);
          if (existing) { if (existing.fingerprint !== fingerprint) throw new BookingError(409, 'idempotency_conflict'); return; }
          if (!generateSlots(now, [], current, professionalId).some(item => item.start === slot.start && item.end === slot.end)) throw new BookingError(409, 'invalid_slot');
          const rules = professionalAgenda(current, professionalId);
          const { name, email, company, phone, service, message } = input;
          current.reservations.push({ mode: mode as 'mock' | 'google_test', client: { name, email, company, phone, service, message }, slotKeyVersion: 3, professionalId: input.professionalId, id: input.requestId, fingerprint, start: slot.start, end: slot.end, bufferBefore: rules.config.bufferBefore, bufferAfter: rules.config.bufferAfter, status: 'pending', createdAt: now.toISOString() });
        });
        pendingInserted = true;
        const eventId = previous?.event?.id || 'reac' + hash(previous && !previous.slotKeyVersion ? slot.start : previous?.slotKeyVersion === 2 ? professionalId + ':' + slot.start : slotIdentity(slot.start)); // Google-compatible base32hex subset.
        let event = await provider.get(eventId);
        if (!event) {
          const busy = await provider.busy([slot]);
          const fresh = await repository.read();
          fresh.reservations = fresh.reservations.filter(item => item.id !== input.requestId);
          if (JSON.stringify(professionalAgenda(fresh, professionalId).config) !== JSON.stringify(state.config) || !generateSlots(dependencies.now?.() || new Date(), busy, fresh, professionalId).some(item => item.start === slot.start && item.end === slot.end)) {
            await updateAgenda(repository, current => { current.reservations = current.reservations.filter(item => item.id !== input.requestId); });
            await store.remove(key(slot.start), fingerprint);
            throw new BookingError(409, busy.length ? 'slot_taken' : 'invalid_slot');
          }
          eventMayExist = true;
          event = await provider.insert(eventId, fingerprint, input, slot);
        }
        if (event.extendedProperties?.private?.bookingFingerprint !== fingerprint || event.status === 'cancelled') {
          await updateAgenda(repository, current => { current.reservations = current.reservations.filter(item => item.id !== input.requestId || item.fingerprint !== fingerprint || item.status !== 'pending'); });
          await store.remove(key(slot.start), fingerprint);
          await store.remove(requestKey, fingerprint);
          throw new BookingError(409, 'slot_taken');
        }
        await updateAgenda(repository, current => { const record = current.reservations.find(item => item.id === input.requestId); if (record) { record.event = event; record.status = 'confirmed'; } });
        let meetUrl: string | null = null;
        if (event.hangoutLink && /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(event.hangoutLink)) meetUrl = event.hangoutLink;
        if (mode === 'google_test') audit(previous ? 'booking.google.reconciled' : 'booking.google.created', { requestId: traceId, professionalId, status: 200 });
        audit('booking.created', { requestId: traceId, professionalId, status: 200 });
        return respond(200, { ok: true, mode, professional: publicProfessional(input.professionalId), eventId: event.id, start: slot.start, end: slot.end, durationMinutes: (Date.parse(slot.end) - Date.parse(slot.start)) / 60000, timezone: state.config.timezone, meetUrl, testMeetUrl: mode === 'mock' ? 'https://meet.google.com/test-local-only' : null, conferenceStatus: meetUrl ? 'ready' : mode === 'mock' ? 'mock' : event.conferenceData?.createRequest?.status?.statusCode || 'pending', invitationSent: false });
      } catch (error) {
        if (error instanceof BookingError) {
          if (!eventMayExist && !pendingInserted) { await store.remove(key(slot.start), fingerprint); await store.remove(requestKey, fingerprint); }
          throw error;
        }
        const definite = !eventMayExist || error instanceof GoogleProviderError && error.definitelyNotCreated;
        if (definite) {
          try {
            if (pendingInserted) await updateAgenda(repository, current => { current.reservations = current.reservations.filter(item => item.id !== input.requestId || item.fingerprint !== fingerprint || item.status !== 'pending'); });
            await store.remove(key(slot.start), fingerprint);
            await store.remove(requestKey, fingerprint);
          } catch { throw new BookingError(503, 'google_uncertain'); }
        }
        if (!definite) {
          audit('booking.google.uncertain', { requestId: traceId, professionalId, status: 502, code: error instanceof GoogleProviderError ? error.code : 'provider_unknown' });
          throw new BookingError(502, 'google_uncertain');
        }
        audit('booking.google.failed', { requestId: traceId, professionalId, status: 502, code: error instanceof GoogleProviderError ? error.code : 'provider_error' });
        throw new BookingError(502, 'google_error');
      } finally { await store.remove(leaseKey, lease); }
    } catch (error) {
      const safe = error instanceof BookingError ? error : error instanceof AgendaError ? new BookingError(error.status, 'processing') : new BookingError(503, 'unavailable');
      audit(safe.status === 409 ? 'booking.conflict' : 'booking.failed', { requestId: traceId, status: safe.status, code: safe.code });
      return respond(safe.status, { ok: false, ...(safe.status >= 500 ? { errorId: traceId } : {}), code: safe.code, message: safe.message !== safe.code ? safe.message : messages[safe.code] || messages.unavailable, ...(safe.field ? { field: safe.field } : {}) });
    }
  };
}
export const handleBooking = createBookingHandler({ persistent: true });
