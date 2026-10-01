// Run manually after configuring YOUR DEVELOPMENT OAuth client in .env.local.
// Tokens are written only to the ignored local file, never printed or served.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const redirect = 'http://127.0.0.1:4280/oauth/callback';
const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) throw new Error('Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local first.');
const state = randomBytes(32).toString('hex');
let exchanging = false;
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  const url = new URL(request.url, redirect);
  if (request.method !== 'GET' || url.pathname !== '/oauth/callback' || url.searchParams.get('state') !== state || !url.searchParams.get('code') || exchanging) { response.writeHead(400); response.end('Autorización no válida.'); return; }
  exchanging = true;
  try {
    const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, code: url.searchParams.get('code'), grant_type: 'authorization_code' }) });
    if (!result.ok) throw new Error('oauth_exchange');
    const data = await result.json();
    if (typeof data.refresh_token !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(data.refresh_token)) throw new Error('refresh_token_missing');
    const prior = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
    const line = 'GOOGLE_REFRESH_TOKEN=' + data.refresh_token;
    writeFileSync('.env.local', /^GOOGLE_REFRESH_TOKEN=.*$/m.test(prior) ? prior.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line) : prior + '\n' + line + '\n');
    response.end('Autorización guardada en .env.local. Podés cerrar esta pestaña. No se creó ninguna reunión.');
    console.log('Refresh token saved in ignored .env.local. No events created.');
  } catch { response.writeHead(502); response.end('No se pudo guardar la autorización. Revisá el cliente OAuth y volvé a ejecutar el comando.'); }
  finally { clearTimeout(timer); server.close(); }
});
const timer = setTimeout(() => { server.close(); console.log('OAuth local expired. Run again to retry.'); }, 300000);
server.listen(4280, '127.0.0.1', () => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent', state, scope: 'https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.freebusy' }).toString();
  console.log('Open this URL and authorize only your development Google account:\n' + url);
});
