import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
if (!process.env.BOOKING_ADMIN_SECRET) process.loadEnvFile('.env.local');
const loginPassword = process.env.BOOKING_ADMIN_TEST_PASSWORD || (!process.env.BOOKING_ADMIN_PASSWORD_HASHES ? process.env.BOOKING_ADMIN_SECRET : undefined);
if (!loginPassword) throw new Error('Set BOOKING_ADMIN_TEST_PASSWORD for the local browser test when custom password hashes are configured.');
const base = process.env.TEST_URL || 'http://127.0.0.1:4174';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Local browser tests only');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { responsive: [], scenarios: [], axe: [], errors: [] };
mkdirSync('artifacts', { recursive: true });
let context, baseline;
try {
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.on('pageerror',error=>report.errors.push(error.message));
  await context.addInitScript(()=>localStorage.setItem('reac_analytics_consent','denied'));
  await page.goto(base+'/admin/agenda'); await page.waitForURL('**/admin/login');
  assert.equal((await context.request.get(base+'/api/admin?action=state')).status(),401);
  for (const width of [320,360,375,390,430,768,1024,1440,1920]) { await page.setViewportSize({width,height:900}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); }
  const loginAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze(); assert.deepEqual(loginAxe.violations.map(v=>v.id),[]);
  await page.locator('#admin-password').fill(loginPassword); await page.locator('#admin-login-form button').click(); await page.waitForURL('**/admin/agenda'); await page.locator('#admin-content').waitFor({state:'visible'});
  const state = async()=> (await context.request.get(base+'/api/admin?action=state')).json();
  baseline=await state(); assert.equal(baseline.mode,'mock','Never mutate Google data in this suite');
  assert.equal(baseline.exceptions.length,0,'Run this UI suite in a local test agenda without pre-existing exceptions');
  const publicSlots = async()=> (await context.request.get(base+'/api/booking')).json();
  const mutate=async(action,method,data,id)=>{const current=await state(); const response=await context.request.fetch(base+'/api/admin?action='+action+(id?'&id='+id:''),{method,headers:{origin:base},data:{revision:current.revision,...data}}); assert.equal(response.status(),200,await response.text());};
  for(const tab of ['agenda','weekly','exceptions','settings']) {
    await page.locator('[data-tab='+tab+']').click();
    for(const width of [320,360,375,390,430,768,1024,1440,1920]) {await page.setViewportSize({width,height:900}); const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);assert.ok(fits,tab+' overflows at '+width);report.responsive.push({tab,width,fits});}
    await page.setViewportSize({width:390,height:844}); const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze(); report.axe.push({tab,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))});assert.deepEqual(report.axe.at(-1).violations,[]);
  }
  await page.locator('[data-tab=agenda]').click(); await page.setViewportSize({width:1440,height:1000}); await page.screenshot({path:'artifacts/admin-agenda-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844}); await page.screenshot({path:'artifacts/admin-agenda-mobile.png',fullPage:true});
  const available=await publicSlots(); const sample=available.slots[0]; assert.ok(sample);
  const publicPage=await context.newPage();await publicPage.goto(base+'/agendar');await publicPage.locator('[name=professionalId][value=misael]').check(); await publicPage.locator('#booking-picker').waitFor({state:'visible'});
  // Prepare a genuine stale submit in a second page. Suppress polling only in this
  // test tab so the server, not client refresh, must reject it after admin blocks.
  await publicPage.locator('#booking-days button:enabled').first().click();await publicPage.locator('#booking-times button').first().click();
  await publicPage.locator('[name=name]').fill('Prueba local');await publicPage.locator('[name=email]').fill('person@example.test');await publicPage.locator('[name=service]').selectOption('Desarrollo web');await publicPage.locator('[name=consent]').check();
  await publicPage.route('**/api/booking*',route=>route.request().method()==='GET'?route.fulfill({json:available}):route.continue());
  await page.bringToFront(); await page.locator('[data-date="'+sample.date+'"]').click(); await page.locator('[name=kind][value=closed]').check();
  await page.locator('[name=reason]').fill('BROWSER TEST PRIVATE');
  for(const width of [320,360,375,390,430,768,1024,1440,1920]) {await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const dialogAxe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze(); assert.deepEqual(dialogAxe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  assert.ok(!(await publicSlots()).slots.some(slot=>slot.date===sample.date));
  await publicPage.bringToFront();const blockedResponse=publicPage.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/booking'));await publicPage.locator('#booking-submit').click();assert.equal((await blockedResponse).status(),409);await publicPage.waitForFunction(()=>document.querySelector('#booking-status').textContent.includes('ya no está disponible'));
  report.scenarios.push('UI full-day block removes public slots; stale browser submit rejected server-side');
  const reset=async date=>mutate('reset-day','POST',{date}); await reset(sample.date);
  await page.bringToFront();await page.locator('#admin-reload').click();await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.includes('actualizados'));
  await page.locator('[data-quick=block]').first().click();await page.locator('#dialog-intervals [data-bound=start]').fill('14:00');await page.locator('#dialog-intervals [data-bound=end]').fill('16:00');await page.locator('[name=from]').fill(sample.date);await page.locator('[name=reason]').fill('BROWSER TEST PRIVATE');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  const partial=(await publicSlots()).slots.filter(slot=>slot.date===sample.date);assert.ok(partial.length);assert.ok(partial.every(slot=>Number(slot.label.slice(0,2))<14)); report.scenarios.push('UI 14:00–16:00 block preserves earlier slots and buffers');
  const nextSaturday=new Date(baseline.today+'T12:00:00Z');do{nextSaturday.setUTCDate(nextSaturday.getUTCDate()+1);}while(nextSaturday.getUTCDay()!==6);const saturday=nextSaturday.toISOString().slice(0,10);
  await page.locator('[data-quick=custom]').click();await page.locator('[name=from]').fill(saturday);await page.locator('#dialog-intervals [data-bound=start]').fill('10:00');await page.locator('#dialog-intervals [data-bound=end]').fill('13:00');await page.locator('[name=reason]').fill('BROWSER TEST PRIVATE');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  assert.ok((await publicSlots()).slots.some(slot=>slot.date===saturday));report.scenarios.push('UI exceptional Saturday 10:00–13:00 becomes bookable');
  await page.locator('[data-quick=period]').click();await page.locator('[name=from]').fill(saturday);const end=new Date(nextSaturday.getTime()+2*86400000).toISOString().slice(0,10);await page.locator('[name=through]').fill(end);await page.locator('[name=reason]').fill('BROWSER TEST PRIVATE');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  assert.ok(!(await publicSlots()).slots.some(slot=>slot.date>=saturday&&slot.date<=end)); report.scenarios.push('UI period overrides exceptional availability');
  await page.locator('[data-tab=weekly]').click();await page.locator('[data-day="1"] [data-active]').uncheck();await page.locator('#admin-weekly-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.startsWith('Guardado'));
  assert.ok(!(await publicSlots()).slots.some(slot=>new Date(slot.date+'T12:00:00Z').getUTCDay()===1));report.scenarios.push('UI weekly weekday disabled');
  await page.locator('[data-tab=settings]').click();await page.locator('[name=durationMinutes]').selectOption('45');await page.locator('#admin-settings-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#admin-status').textContent.startsWith('Guardado'));assert.equal((await publicSlots()).durationMinutes,45);
  await page.locator('[data-tab=exceptions]').click();await page.locator('.admin-exception').first().locator('button',{hasText:'Editar'}).click();await page.locator('[name=reason]').fill('BROWSER TEST PRIVATE EDITED');await page.locator('#dialog-save').click();await page.locator('#admin-dialog').waitFor({state:'hidden'});
  await page.locator('.admin-exception').first().locator('button',{hasText:'Eliminar'}).click();await page.locator('#admin-confirm-accept').click();await page.waitForFunction(()=>!document.querySelector('#admin-exceptions').textContent.includes('EDITED'));
  assert.ok(!JSON.stringify(await publicSlots()).includes('PRIVATE'));report.scenarios.push('UI settings, edit/delete confirmation, private reasons never public');
  assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report,null,2));
} finally {
  // Restore only test-owned exceptions and the baseline config/week. Never reset reservations.
  if(context&&baseline){
    const get=async()=>(await context.request.get(base+'/api/admin?action=state')).json();let current=await get();
    for(const item of current.exceptions.filter(item=>item.reason.startsWith('BROWSER TEST PRIVATE')&&!baseline.exceptions.some(old=>old.id===item.id))){const response=await context.request.delete(base+'/api/admin?action=exception&id='+item.id,{headers:{origin:base},data:{revision:current.revision}});assert.equal(response.status(),200);current=await get();}
    const restore=await context.request.put(base+'/api/admin?action=config',{headers:{origin:base},data:{revision:current.revision,config:baseline.config,weekly:baseline.weekly}});assert.equal(restore.status(),200);
    const logout=await context.request.post(base+'/api/admin?action=logout',{headers:{origin:base},data:{}});assert.equal(logout.status(),200);assert.equal((await context.request.get(base+'/api/admin?action=state')).status(),401);
  }
  writeFileSync('artifacts/agenda-browser-report.json',JSON.stringify(report,null,2));await browser.close();
}
