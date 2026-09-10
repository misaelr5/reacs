import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { auditHtml } from './audit-html.mjs';
const files=['reac-site.js','reac-ui.js','site.config.mjs','support.js',...['scripts','content','tests'].flatMap(dir=>readdirSync(dir).filter(f=>/\.m?js$/.test(f)).map(f=>dir+'/'+f))];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}}
const result=auditHtml();if(result.errors.length){console.error(result.errors.join('\n'));process.exit(1);}
console.log(`Syntax checks: ${files.length} files. HTML, schema, links, sitemap and security checks: ${result.pages} pages passed.`);
