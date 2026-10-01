// Local setup only: no credentials are printed, published or returned to a browser.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw new Error('Local setup only.');
const path = '.env.local';
let content = existsSync(path) ? readFileSync(path, 'utf8') : 'BOOKING_MODE=mock\nBOOKING_STORAGE=local\n';
if (/^BOOKING_ADMIN_SECRET=.+$/m.test(content)) console.log('BOOKING_ADMIN_SECRET already exists. No changes made.');
else {
  const line = 'BOOKING_ADMIN_SECRET=' + randomBytes(32).toString('base64url');
  content = /^BOOKING_ADMIN_SECRET=.*$/m.test(content) ? content.replace(/^BOOKING_ADMIN_SECRET=.*$/m, line) : content + '\n' + line + '\n';
  writeFileSync(path, content, { mode: 0o600 });
  console.log('Admin access configured in ignored .env.local. Open that file locally to copy the password. Restart npm run dev.');
}
