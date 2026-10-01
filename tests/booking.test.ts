import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createBookingHandler, validateBooking } from '../lib/booking.ts';
import { generateSlots, wallTime } from '../lib/booking-slots.ts';
import { bookingConfig } from '../lib/booking-config.ts';
import { initialAgenda } from '../lib/agenda-rules.ts';
import { memoryAgenda } from '../lib/agenda-repository.ts';
import { createAdminHandler } from '../lib/agenda-admin.ts';
import { memoryBookingStore, redisBookingStore } from '../lib/booking-store.ts';
import { googleProvider, type CalendarProvider, type CalendarEvent } from '../lib/booking-google.ts';
const now = new Date('2026-09-28T11:00:00Z'); // Monday 08:00 Córdoba.
const start = '2026-09-28T13:00:00.000Z';
const valid = () => ({ requestId: randomUUID(), start, name: 'Persona de prueba', email: 'person@example.test', company: '', phone: '', professionalId: 'misael', service: 'Desarrollo web', message: '', consent: true });
const request = (body?: unknown, origin = 'http://127.0.0.1:4174') => new Request('http://127.0.0.1:4174/api/booking', body ? { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
const handler = (calendar?: CalendarProvider) => createBookingHandler({ now: () => now, calendar });
test('professional choice is required, persists for either person and cannot change on retry', async () => {
  for (const professionalId of [undefined, '', 'other', '<script>', 123]) assert.throws(() => validateBooking({ ...valid(), professionalId }));
  for (const [professionalId, name, specialty] of [['misael', 'Misael', 'Desarrollador web'], ['tomas', 'Tomás', 'Especialista en marketing']]) {
    const repository = memoryAgenda(); const handle = createBookingHandler({ repository, now: () => now });
    const input = { ...valid(), professionalId };
    const response = await handle(request(input), {}); assert.equal(response.status, 200);
    assert.partialDeepStrictEqual((await response.json()).professional, { id: professionalId, name, specialty });
    assert.equal((await repository.read()).reservations[0].professionalId, professionalId);
    const admin = createAdminHandler({ repository, now: () => now });
    const origin = 'http://127.0.0.1:4174'; const env = { BOOKING_ADMIN_SECRET: 'test-only-professional-admin-secret-32' };
    const login = await admin(new Request(origin + '/api/admin?action=login', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ password: env.BOOKING_ADMIN_SECRET }) }), env);
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const panel = await (await admin(new Request(origin + '/api/admin?action=state&professionalId=' + professionalId, { headers: { cookie } }), env)).json();
    assert.partialDeepStrictEqual(panel.days.find((day: { date: string }) => day.date === '2026-09-28').reservations[0].professional, { id: professionalId, name, specialty });
    assert.equal((await handle(request(input), {})).status, 200);
    const changed = await handle(request({ ...input, professionalId: professionalId === 'misael' ? 'tomas' : 'misael' }), {});
    assert.equal(changed.status, 409); assert.equal((await changed.json()).code, 'idempotency_conflict');
    const available = await (await handle(new Request('http://127.0.0.1:4174/api/booking?professionalId=' + professionalId), {})).json();
    assert.equal(available.professionals.length, 2);
    assert.ok(!available.slots.some((slot: { start: string }) => slot.start === input.start));
  }
});
test('default agenda: weekdays 09:00–16:00 Córdoba, no call ends after closing', () => {
  const agenda = initialAgenda();
  assert.deepEqual(agenda.weekly, [[], ...Array.from({ length: 5 }, () => [{ start: 540, end: 960 }]), []]);
  const slots = generateSlots(new Date('2026-09-28T10:00:00Z'), [], agenda);
  assert.equal(slots[0].label, '09:00');
  for (const slot of slots) {
    const end = new Intl.DateTimeFormat('en-GB', { timeZone: agenda.config.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(slot.end));
    assert.ok(slot.label >= '09:00' && end <= '16:00');
  }
});
test('slots: zone, duration, enabled days, horizon, buffer spacing and notice', () => {
  const slots = generateSlots(now);
  assert.equal(slots[0]?.start, '2026-09-28T13:30:00.000Z'); assert.equal(slots[0]?.label, '10:30');
  assert.equal(slots[1]?.start, '2026-09-28T14:15:00.000Z');
  for (const slot of slots) { assert.equal(Date.parse(slot.end) - Date.parse(slot.start), 1800000); assert.ok([1,2,3,4,5].includes(new Date(slot.start).getUTCDay())); assert.ok(Date.parse(slot.start) >= now.getTime() + 7200000); assert.ok(slot.date < '2026-10-28'); }
  assert.ok(generateSlots(new Date('2026-09-28T18:01:00Z')).every(slot => slot.date > '2026-09-28'));
});
test('slots: occupied intervals and both sides of buffer, including all-day', () => {
  const slots = generateSlots(now, [{ start: '2026-09-28T13:35:00Z', end: '2026-09-28T13:40:00Z' }]);
  assert.ok(!slots.some(slot => slot.start === '2026-09-28T13:30:00.000Z'));
  assert.ok(slots.some(slot => slot.start === '2026-09-28T14:15:00.000Z'));
  assert.equal(generateSlots(now, [{ start: '2026-09-28T03:00:00Z', end: '2026-09-29T03:00:00Z' }]).some(slot => slot.date === '2026-09-28'), false);
});
test('slots: IANA DST conversion omits nonexistent and ambiguous wall times', () => {
  assert.equal(wallTime('2026-03-08', 150, 'America/New_York'), null);
  assert.equal(wallTime('2026-11-01', 90, 'America/New_York'), null);
  assert.equal(wallTime('2026-07-01', 600, 'America/New_York')?.toISOString(), '2026-07-01T14:00:00.000Z');
  assert.equal(generateSlots(now, [], { ...bookingConfig, weekdays: [] }).length, 0);
});
test('validation: invalid dates, email, missing fields, spam and consent', () => {
  for (const change of [{ email: 'a..b@example.com' }, { email: 'bad' }, { name: '' }, { service: 'invented' }, { start: '2026-02-30T13:00:00.000Z' }, { start: 'yesterday' }, { consent: false }, { _gotcha: 'bot' }, { phone: 'bad' }, { message: '<script>' }]) assert.throws(() => validateBooking({ ...valid(), ...change }));
  assert.equal(validateBooking({ ...valid(), message: 'Primera línea\nSegunda línea' }).message.includes('\n'), true);
});
test('mock booking and repeat have one event, no outbound calls, private availability', async () => {
  const handle = handler(); const input = valid(); let calls = 0;
  const network: typeof fetch = async () => { calls++; throw new Error('network forbidden'); };
  const first = await handle(request(input), {}, network); assert.equal(first.status, 200);
  const body = await first.json(); const repeat = await handle(request(input), {}, network);
  assert.equal((await repeat.json()).eventId, body.eventId); assert.equal(calls, 0); assert.equal(body.meetUrl, null); assert.equal(body.invitationSent, false);
  const availability = await (await handle(request(), {}, network)).json(); assert.ok(!availability.slots.some((slot: { start: string }) => slot.start === start)); assert.ok(!JSON.stringify(availability).includes(input.email));
});
test('concurrent different clients: only one wins; same request retry recovers', async () => {
  const handle = handler(); const input = valid();
  const results = await Promise.all([handle(request(input), {}), handle(request(valid()), {})]);
  assert.deepEqual(results.map(result => result.status).sort(), [200,409]);
  assert.equal((await handle(request(input), {})).status, 200);
});
test('concurrent double click creates only once', async () => {
  let inserts = 0; let event: CalendarEvent | null = null;
  const handle = handler({ busy: async () => [], get: async () => event, insert: async (id, fingerprint) => { inserts++; event = { id, extendedProperties: { private: { bookingFingerprint: fingerprint } } }; return event; } });
  const input = valid(); const result = await Promise.all([handle(request(input), {}), handle(request(input), {})]);
  assert.ok(result.some(response => response.status === 200)); assert.equal(inserts, 1);
  assert.equal((await handle(request(input), {})).status, 200);
});
test('server rejects off-grid, past and reused request IDs with changed payload', async () => {
  const handle = handler(); const input = valid();
  for (const date of ['2026-09-28T13:15:00.000Z', '2026-09-28T08:00:00.000Z', '2026-09-27T13:00:00.000Z']) assert.equal((await handle(request({ ...input, start: date }), {})).status, 400);
  await handle(request(input), {});
  assert.equal((await handle(request({ ...input, email: 'other@example.test' }), {})).status, 409);
});
test('confirmed request remains recoverable after the minimum notice window closes', async () => {
  let clock = now;
  const handle = createBookingHandler({ now: () => clock }); const input = valid();
  const first = await (await handle(request(input), {})).json();
  clock = new Date('2026-09-28T12:45:00Z');
  const response = await handle(request(input), {}); assert.equal(response.status, 200); assert.equal((await response.json()).eventId, first.eventId);
});
test('FreeBusy is rechecked at confirmation, Google failures do not fabricate success', async () => {
  let busy = false; let insert = 0;
  const handle = handler({ get: async () => null, busy: async () => busy ? [{ start, end: '2026-09-28T13:30:00Z' }] : [], insert: async () => { insert++; throw new Error('secret failure'); } });
  assert.equal((await handle(request(), {})).status, 200); busy = true;
  const result = await handle(request(valid()), {}); assert.equal(result.status, 409); assert.equal(insert, 0);
  busy = false; const error = await handle(request(valid()), {}); assert.equal(error.status, 502); assert.ok(!(await error.text()).includes('secret'));
});
test('uncertain insert is reconciled with GET and preserves claim across requests', async () => {
  let event: CalendarEvent | null = null; let inserts = 0;
  const handle = handler({ busy: async () => [], get: async () => event, insert: async (id, fingerprint) => { inserts++; event = { id, hangoutLink: 'https://meet.google.com/abc-defg-hij', extendedProperties: { private: { bookingFingerprint: fingerprint } } }; throw new Error('timeout after create'); } });
  const input = valid(); assert.equal((await handle(request(input), {})).status, 502);
  assert.equal((await handle(request(valid()), {})).status, 409);
  const retry = await handle(request(input), {}); assert.equal(retry.status, 200); assert.equal((await retry.json()).meetUrl, 'https://meet.google.com/abc-defg-hij'); assert.equal(inserts, 1);
});
test('production gate, origin, request size and rate limit fail closed', async () => {
  for (const env of [{ VERCEL: '1' }, { NODE_ENV: 'production' }, { BOOKING_MODE: 'production' }, { BOOKING_MODE: 'google_test' }]) assert.equal((await handler()(request(valid()), env)).status, 503);
  assert.equal((await handler()(request(valid(), 'https://evil.test'), {})).status, 403);
  assert.equal((await handler()(request({ ...valid(), message: 'a'.repeat(9000) }), {})).status, 413);
  const handle = handler(); for (let i=0; i<30; i++) await handle(request({}), {});
  assert.equal((await handle(request(valid()), {})).status, 429);
});
test('google_test rejects non-allowlisted emails before any Calendar operation', async () => {
  const env = { BOOKING_MODE: 'google_test', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REFRESH_TOKEN: 'test', GOOGLE_CALENDAR_ID_MISAEL: 'misael-test-calendar', GOOGLE_CALENDAR_ID_TOMAS: 'tomas-test-calendar', BOOKING_TEST_EMAILS: 'owner@example.test', CONTACT_RATE_LIMIT_SECRET: 'x'.repeat(32), UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test' };
  const handle = createBookingHandler({ now: () => now, store: memoryBookingStore(), calendar: { busy: async () => { throw new Error('should not call'); }, get: async () => { throw new Error('should not call'); }, insert: async () => { throw new Error('should not call'); } } });
  const response = await handle(request(valid()), env); assert.equal(response.status, 400); assert.equal((await response.json()).code, 'test_email');
});
test('official Google contract: OAuth refresh, FreeBusy, attendee, unique conference request and safe notifications', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const network: typeof fetch = async (url, init) => {
    if (String(url).includes('oauth2')) { assert.ok(String(init?.body).includes('grant_type=refresh_token')); return Response.json({ access_token: 'test-only' }); }
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}; calls.push({ url: String(url), body });
    if (String(url).endsWith('/freeBusy')) return Response.json({ calendars: { test: { busy: [] } } });
    return Response.json({ id: 'test' });
  };
  const provider = googleProvider({ GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REFRESH_TOKEN: 'test', GOOGLE_CALENDAR_ID: 'test' }, network);
  await provider.busy(generateSlots(now)); await provider.insert('abc', 'hash', validateBooking(valid()), generateSlots(now)[0]!);
  assert.match(calls[1]!.url, /conferenceDataVersion=1&sendUpdates=none/);
  assert.deepEqual(calls[1]!.body.attendees, [{ email: 'person@example.test', displayName: 'Persona de prueba' }]);
  assert.match(String(calls[1]!.body.description), /Profesional: Misael/);
  assert.match(String(calls[1]!.body.description), /Especialidad: Desarrollador web/);
  assert.ok(JSON.stringify(calls[1]!.body.conferenceData).includes('hangoutsMeet'));
  assert.ok(!JSON.stringify(calls[0]!.body).includes('summary'));
});
test('malformed or failed Google FreeBusy is not interpreted as free', async () => {
  for (const body of [{}, { calendars: { test: { errors: [{ reason: 'notFound' }] } } }, { calendars: { test: { busy: [{ start: 'bad', end: 'bad' }] } } }]) {
    const provider = googleProvider({ GOOGLE_CALENDAR_ID: 'test' }, async url => String(url).includes('oauth2') ? Response.json({ access_token: 'test' }) : Response.json(body));
    await assert.rejects(provider.busy(generateSlots(now)));
  }
});
test('Redis coordination validates responses and fails closed', async () => {
  const env = { UPSTASH_REDIS_REST_URL: 'https://test.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test' };
  const store = redisBookingStore(env, async () => Response.json({ result: 1 }));
  assert.equal(await store.claim('test', 'owner', 600), true); assert.equal(await store.rate('test', 30), true); await assert.rejects(store.getMany(['test']));
  const failed = redisBookingStore(env, async () => Response.json({ error: 'private' })); await assert.rejects(failed.claim('test','owner',600));
});
