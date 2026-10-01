import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialAgenda, professionalAgenda, editProfessionalAgenda, validateException } from '../lib/agenda-rules.ts';
import { memoryAgenda, fileAgenda, updateAgenda } from '../lib/agenda-repository.ts';
import { createAdminHandler } from '../lib/agenda-admin.ts';
import { createBookingHandler } from '../lib/booking.ts';
import { memoryBookingStore } from '../lib/booking-store.ts';
import { googleProvider } from '../lib/booking-google.ts';
import { professionalCalendarEnv } from '../lib/booking-config.ts';
import { bookingHealth } from '../lib/booking-health.ts';
const origin = 'http://127.0.0.1:4174';
const now = new Date('2026-09-28T08:00:00Z');
const env = { BOOKING_ADMIN_SECRET: 'test-polish-admin-long-secret-not-real', BOOKING_MODE: 'mock' };
const bookingInput = (professionalId = 'misael') => ({ requestId: randomUUID(), professionalId, start: '2026-09-28T12:00:00.000Z', end: '2026-09-28T12:30:00.000Z', name: 'Synthetic client', email: 'synthetic@example.test', phone: '+54 9 3544 123456', company: 'Synthetic company', service: 'Desarrollo web', message: 'Synthetic private message', consent: true });
const post = (body: unknown) => new Request(origin + '/api/booking', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
async function setup() {
  const repository = memoryAgenda(); const sessions = memoryBookingStore();
  const admin = createAdminHandler({ repository, sessions, now: () => now });
  const req = (action: string, professionalId = 'misael', method = 'GET', body?: unknown, cookie = '') => new Request(origin + '/api/admin?action=' + action + '&professionalId=' + professionalId, { method, headers: { cookie, origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const login = await admin(req('login', 'misael', 'POST', { password: env.BOOKING_ADMIN_SECRET }), env);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  return { repository, admin, req: (action: string, id = 'misael', method = 'GET', body?: unknown) => req(action,id,method,body,cookie), booking: createBookingHandler({ repository, now: () => now }) };
}
test('admin configuration and exceptions belong to one professional; cross-owner deletes fail', async () => {
  const { repository, admin, req, booking } = await setup();
  let state = await repository.read(); const own = professionalAgenda(state, 'misael');
  assert.equal((await admin(req('config','misael','PUT',{ revision: state.revision, config: { ...own.config, durationMinutes: 15 }, weekly: own.weekly }), env)).status,200);
  state = await repository.read();
  assert.equal(professionalAgenda(state,'misael').config.durationMinutes,15);
  assert.equal(professionalAgenda(state,'tomas').config.durationMinutes,30);
  const exception = { kind:'closed',from:'2026-09-28',through:'2026-09-28',intervals:[],reason:'Synthetic internal note' };
  assert.equal((await admin(req('exception','misael','POST',{revision:state.revision,exception}),env)).status,200);
  state=await repository.read();const id=professionalAgenda(state,'misael').exceptions[0].id;
  assert.equal((await admin(req('exception&id='+id,'tomas','DELETE',{revision:state.revision}),env)).status,404);
  const m=await(await booking(new Request(origin+'/api/booking?professionalId=misael'),{})).json();
  const t=await(await booking(new Request(origin+'/api/booking?professionalId=tomas'),{})).json();
  assert.ok(!m.slots.some((s:{date:string})=>s.date==='2026-09-28'));assert.ok(t.slots.some((s:{date:string})=>s.date==='2026-09-28'));
  assert.ok(!JSON.stringify([m,t]).includes('Synthetic internal note'));
});
test('admin client details are private; public success and availability omit client fields', async () => {
  const { admin,req,booking }=await setup();const body=bookingInput();
  const response=await booking(post(body),{});assert.equal(response.status,200);assert.ok(!(await response.text()).includes(body.email));
  const state=await(await admin(req('state'),env)).json();assert.equal(state.upcoming[0].client.email,body.email);assert.equal(state.upcoming[0].mode,'mock');
  const other=await(await admin(req('state','tomas'),env)).json();assert.equal(other.upcoming.length,0);
  const publicState=await(await booking(new Request(origin+'/api/booking'),{})).text();assert.ok(!publicState.includes(body.email));assert.ok(!publicState.includes(body.message));
  assert.equal((await admin(new Request(origin+'/api/admin?action=state'),env)).status,401);
});
test('stale duration returns 409, and concurrent overlapping buffered meetings admit only one', async () => {
  const { repository,booking }=await setup();const body=bookingInput();
  await updateAgenda(repository,s=>{editProfessionalAgenda(s,'misael').config.durationMinutes=60;});
  assert.equal((await booking(post(body),{})).status,409);
  await updateAgenda(repository,s=>{editProfessionalAgenda(s,'misael').config.durationMinutes=30;});
  const other={...bookingInput(),start:'2026-09-28T12:30:00.000Z',end:'2026-09-28T13:00:00.000Z'};
  const results=await Promise.all([booking(post(body),{}),booking(post(other),{})]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('v1 migration copies independent professional rules and never overwrites corrupt storage', async () => {
  const directory=await mkdtemp(join(tmpdir(),'reac-polish-'));const path=join(directory,'agenda.json');
  try {
    const old=initialAgenda();old.version=1;delete old.professionalAgendas;old.weekly[1]=[{start:600,end:960}];
    old.exceptions.push(validateException({kind:'block',from:'2026-09-29',through:'2026-09-29',intervals:[{start:660,end:720}],reason:'Legacy block'}));
    old.reservations.push({id:randomUUID(),fingerprint:'legacy',start:'2026-09-28T12:00:00.000Z',end:'2026-09-28T12:30:00.000Z',bufferBefore:15,bufferAfter:15,status:'confirmed',createdAt:now.toISOString()});
    await writeFile(path,JSON.stringify(old));const repo=fileAgenda(path);const next=await repo.read();assert.equal(next.version,2);assert.deepEqual(professionalAgenda(next,'misael').weekly,professionalAgenda(next,'tomas').weekly);
    assert.deepEqual(next.reservations,old.reservations);assert.deepEqual(next.exceptions,old.exceptions);
    assert.deepEqual(await repo.read(),next,'Repeated migration of unchanged v1 is deterministic');
    assert.equal(await repo.compareAndSet(next.revision,next),true);
    assert.deepEqual(await repo.read(),next,'Reading persisted v2 does not migrate or duplicate again');
    await updateAgenda(repo,s=>{editProfessionalAgenda(s,'misael').weekly[1]=[];});assert.equal(professionalAgenda(await repo.read(),'tomas').weekly[1][0].start,600);
    await writeFile(path,'{corrupted');await assert.rejects(repo.read());await assert.rejects(updateAgenda(repo,s=>{s.revision++;}));assert.equal(await readFile(path,'utf8'),'{corrupted');
  } finally {await unlink(path);await rmdir(directory);}
});

test('open forms reject changed weekly availability, admin blocks and newly conflicting buffers with 409',async()=>{
  for(const change of ['weekly','block','buffer'] as const){
    const {repository,booking}=await setup();const body=bookingInput();
    if(change==='buffer'){
      await updateAgenda(repository,s=>{const own=editProfessionalAgenda(s,'misael');own.config.bufferBefore=0;own.config.bufferAfter=0;});
      assert.equal((await booking(post({...bookingInput(),start:'2026-09-28T12:30:00.000Z',end:'2026-09-28T13:00:00.000Z'}),{})).status,200);
    }
    const before=await(await booking(new Request(origin+'/api/booking?professionalId=misael'),{})).json();assert.ok(before.slots.some((s:{start:string})=>s.start===body.start));
    await updateAgenda(repository,s=>{const own=editProfessionalAgenda(s,'misael');if(change==='weekly')own.weekly[1]=[];else if(change==='buffer')own.config.bufferAfter=15;else own.exceptions.push(validateException({kind:'block',from:'2026-09-28',through:'2026-09-28',intervals:[{start:540,end:570}],reason:'Test'}));});
    assert.equal((await booking(post(body),{})).status,409,change);
    assert.ok(!(await repository.read()).reservations.some(r=>r.id===body.requestId));
    const other=await(await booking(new Request(origin+'/api/booking?professionalId=tomas'),{})).json();assert.ok(other.slots.some((s:{start:string})=>s.start===body.start));
  }
});

test('provider conflict discovered at confirmation rejects and removes pending local reservation',async()=>{
  const repository=memoryAgenda();let busy=false;let inserts=0;
  const handler=createBookingHandler({repository,now:()=>now,calendar:{async busy(){return busy?[{start:'2026-09-28T12:00:00.000Z',end:'2026-09-28T12:30:00.000Z'}]:[];},async get(){return null;},async insert(){inserts++;throw new Error('Unexpected insert');}}});
  assert.equal((await handler(new Request(origin+'/api/booking'),{})).status,200);busy=true;
  assert.equal((await handler(post(bookingInput()),{})).status,409);assert.equal(inserts,0);assert.equal((await repository.read()).reservations.length,0);
});

test('unexpected errors have correlated safe IDs and logs omit request data and thrown secrets',async context=>{
  const logs:string[]=[];context.mock.method(console,'info',(text:string)=>logs.push(text));
  const handler=createBookingHandler({repository:{kind:'broken-test',async read(){throw new Error('private-token-do-not-leak');},async compareAndSet(){return false;}}});
  const response=await handler(post(bookingInput()),{});assert.equal(response.status,503);const body=await response.json();assert.match(body.errorId,/^REAC-[A-F0-9]{8}$/);
  assert.ok(logs.some(line=>JSON.parse(line).requestId===body.errorId));
  assert.ok(!JSON.stringify([body,logs]).match(/private-token|synthetic@example|3544|Synthetic private/));
});
test('health is authenticated and contains statuses, never configuration secrets',async()=>{
  const {admin,req}=await setup();const config={...env,GOOGLE_CLIENT_SECRET:'do-not-expose-client-secret',GOOGLE_REFRESH_TOKEN:'do-not-expose-token'};
  assert.equal((await admin(new Request(origin+'/api/admin?action=health'),config)).status,401);
  const response=await admin(req('health'),config);assert.equal(response.status,200);const text=await response.text();assert.ok(!text.includes('do-not-expose'));assert.equal(JSON.parse(text).google,'not-configured');
  assert.equal(bookingHealth({}).apiEnabled,'not-verified');
});
test('Calendar and FreeBusy use the configured calendar of the selected professional',async()=>{
  const config={GOOGLE_CALENDAR_ID_MISAEL:'misael-calendar',GOOGLE_CALENDAR_ID_TOMAS:'tomas-calendar',GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture',GOOGLE_REFRESH_TOKEN:'fixture'};
  for(const id of ['misael','tomas'] as const){const effective=professionalCalendarEnv(config,id);const urls:string[]=[];
    const provider=googleProvider(effective,async(url,init)=>{urls.push(String(url));if(String(url).includes('oauth2'))return Response.json({access_token:'fixture'});if(String(url).endsWith('/freeBusy')){const body=JSON.parse(String(init?.body));assert.equal(body.items[0].id,id+'-calendar');return Response.json({calendars:{[id+'-calendar']:{busy:[]}}});}return Response.json({id:'fixture'});});
    await provider.busy([{start:'2026-09-28T12:00:00.000Z',end:'2026-09-28T12:30:00.000Z',date:'2026-09-28',label:'09:00'}]);await provider.get('fixture');assert.ok(urls.some(url=>url.includes('/calendars/'+id+'-calendar/events/fixture')));
  }
});
