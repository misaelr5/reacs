import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBookingHandler, validateBooking } from '../lib/booking.ts';
import { initialAgenda } from '../lib/agenda-rules.ts';
import { memoryAgenda, fileAgenda } from '../lib/agenda-repository.ts';
import { generateSlots } from '../lib/booking-slots.ts';
const now = new Date('2026-09-28T08:00:00Z');
const origin = 'http://127.0.0.1:4174';
const start = '2026-09-28T13:00:00.000Z';
const input = (professionalId = 'misael') => ({ requestId: randomUUID(), professionalId, start, name: 'Prueba automatizada', email: 'test@example.test', phone: '(03544) 123456', service: 'Desarrollo web', consent: true });
const post = (body: unknown) => new Request(origin + '/api/booking', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const get = (id: string) => new Request(origin + '/api/booking?professionalId=' + id);
const noNetwork: typeof fetch = async () => { throw new Error('Mock must never call the network'); };

test('both professionals book 10:00 concurrently in mock without Google; each rejects a duplicate', async () => {
  const repository = memoryAgenda(); const handler = createBookingHandler({ repository, now: () => now });
  const bodies = [input('misael'), input('tomas')];
  const results = await Promise.all(bodies.map(body => handler(post(body), {}, noNetwork)));
  assert.deepEqual(results.map(r => r.status), [200, 200]);
  const payloads = await Promise.all(results.map(r => r.json()));
  assert.notEqual(payloads[0].eventId, payloads[1].eventId);
  assert.deepEqual((await repository.read()).reservations.map(r => r.professionalId).sort(), ['misael', 'tomas']);
  for (const body of bodies) {
    assert.equal((await handler(post(body), {}, noNetwork)).status, 200);
    assert.equal((await handler(post({ ...body, requestId: randomUUID() }), {}, noNetwork)).status, 409);
  }
});

test('Misael reservation and buffers do not remove Tomas slots; shared Calendar busy does', async () => {
  const repository = memoryAgenda(); const handler = createBookingHandler({ repository, now: () => now });
  assert.equal((await handler(post(input()), {}, noNetwork)).status, 200);
  for (const id of ['misael','tomas']) {
    const response = await handler(get(id), {}, noNetwork); const body = await response.json();
    assert.equal(body.professionalId, id);
    assert.equal(body.slots.some((slot: { start: string }) => slot.start === start), id === 'tomas');
  }
  const state = await repository.read();
  assert.ok(generateSlots(now, [], state, 'tomas').some(s => s.label === '09:30'));
  assert.ok(!generateSlots(now, [], state, 'misael').some(s => s.date === '2026-09-28' && s.label === '09:30'));
  assert.ok(!generateSlots(now, [{ start, end: '2026-09-28T13:30:00.000Z' }], state, 'tomas').some(s => s.start === start));
});

test('invalid and absent professional and consent return precise field errors without persistence', async () => {
  const repository = memoryAgenda(); const handler = createBookingHandler({ repository, now: () => now });
  for (const change of [{ professionalId: undefined }, { professionalId: 'other' }, { consent: false }, { email: 'a..b@example.test' }, { phone: 'abc' }]) {
    const result = await handler(post({ ...input(), ...change }), {}, noNetwork); const body = await result.json();
    assert.equal(result.status, 400); assert.equal(body.code, 'invalid_submission');
    assert.equal(body.field, Object.keys(change)[0]); assert.ok(!body.message.includes('Error:'));
  }
  assert.equal((await repository.read()).reservations.length, 0);
  assert.equal((await handler(get('other'), {}, noNetwork)).status, 400);
});

test('phone formatting normalizes; consent is still required', () => {
  for (const [phone, expected] of [['(03544) 123456','03544123456'],['+54 (3544) 123-456','+543544123456'],['','']]) assert.equal(validateBooking({ ...input(), phone }).phone, expected);
  assert.throws(() => validateBooking({ ...input(), consent: false }));
  for (const phone of ['123','+54+12345678','1'.repeat(16)]) assert.throws(() => validateBooking({ ...input(), phone }));
});

test('retry of an older formatted-phone reservation preserves its fingerprint and event', async () => {
  const payload = { ...input(), phone: '03544 123456' };
  const legacyInput = { ...validateBooking(payload), phone: payload.phone };
  const fingerprint = createHmac('sha256', 'local-mock-no-external-credentials').update(JSON.stringify(legacyInput)).digest('hex');
  const state = initialAgenda();
  state.reservations.push({ professionalId: 'misael', id: payload.requestId, fingerprint, start, end: '2026-09-28T13:30:00.000Z', bufferBefore: 15, bufferAfter: 15, status: 'confirmed', createdAt: now.toISOString(), event: { id: 'legacy-event', extendedProperties: { private: { bookingFingerprint: fingerprint } } } });
  const repository = memoryAgenda(state); const handler = createBookingHandler({ repository, now: () => now });
  const response = await handler(post(payload), {}, noNetwork);
  assert.equal(response.status, 200); assert.equal((await response.json()).eventId, 'legacy-event');
  assert.equal((await repository.read()).reservations.length, 1);
  assert.equal((await handler(post({ ...payload, email: 'changed@example.test' }), {}, noNetwork)).status, 409);
});

test('default half-hour grid starts at 09:00 and ends at 15:30 for both; future weekly override is isolated', () => {
  const state = initialAgenda();
  for (const id of ['misael','tomas'] as const) {
    const slots = generateSlots(now, [], state, id).filter(s => s.date === '2026-09-28');
    assert.equal(slots.length, 14); assert.equal(slots[0].label, '09:00'); assert.equal(slots.at(-1)!.label, '15:30');
    assert.equal(slots.at(-1)!.end, '2026-09-28T19:00:00.000Z');
  }
  state.weeklyByProfessional = { tomas: [[], [{ start: 840, end: 960 }], [], [], [], [], []] };
  assert.equal(generateSlots(now, [], state, 'tomas')[0].label, '14:00');
  assert.equal(generateSlots(now, [], state, 'misael')[0].label, '09:00');
});

test('version 1 file survives upgrades: unassigned reservations preserved, new owners persist across restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reac-professional-')); const path = join(directory, 'agenda.json');
  try {
    const legacy = initialAgenda();
    legacy.reservations.push({ id: 'legacy', fingerprint: 'legacy', start: '2026-09-29T12:00:00.000Z', end: '2026-09-29T12:30:00.000Z', bufferBefore: 15, bufferAfter: 15, status: 'confirmed', createdAt: now.toISOString() });
    await writeFile(path, JSON.stringify(legacy));
    const handler = createBookingHandler({ repository: fileAgenda(path), now: () => now });
    const body = input('tomas'); assert.equal((await handler(post(body), {}, noNetwork)).status, 200);
    const persisted = await fileAgenda(path).read();
    assert.deepEqual(persisted.reservations[0], legacy.reservations[0]);
    assert.equal(persisted.reservations[1].professionalId, 'tomas');
    for (const id of ['misael','tomas'] as const) assert.ok(!generateSlots(now, [], persisted, id).some(s => s.start === legacy.reservations[0].start));
    const restarted = createBookingHandler({ repository: fileAgenda(path), now: () => now });
    assert.equal((await restarted(post(body), {}, noNetwork)).status, 200);
    assert.equal((await restarted(post(input('misael')), {}, noNetwork)).status, 200);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
