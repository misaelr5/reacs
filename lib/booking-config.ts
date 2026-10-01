// TEST schedule: business hours must be agreed before production activation.
export const bookingConfig = {
  timezone: 'America/Argentina/Cordoba',
  weekdays: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 16 * 60,
  durationMinutes: 30,
  bufferMinutes: 15,
  minimumNoticeMinutes: 120,
  horizonDays: 30,
} as const;
export const bookingServices = ['Desarrollo web', 'Marketing digital', 'Automatización', 'Diagnóstico digital', 'Sistemas / CRM', 'Otro'] as const;

export const bookingProfessionals = [
  { id: 'misael', name: 'Misael', specialty: 'Desarrollador web', description: 'Desarrollo web, performance y soluciones técnicas.', enabled: true, schedule: 'default', calendarEnv: 'GOOGLE_CALENDAR_ID_MISAEL', meeting: { platform: 'Google Meet', defaultDuration: 30 } },
  { id: 'tomas', name: 'Tomás', specialty: 'Especialista en marketing', description: 'Marketing, estrategia y adquisición de clientes.', enabled: true, schedule: 'default', calendarEnv: 'GOOGLE_CALENDAR_ID_TOMAS', meeting: { platform: 'Google Meet', defaultDuration: 30 } },
] as const;
export type ProfessionalId = typeof bookingProfessionals[number]['id'];
export const professionalById = (id: string | undefined) => bookingProfessionals.find(person => person.id === id);

export function publicProfessional(id: string | undefined) { const person = professionalById(id); return person ? { id: person.id, name: person.name, specialty: person.specialty, description: person.description, enabled: person.enabled } : null; }
export const publicProfessionals = () => bookingProfessionals.filter(person => person.enabled).map(person => publicProfessional(person.id)!);
export function professionalCalendarEnv(env: Record<string, string | undefined>, id: ProfessionalId): Record<string, string | undefined> { const person = professionalById(id)!; return { ...env, GOOGLE_CALENDAR_ID: env[person.calendarEnv]?.trim() || env.GOOGLE_CALENDAR_ID?.trim() }; }

// Google TEST is deliberately stricter than legacy calendar resolution: the
// fallback must never route both professionals into one real calendar.
export function googleTestConfigured(env: Record<string, string | undefined>): boolean {
  const misael = env.GOOGLE_CALENDAR_ID_MISAEL?.trim();
  const tomas = env.GOOGLE_CALENDAR_ID_TOMAS?.trim();
  const emails = env.BOOKING_TEST_EMAILS?.split(',').map(value => value.trim().toLowerCase()) || [];
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN
    && misael && tomas && misael !== 'primary' && tomas !== 'primary' && misael !== tomas
    && emails.length && emails.every(value => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value))
    && (env.CONTACT_RATE_LIMIT_SECRET?.length || 0) >= 32
    && env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    && (!env.BOOKING_STORAGE || env.BOOKING_STORAGE === 'upstash'));
}
