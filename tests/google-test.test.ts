import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { googleTestConfigured, professionalCalendarEnv } from '../lib/booking-config.ts';
import { googleProvider, GoogleProviderError } from '../lib/booking-google.ts';
import { createBookingHandler } from '../lib/booking.ts';
import { initialAgenda } from '../lib/agenda-rules.ts';
import { memoryAgenda } from '../lib/agenda-repository.ts';
import { memoryBookingStore } from '../lib/booking-store.ts';
import { bookingHealth, probeBookingHealth } from '../lib/booking-health.ts';

const origin = 'http://127.0.0.1:4174';
const now = new Date('2026-09-28T08:00:00Z');
const start = '2026-09-28T12:00:00.000Z';
const end = '2026-09-28T12:30:00.000Z';
const env = { BOOKING_MODE:'google_test', BOOKING_STORAGE:'upstash', GOOGLE_CLIENT_ID:'fixture-id', GOOGLE_CLIENT_SECRET:'fixture-secret', GOOGLE_REFRESH_TOKEN:'fixture-refresh', GOOGLE_CALENDAR_ID_MISAEL:'misael-test', GOOGLE_CALENDAR_ID_TOMAS:'tomas-test', BOOKING_TEST_EMAILS:'test@example.test', CONTACT_RATE_LIMIT_SECRET:'x'.repeat(32), UPSTASH_REDIS_REST_URL:'https://fixture.upstash.io', UPSTASH_REDIS_REST_TOKEN:'fixture-token' };
const input = (professionalId:'misael'|'tomas'='misael') => ({requestId:randomUUID(),professionalId,start,end,name:'Test only',email:'test@example.test',company:'Fixture company',phone:'',service:'Desarrollo web',message:'Fixture',consent:true as const});
const post = (body:unknown) => new Request(origin+'/api/booking',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});

test('Google TEST needs two different explicit secondary calendars, OAuth, Redis and a valid allowlist',async()=>{
  assert.equal(googleTestConfigured(env),true);
  for(const bad of [{GOOGLE_CALENDAR_ID_MISAEL:undefined},{GOOGLE_CALENDAR_ID_TOMAS:'misael-test'},{GOOGLE_CALENDAR_ID_TOMAS:'primary'},{GOOGLE_CLIENT_SECRET:undefined},{UPSTASH_REDIS_REST_TOKEN:undefined},{BOOKING_TEST_EMAILS:' '},{BOOKING_STORAGE:'local'}]){
    const config={...env,...bad};assert.equal(googleTestConfigured(config),false);
    const handle=createBookingHandler({repository:memoryAgenda(),store:memoryBookingStore(),now:()=>now});
    assert.equal((await handle(post(input()),config)).status,503);
  }
  assert.equal(professionalCalendarEnv(env,'misael').GOOGLE_CALENDAR_ID,'misael-test');
  assert.equal(professionalCalendarEnv(env,'tomas').GOOGLE_CALENDAR_ID,'tomas-test');
  const handle=createBookingHandler({repository:memoryAgenda(),store:memoryBookingStore(),now:()=>now});
  const denied=await handle(post({...input(),email:'outside@example.test'}),env);assert.equal(denied.status,400);const text=await denied.text();assert.match(text,/Este email no está habilitado para pruebas/);assert.ok(!text.includes('test@example.test'));
});

test('provider classifies OAuth, FreeBusy and insert failures without returning private upstream bodies',async()=>{
  const calendar=professionalCalendarEnv(env,'misael');const slot={start,end,date:'2026-09-28',label:'09:00'};
  for(const [phase,status,code] of [['oauth',401,'invalid_grant'],['freebusy',403,'forbidden'],['freebusy',429,'rate_limited'],['freebusy',500,'upstream_unavailable']] as const){
    const provider=googleProvider(calendar,async url=>String(url).includes('oauth2')?phase==='oauth'?Response.json({error:'invalid_grant',secret:'never-expose'},{status}):Response.json({access_token:'test'}):Response.json({secret:'never-expose'},{status}));
    await assert.rejects(provider.busy([slot]),error=>error instanceof GoogleProviderError&&error.code===code&&error.definitelyNotCreated);
  }
  for(const [status,certain] of [[404,true],[429,true],[500,false]] as const){
    const provider=googleProvider(calendar,async url=>String(url).includes('oauth2')?Response.json({access_token:'test'}):String(url).includes('/events')?Response.json({error:'private'},{status}):Response.json({calendars:{'misael-test':{busy:[]}}}));
    await assert.rejects(provider.insert('reacfixture','fingerprint',input(),slot),error=>error instanceof GoogleProviderError&&error.definitelyNotCreated===certain);
  }
});

test('a definitive Google rejection rolls back the pending reservation and permits the same request retry',async()=>{
  const repository=memoryAgenda();const store=memoryBookingStore();let insertion=0;let eventId='';let insertedEvent:Record<string,unknown>|null=null;
  const network:typeof fetch=async(url,options)=>{
    const address=String(url);
    if(address.includes('oauth2'))return Response.json({access_token:'fixture-access'});
    if(address.endsWith('/freeBusy'))return Response.json({calendars:{'misael-test':{busy:[]}}});
    if(options?.method==='GET')return insertedEvent?Response.json(insertedEvent):Response.json({error:'notFound'},{status:404});
    insertion++;if(insertion===1)return Response.json({error:'rateLimitExceeded'},{status:429});
    const sent=JSON.parse(String(options?.body));eventId=sent.id;
    assert.equal(sent.start.dateTime,start);assert.equal(sent.start.timeZone,'America/Argentina/Cordoba');
    assert.equal(new Intl.DateTimeFormat('en-GB',{timeZone:sent.start.timeZone,hour:'2-digit',minute:'2-digit'}).format(new Date(sent.start.dateTime)),'09:00');
    assert.equal(sent.end.dateTime,end);assert.deepEqual(sent.attendees,[{email:'test@example.test',displayName:'Test only'}]);
    assert.equal(sent.extendedProperties.private.environment,'google_test');assert.equal(sent.extendedProperties.private.professionalId,'misael');
    assert.match(sent.description,/Environment: GOOGLE_TEST/);
    assert.match(address,/conferenceDataVersion=1&sendUpdates=none/);
    insertedEvent={...sent,hangoutLink:'https://meet.google.com/abc-defg-hij'};return Response.json(insertedEvent);
  };
  const handle=createBookingHandler({repository,store,calendar:googleProvider(professionalCalendarEnv(env,'misael'),network),now:()=>now});
  const body=input();const first=await handle(post(body),env);assert.equal(first.status,502);assert.equal((await repository.read()).reservations.length,0);
  const second=await handle(post(body),env);assert.equal(second.status,200);const result=await second.json();assert.equal(result.meetUrl,'https://meet.google.com/abc-defg-hij');assert.equal(result.invitationSent,false);assert.equal(result.eventId,eventId);
  assert.equal((await repository.read()).reservations.length,1);assert.equal((await repository.read()).reservations[0]?.status,'confirmed');
  const retry=await handle(post(body),env);assert.equal(retry.status,200);assert.equal(insertion,2);
});

test('Google TEST state starts empty and does not import mock reservations',async()=>{
  const mock=initialAgenda();mock.reservations.push({id:randomUUID(),fingerprint:'mock-fixture',start,end,bufferBefore:15,bufferAfter:15,status:'confirmed',createdAt:now.toISOString(),mode:'mock',professionalId:'misael'});
  const google=memoryAgenda();const handle=createBookingHandler({repository:google,store:memoryBookingStore(),calendar:{async busy(){return [];},async get(){return null;},async insert(){throw new Error('unexpected');}},now:()=>now});
  const availability=await(await handle(new Request(origin+'/api/booking?professionalId=misael'),env)).json();assert.ok(availability.slots.some((slot:{start:string})=>slot.start===start));assert.equal((await google.read()).reservations.length,0);assert.equal(mock.reservations.length,1);
});

test('two Google calendars admit the same 09:00; duplicate Misael requests produce one event',async()=>{
  const repository=memoryAgenda();const store=memoryBookingStore();const events:{id:string;calendar:string}[]=[];
  const make=(id:'misael'|'tomas')=>{
    const calendar=professionalCalendarEnv(env,id).GOOGLE_CALENDAR_ID!;
    const network:typeof fetch=async(url,options)=>{
      const address=String(url);
      if(address.includes('oauth2'))return Response.json({access_token:'fixture-access'});
      if(address.endsWith('/freeBusy'))return Response.json({calendars:{[calendar]:{busy:[]}}});
      if(options?.method==='GET')return Response.json({error:'notFound'},{status:404});
      const event=JSON.parse(String(options?.body));events.push({id:event.id,calendar});return Response.json(event);
    };
    return createBookingHandler({repository,store,calendar:googleProvider(professionalCalendarEnv(env,id),network),now:()=>now});
  };
  const misael=make('misael'),tomas=make('tomas');
  const responses=await Promise.all([misael(post(input('misael')),env),misael(post(input('misael')),env),tomas(post(input('tomas')),env)]);
  assert.deepEqual(responses.slice(0,2).map(response=>response.status).sort(),[200,409]);assert.equal(responses[2]?.status,200);
  assert.deepEqual(events.map(event=>event.calendar).sort(),['misael-test','tomas-test']);assert.equal((await repository.read()).reservations.length,2);
});

test('an existing foreign event fingerprint rejects without leaving a pending reservation',async()=>{
  const repository=memoryAgenda();let inserts=0;
  const handle=createBookingHandler({repository,store:memoryBookingStore(),now:()=>now,calendar:{async busy(){return [];},async get(id){return {id,extendedProperties:{private:{bookingFingerprint:'another-request'}}};},async insert(){inserts++;throw new Error('unexpected insertion');}}});
  const response=await handle(post(input()),env);assert.equal(response.status,409);assert.equal(inserts,0);assert.equal((await repository.read()).reservations.length,0);
});

test('private probe checks Redis and each calendar separately without exposing credentials',async()=>{
  const seen:string[]=[];
  const network:typeof fetch=async(url,options)=>{const address=String(url);seen.push(address);if(address.includes('upstash.io'))return Response.json({result:'PONG'});if(address.includes('oauth2'))return Response.json({access_token:'fixture-access'});const body=JSON.parse(String(options?.body));return Response.json({calendars:{[body.items[0].id]:{busy:[]}}});};
  const result=await probeBookingHealth(env,network);assert.equal(result.upstash,'connected');assert.equal(result.apiEnabled,'reachable');assert.deepEqual(result.professionals.map(person=>person.freeBusy),['ok','ok']);assert.equal(seen.filter(url=>url.endsWith('/freeBusy')).length,2);
  assert.ok(!JSON.stringify([bookingHealth(env),result]).includes('fixture-secret'));assert.ok(!JSON.stringify([bookingHealth(env),result]).includes('fixture-token'));
});

test('cleanup refuses an unmarked event and deletes only a matching app-created test event',async()=>{
  const slot=input();let deletes=0;let mismatch=true;
  const provider=googleProvider(professionalCalendarEnv(env,'misael'),async(url,init)=>{
    const address=String(url);if(address.includes('oauth2'))return Response.json({access_token:'fixture-access'});
    if(init?.method==='DELETE'){deletes++;return new Response(null,{status:204});}
    return Response.json({id:'reacfixture',summary:'[TEST] Synthetic',extendedProperties:{private:{environment:'google_test',bookingRequestId:slot.requestId,professionalId:'misael',bookingFingerprint:mismatch?'other':'fixture-fingerprint'}}});
  });
  await assert.rejects(provider.deleteTestEvent('reacfixture','fixture-fingerprint',slot.requestId,'misael'),error=>error instanceof GoogleProviderError&&error.code==='test_event_identity_mismatch');assert.equal(deletes,0);
  mismatch=false;assert.equal(await provider.deleteTestEvent('reacfixture','fixture-fingerprint',slot.requestId,'misael'),'deleted');assert.equal(deletes,1);
});
