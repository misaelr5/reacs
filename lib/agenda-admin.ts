import { professionalById, publicProfessional, publicProfessionals, professionalCalendarEnv, googleTestConfigured } from './booking-config.ts';
import { audit, errorId } from './booking-observability.ts';
import { bookingHealth, probeBookingHealth } from './booking-health.ts';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { adminAuth, adminJson, localOnly, sameOrigin } from './agenda-auth.ts';
import { agendaRepository, updateAgenda, type AgendaRepository } from './agenda-repository.ts';
import { professionalAgenda, editProfessionalAgenda, AgendaError, assertCustomUnique, dayRules, validDate, validateConfig, validateException, validateWeekly } from './agenda-rules.ts';
import { dateInZone, generateSlots } from './booking-slots.ts';
import { googleProvider } from './booking-google.ts';
import type { BookingStore } from './booking-store.ts';
export function createAdminHandler(dependencies: { repository?: AgendaRepository; sessions?: BookingStore; now?: () => Date } = {}) {
  return async (request: Request, env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): Promise<Response> => {
    const traceId = errorId();
    const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
    const json = (status: number, value: unknown, extra = {}) => Response.json(value, { status, headers: { ...headers, ...extra } });
    try {
      localOnly(request, env);
      const url = new URL(request.url); const action = url.searchParams.get('action') || 'state';
      const page = url.pathname === '/admin/login' || url.searchParams.get('view') === 'login' ? 'login' : url.pathname === '/admin/agenda' || url.searchParams.get('view') === 'agenda' ? 'agenda' : null;
      if (page && request.method !== 'GET') throw new AgendaError('Método no permitido.', 405);
      if (page === 'login') return new Response(await readFile(new URL('../content/admin-login.html', import.meta.url), 'utf8'), { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
      const auth = adminAuth(env, fetchImpl, dependencies.sessions);
      if (action === 'login' && request.method === 'POST' && !page) {
        sameOrigin(request); const body = await adminJson(request);
        try { return json(200, { ok: true }, { 'Set-Cookie': await auth.login(body.password, request) }); }
        catch (error) { audit('auth.login.failed', { requestId: traceId, status: error instanceof AgendaError ? error.status : 503 }); throw error; }
      }
      if (!await auth.authenticated(request)) {
        if (page) return new Response(null, { status: 303, headers: { ...headers, Location: '/admin/login' } });
        throw new AgendaError('Iniciá sesión para continuar.', 401);
      }
      if (page === 'agenda') return new Response(await readFile(new URL('../content/admin-agenda.html', import.meta.url), 'utf8'), { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } });
      if (request.method !== 'GET') sameOrigin(request);
      if (action === 'logout' && request.method === 'POST') return json(200, { ok: true }, { 'Set-Cookie': await auth.logout(request) });
      const repository = dependencies.repository || agendaRepository(env, fetchImpl);
      if (action === 'health' && request.method === 'GET') {
        const report = bookingHealth(env); let storageState = 'ok';
        try { await repository.read(); } catch { storageState = 'unavailable'; }
        return json(200, { ...report, storageState, ...(url.searchParams.get('probe') === '1' ? { probe: await probeBookingHealth(env, fetchImpl) } : {}) });
      }
      const selected = professionalById(url.searchParams.get('professionalId') || 'misael');
      if (!selected || !selected.enabled) throw new AgendaError('Elegí un profesional válido.');
      const professionalId = selected.id;
      if (action === 'state' && request.method === 'GET') {
        const root = await repository.read(); const state = { ...professionalAgenda(root, professionalId), professionalAgendas: undefined, weeklyByProfessional: undefined }; const now = dependencies.now?.() || new Date();
        const allSlots = (snapshot: typeof state, busy: Parameters<typeof generateSlots>[1] = []) => generateSlots(now, busy, snapshot, professionalId).map(slot => ({ ...slot, professionalId }));
        const candidates = allSlots(state);
        let slots = candidates; let calendarError = false;
        if (env.BOOKING_MODE === 'google_test') { if (!googleTestConfigured(env)) { slots = []; calendarError = true; } else try { slots = allSlots(state, await googleProvider(professionalCalendarEnv(env, professionalId), fetchImpl, state.config).busy(candidates)); } catch { slots = []; calendarError = true; } }
        const today = dateInZone(now, state.config.timezone);
        const days = Array.from({ length: 93 }, (_, index) => { const date = new Date(Date.parse(today.slice(0,7) + '-01T12:00:00Z') + index * 86400000).toISOString().slice(0,10); const rules = dayRules(state, date); return { date, label: rules.label, past: date < today, available: slots.filter(slot => slot.date === date).length, reservations: state.reservations.filter(item => dateInZone(new Date(item.start), state.config.timezone) === date).map(item => ({ id: item.id, start: item.start, end: item.end, status: item.status, professional: publicProfessional(item.professionalId) })) }; });
        const weekStart = new Date(Date.parse(today + 'T12:00:00Z')); weekStart.setUTCDate(weekStart.getUTCDate() - (weekStart.getUTCDay() + 6) % 7);
        const weekEnd = new Date(weekStart.getTime() + 7 * 86400000).toISOString().slice(0,10); const week = weekStart.toISOString().slice(0,10);
        const reservations = state.reservations.filter(item => item.status === 'confirmed' && dateInZone(new Date(item.start), state.config.timezone) >= week && dateInZone(new Date(item.start), state.config.timezone) < weekEnd);
        const next = state.reservations.filter(item => item.status === 'confirmed' && Date.parse(item.start) >= now.getTime()).sort((a,b) => a.start.localeCompare(b.start))[0];
        const baseline = allSlots({ ...state, exceptions: [], reservations: [] });
        const administrative = allSlots({ ...state, reservations: [] });
        const upcoming = state.reservations.filter(item => Date.parse(item.end) >= now.getTime()).sort((a,b) => a.start.localeCompare(b.start)).slice(0,100).map(item => ({ id: item.id, start: item.start, end: item.end, status: item.status, mode: item.mode || 'legacy', professional: publicProfessional(item.professionalId), client: item.client || null }));
        return json(200, { ok: true, professionalId, professional: publicProfessional(professionalId), professionals: publicProfessionals(), upcoming, storage: repository.kind, mode: env.BOOKING_MODE || 'mock', revision: state.revision, config: state.config, weekly: state.weekly, exceptions: state.exceptions, updatedAt: state.updatedAt, today, days, calendarError, summary: { available: calendarError ? null : slots.filter(slot => slot.date >= week && slot.date < weekEnd).length, blocked: baseline.filter(slot => slot.date >= week && slot.date < weekEnd && !administrative.some(item => item.start === slot.start && item.professionalId === slot.professionalId)).length, reservations: reservations.length, next: next?.start || null, nextProfessional: publicProfessional(next?.professionalId) } });
      }
      const validAction = action === 'config' && request.method === 'PUT' || action === 'exception' && ['POST','PUT','DELETE'].includes(request.method) || action === 'reset-day' && request.method === 'POST';
      if (!validAction) throw new AgendaError('Ruta o método no permitido.', 405);
      const body = await adminJson(request);
      if (!Number.isSafeInteger(body.revision)) throw new AgendaError('Falta la versión de la agenda. Recargá el panel.', 409);
      const id = url.searchParams.get('id');
      await updateAgenda(repository, root => {
        const own = editProfessionalAgenda(root, professionalId);
        const state = { ...root, ...own };
        if (state.revision !== body.revision) throw new AgendaError('La agenda cambió en otra sesión. Recargá antes de guardar.', 409);
        if (action === 'reset-day') {
          if (!validDate(body.date)) throw new AgendaError('Fecha inválida.');
          const date = body.date;
          const adjacent = (delta: number) => new Date(Date.parse(date + 'T12:00:00Z') + delta * 86400000).toISOString().slice(0,10);
          state.exceptions = state.exceptions.flatMap(item => {
            if (item.from > date || item.through < date) return [item];
            const pieces = [];
            if (item.from < date) pieces.push({ ...item, through: adjacent(-1), updatedAt: new Date().toISOString(), updatedBy: 'booking-admin' });
            if (item.through > date) pieces.push({ ...item, id: pieces.length ? randomUUID() : item.id, from: adjacent(1), updatedAt: new Date().toISOString(), updatedBy: 'booking-admin' });
            return pieces;
          });
        }
        else if (action === 'config') { state.config = validateConfig(body.config); state.weekly = validateWeekly(body.weekly); }
        else {
          const prior = state.exceptions.find(item => item.id === id);
          if (request.method !== 'POST' && !prior) throw new AgendaError('La excepción ya no existe.', 404);
          if (request.method === 'DELETE') state.exceptions = state.exceptions.filter(item => item.id !== id);
          else {
            if (state.exceptions.length >= 300 && !prior) throw new AgendaError('Límite de 300 excepciones. Eliminá las que ya no necesites.');
            const exception = validateException(body.exception, prior); assertCustomUnique(state, exception);
            state.exceptions = state.exceptions.filter(item => item.id !== exception.id); state.exceptions.push(exception);
          }
        }
        Object.assign(own, { config: state.config, weekly: state.weekly, exceptions: state.exceptions });
        root.updatedAt = new Date().toISOString(); root.updatedBy = 'booking-admin';
      });
      audit(action === 'exception' ? request.method === 'DELETE' ? 'admin.exception.deleted' : request.method === 'POST' ? 'admin.exception.created' : 'admin.exception.updated' : 'admin.schedule.updated', { requestId: traceId, professionalId, status: 200 });
      return json(200, { ok: true });
    } catch (error) { const safe = error instanceof AgendaError ? error : new AgendaError('No pudimos acceder a la agenda. Reintentá sin sobrescribir tus cambios.', 503); audit('admin.failed', { requestId: traceId, status: safe.status }); return json(safe.status, { ok: false, message: safe.message, ...(safe.status >= 500 ? { errorId: traceId } : {}) }, safe.status === 429 ? { 'Retry-After': '600' } : {}); }
  };
}
export const handleAdmin = createAdminHandler();
