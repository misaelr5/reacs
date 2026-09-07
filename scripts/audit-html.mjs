import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { parse, attr, all, find, textContent, hasClass } from './html.mjs';
export function auditHtml() {
  const manifest=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8'));
  const config=JSON.parse(readFileSync('vercel.json','utf8'));
  const byPath=new Map(manifest.pages.map(page=>[page.path,page]));
  const errors=[]; const documents=new Map();
  const assert=(condition,message)=>{if(!condition)errors.push(message);};
  const normalized=text=>text.replace(/\s+/g,' ').trim();
  for(const page of manifest.pages){
    const html=readFileSync('dist'+page.file,'utf8');const doc=parse(html);documents.set(page.path,doc);
    assert(!html.includes('{{')&&!/<(?:sc-|x-dc|helmet)/i.test(html),page.path+': templates remain');
    assert(!html.includes('reacstudio.com'),page.path+': old canonical domain');
    assert(all(doc,n=>n.tagName==='h1').length===1,page.path+': H1 count');
    assert(all(doc,n=>n.tagName==='main').length===1,page.path+': main landmark count');
    assert(all(doc,n=>n.tagName==='title').length===1,page.path+': title count');
    assert(all(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical').length===1,page.path+': canonical count');
    assert(attr(find(doc,n=>n.tagName==='link'&&attr(n,'rel')==='canonical'),'href')===manifest.siteUrl+page.path,page.path+': wrong canonical');
    assert(Boolean(attr(find(doc,n=>n.tagName==='meta'&&attr(n,'name')==='description'),'content')),page.path+': missing description');
    const ids=all(doc,n=>attr(n,'id')).map(n=>attr(n,'id'));
    assert(new Set(ids).size===ids.length,page.path+': duplicate ids');
    const robots=attr(find(doc,n=>n.tagName==='meta'&&attr(n,'name')==='robots'),'content') || '';
    assert(page.indexable?!robots.includes('noindex'):robots.includes('noindex'),page.path+': robots mismatch');
    for(const node of all(doc,n=>n.tagName==='script')){
      assert(attr(node,'type')==='application/ld+json'||attr(node,'src')?.startsWith('/'),page.path+': unsafe/third-party startup script');
      if(attr(node,'type')==='application/ld+json'){
        let graph;try{graph=JSON.parse(textContent(node));}catch{errors.push(page.path+': invalid JSON-LD');continue;}
        assert(graph['@context']==='https://schema.org'&&Array.isArray(graph['@graph']),page.path+': schema graph missing');
        assert(!/aggregateRating|reviewRating|ProfessionalService/.test(JSON.stringify(graph)),page.path+': unsupported schema');
        for(const item of graph['@graph'])if(item['@type']==='FAQPage'){
          const body=normalized(textContent(find(doc,n=>n.tagName==='body')));
          for(const question of item.mainEntity){assert(body.includes(normalized(question.name))&&body.includes(normalized(question.acceptedAnswer.text)),page.path+': FAQ schema differs from visible content');}
        }
      }
    }
    for(const node of all(doc,n=>n.attrs))for(const a of node.attrs)assert(!/^on[a-z]/.test(a.name),page.path+': inline event handler');
    for(const img of all(doc,n=>n.tagName==='img'))assert(attr(img,'alt')!==undefined,page.path+': image alt missing');
  }
  for(const [path,doc] of documents)for(const node of all(doc,n=>n.tagName==='a'||n.tagName==='img'||n.tagName==='script'||n.tagName==='link')){
    const href=attr(node,node.tagName==='img'||node.tagName==='script'?'src':'href');
    if(!href||/^(mailto:|tel:|data:)/.test(href))continue;
    let target;try{target=new URL(href,manifest.siteUrl+path);}catch{errors.push(path+': malformed URL');continue;}
    if(target.origin!==manifest.siteUrl)continue;
    const redirected=config.redirects.find(r=>r.source===target.pathname)?.destination;
    const destPath=redirected || target.pathname;
    const mapped=byPath.get(destPath);
    const file=mapped?.file||destPath;
    assert(existsSync(resolve('dist','.'+file)),path+': broken local URL '+href);
    if(target.hash&&documents.has(destPath))assert(Boolean(find(documents.get(destPath),n=>attr(n,'id')===decodeURIComponent(target.hash.slice(1)))),path+': missing anchor '+href);
  }
  const sitemap=readFileSync('dist/sitemap.xml','utf8');
  const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert(locs.length===manifest.pages.filter(p=>p.indexable).length,'sitemap count');
  assert(new Set(locs).size===locs.length,'duplicate sitemap URLs');
  for(const page of manifest.pages)assert(locs.includes(manifest.siteUrl+page.path)===page.indexable,'sitemap indexability '+page.path);
  assert(readFileSync('Reac.dc.html','utf8')===readFileSync('index.html','utf8'),'source/output home mismatch');
  for(const forbidden of ['support.js','Reac.dc.html','README.md','package.json','site.config.mjs','api','lib','scripts','.env','.git','artifacts'])assert(!existsSync('dist/'+forbidden),'source/config leaked in dist: '+forbidden);
  const headers=config.headers.find(h=>h.source==='/(.*)').headers;
  const csp=headers.find(h=>h.key==='Content-Security-Policy').value;
  assert(!csp.includes('unsafe-eval'),'CSP allows eval');
  assert(!csp.match(/script-src[^;]*unsafe-inline/),'CSP allows inline scripts');
  assert(config.outputDirectory==='dist','unsafe output directory');
  return {pages:manifest.pages.length,indexable:locs.length,errors};
}
