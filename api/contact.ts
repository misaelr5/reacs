import { handleContact } from '../lib/contact.ts';

// Vercel's Node runtime supports the standard Request/Response fetch entry point.
// https://vercel.com/docs/functions/runtimes/node-js
export default {
  fetch(request: Request): Promise<Response> {
    return handleContact(request, process.env, fetch);
  },
};
