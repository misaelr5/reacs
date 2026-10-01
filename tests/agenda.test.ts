import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { professionalAgenda, initialAgenda, validateWeekly, validateConfig, validateException, dayRules } from '../lib/agenda-rules.ts';
import { memoryAgenda, fileAgenda, redisAgenda, updateAgenda } from '../lib/agenda-repository.ts';
import { generateSlots } from '../lib/booking-slots.ts';
import { createAdminHandler } from '../lib/agenda-admin.ts';
import { createBookingHandler } from '../lib/booking.ts';
import { memoryBookingStore } from '../lib/booking-store.ts';
import { adminAuth } from '../lib/agenda-auth.ts';
const now = new Date('2026-09-28T08:00:00Z');
const env = { BOOKING_ADMIN_SECRET: 'test-only-admin-secret-at-least-32-characters', BOOKING_MODE: 'mock' };
const origin = 'http://127.0.0.1:4174';
test('custom salted passwords both authenticate, reject wrong passwords and replace internal secret', async () => {
  const hashes = ['fixture-first','fixture-second'].map(password => { const salt = randomBytes(16); return { salt: salt.toString('hex'), hash: scryptSync(password, salt, 64).toString('hex') }; });
  const auth = adminAuth({ ...env, BOOKING_ADMIN_PASSWORD_HASHES: JSON.stringify(hashes) }, fetch, memoryBookingStore());
  for (const password of ['fixture-first','fixture-second']) assert.match(await auth.login(password, request('login','POST',{})), /HttpOnly/);
  await assert.rejects(auth.login('wrong', request('login','POST',{})));
  await assert.rejects(auth.login(env.BOOKING_ADMIN_SECRET, request('login','POST',{})));
  assert.throws(() => adminAuth({ ...env, BOOKING_ADMIN_PASSWORD_HASHES: '[{}]' }));
});
function request(action = 'state', method = 'GET', body?: unknown, cookie = '', otherOrigin = origin) {
  return new Request(origin + '/api/admin?action=' + action, { method, headers: { cookie, origin: otherOrigin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
function exception(kind: string, from = '2026-09-28', ranges: { start: number; end: number }[] = [], through = from) { return validateException({ kind, from, through, intervals: ranges, reason: 'Motivo privado' }); }
async function setup() {
  const repository = memoryAgenda(); const sessions = memoryBookingStore();
  const handle = createAdminHandler({ repository, sessions, now: () => now });
  const response = await handle(request('login','POST',{ password: env.BOOKING_ADMIN_SECRET }), env);
  assert.equal(response.status, 200); const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  return { repository, handle, cookie, sessions };
}
test('weekly: enabled/disabled weekdays and multiple normalized windows', () => {
  const state = initialAgenda(); state.config.bufferBefore = 0; state.config.bufferAfter = 0;
  state.weekly[1] = [{ start: 540, end: 720 }, { start: 840, end: 1080 }];
  let slots = generateSlots(now, [], state).filter(slot => slot.date === '2026-09-28');
  assert.equal(slots.length, 14); assert.ok(!slots.some(slot => slot.label === '12:00' || slot.label === '13:30'));
  state.weekly[1] = []; slots = generateSlots(now, [], state).filter(slot => slot.date === '2026-09-28'); assert.equal(slots.length, 0);
  const weekly = validateWeekly([[], [{start:540,end:720},{start:600,end:780}], [],[],[],[],[]]); assert.deepEqual(weekly[1], [{start:540,end:780}]);
  for (const value of [[], [[], [{start:1080,end:720}],[],[],[],[],[]], [[], [{start:-1,end:720}],[],[],[],[],[]]]) assert.throws(() => validateWeekly(value));
});
test('date rules: closed day, partial blocks, exceptional Saturday, period and overlaps', () => {
  const state = initialAgenda(); state.config.bufferBefore = 0; state.config.bufferAfter = 0;
  state.exceptions.push(exception('block','2026-09-28',[{start:840,end:1020}]), exception('block','2026-09-28',[{start:900,end:960}]));
  const monday = generateSlots(now, [], state).filter(slot => slot.date === '2026-09-28'); assert.ok(monday.length); assert.ok(monday.every(slot => slot.label < '14:00'));
  state.exceptions.push(exception('custom','2026-10-03',[{start:600,end:780}])); assert.equal(generateSlots(now, [], state).filter(slot => slot.date === '2026-10-03').length,6);
  state.exceptions.push(exception('closed','2026-10-02',[],'2026-10-05')); assert.equal(dayRules(state,'2026-10-03').windows.length,0);
  assert.equal(generateSlots(now, [], state).some(slot => slot.date >= '2026-10-02' && slot.date <= '2026-10-05'),false);
});
test('precedence: custom replaces weekly; block beats custom; Google busy and reservations remove slots', () => {
  const state = initialAgenda(); state.config.bufferBefore = 0; state.config.bufferAfter = 0;
  state.exceptions.push(exception('custom','2026-09-28',[{start:540,end:720}]),exception('block','2026-09-28',[{start:600,end:630}]));
  state.reservations.push({id:'test',fingerprint:'test',start:'2026-09-28T14:00:00Z',end:'2026-09-28T14:30:00Z',bufferBefore:0,bufferAfter:0,status:'confirmed',createdAt:now.toISOString()});
  const slots = generateSlots(now,[{start:'2026-09-28T12:00:00Z',end:'2026-09-28T12:30:00Z'}],state).filter(slot=>slot.date==='2026-09-28');
  assert.deepEqual(slots.map(slot=>slot.label),['09:30','10:30','11:30']);
});
test('config: duration/buffers/minimum notice/horizon and invalid settings', () => {
  const state = initialAgenda();
  for (const duration of [15,30,45,60]) { state.config.durationMinutes=duration; const slots=generateSlots(now,[],state); assert.ok(slots.length); for(const slot of slots) assert.equal(Date.parse(slot.end)-Date.parse(slot.start),duration*60000); }
  state.config = {...state.config,durationMinutes:30,bufferBefore:10,bufferAfter:5,horizonDays:7,minimumNoticeMinutes:1440};
  const slots=generateSlots(now,[],state); assert.ok(slots.every(slot=>Date.parse(slot.start)>=now.getTime()+86400000 && slot.date<'2026-10-05')); assert.equal(Date.parse(slots[1]!.start)-Date.parse(slots[0]!.start),30*60000);
  for(const change of [{durationMinutes:22},{bufferBefore:-1},{bufferAfter:999},{horizonDays:999},{minimumNoticeMinutes:0},{timezone:'UTC'}]) assert.throws(()=>validateConfig({...state.config,...change}));
});
test('exception input validation: invalid dates/ranges, empty custom and dangerous reason', () => {
  for(const change of [{from:'2026-02-30'},{through:'2025-01-01'},{kind:'unknown'},{kind:'custom'},{reason:'<script>'},{intervals:[{start:1080,end:720}]}]) assert.throws(()=>validateException({kind:'closed',from:'2026-09-28',through:'2026-09-28',intervals:[],reason:'',...change}));
});
test('admin API/HTML require session; cookie is opaque, HttpOnly and SameSite Strict', async () => {
  const {handle,cookie}=await setup();
  for(const [action,method] of [['state','GET'],['config','PUT'],['exception','POST'],['exception','PUT'],['exception','DELETE'],['reset-day','POST']]) assert.equal((await handle(request(action,method,method==='GET'?undefined:{}),env)).status,401);
  const html=await handle(new Request(origin+'/admin/agenda'),env); assert.equal(html.status,303); assert.equal(html.headers.get('location'),'/admin/login'); assert.equal(await html.text(),'');
  assert.equal((await handle(new Request(origin+'/admin/agenda',{headers:{cookie}}),env)).status,200);
  const login=await handle(request('login','POST',{password:env.BOOKING_ADMIN_SECRET}),env); const header=login.headers.get('set-cookie')!; assert.match(header,/HttpOnly/); assert.match(header,/SameSite=Strict/); assert.match(header,/Max-Age=14400/); assert.ok(!header.includes(env.BOOKING_ADMIN_SECRET)); assert.ok(!(await login.text()).includes(env.BOOKING_ADMIN_SECRET));
});
test('auth: CSRF, wrong/forged sessions, logout revocation and production gate', async () => {
  const {handle,cookie}=await setup();
  assert.equal((await handle(request('config','PUT',{},cookie,'https://evil.test'),env)).status,403);
  assert.equal((await handle(request('login','POST',{password:env.BOOKING_ADMIN_SECRET},'','https://evil.test'),env)).status,403);
  assert.equal((await handle(request('state','GET',undefined,'reac_admin='+'a'.repeat(64)),env)).status,401);
  assert.equal((await handle(request('state','GET',undefined,cookie),{...env,NODE_ENV:'production'})).status,503);
  assert.equal((await handle(request('logout','POST',{},cookie),env)).status,200);
  assert.equal((await handle(request('state','GET',undefined,cookie),env)).status,401);
});
test('login brute force limiting and secret rotation invalidates sessions', async () => {
  const {handle,cookie,sessions}=await setup();
  const rotated=adminAuth({...env,BOOKING_ADMIN_SECRET:'another-secret-at-least-32-characters'},fetch,sessions); assert.equal(await rotated.authenticated(request('state','GET',undefined,cookie)),false);
  let response; for(let i=0;i<9;i++) response=await handle(request('login','POST',{password:'wrong'}),env); assert.equal(response!.status,429);
});
test('CRUD config/exceptions: audit fields, stale version conflict and delete', async () => {
  const {handle,cookie,repository}=await setup(); let state=await repository.read();
  const bad=await handle(request('config','PUT',{revision:state.revision,config:{...state.config,durationMinutes:17},weekly:state.weekly},cookie),env); assert.equal(bad.status,400);
  let result=await handle(request('config','PUT',{revision:state.revision,config:{...state.config,durationMinutes:45},weekly:state.weekly},cookie),env); assert.equal(result.status,200);
  assert.equal((await handle(request('config','PUT',{revision:0,config:state.config,weekly:state.weekly},cookie),env)).status,409);
  state=professionalAgenda(await repository.read(), 'misael'); assert.equal(state.config.durationMinutes,45); assert.equal(state.updatedBy,'booking-admin');
  const payload={kind:'closed',from:'2026-09-28',through:'2026-09-28',intervals:[],reason:'Privado'};
  assert.equal((await handle(request('exception','POST',{revision:state.revision,exception:payload},cookie),env)).status,200);
  state=professionalAgenda(await repository.read(), 'misael'); const item=state.exceptions[0]!; assert.ok(item.createdAt); assert.ok(item.updatedAt); assert.equal(item.updatedBy,'booking-admin');
  result=await handle(request('exception&id='+item.id,'PUT',{revision:state.revision,exception:{...payload,reason:'Actualizado'}},cookie),env); assert.equal(result.status,200);
  state=await repository.read(); result=await handle(request('exception&id='+item.id,'DELETE',{revision:state.revision},cookie),env); assert.equal(result.status,200); assert.equal(professionalAgenda(await repository.read(), 'misael').exceptions.length,0);
});
test('habitual reset splits periods and restores one date without unblocking adjacent days', async () => {
  const {handle,cookie,repository}=await setup();
  await updateAgenda(repository,state=>{state.exceptions.push(exception('closed','2026-09-28',[],'2026-10-02'));});
  const state=await repository.read(); assert.equal((await handle(request('reset-day','POST',{revision:state.revision,date:'2026-09-30'},cookie),env)).status,200);
  const next=professionalAgenda(await repository.read(), 'misael'); assert.equal(next.exceptions.length,2); assert.ok(dayRules(next,'2026-09-30').windows.length); assert.equal(dayRules(next,'2026-09-29').windows.length,0); assert.equal(dayRules(next,'2026-10-01').windows.length,0);
});
test('stale public slot cannot be booked after an admin block; public response hides reasons', async () => {
  const {handle,cookie,repository}=await setup(); const booking=createBookingHandler({repository,now:()=>now});
  const available=await (await booking(new Request(origin+'/api/booking'),{})).json(); const slot=available.slots[0];
  const revision=(await repository.read()).revision;
  assert.equal((await handle(request('exception','POST',{revision,exception:{kind:'closed',from:slot.date,through:slot.date,intervals:[],reason:'PRIVATE VACATION'}},cookie),env)).status,200);
  const publicResult=await (await booking(new Request(origin+'/api/booking'),{})).json(); assert.ok(!JSON.stringify(publicResult).includes('PRIVATE')); assert.ok(!publicResult.slots.some((item:{date:string})=>item.date===slot.date));
  const result=await booking(new Request(origin+'/api/booking',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({requestId:randomUUID(),start:slot.start,name:'Prueba',email:'test@example.test',professionalId:'misael',service:'Desarrollo web',consent:true})}),{}); assert.equal(result.status,400); assert.equal((await result.json()).code,'invalid_slot');
});
test('schedule edits cannot create overlapping mock reservations on a different grid', async () => {
  const repository=memoryAgenda(); const booking=createBookingHandler({repository,now:()=>now});
  function book(start:string){return booking(new Request(origin+'/api/booking',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({requestId:randomUUID(),start,name:'Prueba',email:'test@example.test',professionalId:'misael',service:'Desarrollo web',consent:true})}),{});}
  assert.equal((await book('2026-09-28T13:00:00.000Z')).status,200);
  await updateAgenda(repository,state=>{state.config.durationMinutes=15;state.config.bufferBefore=0;state.config.bufferAfter=0;state.weekly[1]=[{start:615,end:1080}];});
  assert.notEqual((await book('2026-09-28T13:15:00.000Z')).status,200);
  const available=await(await booking(new Request(origin+'/api/booking'),{})).json(); assert.equal(available.durationMinutes,15); assert.ok(available.slots.some((item:{start:string})=>item.start==='2026-09-28T13:45:00.000Z'));
});
test('file persistence survives new repository instances; stale writes fail', async () => {
  const directory=await mkdtemp(join(tmpdir(),'reac-agenda-test-')); const path=join(directory,'agenda.json');
  try { const first=fileAgenda(path); await updateAgenda(first,state=>{state.config.durationMinutes=60;}); const second=fileAgenda(path); assert.equal((await second.read()).config.durationMinutes,60); assert.equal(await second.compareAndSet(0,initialAgenda()),false); }
  finally { await unlink(path); await rmdir(directory); }
});
test('atomic CAS retries preserve concurrent mutations, Redis validates contract', async () => {
  const repository=memoryAgenda(); await Promise.all([updateAgenda(repository,state=>{state.exceptions.push(exception('closed','2026-10-01'));}),updateAgenda(repository,state=>{state.exceptions.push(exception('closed','2026-10-02'));})]); assert.equal((await repository.read()).exceptions.length,2);
  const commands: unknown[][]=[]; let stored:string|null=null;
  const redis=redisAgenda({BOOKING_MODE:'mock',UPSTASH_REDIS_REST_URL:'https://test.upstash.io',UPSTASH_REDIS_REST_TOKEN:'test'},async (_url,init)=>{const command=JSON.parse(String(init?.body)) as unknown[];commands.push(command);if(command[0]==='GET')return Response.json({result:stored});stored=String(command[5]);return Response.json({result:1});});
  await updateAgenda(redis,state=>{state.config.durationMinutes=45;}); assert.equal((await redis.read()).config.durationMinutes,45); assert.equal(commands[1]?.[0],'EVAL');
});
