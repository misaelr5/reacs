import { redisCommand } from './redis.ts';
export interface BookingStore {
  claim(key: string, value: string, seconds: number): Promise<boolean>;
  getMany(keys: string[]): Promise<(string | null)[]>;
  remove(key: string, value: string): Promise<void>;
  rate(key: string, limit: number): Promise<boolean>;
}
export function memoryBookingStore(): BookingStore {
  const records = new Map<string, { value: string; until: number }>();
  function get(key: string) {
    for (const [id, item] of records) if (item.until <= Date.now()) records.delete(id);
    return records.get(key)?.value || null;
  }
  return {
    async claim(key, value, seconds) { const prior = get(key); if (prior) return prior === value; records.set(key, { value, until: Date.now() + seconds * 1000 }); return true; },
    async getMany(keys) { return keys.map(get); },
    async remove(key, value) { if (get(key) === value) records.delete(key); },
    async rate(key, limit) { const count = Number(get(key) || 0) + 1; records.set(key, { value: String(count), until: records.get(key)?.until || Date.now() + 600000 }); return count <= limit; },
  };
}
export function redisBookingStore(env: Record<string, string | undefined>, fetchImpl: typeof fetch): BookingStore {
  const command = (args: (string | number)[]) => redisCommand(env, args, fetchImpl);
  return {
    async claim(key, value, seconds) {
      const result = await command(['EVAL', "local v=redis.call('GET',KEYS[1]); if v then if v==ARGV[1] then return 1 else return 0 end end; redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return 1", 1, key, value, seconds]);
      if (result !== 0 && result !== 1) throw new Error('redis_claim');
      return result === 1;
    },
    async getMany(keys) {
      if (!keys.length) return [];
      const result = await command(['MGET', ...keys]);
      if (!Array.isArray(result) || result.length !== keys.length || result.some(item => item !== null && typeof item !== 'string')) throw new Error('redis_read');
      return result as (string | null)[];
    },
    async remove(key, value) { await command(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, key, value]); },
    async rate(key, limit) {
      const result = await command(['EVAL', "local c=redis.call('INCR',KEYS[1]); if c==1 then redis.call('EXPIRE',KEYS[1],600) end return c", 1, key]);
      if (!Number.isInteger(result) || Number(result) < 1) throw new Error('redis_rate');
      return Number(result) <= limit;
    },
  };
}
