import { readFile, mkdir, writeFile, rename, unlink, rmdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash, randomUUID } from 'node:crypto';
import { initialAgenda, type AgendaState, AgendaError, validateConfig, validateWeekly, validateException, editProfessionalAgenda } from './agenda-rules.ts';
import { professionalById, bookingProfessionals } from './booking-config.ts';
import { redisCommand } from './redis.ts';
export interface AgendaRepository { read(): Promise<AgendaState>; compareAndSet(revision: number, state: AgendaState): Promise<boolean>; kind: string }
function decode(raw: string | null): AgendaState {
  if (raw === null) return initialAgenda();
  const state = JSON.parse(raw) as AgendaState;
  if (![1, 2].includes(state.version) || !Number.isSafeInteger(state.revision) || state.revision < 0 || !state.config || !Array.isArray(state.weekly) || !Array.isArray(state.exceptions) || !Array.isArray(state.reservations)) throw new Error('Invalid agenda store');
  validateConfig(state.config); validateWeekly(state.weekly);
  for (const reservation of state.reservations) if (reservation.professionalId !== undefined && !professionalById(reservation.professionalId)) throw new Error('Invalid reservation professional');
  // Version 1 records without a professional stay unassigned; never guess or erase.
  if (state.weeklyByProfessional) for (const [id, weekly] of Object.entries(state.weeklyByProfessional)) { if (!professionalById(id)) throw new Error('Invalid schedule professional'); validateWeekly(weekly); }
  const validateExceptions = (items: AgendaState['exceptions']) => {
    if (!Array.isArray(items) || items.length > 300) throw new Error('Invalid exceptions');
    for (const item of items) { if (!item || typeof item.id !== 'string') throw new Error('Invalid exception'); validateException({ kind: item.kind, from: item.from, through: item.through, intervals: item.intervals, reason: item.reason }, item); }
  };
  validateExceptions(state.exceptions);
  for (const record of state.reservations) {
    if (!record || typeof record.id !== 'string' || typeof record.fingerprint !== 'string' || !['pending','confirmed'].includes(record.status) || !Number.isFinite(Date.parse(record.start)) || !Number.isFinite(Date.parse(record.end)) || Date.parse(record.end) <= Date.parse(record.start) || ![record.bufferBefore,record.bufferAfter].every(n => Number.isInteger(n) && n >= 0 && n <= 30)) throw new Error('Invalid reservation');
  }
  if (state.professionalAgendas) for (const [id, own] of Object.entries(state.professionalAgendas)) { if (!professionalById(id) || !own) throw new Error('Invalid professional agenda'); validateConfig(own.config); validateWeekly(own.weekly); validateExceptions(own.exceptions); }
  if (state.version === 1) {
    for (const person of bookingProfessionals) editProfessionalAgenda(state, person.id);
    state.version = 2;
  }
  return state;
}
export function memoryAgenda(initial = initialAgenda()): AgendaRepository {
  let state = structuredClone(initial);
  return { kind: 'memory-test', async read() { return structuredClone(state); }, async compareAndSet(revision, next) { if (state.revision !== revision) return false; state = structuredClone(next); return true; } };
}
export function fileAgenda(path: string): AgendaRepository {
  const file = resolve(path);
  async function read() { try { return decode(await readFile(file, 'utf8')); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return initialAgenda(); throw error; } }
  return { kind: 'local-test-file', read, async compareAndSet(revision, next) {
    await mkdir(dirname(file), { recursive: true });
    const lock = file + '.lock';
    let acquired = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { await mkdir(lock); acquired = true; break; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; await delay(20); }
    }
    if (!acquired) throw new AgendaError('La agenda está ocupada. Reintentá en unos segundos.', 409);
    const temporary = file + '.' + randomUUID() + '.tmp';
    try { if ((await read()).revision !== revision) return false; await writeFile(temporary, JSON.stringify(next), { mode: 0o600 }); await rename(temporary, file); return true; }
    finally { await unlink(temporary).catch(() => {}); await rmdir(lock); }
  } };
}
export function redisAgenda(env: Record<string, string | undefined>, fetchImpl: typeof fetch): AgendaRepository {
  const namespace = createHash('sha256').update((env.BOOKING_MODE || 'mock') + ':' + (env.GOOGLE_CALENDAR_ID || 'local')).digest('hex');
  const key = 'reac:agenda:v1:' + namespace;
  return { kind: 'upstash', async read() { const value = await redisCommand(env, ['GET', key], fetchImpl); if (value !== null && typeof value !== 'string') throw new Error('Invalid redis document'); return decode(value); },
    async compareAndSet(revision, next) { const result = await redisCommand(env, ['EVAL', "local v=redis.call('GET',KEYS[1]); local r=0; if v then r=cjson.decode(v).revision end; if r~=tonumber(ARGV[1]) then return 0 end; redis.call('SET',KEYS[1],ARGV[2]); return 1", 1, key, revision, JSON.stringify(next)], fetchImpl); if (result !== 0 && result !== 1) throw new Error('Invalid redis CAS'); return result === 1; } };
}
export function agendaRepository(env: Record<string, string | undefined>, fetchImpl: typeof fetch = fetch): AgendaRepository {
  if (env.VERCEL === '1' || env.NODE_ENV === 'production' || env.BOOKING_MODE === 'production') throw new AgendaError('Producción bloqueada en esta fase.', 503);
  const storage = env.BOOKING_STORAGE || (env.BOOKING_MODE === 'google_test' ? 'upstash' : 'local');
  if (storage === 'upstash') return redisAgenda(env, fetchImpl);
  if (storage !== 'local' || env.BOOKING_MODE === 'google_test') throw new AgendaError('Almacenamiento inválido para este modo.', 503);
  return fileAgenda('.local/booking-agenda-mock.json');
}
export async function updateAgenda<T>(repository: AgendaRepository, operation: (state: AgendaState) => T): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const state = await repository.read(); const revision = state.revision;
    const result = operation(state); state.revision = revision + 1;
    if (await repository.compareAndSet(revision, state)) return result;
  }
  throw new AgendaError('La agenda cambió mientras guardabas. Recargá y reintentá.', 409);
}
