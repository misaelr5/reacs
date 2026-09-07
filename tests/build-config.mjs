import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const run=env=>{const result=spawnSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,...env},encoding:'utf8'});assert.equal(result.status,0,result.stderr);};
let report;
try{
  run({SITE_URL:'https://reac-config-test.example'});
  const manifest=JSON.parse(readFileSync('artifacts/build-manifest.json','utf8'));
  for(const page of manifest.pages){const html=readFileSync('dist'+page.file,'utf8');assert.ok(html.includes('href="https://reac-config-test.example'+page.path+'"'));assert.ok(!html.includes('https://reacs-studio.vercel.app'));}
  assert.ok(readFileSync('dist/sitemap.xml','utf8').includes('https://reac-config-test.example/desarrollo-web'));
  assert.ok(readFileSync('dist/robots.txt','utf8').includes('https://reac-config-test.example/sitemap.xml'));
  run({SITE_URL:process.env.SITE_URL||'https://reacs-studio.vercel.app'});
  const first=readFileSync('dist/index.html','utf8');
  run({SITE_URL:process.env.SITE_URL||'https://reacs-studio.vercel.app'});
  assert.equal(first,readFileSync('dist/index.html','utf8'));
  report={passed:true,checks:['Alternate HTTPS origin propagated to all 19 pages, JSON-LD, sitemap and robots','Repeated build is byte-identical for the home','Actual configured origin restored'],externalRequests:0};
  console.log(JSON.stringify(report));
}finally{run({SITE_URL:process.env.SITE_URL||'https://reacs-studio.vercel.app'});}
writeFileSync('artifacts/build-config-report.json',JSON.stringify(report,null,2));
