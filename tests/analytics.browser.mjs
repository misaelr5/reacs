import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8'));
const config=JSON.parse(readFileSync('vercel.json','utf8'));
const origin=manifest.siteUrl;
const browser=await chromium.launch({channel:'chrome',headless:true});
const events=[];let gtagRequests=0;let formStatus=503;
try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  // All requests are fixtures. No analytics, emails or public-site writes occur.
  await context.route('**/*',async route=>{
    const requestUrl=new URL(route.request().url());
    if(requestUrl.hostname==='www.googletagmanager.com'){gtagRequests++;await route.fulfill({contentType:'text/javascript',body:'/* analytics transport mocked */'});return;}
    if(requestUrl.origin!==origin){await route.fulfill({contentType:'text/css',body:''});return;}
    if(requestUrl.pathname==='/api/contact'){await route.fulfill({status:formStatus,contentType:'application/json',body:JSON.stringify({ok:formStatus===200})});return;}
    const entry=manifest.pages.find(p=>p.path===requestUrl.pathname);
    let file=entry?.file||requestUrl.pathname;
    const ext=file.split('.').at(-1);const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',webp:'image/webp'}[ext]||'text/plain';
    await route.fulfill({status:200,contentType:mime,headers:{'Content-Security-Policy':config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value},body:readFileSync('dist'+file)});
  });
  const page=await context.newPage();
  await page.exposeFunction('recordGtag',args=>events.push(args));
  await page.addInitScript(()=>{
    window.gtag=(...args)=>{
      window.recordGtag(args.map(value=>typeof value==='object'?JSON.parse(JSON.stringify(value)):value));
      if(args[0]==='event'&&typeof args[2]?.event_callback==='function')args[2].event_callback();
    };
  });
  await page.goto(origin+'/contacto?email=private@example.test');
  assert.equal(gtagRequests,0);assert.equal(events.length,0);
  assert.equal(await page.locator('[data-privacy-settings]').count(),0);
  await page.locator('[data-consent=denied]').click();
  await page.locator('#ct-nombre').fill('Persona de prueba');assert.equal(events.filter(args=>args[0]==='event').length,0);
  await page.goto(origin+'/politica-de-privacidad');await page.locator('[data-privacy-settings]').click();await page.locator('[data-consent=granted]').click();
  assert.equal(await page.locator('script[src*="googletagmanager"]').count(),1);
  await page.waitForTimeout(100);assert.equal(gtagRequests,1);
  const configEvent=events.find(args=>args[0]==='config');assert.equal(configEvent[2].page_location,origin+'/politica-de-privacidad');assert.equal(configEvent[2].allow_google_signals,false);
  await page.goto(origin+'/contacto');
  await page.locator('#ct-nombre').fill('Persona de prueba');await page.locator('#ct-email').fill('person@example.test');await page.locator('#ct-mensaje').fill('Consulta de prueba, no enviar a proveedores.');await page.locator('[name=privacy_consent]').check();
  await page.locator('[data-submit-button]').click();await page.waitForFunction(()=>document.getElementById('ct-form').dataset.state==='error');
  assert.equal(events.filter(args=>args[1]==='contact_form_submit').length,0);
  formStatus=200;await page.locator('[data-submit-button]').click();await page.waitForURL(origin+'/gracias');
  assert.equal(events.filter(args=>args[1]==='contact_form_submit').length,1);
  assert.ok(!JSON.stringify(events).includes('person@example.test'));assert.ok(!JSON.stringify(events).includes('private@example.test'));
  await page.reload();assert.equal(events.filter(args=>args[1]==='contact_form_submit').length,1);
  await page.goto(origin+'/google-ads');
  const serviceLink=page.locator('[data-service=google-ads][href="/contacto"]').first();await serviceLink.click();await page.waitForURL(origin+'/contacto');
  assert.ok(events.some(args=>args[1]==='service_cta_click'));
  const beforeRevoke=events.filter(args=>args[0]==='event').length;
  await page.goto(origin+'/politica-de-privacidad');await page.locator('[data-privacy-settings]').click();await page.locator('[data-consent=denied]').click();
  await page.evaluate(()=>window.ReacAnalytics.track('diagnostic_cta_click'));
  assert.equal(events.filter(args=>args[0]==='event').length,beforeRevoke);
  assert.equal(await page.evaluate(()=>window['ga-disable-G-8VJDB377CE']),true);
  console.log('Analytics fixtures passed: consent, one script per page, no PII, failed/successful contact, direct thanks visits, service CTA, withdrawal.');
  writeFileSync('artifacts/analytics-report.json',JSON.stringify({passed:true,events,realNetworkRequests:0},null,2));
}finally{await browser.close();}
