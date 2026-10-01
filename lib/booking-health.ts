import { bookingProfessionals, googleTestConfigured, professionalCalendarEnv } from './booking-config.ts';
import { googleProvider, GoogleProviderError } from './booking-google.ts';
import { redisCommand } from './redis.ts';
export function bookingHealth(env: Record<string, string | undefined>) {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_CALENDAR_ID_MISAEL', 'GOOGLE_CALENDAR_ID_TOMAS', 'BOOKING_TEST_EMAILS', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CONTACT_RATE_LIMIT_SECRET'];
  const missing = required.filter(key => !env[key]);
  const professionals = bookingProfessionals.map(person => {
    const calendar = env[person.calendarEnv]?.trim();
    const duplicate = calendar && bookingProfessionals.some(other => other.id !== person.id && env[other.calendarEnv]?.trim() === calendar);
    return { id: person.id, enabled: person.enabled, calendar: !calendar ? 'not-configured' : calendar === 'primary' || duplicate ? 'invalid' : 'configured-not-verified', variable: person.calendarEnv };
  });
  return { bookingMode: env.BOOKING_MODE || 'mock', storage: env.BOOKING_STORAGE || (env.BOOKING_MODE === 'google_test' ? 'upstash' : 'local'),
    google: googleTestConfigured(env) ? 'configured-not-verified' : 'not-configured',
    oauth: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN ? 'configured-not-verified' : 'not-configured',
    missing, professionals, redirectUri: 'http://127.0.0.1:4280/oauth/callback', apiEnabled: 'not-verified', credentialsVerified: false };
}

export async function probeBookingHealth(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch) {
  const report = bookingHealth(env);
  if (env.BOOKING_MODE !== 'google_test' || !googleTestConfigured(env)) return { upstash: 'not-verified', oauth: report.oauth, apiEnabled: 'not-verified', professionals: report.professionals.map(person => ({ id: person.id, freeBusy: 'not-verified' })) };
  let upstash = 'unavailable';
  try { upstash = await redisCommand(env, ['PING'], fetchImpl) === 'PONG' ? 'connected' : 'unavailable'; } catch { /* Safe status only. */ }
  const start = new Date().toISOString(); const end = new Date(Date.now() + 3600000).toISOString();
  const professionals = [];
  for (const person of bookingProfessionals) {
    try { await googleProvider(professionalCalendarEnv(env, person.id), fetchImpl).busy([{ start, end, date: start.slice(0,10), label: '' }]); professionals.push({ id: person.id, freeBusy: 'ok', code: '' }); }
    catch (error) { professionals.push({ id: person.id, freeBusy: 'failed', code: error instanceof GoogleProviderError ? error.code : 'provider_error' }); }
  }
  const googleOk = professionals.every(person => person.freeBusy === 'ok');
  return { upstash, oauth: googleOk ? 'verified-through-freebusy' : 'not-verified', apiEnabled: googleOk ? 'reachable' : 'not-verified', professionals };
}
