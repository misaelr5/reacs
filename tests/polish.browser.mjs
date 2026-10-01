import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { writeFileSync } from 'node:fs';
import { fileAgenda, updateAgenda } from '../lib/agenda-repository.ts';
const base='http://127.0.0.1:4174',password=process.env.BOOKING_ADMIN_TEST_PASSWORD;
if(!password)throw new Error('Set BOOKING_ADMIN_TEST_PASSWORD locally.');
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={checks:[],responsive:[],errors:[],axe:[]};let requestId,baseline,context;
try{
  context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('reac_analytics_consent','denied'));
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/agendar');assert.equal(await page.title(),'Agendar llamada | Reac Studio');
  await page.locator('[name=professionalId][value=misael]').focus();await page.keyboard.press('Space');await page.locator('#booking-picker').waitFor({state:'visible'});
  await page.locator('#booking-days button:enabled').first().focus();await page.keyboard.press('Enter');
  await page.locator('#booking-times button').first().focus();await page.keyboard.press('Enter');
  await page.locator('[name=name]').focus();await page.keyboard.type('Prueba privada de pulido');await page.keyboard.press('Tab');await page.keyboard.type('invalid-email');await page.keyboard.press('Tab');assert.equal(await page.locator('[name=company]').evaluate(el=>el===document.activeElement),true,'Blur validation must not trap keyboard focus');await page.keyboard.press('Shift+Tab');await page.keyboard.press('Control+A');await page.keyboard.type('polish@example.test');
  await page.keyboard.press('Tab');await page.keyboard.type('Empresa de prueba');await page.keyboard.press('Tab');await page.keyboard.type('+54 9 3544 123456');
  await page.keyboard.press('Tab');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab');await page.keyboard.type('Mensaje privado sintetico');await page.keyboard.press('Tab');await page.keyboard.press('Space');
  assert.equal(await page.locator('[name=consent]').isChecked(),true);assert.match(await page.locator('#booking-review').innerText(),/Misael/);
  for(const width of [320,360,375,390,430,768,1024,1440,1920]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.responsive.push({screen:'public-review',width});}
  await page.setViewportSize({width:375,height:812});await page.screenshot({path:'artifacts/booking-polish-mobile.png',fullPage:true});
  const responsePromise=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/booking'));
  await page.locator('#booking-submit').focus();await page.keyboard.press('Enter');const response=await responsePromise;requestId=response.request().postDataJSON().requestId;assert.equal(response.status(),200);await page.locator('#booking-success').waitFor({state:'visible'});
  assert.match(await page.locator('#booking-confirm-note').innerText(),/TEST MODE/);report.checks.push('375px keyboard-only booking with review and success');
  const publicResult=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.equal(publicResult.violations.length,0);report.axe.push('public success');
  await page.goto(base+'/admin/login');assert.equal(await page.locator('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
  await page.locator('#admin-password').fill(password);await page.locator('#admin-login-form button').click();await page.waitForURL('**/admin/agenda');await page.locator('#admin-content').waitFor({state:'visible'});
  const state=async id=>(await context.request.get(base+'/api/admin?action=state&professionalId='+id)).json();baseline={misael:await state('misael'),tomas:await state('tomas')};
  await page.locator('[data-tab=bookings]').click();await page.locator('.admin-reservation').filter({hasText:'Prueba privada de pulido'}).getByRole('button',{name:'Ver detalle'}).click();
  assert.match(await page.locator('#admin-booking-detail').innerText(),/polish@example.test/);assert.match(await page.locator('#admin-booking-detail').innerText(),/Mensaje privado sintetico/);
  for(const width of [320,360,375,390,430,768,1024,1440,1920]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.responsive.push({screen:'private-detail',width});}
  assert.equal((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations.length,0);report.axe.push('private detail');
  await page.keyboard.press('Escape');await page.locator('#admin-booking-dialog').waitFor({state:'hidden'});
  await page.setViewportSize({width:1440,height:1000});await page.locator('#admin-professional').selectOption('tomas');await page.waitForFunction(()=>document.querySelector('#admin-content').hidden===false&&document.querySelector('#admin-owner-note'));
  await page.locator('[data-tab=weekly]').click();await page.locator('[data-day="1"] [data-active]').uncheck();await page.locator('#admin-weekly-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.startsWith('Guardado'));
  assert.equal((await state('tomas')).weekly[1].length,0);assert.deepEqual((await state('misael')).weekly,baseline.misael.weekly);report.checks.push('Admin Tomas weekly change isolated from Misael');
  await page.locator('#admin-professional').selectOption('misael');await page.waitForFunction(()=>!document.querySelector('#admin-content').hidden);await page.locator('[data-tab=agenda]').click();
  await page.screenshot({path:'artifacts/admin-polish-desktop.png',fullPage:true});
  await page.locator('[data-quick=closed]').first().click();await page.locator('[name=reason]').fill('POLISH TEST EXCEPTION');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  assert.ok(!(await state('tomas')).exceptions.some(item=>item.reason==='POLISH TEST EXCEPTION'));
  await page.locator('[data-tab=exceptions]').click();await page.locator('.admin-exception').filter({hasText:'POLISH TEST EXCEPTION'}).getByRole('button',{name:'Eliminar'}).click();
  await page.locator('#admin-confirm').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.ok((await state('misael')).exceptions.some(item=>item.reason==='POLISH TEST EXCEPTION'));
  await page.locator('.admin-exception').filter({hasText:'POLISH TEST EXCEPTION'}).getByRole('button',{name:'Eliminar'}).click();await page.locator('#admin-confirm-accept').click();await page.waitForFunction(()=>!document.querySelector('#admin-exceptions').textContent.includes('POLISH TEST EXCEPTION'));
  await page.locator('[data-tab=settings]').click();await page.locator('#admin-health-check').click();await page.waitForFunction(()=>document.querySelector('#admin-health-result').textContent.includes('Calendar API:'));
  report.checks.push('Independent exception, accessible confirm/cancel and private health');
  // A real open form keeps its reviewed end time when another page changes duration.
  const stale=await context.newPage();await stale.goto(base+'/agendar');await stale.locator('[name=professionalId][value=misael]').check();await stale.locator('#booking-picker').waitFor({state:'visible'});
  const oldAvailability=await(await context.request.get(base+'/api/booking?professionalId=misael')).json();
  await stale.locator('#booking-days button:enabled').first().click();await stale.locator('#booking-times button').first().click();
  await stale.locator('[name=name]').fill('Stale duration fixture');await stale.locator('[name=email]').fill('stale@example.test');await stale.locator('[name=service]').selectOption('Desarrollo web');await stale.locator('[name=consent]').check();
  assert.match(await stale.locator('#booking-review-duration').innerText(),/30 minutos/);
  await stale.route('**/api/booking*',route=>route.request().method()==='GET'?route.fulfill({json:oldAvailability}):route.continue());
  await page.locator('[name=durationMinutes]').selectOption('60');await page.locator('#admin-settings-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.startsWith('Guardado'));
  assert.equal((await state('misael')).config.durationMinutes,60);assert.equal((await state('tomas')).config.durationMinutes,baseline.tomas.config.durationMinutes);
  const staleResult=stale.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/booking'));await stale.locator('#booking-submit').click();const rejected=await staleResult;assert.equal(rejected.status(),409);
  const payload=rejected.request().postDataJSON();assert.equal((Date.parse(payload.end)-Date.parse(payload.start))/60000,30);
  assert.ok(!(await state('misael')).upcoming.some(item=>item.id===payload.requestId));await stale.close();report.checks.push('Open 30-minute form after admin changes Misael to 60: HTTP 409, no booking; Tomas unchanged');
  const slotsM=await(await context.request.get(base+'/api/booking?professionalId=misael')).json();const slotsT=await(await context.request.get(base+'/api/booking?professionalId=tomas')).json();
  const eleven=slotsM.slots.find(slot=>slot.label==='11:00'&&slotsT.slots.some(other=>other.start===slot.start));assert.ok(eleven);
  await page.locator('[data-tab=agenda]').click();await page.locator('[data-quick=block]').first().click();await page.locator('[name=from]').fill(eleven.date);await page.locator('#dialog-intervals [data-bound=start]').fill('11:00');await page.locator('#dialog-intervals [data-bound=end]').fill('12:00');await page.locator('[name=reason]').fill('POLISH TEST EXCEPTION');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  assert.ok(!(await(await context.request.get(base+'/api/booking?professionalId=misael')).json()).slots.some(slot=>slot.start===eleven.start));assert.ok((await(await context.request.get(base+'/api/booking?professionalId=tomas')).json()).slots.some(slot=>slot.start===eleven.start));report.checks.push('Admin blocks Misael at 11:00; Tomas at 11:00 remains available');
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify({checks:report.checks,responsive:report.responsive.length,axe:report.axe,errors:report.errors},null,2));
}finally{
  if(context&&baseline){for(const id of ['misael','tomas']){let current=await(await context.request.get(base+'/api/admin?action=state&professionalId='+id)).json();for(const item of current.exceptions.filter(item=>item.reason==='POLISH TEST EXCEPTION')){await context.request.delete(base+'/api/admin?action=exception&professionalId='+id+'&id='+item.id,{headers:{origin:base},data:{revision:current.revision}});current=await(await context.request.get(base+'/api/admin?action=state&professionalId='+id)).json();}const result=await context.request.put(base+'/api/admin?action=config&professionalId='+id,{headers:{origin:base},data:{revision:current.revision,config:baseline[id].config,weekly:baseline[id].weekly}});assert.equal(result.status(),200);}}
  await browser.close();if(requestId)await updateAgenda(fileAgenda('.local/booking-agenda-mock.json'),state=>{state.reservations=state.reservations.filter(item=>item.id!==requestId);});writeFileSync('artifacts/polish-browser-report.json',JSON.stringify(report,null,2));
}
