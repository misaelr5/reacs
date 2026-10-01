// Shared Upstash REST transport. Credentials stay on the server.
export async function redisCommand(env: Record<string, string | undefined>, command: (string | number)[], fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const url = new URL(env.UPSTASH_REDIS_REST_URL || '');
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.upstash.io') || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !env.UPSTASH_REDIS_REST_TOKEN) throw new Error('redis_config');
  const response = await fetchImpl(url.origin, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000), headers: { Authorization: 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  if (!response.ok) throw new Error('redis_unavailable');
  const data = await response.json() as { result?: unknown; error?: unknown };
  if (data.error || !('result' in data)) throw new Error('redis_unavailable');
  return data.result;
}
