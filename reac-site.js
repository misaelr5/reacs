(function () {
  'use strict';
  const config = window.REAC_CONFIG || {};
  const consentKey = 'reac_analytics_consent';
  let analyticsReady = false;
  const production = location.origin === config.siteUrl;
  const getConsent = () => { try { return localStorage.getItem(consentKey); } catch { return null; } };
  function loadAnalytics() {
    if (analyticsReady || !production || getConsent() !== 'granted' || !/^G-[A-Z0-9]+$/.test(config.analyticsId || '')) return;
    analyticsReady = true;
    window['ga-disable-' + config.analyticsId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    let referrer = '';
    try { const url = new URL(document.referrer); referrer = url.origin + url.pathname; } catch { /* no referrer */ }
    window.gtag('config', config.analyticsId, { page_location: location.origin + location.pathname, page_referrer: referrer, allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(config.analyticsId);
    document.head.appendChild(script);
  }
  function track(name, params) {
    if (!production || getConsent() !== 'granted') return;
    loadAnalytics();
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  window.ReacAnalytics = { track, load: loadAnalytics };
  function disableAnalytics() {
    window['ga-disable-' + config.analyticsId] = true;
    if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    const domains = [location.hostname, '.' + location.hostname];
    const parts = location.hostname.split('.');
    if (parts.length > 2) domains.push('.' + parts.slice(-2).join('.'));
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      for (const domain of domains) document.cookie = name + '=; Max-Age=0; path=/; domain=' + domain + '; SameSite=Lax';
    }
  }
  function mountConsent(force = false) {
    if (!force && getConsent()) { if (getConsent() === 'granted') loadAnalytics(); return; }
    document.getElementById('reac-consent')?.remove();
    const banner = document.createElement('section');
    banner.id = 'reac-consent'; banner.className = 'reac-consent';
    banner.setAttribute('aria-label', 'Preferencias de privacidad');
    banner.innerHTML = '<div class="reac-consent__copy"><strong>Tu privacidad, sin vueltas.</strong><span>Usamos Analytics solo si lo aceptás. Nos ayuda a entender qué funciona; no es necesario para navegar.</span><a href="/politica-de-privacidad">Ver política de privacidad</a></div><div class="reac-consent__actions"><button type="button" data-consent="denied">Rechazar Analytics</button><button type="button" data-consent="granted">Aceptar Analytics</button></div>';
    document.body.appendChild(banner);
    if (force) banner.querySelector('button').focus();
    banner.addEventListener('click', event => {
      const button = event.target.closest('[data-consent]'); if (!button) return;
      const value = button.dataset.consent;
      try { localStorage.setItem(consentKey, value); } catch { /* Without stored consent, no analytics. */ }
      if (value === 'denied') disableAnalytics();
      else if (analyticsReady) { window['ga-disable-' + config.analyticsId] = false; window.gtag('consent', 'update', { analytics_storage: 'granted' }); }
      else loadAnalytics();
      banner.remove();
      if (force) document.querySelector('[data-privacy-settings]')?.focus();
    });
  }
  function formState(form, state, message) {
    const button = form.querySelector('[data-submit-button]');
    const status = form.querySelector('[data-form-status]');
    form.dataset.state = state; form.setAttribute('aria-busy', String(state === 'sending'));
    if (button) { button.disabled = state === 'sending'; button.textContent = state === 'sending' ? 'Enviando…' : button.dataset.idleText || 'Enviar consulta'; }
    if (status) { status.textContent = message; status.className = 'form-status form-status--' + state; }
  }
  function bindForm() {
    const form = document.getElementById('ct-form'); if (!form) return;
    let sending = false;
    form.addEventListener('focusin', () => track('contact_form_start', { form_id: 'contacto' }), { once: true });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (sending || !form.reportValidity()) return;
      sending = true; formState(form, 'sending', 'Enviando tu consulta…');
      try {
        const response = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))), signal: AbortSignal.timeout(15000), credentials: 'same-origin'
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true) {
          formState(form, 'error', response.status === 429 ? 'Recibimos varios intentos. Esperá unos minutos antes de volver a enviar.' : 'No pudimos enviar la consulta. Intentá más tarde o escribinos por WhatsApp o email.');
          return;
        }
        // One key event, only after server/provider acceptance; no form fields.
        track('contact_form_submit', { form_id: 'contacto' });
        formState(form, 'success', 'Consulta enviada correctamente.'); form.reset(); location.assign('/gracias');
      } catch { formState(form, 'error', 'No pudimos confirmar el envío. Intentá más tarde o escribinos por WhatsApp.'); }
      finally { sending = false; }
    });
  }
  function bindLinks() {
    document.addEventListener('click', event => {
      if (event.target.closest('[data-privacy-settings]')) { mountConsent(true); return; }
      const link = event.target.closest('a'); if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('https://wa.me/')) track('whatsapp_click', { placement: link.dataset.placement || document.body.dataset.page || 'home' });
      if (href.startsWith('mailto:')) track('email_click');
      if (link.dataset.service) track('service_cta_click', { service: link.dataset.service });
      else if (['#contacto', '/#contacto', '/contacto'].includes(href) || link.dataset.cta === 'diagnostic') track('diagnostic_cta_click', { placement: document.body.dataset.page || 'home' });
      const menu = document.querySelector('.mobile-nav[open]');
      if (menu && (!menu.contains(link) || link.closest('.mobile-nav-panel'))) menu.open = false;
    });
    document.addEventListener('reac:project-view', event => track('project_view', { project_index: event.detail?.project_index }));
    document.addEventListener('keydown', event => {
      const menu = document.querySelector('.mobile-nav[open]');
      if (event.key === 'Escape' && menu) { menu.open = false; menu.querySelector('summary').focus(); }
    });
    document.addEventListener('click', event => {
      const menu = document.querySelector('.mobile-nav[open]'); if (menu && !menu.contains(event.target)) menu.open = false;
    });
    matchMedia('(max-width: 980px)').addEventListener('change', () => {
      const menu = document.querySelector('.mobile-nav[open]'); if (menu) menu.open = false;
    });
    addEventListener('storage', event => { if (event.key === consentKey && getConsent() !== 'granted') disableAnalytics(); });
  }
  function init() {
    mountConsent(); bindForm(); bindLinks();
    const contact = document.getElementById('contacto');
    if (contact && 'IntersectionObserver' in window) new IntersectionObserver(entries => {
      document.documentElement.classList.toggle('reac-contact-visible', entries[0].isIntersecting);
    }).observe(contact);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
