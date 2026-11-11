// Contact is handled directly through WhatsApp and email. Keep the old endpoint
// explicitly closed so bookmarks/stale clients never trigger provider delivery.
export default {
  async fetch(_request: Request): Promise<Response> {
    return Response.json({ ok: false, error: 'contact_form_retired', contact: '/contacto' }, {
      status: 410,
      headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    });
  },
};
