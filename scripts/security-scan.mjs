import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,statSync} from 'node:fs';
const signatures=[/sk_live_[A-Za-z0-9]{16,}/,/AKIA[A-Z0-9]{16}/,/gh[pousr]_[A-Za-z0-9]{25,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/AIza[0-9A-Za-z_-]{30,}/,/sk-proj-[A-Za-z0-9_-]{32,}/];
const findings=[];
const inspect=(text,path)=>{if(signatures.some(pattern=>pattern.test(text)))findings.push(path);};
const git=(args)=>{const result=spawnSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});if(result.status!==0)throw new Error('Git scan failed');return result.stdout;};
const paths=git(['ls-files','--cached','--others','--exclude-standard']).trim().split('\n').filter(path=>/\.(?:html|m?js|ts|json|md|txt|xml|svg|ya?ml)$|(?:^|\/)\.env/.test(path));
for(const path of paths)inspect(readFileSync(path,'utf8'),path);
const objects=git(['rev-list','--objects','--all']).trim().split('\n').map(line=>{const at=line.indexOf(' ');return {oid:line.slice(0,at),path:line.slice(at+1)};}).filter(item=>/\.(?:html|m?js|ts|json|ya?ml)$|(?:^|\/)\.env/.test(item.path));
for(const item of objects){const result=spawnSync('git',['cat-file','blob',item.oid],{encoding:'utf8',maxBuffer:4*1024*1024});if(result.status===0)inspect(result.stdout,'history:'+item.oid.slice(0,8)+':'+item.path);else throw new Error('History blob could not be scanned');}
let publicFiles=0;
function scanDist(dir){for(const entry of readdirSync(dir)){const path=dir+'/'+entry;if(statSync(path).isDirectory())scanDist(path);else{publicFiles++;if(/\.(?:html|js|css|json|xml|txt|svg)$/.test(path))inspect(readFileSync(path,'utf8'),path);if(path.endsWith('.map'))findings.push('Unexpected source map: '+path);}}}
scanDist('dist');
const report={trackedAndUntrackedTextFiles:paths.length,historicalTextBlobs:objects.length,publicFiles,findings,scope:'Known credential patterns and private keys; not proof that every possible secret is absent.'};
writeFileSync('artifacts/security-scan.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(findings.length)process.exitCode=1;
