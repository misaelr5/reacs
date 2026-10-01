(() => {
  'use strict';
  const motion = window.ReacMotion || { reveal() {}, change(update) { update(); return Promise.resolve(); } };
  const el = id => document.getElementById('booking-' + id);
  if (!el('form')) return;
  const form = el('form');
  let data, selectedProfessional, selectedDate, selectedSlot, month, requestId = crypto.randomUUID(), submitting = false, sentPayload, availabilityVersion = 0, loadingAvailability = false;
  const track = name => window.ReacAnalytics?.track(name, { page: '/agendar' });
  const format = start => new Intl.DateTimeFormat('es-AR', { timeZone: data.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(start));
  async function api(body, professionalId = selectedProfessional?.id) {
    const response = await fetch('/api/booking' + (!body && professionalId ? '?professionalId=' + encodeURIComponent(professionalId) : ''), { cache: 'no-store', method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(35000) }).catch(() => { throw new Error('No pudimos conectar con la agenda. Revisá tu conexión y reintentá.'); });
    let result; try { result = await response.json(); } catch { throw new Error('No pudimos completar la reserva. Reintentá en unos segundos.'); }
    if (!response.ok || !result.ok) throw Object.assign(new Error(result.message || 'No pudimos cargar la agenda.'), { code: result.code, field: result.field, errorId: result.errorId });
    return result;
  }
  function button(label, handler, pressed = false) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label; node.setAttribute('aria-pressed', String(pressed)); node.addEventListener('click', handler); return node;
  }
  function setFieldsDisabled(disabled) { for (const field of form.elements) if (field.matches('input,select,textarea')) field.disabled = disabled; }
  function clearFieldErrors() {
    document.querySelectorAll('.booking-field-error').forEach(node => node.remove());
    for (const field of form.elements) if (field.matches('input,select,textarea') && field.getAttribute('aria-invalid') === 'true') {
      field.removeAttribute('aria-invalid'); field.setCustomValidity('');
      const descriptions = (field.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== 'booking-error' && !id.startsWith('booking-field-error-'));
      if (descriptions.length) field.setAttribute('aria-describedby', descriptions.join(' ')); else field.removeAttribute('aria-describedby');
    }
  }
  function showFieldError(error, focus = true) {
    const fields = [...form.elements].filter(field => field.name === error.field && field.matches('input,select,textarea'));
    const descriptionId = 'booking-field-error-' + error.field;
    for (const field of fields) { field.setAttribute('aria-invalid', 'true'); field.setAttribute('aria-describedby', [...new Set([...(field.getAttribute('aria-describedby') || '').split(' '), descriptionId])].filter(Boolean).join(' ')); }
    const field = fields.find(field => field.checked) || fields[0];
    if (field) { field.closest('label')?.querySelector('.booking-field-error')?.remove(); const inline = document.createElement('small'); inline.id = descriptionId; inline.className = 'booking-field-error'; inline.textContent = error.message; field.closest('label')?.append(inline); field.setCustomValidity(error.message); if (focus) { field.focus(); field.reportValidity(); } }
  }
  document.addEventListener('input', event => { if (event.target.form === form) clearFieldErrors(); });
  document.addEventListener('change', event => { if (event.target.form === form) clearFieldErrors(); });
  function renderProfessionals() {
    const restoreFocus = document.activeElement?.name === 'professionalId';
    const container = el('professional-options'); container.replaceChildren();
    for (const person of data.professionals) {
      const label = document.createElement('label'); label.className = 'booking-professional';
      const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'professionalId'; radio.value = person.id; radio.required = true; radio.setAttribute('form', 'booking-form'); radio.checked = person.id === selectedProfessional?.id;
      const details = document.createElement('span'); const name = document.createElement('strong'); name.textContent = person.name; const specialty = document.createElement('span'); specialty.textContent = person.specialty; const description = document.createElement('small'); description.textContent = person.description || ''; const selected = document.createElement('span'); selected.className = 'booking-person-selected'; selected.textContent = '✓ Seleccionado'; selected.setAttribute('aria-hidden', 'true'); details.append(name, specialty, description, selected); label.append(radio, details); container.append(label);
      radio.addEventListener('change', () => {
        if (submitting || sentPayload || !radio.checked) return;
        selectedProfessional = person; requestId = crypto.randomUUID(); clearFieldErrors(); load();
        track('professional_selected');
      });
    }
    el('professionals').hidden = false; if (restoreFocus) container.querySelector('input:checked')?.focus();
  }
  function renderCalendar() {
    el('month').textContent = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(month + '-01T12:00:00Z'));
    const months = [...new Set(data.slots.map(slot => slot.date.slice(0, 7)))];
    el('prev').disabled = months.indexOf(month) <= 0; el('next').disabled = months.indexOf(month) >= months.length - 1;
    el('days').replaceChildren();
    const first = new Date(month + '-01T12:00:00Z'); const offset = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < offset; i++) el('days').append(document.createElement('span'));
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day++) {
      const date = month + '-' + String(day).padStart(2, '0');
      const node = button(String(day), () => { if (submitting || sentPayload) return; selectedDate = date; selectedSlot = null; form.hidden = true; renderCalendar(); renderTimes(); motion.reveal(el('times').children); track('booking_date_selected'); el('days').querySelector('[aria-pressed=true]')?.focus(); }, date === selectedDate);
      node.dataset.date = date;
      if (date === new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(new Date())) node.setAttribute('aria-current', 'date');
      node.disabled = !data.slots.some(slot => slot.date === date) || Boolean(sentPayload);
      node.setAttribute('aria-label', new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00Z')));
      el('days').append(node);
    }
  }
  function renderTimes() {
    el('times').replaceChildren();
    el('date-label').textContent = selectedDate ? new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(selectedDate + 'T12:00:00Z')) : 'Seleccioná un día para ver sus horarios.';
    for (const slot of data.slots.filter(item => item.date === selectedDate)) {
      el('times').append(button(slot.label, () => {
        if (submitting || sentPayload) return;
        const revealForm = form.hidden; selectedSlot = slot; requestId = crypto.randomUUID(); renderTimes(); form.hidden = false; if (revealForm) { motion.reveal(form); if (matchMedia('(max-width: 760px)').matches && form.getBoundingClientRect().top > innerHeight * .8) form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); } el('selected').textContent = selectedProfessional.name + ' — ' + selectedProfessional.specialty + ' · ' + format(slot.start) + ' · Córdoba, Argentina'; el('error').textContent = ''; el('times').querySelector('[aria-pressed=true]')?.focus(); updateReview(); track('booking_time_selected');
      }, slot.start === selectedSlot?.start));
    }
  }
  function updateReview() {
    if (!selectedProfessional || !selectedSlot) return;
    el('review-person').textContent = selectedProfessional.name + ' — ' + selectedProfessional.specialty;
    el('review-service').textContent = form.elements.service.value || 'Elegí un servicio';
    el('review-date').textContent = format(selectedSlot.start);
    el('review-duration').textContent = data.durationMinutes + ' minutos · Google Meet' + (data.mode === 'mock' ? ' · TEST MODE' : '');
  }
  form.elements.service.addEventListener('change', updateReview);
  form.addEventListener('focusout', event => { const field = event.target; if (!field.matches('input:not([type=checkbox]),textarea') || !field.value || field.validity.valid) return; showFieldError({ field: field.name, message: field.type === 'email' ? 'Ingresá un email válido.' : field.validationMessage }, false); });
  async function load() {
    const version = ++availabilityVersion; const professionalId = selectedProfessional?.id; loadingAvailability = true; el('loading').hidden = false; el('picker').setAttribute('aria-busy', 'true');
    selectedDate = null; selectedSlot = null; if (data) data = { ...data, slots: [] }; el('times').replaceChildren();
    el('status').textContent = 'Cargando calendario y horarios…'; el('retry').hidden = true; el('picker').hidden = true; form.hidden = true;
    try {
      const fresh = await api(undefined, professionalId);
      if (version !== availabilityVersion || professionalId !== selectedProfessional?.id) return;
      data = fresh; renderProfessionals();
      el('duration').textContent = data.durationMinutes + ' minutos';
      el('mode').textContent = data.mode === 'mock' ? 'TEST MODE · SIMULACIÓN LOCAL' : 'TEST MODE · GOOGLE REAL'; el('mode').hidden = false;
      el('zone').textContent = 'Horarios de Córdoba, Argentina · ' + data.timezone;
      const select = form.elements.service; const previousService = select.value; select.replaceChildren(new Option('Elegí una opción', '')); data.services.forEach(service => select.add(new Option(service, service))); if (data.services.includes(previousService)) select.value = previousService;
      if (!data.slots.length) { el('status').textContent = 'No hay horarios disponibles por ahora. Podés contactarnos o volver a consultar.'; el('retry').hidden = false; return; }
      month = data.slots[0].date.slice(0, 7); renderCalendar(); renderTimes(); el('picker').hidden = !selectedProfessional; motion.reveal(selectedProfessional ? el('picker') : el('professionals')); el('status').textContent = selectedProfessional ? 'Elegí tu día y horario. Horarios de Córdoba.' : 'Elegí con quién querés hablar para continuar.';
    } catch (error) { if (version === availabilityVersion) { el('status').textContent = error.message || 'No pudimos cargar la agenda.'; el('retry').hidden = false; } }
    finally { if (version === availabilityVersion) { loadingAvailability = false; el('loading').hidden = true; el('picker').removeAttribute('aria-busy'); } }
  }
  function showSuccess(result) {
    el('professionals').hidden = true; el('picker').hidden = true; form.hidden = true; el('status').textContent = '';
    const person = result.professional || selectedProfessional;
    el('confirm-professional').textContent = 'Tu llamada es con ' + person.name + ' — ' + person.specialty; el('success').hidden = false;
    el('success-heading').textContent = 'Listo, tu llamada quedó agendada.';
    el('confirm-date').textContent = 'Te esperamos el ' + format(result.start) + ' (hora de Córdoba).';
    el('confirm-duration').textContent = 'Duración: ' + (result.durationMinutes || data.durationMinutes) + ' minutos · Google Meet';
    el('confirm-note').textContent = result.mode === 'mock' ? 'TEST MODE · Simulación local: no se creó un evento ni se enviaron invitaciones.' : result.meetUrl ? 'Evento creado en el calendario de prueba. No confirmamos el envío de una invitación.' : result.conferenceStatus === 'failure' ? 'El evento está creado, pero Google no pudo generar Meet. Contactá al administrador; no vuelvas a reservar.' : 'El evento está creado. Google todavía está preparando el enlace Meet. Consultalo nuevamente sin crear otra reserva.';
    el('meet').hidden = !result.meetUrl; if (result.meetUrl) el('meet').href = result.meetUrl;
    el('refresh-meet').hidden = result.mode === 'mock' || Boolean(result.meetUrl) || result.conferenceStatus === 'failure'; el('success').focus();
  }
  async function submit() {
    if (submitting) return;
    submitting = true; el('submit').disabled = true; el('refresh-meet').disabled = true; el('submit').textContent = 'Confirmando…'; el('error').textContent = ''; form.setAttribute('aria-busy', 'true');
    try { const result = await api(sentPayload); await motion.change(() => showSuccess(result)); track('booking_completed'); }
    catch (error) {
      track('booking_failed'); const message = (error.message || 'No pudimos completar la reserva. Reintentá en unos segundos.') + (error.errorId ? ' Código: ' + error.errorId : ''); el('error').textContent = message; el('status').textContent = message;
      if (['slot_taken', 'invalid_slot'].includes(error.code)) { sentPayload = null; requestId = crypto.randomUUID(); setFieldsDisabled(false); await load(); el('status').textContent = error.message; }
      else if (['invalid_submission', 'test_email'].includes(error.code)) { sentPayload = null; setFieldsDisabled(false); showFieldError(error); }
    } finally { submitting = false; el('submit').disabled = false; el('refresh-meet').disabled = false; el('submit').textContent = sentPayload ? 'Reintentar confirmación' : 'Confirmar llamada →'; form.removeAttribute('aria-busy'); }
  }
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!selectedProfessional || !selectedSlot || submitting) return;
    if (!sentPayload) { const fields = Object.fromEntries(new FormData(form)); sentPayload = { ...fields, professionalId: selectedProfessional.id, consent: form.elements.consent.checked, requestId, start: selectedSlot.start, end: selectedSlot.end }; setFieldsDisabled(true); }
    submit();
  });
  // Native validation attaches errors to the corresponding input and focuses it.
  form.addEventListener('focusin', () => track('booking_form_started'), { once: true });
  el('refresh-meet').addEventListener('click', submit);
  let refreshing = false;
  async function refreshAvailability() {
    if (!data || loadingAvailability || sentPayload || submitting || refreshing || document.hidden) return;
    refreshing = true; const version = availabilityVersion; const professionalId = selectedProfessional?.id;
    try {
      const fresh = await api(undefined, professionalId);
      if (version !== availabilityVersion || professionalId !== selectedProfessional?.id || sentPayload || submitting || JSON.stringify(fresh) === JSON.stringify(data)) return;
      const selection = selectedSlot; data = fresh;
      el('duration').textContent = data.durationMinutes + ' minutos';
      if (selection && !data.slots.some(slot => slot.start === selection.start && slot.end === selection.end)) { selectedSlot = null; form.hidden = true; el('status').textContent = 'La disponibilidad cambió. Elegí un nuevo horario.'; }
      if (!data.slots.length) { el('picker').hidden = true; form.hidden = true; el('status').textContent = 'No hay horarios disponibles por ahora.'; el('retry').hidden = false; return; }
      month = data.slots.some(slot => slot.date.startsWith(month)) ? month : data.slots[0].date.slice(0,7);
      el('picker').hidden = !selectedProfessional; renderCalendar(); renderTimes();
    } catch { el('status').textContent = 'No pudimos actualizar los horarios. La disponibilidad se verificará al confirmar.'; }
    finally { refreshing = false; }
  }
  if ('BroadcastChannel' in window) { const channel = new BroadcastChannel('reac-booking-rules'); channel.onmessage = refreshAvailability; }
  setInterval(refreshAvailability, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAvailability(); });
  window.addEventListener('pageshow', event => { if (event.persisted) refreshAvailability(); });
  window.addEventListener('focus', refreshAvailability);
  el('retry').addEventListener('click', load);
  for (const [id, direction] of [['prev', -1], ['next', 1]]) el(id).addEventListener('click', () => { const months = [...new Set(data.slots.map(slot => slot.date.slice(0, 7)))]; month = months[months.indexOf(month) + direction] || month; renderCalendar(); });
  el('days').addEventListener('keydown', event => {
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key]; if (!delta) return;
    const buttons = [...el('days').querySelectorAll('button')]; let index = buttons.indexOf(document.activeElement); if (index < 0) return; event.preventDefault();
    for (index += delta; index >= 0 && index < buttons.length; index += Math.sign(delta)) if (!buttons[index].disabled) { buttons[index].focus(); break; }
  });
  track('booking_opened'); load();
})();
