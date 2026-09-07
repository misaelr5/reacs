import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

export type ContactEnvironment = Record<string, string | undefined>;
type Fetch = typeof globalThis.fetch;
type Contact = { nombre: string; email: string; empresa: string; mensaje: string };
type Config = { origin: string; redis: string; redisToken: string; rateSecret: string; apiKey: string; from: string; to: string };

const BODY_LIMIT = 12 * 1024;
const WINDOW_SECONDS = 600;
const RATE_LIMIT = 5;
const NO_CONTROL = /[\u0000-\u001f\u007f-\u009f]/u;
const UNSAFE_MESSAGE_CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;
const EMAIL = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i;
const FIELDS = new Set(['form_type', 'nombre', 'email', 'empresa', 'mensaje', 'privacy_consent', '_gotcha']);

// One atomic Redis operation: separate INCR/EXPIRE calls can leave a permanent
// counter after a partial failure. REST transport adds no client dependency.
// https://upstash.com/docs/redis/features/restapi
const RATE_SCRIPT = `local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('TTL', KEYS[1])}`;

class ContactError extends Error {
  status: number;
  code: string;
  retryAfter?: number;
  constructor(status: number, code: string, retryAfter?: number) {
    super(code);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const MESSAGES: Record<string, string> = {
  method_not_allowed: 'Este recurso solamente acepta el envío del formulario.',
  forbidden_origin: 'No pudimos verificar el origen de la consulta. Volvé al formulario del sitio.',
  invalid_content_type: 'El formato de la consulta no es válido.',
  payload_too_large: 'La consulta supera el tamaño permitido.',
  invalid_submission: 'Revisá tu nombre, email, mensaje y aceptación de la política de privacidad.',
  spam_rejected: 'No pudimos procesar esta consulta. Revisá los campos e intentá nuevamente.',
  rate_limited: 'Recibimos varios intentos. Esperá unos minutos antes de volver a enviar.',
  service_unavailable: 'El formulario no está disponible en este momento. Podés usar los canales de contacto del sitio.',
  newsletter_unavailable: 'La suscripción al newsletter todavía no está disponible.',
  delivery_failed: 'No pudimos confirmar el envío. Intentá nuevamente más tarde o usá los canales de contacto del sitio.',
};

function validEmail(value: string): boolean {
  const [local = '', domain = ''] = value.split('@');
  return value.length <= 254 && local.length <= 64 && !local.startsWith('.') && !local.endsWith('.')
    && !local.includes('..') && domain.split('.').every(label => label.length <= 63) && EMAIL.test(value);
}

function readOrigin(env: ContactEnvironment): string {
  try {
    const url = new URL(env.SITE_URL || 'https://reacs-studio.vercel.app');
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    return url.origin;
  } catch {
    throw new ContactError(503, 'service_unavailable');
  }
}

function readConfig(env: ContactEnvironment, origin: string): Config {
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || '';
  const rateSecret = env.CONTACT_RATE_LIMIT_SECRET || '';
  const apiKey = env.RESEND_API_KEY || '';
  const from = env.CONTACT_FROM || '';
  const to = env.CONTACT_TO || '';
  const senderAddress = from.match(/^[^<>]+<([^<>]+)>$/)?.[1] || from;
  let redis: URL;
  try { redis = new URL(env.UPSTASH_REDIS_REST_URL || ''); }
  catch { throw new ContactError(503, 'service_unavailable'); }
  if (redis.protocol !== 'https:' || !redis.hostname.endsWith('.upstash.io') || redis.port || redis.username || redis.password || redis.pathname !== '/' || redis.search || redis.hash
      || !redisToken || redisToken.length > 4096 || NO_CONTROL.test(redisToken)
      || rateSecret.length < 32 || rateSecret.length > 512 || NO_CONTROL.test(rateSecret)
      || !apiKey || apiKey.length > 512 || NO_CONTROL.test(apiKey)
      || from.length > 320 || NO_CONTROL.test(from) || !validEmail(senderAddress) || !validEmail(to)) {
    throw new ContactError(503, 'service_unavailable');
  }
  return { origin, redis: redis.origin, redisToken, rateSecret, apiKey, from, to };
}

function clientAddress(request: Request, env: ContactEnvironment): string {
  // This header is trustworthy only behind Vercel's edge. Do not fall back to
  // client-supplied X-Forwarded-For or X-Real-IP on arbitrary deployments.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  if (env.VERCEL === '1') {
    const address = request.headers.get('x-vercel-forwarded-for')?.trim() || '';
    if (isIP(address)) return address;
  } else if (env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) {
    return '127.0.0.1';
  }
  throw new ContactError(503, 'service_unavailable');
}

async function fetchJson(url: string, init: RequestInit, fetchImpl: Fetch, timeout = 6000): Promise<unknown> {
  const response = await fetchImpl(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(timeout) });
  if (!response.ok) throw new Error('upstream_rejected');
  return response.json();
}

async function limitRate(config: Config, address: string, fetchImpl: Fetch): Promise<void> {
  const digest = createHmac('sha256', config.rateSecret).update(config.origin + '\0' + address).digest('hex');
  let result: unknown;
  try {
    const data = await fetchJson(config.redis, {
      method: 'POST', headers: { Authorization: 'Bearer ' + config.redisToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', RATE_SCRIPT, '1', 'reac:contact:v1:' + digest, String(WINDOW_SECONDS)]),
    }, fetchImpl, 3000) as { result?: unknown; error?: unknown };
    if (data?.error) throw new Error('redis_rejected');
    result = data?.result;
  } catch { throw new ContactError(503, 'service_unavailable'); }
  if (!Array.isArray(result) || result.length !== 2 || !Number.isInteger(result[0]) || result[0] < 1 || !Number.isInteger(result[1]) || result[1] < 0 || result[1] > WINDOW_SECONDS) {
    throw new ContactError(503, 'service_unavailable');
  }
  if (result[0] > RATE_LIMIT) throw new ContactError(429, 'rate_limited', Math.max(1, result[1]));
}

async function readBody(request: Request, contentType: string): Promise<Record<string, unknown>> {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) throw new ContactError(413, 'payload_too_large');
  if (!request.body) throw new ContactError(400, 'invalid_submission');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > BODY_LIMIT) {
        await reader.cancel();
        throw new ContactError(413, 'payload_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  let data: unknown;
  if (contentType === 'application/json') data = JSON.parse(text);
  else {
    const fields = new URLSearchParams(text);
    const entries = [...fields.entries()];
    if (new Set(entries.map(([key]) => key)).size !== entries.length) throw new ContactError(400, 'invalid_submission');
    data = Object.fromEntries(entries);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new ContactError(400, 'invalid_submission');
  return data as Record<string, unknown>;
}

function validate(data: Record<string, unknown>): Contact {
  if (Object.keys(data).some(key => !FIELDS.has(key))) throw new ContactError(400, 'invalid_submission');
  if (data.form_type === 'newsletter') throw new ContactError(503, 'newsletter_unavailable');
  if (data.form_type !== 'contacto') throw new ContactError(400, 'invalid_submission');
  if (data._gotcha !== undefined && (typeof data._gotcha !== 'string' || data._gotcha.trim())) throw new ContactError(400, 'spam_rejected');
  if (data.privacy_consent !== true && data.privacy_consent !== 'on' && data.privacy_consent !== 'true') throw new ContactError(400, 'invalid_submission');
  for (const field of ['nombre', 'email', 'mensaje']) if (typeof data[field] !== 'string') throw new ContactError(400, 'invalid_submission');
  if (data.empresa !== undefined && typeof data.empresa !== 'string') throw new ContactError(400, 'invalid_submission');
  const contact = {
    nombre: (data.nombre as string).normalize('NFC').trim(),
    email: (data.email as string).trim(),
    empresa: ((data.empresa as string | undefined) || '').normalize('NFC').trim(),
    mensaje: (data.mensaje as string).normalize('NFC').trim(),
  };
  if (contact.nombre.length < 2 || contact.nombre.length > 120 || NO_CONTROL.test(contact.nombre)
      || !validEmail(contact.email) || NO_CONTROL.test(contact.email)
      || contact.empresa.length > 160 || NO_CONTROL.test(contact.empresa)
      || contact.mensaje.length < 10 || contact.mensaje.length > 3000 || UNSAFE_MESSAGE_CONTROL.test(contact.mensaje)) {
    throw new ContactError(400, 'invalid_submission');
  }
  if ((contact.mensaje.match(/(?:https?:\/\/|www\.)/gi) || []).length > 4) throw new ContactError(400, 'spam_rejected');
  return contact;
}

function response(request: Request, status: number, code: string, retryAfter?: number): Response {
  const headers = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (status === 405) headers.set('Allow', 'POST');
  if (retryAfter) headers.set('Retry-After', String(retryAfter));
  const wantsHtml = request.headers.get('accept')?.includes('text/html') && !request.headers.get('accept')?.includes('application/json');
  if (wantsHtml && status === 200) {
    headers.set('Location', '/gracias');
    return new Response(null, { status: 303, headers });
  }
  const message = MESSAGES[code] || 'Consulta enviada correctamente.';
  if (wantsHtml) {
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    return new Response('<!doctype html><html lang="es-AR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Consulta | Reac Studio</title><main><h1>No pudimos enviar la consulta</h1><p>' + message + '</p><a href="/contacto">Volver al formulario</a></main></html>', { status, headers });
  }
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(status === 200 ? { ok: true } : { ok: false, code, message }), { status, headers });
}

export async function handleContact(request: Request, env: ContactEnvironment, fetchImpl: Fetch = fetch): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new ContactError(405, 'method_not_allowed');
    const origin = readOrigin(env);
    if (request.headers.get('origin') !== origin) throw new ContactError(403, 'forbidden_origin');
    const contentType = request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() || '';
    if (!['application/json', 'application/x-www-form-urlencoded'].includes(contentType)) throw new ContactError(415, 'invalid_content_type');
    const config = readConfig(env, origin);
    await limitRate(config, clientAddress(request, env), fetchImpl);
    let data: Record<string, unknown>;
    try { data = await readBody(request, contentType); }
    catch (error) {
      if (error instanceof ContactError) throw error;
      throw new ContactError(400, 'invalid_submission');
    }
    const contact = validate(data);
    try {
      // Fixed destination and subject prevent relaying and header injection.
      // User input is plain text; it is never rendered as HTML or interpreted.
      // https://resend.com/docs/api-reference/emails/send-email
      const delivered = await fetchJson('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: config.from, to: [config.to], reply_to: contact.email,
          subject: 'Nueva consulta desde Reac Studio',
          text: ['Nombre: ' + contact.nombre, 'Email: ' + contact.email, 'Empresa: ' + (contact.empresa || 'No indicada'), '', 'Mensaje:', contact.mensaje, '', 'La persona aceptó la política de privacidad al enviar la consulta.'].join('\n'),
        }),
      }, fetchImpl) as { id?: unknown };
      if (typeof delivered?.id !== 'string' || !delivered.id.trim()) throw new Error('delivery_not_confirmed');
    } catch { throw new ContactError(502, 'delivery_failed'); }
    return response(request, 200, 'sent');
  } catch (error) {
    const safe = error instanceof ContactError ? error : new ContactError(503, 'service_unavailable');
    return response(request, safe.status, safe.code, safe.retryAfter);
  }
}
