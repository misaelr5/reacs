// Exact-ID, local-only cleanup for an app-created Google TEST event.
// Dry-run by default. Never scans or deletes an entire calendar.
import { createHmac } from 'node:crypto';
import { agendaRepository, updateAgenda } from '../lib/agenda-repository.ts';
import { googleTestConfigured, professionalCalendarEnv } from '../lib/booking-config.ts';
import { googleProvider, GoogleProviderError } from '../lib/booking-google.ts';
import { redisBookingStore } from '../lib/booking-store.ts';
import { audit, errorId } from '../lib/booking-observability.ts';

const args = process.argv.slice(2);
const idAt = args.indexOf('--booking-id');
const bookingId = args[idAt + 1];
if (idAt < 0 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId || '') || args.some((arg, index) => arg !== '--execute' && arg !== '--booking-id' && index !== idAt + 1)) {
  console.error('Uso: npm run booking:test:cleanup -- --booking-id UUID [--execute]');process.exit(2);
}
const env = process.env;
if (env.BOOKING_MODE !== 'google_test' || !googleTestConfigured(env) || env.VERCEL === '1' || env.NODE_ENV === 'production') { console.error('Solo se permite en GOOGLE TEST local configurado.');process.exit(2); }

try {
  const repository = agendaRepository(env);
  const reservation = (await repository.read()).reservations.find(item => item.id === bookingId);
  const meta = reservation?.event?.extendedProperties?.private;
  if (!reservation || reservation.mode !== 'google_test' || reservation.status !== 'confirmed' || !reservation.professionalId || !/^reac[0-9a-f]{64}$/.test(reservation.event?.id || '') || meta?.environment !== 'google_test' || meta.bookingRequestId !== bookingId || meta.professionalId !== reservation.professionalId || meta.bookingFingerprint !== reservation.fingerprint) throw new Error('unverified_record');
  const provider = googleProvider(professionalCalendarEnv(env, reservation.professionalId));
  const event = await provider.get(reservation.event.id);
  if (event) {
    const check = event.extendedProperties?.private;
    if (event.id !== reservation.event.id || !event.summary?.startsWith('[TEST] ') || check?.environment !== 'google_test' || check.bookingRequestId !== bookingId || check.professionalId !== reservation.professionalId || check.bookingFingerprint !== reservation.fingerprint) throw new Error('unverified_event');
  }
  const hash = value => createHmac('sha256', env.CONTACT_RATE_LIMIT_SECRET).update(value).digest('hex');
  const prefix = 'reac:booking:v1:google_test:' + hash(env.GOOGLE_CALENDAR_ID || 'mock') + ':';
  const identity = reservation.professionalId + ':' + reservation.start + ':' + (Date.parse(reservation.end) - Date.parse(reservation.start)) / 60000;
  const store = redisBookingStore(env, fetch);
  if ((await store.getMany([prefix + 'working:v2:' + hash(identity)]))[0]) throw new Error('booking_in_progress');
  if (!args.includes('--execute')) { console.log(JSON.stringify({ status:'dry-run', professionalId:reservation.professionalId, event:event?'verified':'already-absent', reservation:'verified', changes:0 }));process.exit(0); }
  const deletion = await provider.deleteTestEvent(reservation.event.id, reservation.fingerprint, bookingId, reservation.professionalId);
  // Keep the durable reservation until both claims are released. If Redis
  // fails, this exact UUID can be retried without losing the cleanup target.
  await store.remove(prefix + 'slot:v3:' + hash(identity), reservation.fingerprint);
  await store.remove(prefix + 'request:' + hash(bookingId), reservation.fingerprint);
  await updateAgenda(repository, state => {
    const current = state.reservations.find(item => item.id === bookingId);
    if (!current || current.mode !== 'google_test' || current.event?.id !== reservation.event.id || current.fingerprint !== reservation.fingerprint) throw new Error('record_changed');
    state.reservations = state.reservations.filter(item => item.id !== bookingId);
  });
  console.log(JSON.stringify({ status:'cleaned', professionalId:reservation.professionalId, event:deletion, reservationsRemoved:1 }));
} catch (error) { const id=errorId();const code=error instanceof GoogleProviderError?error.code:error instanceof Error&&['unverified_record','unverified_event','booking_in_progress','record_changed'].includes(error.message)?error.message:'cleanup_failed';audit('booking.test_cleanup.failed',{requestId:id,status:503,code});console.error('No se completó la limpieza. Conservá el UUID para revisar el estado. Código: '+id);process.exitCode=1; }
