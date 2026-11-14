import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';

const base=process.env.TEST_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({channel:'chrome',headless:true});
mkdirSync('artifacts',{recursive:true});
// Measure against the actual SVG endpoints, including its current screen transform.
const geometry=()=>[...document.querySelectorAll('.pjl-beam')].map(beam=>{
  const label=beam.querySelector('.pjl-label'),line=beam.querySelector('.pjl-core');
  const rect=label.getBoundingClientRect();
  const tip=new DOMPoint(line.x2.baseVal.value,line.y2.baseVal.value).matrixTransform(line.getScreenCTM());
  return {dx:rect.x+rect.width/2-tip.x,gap:tip.y-rect.bottom,opacity:Number(getComputedStyle(label).opacity)};
});
const aligned=async(page,phase,settled=false)=>{
  for(const {dx,gap,opacity} of await page.evaluate(geometry)){
    assert.ok(Math.abs(dx)<1,`${phase}: label drifted ${dx}px from ray`);
    assert.ok(gap>=-4.5&&gap<=10.5,`${phase}: label jumped vertically (${gap}px)`);
    if(settled){assert.ok(Math.abs(gap-10)<.5,`${phase}: incorrect final anchor`);assert.equal(opacity,1,phase);}
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),phase+': horizontal overflow');
};
try {
  for(const width of [1100,1366,1920]){
    const context=await browser.newContext({viewport:{width,height:768}});
    await context.addInitScript(()=>{sessionStorage.setItem('reac_intro_seen','1');localStorage.setItem('reac_analytics_consent','denied');});
    const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await page.waitForLoadState('networkidle');
    await aligned(page,`${width}: pending`);
    await page.locator('#proceso').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    for(let frame=0;frame<23;frame++){
      await page.waitForTimeout(100);
      await aligned(page,`${width}: entrance ${frame}`);
      if(frame===8&&width===1366)await page.locator('#proceso').screenshot({path:'artifacts/fan-mid-animation.png',animations:'allow'});
      if(frame===3){
        await page.setViewportSize({width:1000,height:768});
        await page.waitForTimeout(50);
        await page.setViewportSize({width,height:768});
      }
    }
    await aligned(page,`${width}: settled`,true);
    assert.deepEqual(errors,[]);
    await context.close();
  }
  // Changing the OS preference must reveal children even before the fan is triggered.
  for(const active of [false,true]){
    const context=await browser.newContext({viewport:{width:1366,height:768}});
    await context.addInitScript(()=>sessionStorage.setItem('reac_intro_seen','1'));
    const page=await context.newPage();await page.goto(base);await page.waitForLoadState('networkidle');
    if(active){await page.locator('#proceso').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(750);}
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
    await aligned(page,`reduced motion ${active?'during':'before'} entrance`,true);
    assert.equal(await page.locator('.pjl-ray').evaluateAll(nodes=>nodes.some(node=>node.style.clipPath)),false);
    await context.close();
  }
  console.log('Fan passed: all 7 labels remain anchored before, during and after entrance; 3 desktop widths, breakpoint resizing and reduced-motion changes.');
} finally {await browser.close();}
