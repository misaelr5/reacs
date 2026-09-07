import {chromium} from 'playwright-core';
import {writeFileSync,readFileSync,statSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try{
  for(const path of ['/','/desarrollo-web','/google-ads']){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3});
    const page=await context.newPage();const cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.addInitScript(()=>{
      localStorage.setItem('reac_analytics_consent','denied');
      window.auditMetrics={lcp:0,cls:0,interactions:[]};
      new PerformanceObserver(list=>{for(const entry of list.getEntries())window.auditMetrics.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.auditMetrics.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{for(const entry of list.getEntries())if(entry.interactionId)window.auditMetrics.interactions.push(entry.duration);}).observe({type:'event',buffered:true,durationThreshold:16});
    });
    await page.goto('http://127.0.0.1:4174'+path);await page.waitForTimeout(5000);
    await page.locator('.mobile-nav summary').click();await page.locator('.mobile-nav summary').click();await page.waitForTimeout(300);
    const metrics=await page.evaluate(()=>{
      const nav=performance.getEntriesByType('navigation')[0];
      return {...window.auditMetrics,ttfb:nav.responseStart-nav.requestStart,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,htmlBytes:nav.encodedBodySize,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,bytes:r.encodedBodySize,type:r.initiatorType}))};
    });
    results.push({path,...metrics});await context.close();
  }
  const page=await browser.newPage({viewport:{width:320,height:800}});await page.goto('http://127.0.0.1:4174/recursos/auditoria-sitio-web.html');await page.emulateMedia({media:'print'});
  const print=await page.locator('.page').first().evaluate(n=>({width:n.getBoundingClientRect().width,minHeight:getComputedStyle(n).minHeight}));assert.ok(Math.abs(print.width-210*96/25.4)<1,'A4 width preserved');assert.equal(await page.locator('.resource-web-links').isVisible(),false);
  const report={method:'Single cold-cache Chrome lab sample per page; 390x844, 4x CPU slowdown, 1.6 Mbps down/0.75 Mbps up, 150ms latency; local server. Not field Core Web Vitals or p75 INP.',results,print,ownHomeJavaScriptBytes:['reac-ui.js','reac-site.js','site-config.js'].reduce((sum,file)=>sum+statSync('dist/'+file).size,0)};
  writeFileSync('artifacts/performance-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({results:results.map(r=>({path:r.path,LCP_ms:Math.round(r.lcp),FCP_ms:Math.round(r.fcp),TTFB_ms:Math.round(r.ttfb),CLS:r.cls,maxObservedInteraction_ms:Math.max(0,...r.interactions)})),ownJSBytes:report.ownHomeJavaScriptBytes,print}));
}finally{await browser.close();}
