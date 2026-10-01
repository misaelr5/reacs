import { createHash, createHmac, randomBytes, timingSafeEqual, scryptSync } from 'node:crypto';
import { memoryBookingStore, redisBookingStore, type BookingStore } from './booking-store.ts';
import { AgendaError } from './agenda-rules.ts';
type Env = Record<string, string | undefined>;
const localSessions = memoryBookingStore();
export const SESSION_SECONDS = 4 * 3600;
export function localOnly(request: Request, env: Env) {
  if (env.NODE_ENV === 'production' || env.VERCEL === '1' || env.BOOKING_MODE === 'production' || !['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname)) throw new AgendaError('Administración deshabilitada fuera del desarrollo local.', 503);
}
export function sameOrigin(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new AgendaError('Origen de solicitud no válido.', 403);
  const referer = request.headers.get('referer');
  if (referer) { try { if (new URL(referer).origin !== url.origin) throw new Error(); } catch { throw new AgendaError('Origen de solicitud no válido.', 403); } }
}
export function adminAuth(env: Env, fetchImpl: typeof fetch = fetch, injected?: BookingStore) {
  const secret = env.BOOKING_ADMIN_SECRET || '';
  if (secret.length < 32 || secret.length > 256 || /\s/.test(secret)) throw new AgendaError('Configurá BOOKING_ADMIN_SECRET (32–256 caracteres sin espacios) en .env.local.', 503);
  let passwords: { salt: string; hash: string }[] | null = null;
  if (env.BOOKING_ADMIN_PASSWORD_HASHES) {
    try {
      const entries: unknown = JSON.parse(env.BOOKING_ADMIN_PASSWORD_HASHES);
      if (!Array.isArray(entries) || entries.length < 1 || entries.length > 4 || entries.some(item => !item || typeof item.salt !== 'string' || !/^[a-f0-9]{32}$/.test(item.salt) || typeof item.hash !== 'string' || !/^[a-f0-9]{128}$/.test(item.hash))) throw new Error();
      passwords = entries;
    } catch { throw new AgendaError('Configuración de contraseñas administrativas inválida.', 503); }
  }
  const redis = env.BOOKING_STORAGE === 'upstash' || env.BOOKING_MODE === 'google_test';
  const store = injected || (redis ? redisBookingStore(env, fetchImpl) : localSessions);
  const digest = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const token = (request: Request) => {
    const value = request.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith('reac_admin='))?.slice(11) || '';
    return /^[a-f0-9]{64}$/.test(value) ? value : '';
  };
  const key = (value: string) => 'reac:admin:session:v1:' + digest(value + (env.BOOKING_ADMIN_PASSWORD_HASHES || ''));
  const cookie = (value: string, age: number) => `reac_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  return {
    async authenticated(request: Request) { const value = token(request); return Boolean(value && (await store.getMany([key(value)]))[0] === 'admin'); },
    async login(password: unknown, request: Request) {
      sameOrigin(request);
      if (!await store.rate('reac:admin:login:v1:' + digest('loopback'), 8)) throw new AgendaError('Demasiados intentos. Esperá diez minutos.', 429);
      const text = typeof password === 'string' && password.length <= 256 ? password : '';
      const valid = passwords
        ? passwords.map(entry => timingSafeEqual(scryptSync(text, Buffer.from(entry.salt, 'hex'), 64), Buffer.from(entry.hash, 'hex'))).some(Boolean)
        : timingSafeEqual(createHash('sha256').update(text).digest(), createHash('sha256').update(secret).digest());
      if (!valid) throw new AgendaError('Contraseña incorrecta.', 401);
      const old = token(request); if (old) await store.remove(key(old), 'admin');
      const value = randomBytes(32).toString('hex'); await store.claim(key(value), 'admin', SESSION_SECONDS);
      return cookie(value, SESSION_SECONDS);
    },
    async logout(request: Request) { sameOrigin(request); const value = token(request); if (value) await store.remove(key(value), 'admin'); return cookie('', 0); },
  };
}
export async function adminJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AgendaError('Se requiere JSON.', 415);
  const reader = request.body?.getReader(); if (!reader) throw new AgendaError('Faltan datos.');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 32768) { await reader.cancel(); throw new AgendaError('Solicitud demasiado grande.', 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { const data: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data as Record<string, unknown>; } catch { throw new AgendaError('JSON inválido.'); }
}
