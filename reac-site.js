(function () {
  'use strict';

  var CONFIG = {
    analyticsId: 'G-8VJDB377CE',
    formEndpoint: 'FORM_ENDPOINT',
    productionHosts: ['reacstudio.com', 'www.reacstudio.com', 'reacs-studio.vercel.app']
  };
  var CONSENT_KEY = 'reac_analytics_consent';
  var SUBMISSION_KEY = 'reac_contact_form_submitted';
  var analyticsReady = false;

  window.REAC_CONFIG = CONFIG;

  function isProduction() {
    return CONFIG.productionHosts.indexOf(window.location.hostname) !== -1;
  }

  function getConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (error) { return null; }
  }

  function loadAnalytics() {
    if (analyticsReady || !isProduction() || getConsent() !== 'granted') return;
    analyticsReady = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.analyticsId, { anonymize_ip: true });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.analyticsId);
    document.head.appendChild(script);
  }

  function track(name, params) {
    if (!isProduction() || getConsent() !== 'granted') return;
    loadAnalytics();
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  window.ReacAnalytics = { track: track, load: loadAnalytics };

  function saveConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (error) {}
    var banner = document.getElementById('reac-consent');
    if (banner) banner.remove();
    if (value === 'granted') loadAnalytics();
  }

  function mountConsent() {
    if (getConsent()) {
      if (getConsent() === 'granted') loadAnalytics();
      return;
    }
    var banner = document.createElement('section');
    banner.id = 'reac-consent';
    banner.className = 'reac-consent';
    banner.setAttribute('aria-label', 'Preferencias de privacidad');
    banner.innerHTML = '<div class="reac-consent__copy"><strong>Tu privacidad, sin vueltas.</strong><span>Usamos Analytics solo si lo aceptás. Nos ayuda a entender qué funciona; no es necesario para navegar.</span><a href="/politica-de-privacidad.html">Ver política de privacidad</a></div><div class="reac-consent__actions"><button type="button" data-consent="denied">Rechazar Analytics</button><button type="button" data-consent="granted">Aceptar Analytics</button></div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (button) saveConsent(button.getAttribute('data-consent'));
    });
  }

  function setFormState(form, state, message) {
    var button = form.querySelector('[data-submit-button]');
    var status = form.querySelector('[data-form-status]');
    form.setAttribute('data-state', state);
    if (button) {
      button.disabled = state === 'sending';
      var idleText = button.getAttribute('data-idle-text') || 'Enviar';
      button.textContent = state === 'sending' ? 'Enviando…' : idleText;
    }
    if (status) {
      status.textContent = message || '';
      status.className = 'form-status form-status--' + state;
    }
  }

  function endpointIsConfigured() {
    return /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(CONFIG.formEndpoint);
  }

  function bindContactForm() {
    var form = document.getElementById('ct-form');
    if (!form || form.dataset.reacBound === 'true') return;
    form.dataset.reacBound = 'true';
    var sending = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      track('contact_form_attempt');
      if (!endpointIsConfigured()) {
        setFormState(form, 'error', 'El formulario todavía necesita configurar su endpoint de Formspree. Podés contactarnos por WhatsApp.');
        track('contact_form_error', { reason: 'endpoint_not_configured' });
        return;
      }
      sending = true;
      setFormState(form, 'sending', 'Enviando tu consulta…');
      try {
        var response = await window.fetch(CONFIG.formEndpoint, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('form_provider_error');
        try { window.sessionStorage.setItem(SUBMISSION_KEY, 'true'); } catch (error) {}
        track('contact_form_success');
        setFormState(form, 'success', 'Consulta enviada correctamente.');
        window.location.assign('/gracias');
      } catch (error) {
        sending = false;
        setFormState(form, 'error', 'No pudimos enviar la consulta. Intentá nuevamente o escribinos por WhatsApp.');
        track('contact_form_error', { reason: 'request_failed' });
      }
    });
  }

  function bindNewsletterForm() {
    var form = document.querySelector('[data-newsletter-form]');
    if (!form || form.dataset.reacBound === 'true') return;
    form.dataset.reacBound = 'true';
    var sending = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      if (!endpointIsConfigured()) {
        setFormState(form, 'error', 'La suscripción todavía no está configurada.');
        return;
      }
      sending = true;
      setFormState(form, 'sending', 'Enviando…');
      try {
        var response = await window.fetch(CONFIG.formEndpoint, {
          method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }
        });
        if (!response.ok) throw new Error('form_provider_error');
        form.reset();
        sending = false;
        setFormState(form, 'success', 'Suscripción registrada.');
      } catch (error) {
        sending = false;
        setFormState(form, 'error', 'No pudimos registrar la suscripción. Intentá nuevamente.');
      }
    });
  }

  function bindLinkTracking() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest ? event.target.closest('a') : null;
      if (!link) return;
      var href = link.getAttribute('href') || '';
      if (href.indexOf('https://wa.me/') === 0) track('whatsapp_click', { link_url: href });
      else if (href.indexOf('mailto:') === 0) track('email_click');
      else if (href.indexOf('tel:') === 0) track('phone_click');
      if (link.matches('[data-cta], a[href="#contacto"], a[href="/#contacto"]')) {
        track('cta_click', {
          cta_name: link.getAttribute('data-cta') || (link.textContent || 'contacto').trim().slice(0, 80)
        });
      }
    });
    document.addEventListener('reac:project-view', function (event) {
      track('project_view', event.detail || {});
    });
  }

  function trackConfirmedLead() {
    if (document.body.getAttribute('data-page') !== 'thanks') return;
    var confirmed = false;
    try {
      confirmed = window.sessionStorage.getItem(SUBMISSION_KEY) === 'true';
      if (confirmed) window.sessionStorage.removeItem(SUBMISSION_KEY);
    } catch (error) {}
    if (confirmed) track('generate_lead');
  }

  function init() {
    mountConsent();
    bindContactForm();
    bindNewsletterForm();
    bindLinkTracking();
    trackConfirmedLead();
    // El runtime DC monta parte del contenido luego de DOMContentLoaded.
    // Estos reintentos idempotentes garantizan que los formularios queden enlazados.
    window.setTimeout(bindContactForm, 500);
    window.setTimeout(bindNewsletterForm, 500);
    window.setTimeout(bindContactForm, 1500);
    window.setTimeout(bindNewsletterForm, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
