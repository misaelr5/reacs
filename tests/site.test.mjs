import {cases} from '../content/cases.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {auditHtml} from '../scripts/audit-html.mjs';
import {articles} from '../content/editorial.mjs';
import {site} from '../site.config.mjs';
import {services} from '../content/services.mjs';
import {parse, all, attr, hasClass} from '../scripts/html.mjs';
import {minifyCss} from '../scripts/minify.mjs';
test('Published pages load one versioned stylesheet and preserve the navigation transition setup',()=>{
  const source=parse(readFileSync('Reac.dc.html','utf8'));
  const expected=all(source,n=>n.tagName==='link'&&attr(n,'rel')==='stylesheet').map(n=>readFileSync('.'+attr(n,'href'),'utf8')).join('\n');
  for(const page of JSON.parse(readFileSync('artifacts/build-manifest.json','utf8')).pages){
    const doc=parse(readFileSync('dist'+page.file,'utf8'));
    const links=all(doc,n=>n.tagName==='link'&&attr(n,'rel')==='stylesheet');
    assert.equal(links.length,1,page.path);
    assert.match(attr(links[0],'href'),/^\/styles\/[a-f0-9]{12}\.css$/);
    if(page.path==='/' || page.path==='/servicios')assert.equal(all(doc,n=>n.tagName==='script'&&attr(n,'blocking')==='render'&&/^\/js\/reac-ui\.[a-f0-9]{12}\.js$/.test(attr(n,'src')||'')).length,1,page.path);
    for(const script of all(doc,n=>n.tagName==='script'&&attr(n,'src'))){
      const src=attr(script,'src');
      assert.match(src,/^\/js\/[\w.-]+\.[\w-]+\.js$/,page.path);
      assert.ok(existsSync('dist'+src),`${page.path}: missing script ${src}`);
    }
    if(page.path==='/')assert.equal(readFileSync('dist'+attr(links[0],'href'),'utf8'),minifyCss(expected),'Home CSS cascade changed');
  }
});
test('Social proof does not ship illustrative portraits as client photos',()=>{
  assert.doesNotMatch(readFileSync('dist/index.html','utf8'),/p-hero__avatars|hero-avatars-illustrative/);
  assert.equal(existsSync('dist/uploads/hero-avatars-illustrative.webp'),false);
});
test('Public HTML contains complete content, correct canonicals, valid links and schema',()=>{const result=auditHtml();assert.deepEqual(result.errors,[]);assert.equal(result.indexable,services.length+10+cases.length+articles.filter(article=>article.published).length);});
test('IndexNow ownership file matches the configured public key',()=>{const key=process.env.INDEXNOW_KEY||site.indexNowKey;assert.equal(readFileSync('dist/'+key+'.txt','utf8').trim(),key);});
test('Search bot access and training policy are independent',()=>{const robots=readFileSync('dist/robots.txt','utf8');assert.match(robots,/User-agent: OAI-SearchBot\nAllow: \/\nDisallow: \/api\//);assert.match(robots,/User-agent: \*\nAllow: \//);assert.doesNotMatch(robots,/Disallow: \/\s*$/m);});
test('Production source excludes compiler, secrets and server implementation',()=>{for(const path of ['support.js','.env.local','api/contact.ts','lib/contact.ts','site.config.mjs','package.json','README.md'])assert.equal(existsSync('dist/'+path),false,path);const config=readFileSync('dist/site-config.js','utf8');assert.doesNotMatch(config,/RESEND|TOKEN|SECRET|UPSTASH/);});
test('WhatsApp links use the configured Reac Studio contact and expose a desktop quick action',()=>{const home=readFileSync('dist/index.html','utf8');const thanks=readFileSync('dist/gracias.html','utf8');assert.match(home,/class="whatsapp-quick-action"/);assert.match(home,new RegExp(`https://wa\\.me/${site.whatsapp}`));assert.match(thanks,new RegExp(`https://wa\\.me/${site.whatsapp}`));assert.doesNotMatch(home,/5493544434403/);assert.doesNotMatch(thanks,/5493544434403/);});
test('Service pages map to distinct intents and retain commercial contact routes',()=>{for(const {slug} of services){const html=readFileSync('dist/'+slug+'.html','utf8');assert.match(html,new RegExp('data-service="'+slug+'"'));assert.match(html,/href="\/contacto"/);assert.doesNotMatch(html,/reviewRating|aggregateRating/);}});
test('Homepage prioritizes conversion while the full project catalog remains available',()=>{const home=readFileSync('dist/index.html','utf8');const projects=readFileSync('dist/proyectos.html','utf8');assert.equal((home.match(/class="proj-slide"/g)||[]).length,0);assert.equal(all(parse(home),n=>hasClass(n,'rfx-card')).length,4);assert.equal(all(parse(projects),n=>hasClass(n,'case-card')).length,cases.length);assert.equal(all(parse(projects),n=>hasClass(n,'project-entry')).length,8);assert.doesNotMatch(home,/data-newsletter-form|novedades por email todavía no están disponibles/);assert.doesNotMatch(home+projects,/pendientes? de confirmar/i);assert.match(home,/href="\/recursos"/);});
test('Home sections remain inside main and the footer follows it',()=>{
  for(const file of ['Reac.dc.html','dist/index.html']) {
    const document=parse(readFileSync(file,'utf8'));
    const main=all(document,n=>n.tagName==='main');
    assert.equal(main.length,1,file);
    for(const id of ['hero-sec','proceso','sobre-reac','faq','recursos','contacto']) assert.equal(all(main[0],n=>attr(n,'id')===id).length,1,`${file}: ${id} outside main`);
    const footer=all(document,n=>hasClass(n,'home-footer'))[0];
    assert.equal(footer.parentNode,main[0].parentNode,file);
    assert.ok(footer.parentNode.childNodes.indexOf(footer)>footer.parentNode.childNodes.indexOf(main[0]),file);
    const process=all(main[0],n=>attr(n,'id')==='proceso')[0];
    const wrap=process.childNodes.find(n=>hasClass(n,'pj-wrap'));
    assert.ok(wrap,`${file}: process wrapper missing`);
    assert.equal(all(wrap,n=>hasClass(n,'pj-steps')).length,1,`${file}: process scenes outside wrap`);
  }
});
test('Public email follows central configuration and deprecated FAQ rich-result markup is absent',()=>{for(const page of JSON.parse(readFileSync('artifacts/build-manifest.json','utf8')).pages){const html=readFileSync('dist'+page.file,'utf8');assert.doesNotMatch(html,/"@type":"FAQPage"/);assert.doesNotMatch(html,/reviewRating|aggregateRating/);}const home=readFileSync('dist/index.html','utf8');assert.match(home,new RegExp('mailto:'+site.email.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));});
