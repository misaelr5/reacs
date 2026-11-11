import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8'));
const config=JSON.parse(readFileSync('vercel.json','utf8'));
const origin=manifest.siteUrl;
const browser=await chromium.launch({channel:'chrome',headless:true});
const events=[];let gtagRequests=0,contactRequests=0;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 // All transports are fixtures; channel clicks never open external apps.
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='www.googletagmanager.com'){gtagRequests++;await route.fulfill({contentType:'text/javascript',body:'/* mocked */'});return;}
  if(url.origin!==origin){await route.fulfill({contentType:'text/plain',body:''});return;}
  if(url.pathname==='/api/contact'){contactRequests++;await route.fulfill({status:410,body:'retired'});return;}
  const file=manifest.pages.find(p=>p.path===url.pathname)?.file||url.pathname;
  const mime={html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',webp:'image/webp',woff2:'font/woff2'}[file.split('.').at(-1)]||'text/plain';
  await route.fulfill({contentType:mime,headers:{'Content-Security-Policy':config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value},body:readFileSync('dist'+file)});
 });
 const page=await context.newPage();
 await page.exposeFunction('recordGtag',args=>events.push(args));
 await page.addInitScript(()=>{
  window.gtag=(...args)=>window.recordGtag(args.map(v=>typeof v==='object'?JSON.parse(JSON.stringify(v)):v));
  document.addEventListener('click',event=>{if(event.target.closest('a[href^="https://wa.me/"],a[href^="mailto:"]'))event.preventDefault();},true);
 });
 await page.goto(origin+'/contacto?email=private@example.test&utm_source=google&utm_campaign=search_web&gclid=private-click-id');
 assert.equal(gtagRequests,0);assert.equal(events.length,0);assert.equal(await page.locator('form').count(),0);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('reac_campaign_attribution')),null);
 await page.locator('[data-consent=denied]').click();
 await page.locator('.ct-direct__channel--primary').click();
 // A consent-denied control command is allowed; measurement events and loading are not.
 assert.equal(events.filter(args=>args[0]==='event').length,0);assert.equal(gtagRequests,0);
 assert.ok(events.every(args=>args[0]==='consent'&&args[1]==='update'&&args[2].analytics_storage==='denied'));
 await page.goto(origin+'/politica-de-privacidad');await page.locator('[data-privacy-settings]').click();await page.locator('[data-consent=granted]').click();
 await page.waitForTimeout(150);assert.equal(gtagRequests,1);
 const settings=events.find(args=>args[0]==='config');assert.equal(settings[2].page_location,origin+'/politica-de-privacidad');assert.equal(settings[2].allow_google_signals,false);
 await page.goto(origin+'/contacto?email=private@example.test&utm_source=google&utm_campaign=search_web&gclid=private-click-id');
 await page.locator('.ct-direct__channel--primary').click();await page.locator('.ct-direct__channel[href^="mailto:"]').click();await page.waitForTimeout(100);
 assert.equal(events.filter(args=>args[1]==='whatsapp_click').length,1);
 assert.equal(events.filter(args=>args[1]==='email_click').length,1);
 const click=events.find(args=>args[1]==='whatsapp_click');assert.equal(click[2].utm_source,'google');assert.equal(click[2].utm_campaign,'search_web');
 assert.equal(events.filter(args=>/contact_form|generate_lead/.test(args[1]||'')).length,0);
 assert.ok(!JSON.stringify(events).includes('private@example.test'));assert.ok(!JSON.stringify(events).includes('private-click-id'));assert.equal(contactRequests,0);
 await page.goto(origin+'/google-ads');assert.ok(events.some(args=>args[1]==='service_view'&&args[2].service==='google-ads'));
 await page.locator('[data-service=google-ads][href="/contacto"]').first().click();await page.waitForURL(origin+'/contacto');
 assert.ok(events.some(args=>args[1]==='cta_click'&&args[2].service==='google-ads'));
 const before=events.filter(args=>args[0]==='event').length;
 await page.goto(origin+'/politica-de-privacidad');await page.locator('[data-privacy-settings]').click();await page.locator('[data-consent=denied]').click();
 await page.evaluate(()=>window.ReacAnalytics.track('diagnostic_click'));
 assert.equal(events.filter(args=>args[0]==='event').length,before);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('reac_campaign_attribution')),null);
 assert.equal(await page.evaluate(()=>window['ga-disable-G-8VJDB377CE']),true);
 console.log('Analytics fixtures passed: consent, direct-channel clicks, attribution after consent, no false leads, no PII, no API requests and withdrawal.');
 writeFileSync('artifacts/analytics-report.json',JSON.stringify({passed:true,events,realNetworkRequests:0,contactRequests},null,2));
}finally{await browser.close();}
