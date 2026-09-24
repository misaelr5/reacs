import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';
import AxeBuilder from '@axe-core/playwright';
const base=process.env.TEST_URL||'http://127.0.0.1:4174';
const manifest=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={responsive:[],accessibility:[],errors:[],auditToolWarnings:[],interactions:[],metrics:{}};
mkdirSync('artifacts',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(error.message));
  let runningAxe=false;
  page.on('console',msg=>{
    if(msg.type()!=='error'||/status of (?:403|404|503)/.test(msg.text()))return;
    // axe fetches external CSS to inspect contrast. Production loads it through
    // style-src, not connect-src. Keep this tooling warning separate, without
    // weakening the deployed policy merely for an audit tool.
    if(runningAxe&&msg.text().includes('connect-src')&&/api.fontshare.com|fonts.googleapis.com/.test(msg.text()))report.auditToolWarnings.push(msg.text());
    else report.errors.push(msg.text());
  });
  await context.addInitScript(()=>localStorage.setItem('reac_analytics_consent','denied'));
  for(const entry of manifest.pages){
    const response=await page.goto(base+(entry.path==='/404'?'/missing-page-for-audit':entry.path));
    assert.equal(response.status(),entry.path==='/404'?404:200,entry.path);
    await page.waitForLoadState('networkidle');
    for(const width of [320,375,390,430,768,1024,1440]){
      await page.setViewportSize({width,height:900});
      const dims=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}));
      report.responsive.push({path:entry.path,...dims});assert.ok(dims.scroll<=dims.viewport,entry.path+' overflows at '+width);
    }
    await page.setViewportSize({width:390,height:844});
    // Expanded disclosures are audited too; the content is already in source HTML.
    await page.locator('details.imp-faq').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
    runningAxe=true;
    const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
    runningAxe=false;
    report.accessibility.push({path:entry.path,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html}))}))});
  }
  await page.goto(base+'/');await page.setViewportSize({width:1440,height:900});
  const homeNav=page.locator('.site-nav');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.site-nav')).visibility==='hidden');assert.equal(await homeNav.isVisible(),false);
  await page.locator('#hero-sec').evaluate(node=>window.scrollTo({top:node.offsetTop+node.offsetHeight+1,behavior:'instant'}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.site-nav')).visibility==='visible');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.site-nav')).visibility==='hidden');
  const quickAction=page.locator('.whatsapp-quick-action');assert.equal(await quickAction.isVisible(),true);assert.match(await quickAction.getAttribute('href'),/https:\/\/wa\.me\/5493544657866/);
  await page.setViewportSize({width:390,height:844});assert.equal(await homeNav.isVisible(),false);assert.equal(await quickAction.isVisible(),false);assert.equal(await page.locator('.mobile-sticky-cta').isVisible(),true);
  await page.locator('#hero-sec').evaluate(node=>window.scrollTo({top:node.offsetTop+node.offsetHeight+1,behavior:'instant'}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.site-nav')).visibility==='visible');
  await page.locator('#proceso').evaluate(node=>window.scrollTo({top:node.getBoundingClientRect().top+scrollY,behavior:'instant'}));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.mobile-sticky-cta')).visibility==='visible');
  for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:844});
    for(const selector of ['#hero-sec','#servicios','#proceso','#proyectos','#contacto','.home-footer']){
      await page.locator(selector).evaluate(node=>window.scrollTo({top:Math.max(0,node.getBoundingClientRect().top+scrollY-78),behavior:'instant'}));
      await page.waitForFunction(()=>{
        const button=document.querySelector('.mobile-sticky-cta');
        const rect=button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
      });
      const state=await page.locator('.mobile-sticky-cta').evaluate(button=>{
        const rect=button.getBoundingClientRect(),style=getComputedStyle(button);
        return {inside:rect.x>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,size:Math.min(rect.width,rect.height),background:style.backgroundColor,image:style.backgroundImage};
      });
      assert.equal(state.inside,true,selector+' WhatsApp outside viewport at '+width);
      assert.ok(state.size>=48);assert.equal(state.background,'rgb(19, 125, 72)');assert.equal(state.image,'none');
    }
  }
  await page.locator('#ct-nombre').focus();assert.equal(await page.locator('.mobile-sticky-cta').isVisible(),false);
  await page.locator('#ct-nombre').blur();assert.equal(await page.locator('.mobile-sticky-cta').isVisible(),true);
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  // Intercept the destination: verify a real tap without contacting WhatsApp or sending a message.
  await touchContext.route('https://wa.me/**',route=>route.fulfill({status:200,contentType:'text/html',body:'WhatsApp destination intercepted for test'}));
  const touchPage=await touchContext.newPage();await touchPage.goto(base+'/');
  assert.equal(await touchPage.locator('.mobile-sticky-cta').isVisible(),false);
  await touchPage.locator('[data-consent="denied"]').click();
  assert.equal(await touchPage.locator('.mobile-sticky-cta').isVisible(),true);
  const popupPromise=touchPage.waitForEvent('popup');await touchPage.locator('.mobile-sticky-cta').tap();
  const popup=await popupPromise;await popup.waitForLoadState('domcontentloaded');
  const destination=new URL(popup.url());assert.equal(destination.origin,'https://wa.me');assert.equal(destination.pathname,'/5493544657866');assert.ok(destination.searchParams.get('text'));
  await touchContext.close();
  await page.locator('.mobile-nav summary').click();assert.equal(await page.locator('.mobile-nav').getAttribute('open'),'');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-nav').getAttribute('open'),null);
  await page.locator('.mobile-nav summary').click();await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>document.querySelector('.mobile-nav')?.getAttribute('open')===null);
  await page.setViewportSize({width:390,height:844});
  await page.locator('[data-action="setProbCon"]').click();assert.equal(await page.locator('[data-prob-panel="sin"]').isVisible(),false);assert.equal(await page.locator('[data-prob-panel="con"]').isVisible(),true);
  const toggle=page.locator('.sim-toggle').first();const before=await toggle.getAttribute('aria-pressed');await toggle.click();assert.notEqual(await toggle.getAttribute('aria-pressed'),before);
  const budget=page.locator('[data-action="changeBudget"]');await budget.fill('100');await budget.dispatchEvent('input');assert.match(await page.locator('[data-budget-output]').textContent(),/3\.000/);
  await page.locator('.proj-controls [data-action="projNext"]').click();assert.match(await page.locator('.proj-counter').textContent(),/02 \/ 03/);assert.equal(await page.locator('.proj-slide[inert]').count(),2);
  await page.locator('.proj-dot').nth(2).click();assert.match(await page.locator('.proj-counter').textContent(),/03 \/ 03/);
  const summary=page.locator('.imp-faq summary').first();await summary.click();assert.equal(await page.locator('.imp-faq').first().getAttribute('open'),'');
  await page.goto(base+'/contacto');await page.locator('#ct-interes').selectOption('web_nueva');await page.locator('#ct-nombre').fill('Prueba local');await page.locator('#ct-contacto').fill('audit@example.test');await page.locator('#ct-mensaje').fill('Verificación local sin envío a proveedores.');await page.locator('[name=privacy_consent]').check();
  await page.locator('[data-submit-button]').click();await page.waitForFunction(()=>document.getElementById('ct-form')?.dataset.state==='error');assert.ok(page.url().endsWith('/contacto'));assert.equal(await page.locator('[data-submit-button]').isEnabled(),true);
  report.interactions.push('Desktop WhatsApp quick action and mobile sticky CTA','Mobile navigation/Escape/resize','Comparison panels','Simulator toggle/range','Carousel controls and inert slides','Native FAQ disclosure','Safe unavailable contact response');
  await page.goto(base+'/desarrollo-web');assert.equal(await page.locator('.site-nav').isVisible(),true);await page.screenshot({path:'artifacts/service-mobile.png',fullPage:true});
  await page.goto(base+'/');await page.screenshot({path:'artifacts/home-mobile.png'});
  const noJS=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const staticPage=await noJS.newPage();await staticPage.goto(base+'/');
  assert.match(await staticPage.locator('h1').textContent(),/Tu negocio, conectado de punta a punta/);assert.equal(await staticPage.locator('.proj-slide').count(),3);assert.equal(await staticPage.locator('.proj-slide').last().isVisible(),true);await staticPage.locator('.imp-faq summary').first().click();assert.equal(await staticPage.locator('.imp-faq').first().getAttribute('open'),'');
  report.interactions.push('JavaScript disabled: real heading, three featured commercial projects and native FAQ');await noJS.close();
  for(const path of ['/index.html','/Reac.dc.html','/google-ads.html','/politica-de-privacidad.html']){const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,308);}
  for(const path of ['/README.md','/package.json','/site.config.mjs','/support.js','/.env','/api/source.ts']){const response=await fetch(base+path);assert.equal(response.status,404,path);}
  const headers=await fetch(base+'/');assert.ok(headers.headers.get('content-security-policy').includes("script-src 'self'"));assert.ok(!headers.headers.get('content-security-policy').includes('unsafe-eval'));
  report.interactions.push('Permanent redirects, true 404s, source isolation and CSP headers');
}catch(error){report.errors.push(error.stack||error.message);}finally{await browser.close();writeFileSync('artifacts/browser-report.json',JSON.stringify(report,null,2));}
const violations=report.accessibility.reduce((n,p)=>n+p.violations.length,0);
console.log(JSON.stringify({responsiveChecks:report.responsive.length,axePages:report.accessibility.length,violationGroups:violations,interactions:report.interactions.length,errors:report.errors}));
if(report.errors.length||violations)process.exitCode=1;
