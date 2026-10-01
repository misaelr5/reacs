import { handleAdmin } from '../lib/agenda-admin.ts';
export default { fetch(request: Request): Promise<Response> { return handleAdmin(request, process.env, fetch); } };
