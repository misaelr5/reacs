(() => {
  'use strict';
  const motion = window.ReacMotion || { reveal() {}, change(update) { update(); return Promise.resolve(); } };
  const $ = id => document.getElementById(id);
  let state, month, editingId = null, period = false, saving = false, professionalId = 'misael', loadVersion = 0, toastTimer;
  const names = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const time = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  const minutes = value => { const [hour, minute] = value.split(':').map(Number); return hour * 60 + minute; };
  const dateText = date => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00Z'));
  const callText = start => new Intl.DateTimeFormat('es-AR', { timeZone: state.config.timezone, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(start));
  function node(tag, text, className) { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; }
  function button(text, action) { const item = node('button', text); item.type = 'button'; item.addEventListener('click', action); return item; }
  async function api(action, method = 'GET', body, id) {
    const response = await fetch('/api/admin?action=' + action + '&professionalId=' + encodeURIComponent(professionalId) + (id ? '&id=' + encodeURIComponent(id) : ''), { method, cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) }).catch(() => { throw new Error('No pudimos conectar con la agenda. Revisá tu conexión y reintentá.'); });
    const data = await response.json().catch(() => { throw new Error('La agenda no respondió correctamente. Reintentá en unos segundos.'); });
    if (!response.ok) { if (response.status === 401 && action !== 'login') location.assign('/admin/login'); throw new Error((data.message || 'No pudimos completar la acción.') + (data.errorId ? ' Código: ' + data.errorId : ''));  }
    return data;
  }
  const login = $('admin-login-form');
  if (login) { motion.reveal('.admin-login > *'); login.addEventListener('submit', async event => { event.preventDefault(); const submit = login.querySelector('button'); submit.disabled = true; $('admin-error').textContent = ''; try { await api('login', 'POST', { password: login.elements.password.value }); login.reset(); location.assign('/admin/agenda'); } catch (error) { $('admin-error').textContent = error.message; } finally { submit.disabled = false; } }); return; }
  if (!$('admin-content')) return;
  function toast(message, error = false) { const target = $('admin-toast'); clearTimeout(toastTimer); target.textContent = message; target.dataset.error = String(error); target.hidden = false; toastTimer = setTimeout(() => { target.hidden = true; }, 4500); }
  function confirmAction(title, text) {
    const dialog = $('admin-confirm'); if (dialog.open) return Promise.resolve(false);
    $('admin-confirm-title').textContent = title; $('admin-confirm-text').textContent = text; dialog.returnValue = 'cancel';
    return new Promise(resolve => { dialog.onclose = () => { dialog.onclose = null; resolve(dialog.returnValue === 'confirm'); }; dialog.showModal(); $('admin-confirm-cancel').focus(); });
  }
  function renderBookings() {
    const container = $('admin-bookings'); container.replaceChildren();
    if (!state.upcoming.length) { container.append(node('p', 'Todavía no hay próximas llamadas para ' + state.professional.name + '.')); const link = node('a', 'Ver agenda pública →'); link.href = '/agendar'; container.append(link); }
    for (const item of state.upcoming) {
      const row = node('article', undefined, 'admin-reservation'); const info = node('div');
      info.append(node('strong', callText(item.start)), node('p', (item.professional?.name || 'Sin asignar') + ' · ' + (item.client?.name || 'Datos no guardados en esta reserva anterior')), node('small', (item.client?.service || 'Servicio no registrado') + ' · ' + (item.status === 'confirmed' ? 'Confirmada' : 'Pendiente') + (item.mode === 'mock' ? ' · TEST MODE' : item.mode === 'google_test' ? ' · GOOGLE TEST' : '')));
      const detail = button('Ver detalle', () => {
        const list = $('admin-booking-detail'); list.replaceChildren();
        const details = [['Profesional', item.professional?.name || 'Sin asignar'], ['Fecha y hora', callText(item.start)], ['Duración', ((Date.parse(item.end)-Date.parse(item.start))/60000) + ' minutos'], ['Estado', item.status === 'confirmed' ? 'Confirmada' : 'Pendiente'], ['Modo', item.mode === 'mock' ? 'TEST MODE · Simulación local' : item.mode === 'google_test' ? 'Google de prueba' : 'Reserva anterior']];
        for (const [key, label] of [['name','Nombre'],['company','Empresa'],['service','Servicio'],['email','Email'],['phone','Teléfono'],['message','Mensaje']]) details.push([label, item.client?.[key] || 'No informado']);
        for (const [label, value] of details) list.append(node('dt', label), node('dd', value));
        $('admin-booking-dialog').showModal(); motion.reveal($('admin-booking-dialog'));
      }); row.append(info, detail); container.append(row);
    }
  }
  function renderCalendar() {
    const months = [...new Set(state.days.map(day => day.date.slice(0,7)))];
    month ||= months[0];
    $('admin-month').textContent = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(month + '-01T12:00:00Z'));
    $('admin-prev').disabled = months.indexOf(month) <= 0; $('admin-next').disabled = months.indexOf(month) >= months.length - 1;
    const grid = $('admin-days'); grid.replaceChildren(); const offset = (new Date(month + '-01T12:00:00Z').getUTCDay() + 6) % 7;
    for (let index = 0; index < offset; index++) grid.append(node('span'));
    for (const day of state.days.filter(item => item.date.startsWith(month))) {
      const text = (day.past ? 'Pasado · ' : '') + day.label;
      const item = button(String(Number(day.date.slice(-2))), () => openEditor(day.date));
      item.dataset.date = day.date; item.dataset.kind = day.label === 'Bloqueado' ? 'blocked' : ['Horario especial','Franja bloqueada'].includes(day.label) ? 'special' : 'normal';
      item.append(node('span', text)); if (day.reservations.length) item.append(node('small', `${day.reservations.length} reserva${day.reservations.length > 1 ? 's' : ''}`));
      for (const reservation of day.reservations) item.append(node('small', reservation.professional?.name || 'Sin asignar'));
      if (!day.past) item.append(node('small', `${day.available} libres`));
      item.setAttribute('aria-label', `${dateText(day.date)}. ${text}. ${day.available} horarios disponibles. ${day.reservations.length} reservas.`); grid.append(item);
    }
  }
  function range(container, value = { start: 540, end: 960 }, title = 'Franja') {
    const row = node('div', undefined, 'admin-range');
    for (const [key, label] of [['start','Desde'],['end','Hasta']]) { const field = node('label', label); const input = node('input'); input.type = 'time'; input.step = '300'; input.required = true; input.value = time(value[key]); input.dataset.bound = key; input.setAttribute('aria-label', title + ' · ' + label); field.append(input); row.append(field); }
    const remove = button('×', () => row.remove()); remove.setAttribute('aria-label', 'Eliminar ' + title.toLowerCase()); row.append(remove); container.append(row);
  }
  function readRanges(container) { return [...container.querySelectorAll('.admin-range')].map(row => ({ start: minutes(row.querySelector('[data-bound=start]').value), end: minutes(row.querySelector('[data-bound=end]').value) })); }
  function renderWeekly() {
    const target = $('admin-weekly'); target.replaceChildren();
    for (const day of [1,2,3,4,5,6,0]) {
      const section = node('div', undefined, 'admin-weekly-day'); section.dataset.day = day;
      const label = node('label'); const active = node('input'); active.type = 'checkbox'; active.checked = state.weekly[day].length > 0; active.dataset.active = 'true'; label.append(active, document.createTextNode(' ' + names[day] + ' · Activo'));
      const ranges = node('div', undefined, 'admin-ranges'); state.weekly[day].forEach((value, index) => range(ranges, value, names[day] + ', franja ' + (index + 1)));
      const add = button('+ Agregar franja', () => { if (ranges.children.length >= 8) return; active.checked = true; range(ranges, undefined, names[day]); toggle(); });
      function toggle() { ranges.querySelectorAll('input,button').forEach(input => input.disabled = !active.checked); }
      active.addEventListener('change', () => { if (active.checked && !ranges.children.length) range(ranges, undefined, names[day]); toggle(); });
      section.append(label, ranges, add); target.append(section); toggle();
    }
  }
  function renderExceptions() {
    const target = $('admin-exceptions'); target.replaceChildren();
    const items = [...state.exceptions].sort((a,b) => a.from.localeCompare(b.from));
    if (!items.length) target.append(node('p', 'No hay excepciones. Tu semana habitual define la disponibilidad.'));
    for (const item of items) {
      const card = node('article', undefined, 'admin-exception'); const description = node('div');
      description.append(node('strong', dateText(item.from) + (item.through !== item.from ? ' — ' + dateText(item.through) : '')));
      description.append(node('p', ({ closed: 'No disponible', block: 'Franja bloqueada', custom: 'Disponible excepcionalmente' })[item.kind] + (item.through < state.today ? ' · Pasada' : '')));
      if (item.intervals.length) description.append(node('p', item.intervals.map(value => time(value.start) + '–' + time(value.end)).join(' / ')));
      if (item.reason) description.append(node('p', 'Motivo interno: ' + item.reason));
      const actions = node('div', undefined, 'admin-actions'); actions.append(button('Editar', () => openEditor(item.from, item.kind, item)), button('Eliminar', async () => { if (!await confirmAction('Eliminar excepción', 'Se quitará esta excepción de ' + state.professional.name + '. Los horarios se recalcularán. Las reservas existentes se conservan.')) return; await save('exception','DELETE',{ revision: state.revision },item.id); }));
      card.append(description, actions); target.append(card);
    }
  }
  async function load(message = '') {
    const version = ++loadVersion; $('admin-loading').hidden = false; $('admin-content').inert = true;
    $('admin-status').textContent = 'Cargando agenda…';
    try {
      const firstLoad = !state;
      const fresh = await api('state'); if (version !== loadVersion) return; state = fresh;
      const selector = $('admin-professional'); selector.replaceChildren(...state.professionals.map(person => new Option(person.name + ' — ' + person.specialty, person.id))); selector.value = state.professionalId;
      $('admin-mode').textContent = `TEST MODE · ${state.mode === 'mock' ? 'DATOS LOCALES SIMULADOS' : 'GOOGLE REAL DE PRUEBA'} · ${state.storage === 'upstash' ? 'UPSTASH' : 'ARCHIVO LOCAL'}`;
      for (const key of ['available','blocked','reservations']) $('stat-' + key).textContent = state.summary[key] ?? 'No disponible';
      $('stat-next').textContent = state.summary.next ? callText(state.summary.next) + ' · ' + (state.summary.nextProfessional?.name || 'Sin profesional asignado') : 'Sin próximas llamadas';
      renderCalendar(); renderWeekly(); renderExceptions(); renderBookings();
      for (const [key, value] of Object.entries(state.config)) if ($('admin-settings-form').elements[key]) $('admin-settings-form').elements[key].value = value;
      $('admin-content').hidden = false; if (firstLoad) motion.reveal('.admin-stats article, .admin-tabs, #panel-agenda'); $('admin-status').textContent = state.calendarError ? 'No se pudo consultar Google. La disponibilidad no está confirmada; no se inventaron horarios libres.' : message || 'Datos actualizados. Los cambios guardados se aplican a las nuevas reservas.';
    } catch (error) { if (version === loadVersion) { $('admin-status').textContent = error.message; toast(error.message, true); } }
    finally { if (version === loadVersion) { $('admin-loading').hidden = true; $('admin-content').inert = false; } }
  }
  async function save(action, method, body, id) {
    if (saving) return false; saving = true; $('admin-professional').disabled = true; document.querySelectorAll('button[type=submit]').forEach(button => button.disabled = true); $('admin-status').textContent = 'Guardando cambios…';
    try { await api(action, method, body, id); if ('BroadcastChannel' in window) { const channel = new BroadcastChannel('reac-booking-rules'); channel.postMessage('changed'); channel.close(); } if ($('admin-dialog').open) $('admin-dialog').close(); const feedback = action === 'config' ? 'Disponibilidad actualizada' : method === 'DELETE' ? 'Excepción eliminada' : 'Cambio guardado'; await load('Guardado. La agenda pública ya usa las nuevas reglas.'); toast(feedback); return true; }
    catch (error) { $('admin-status').textContent = error.message; $('dialog-error').textContent = error.message; toast(error.message, true); return false; }
    finally { saving = false; $('admin-professional').disabled = false; document.querySelectorAll('button[type=submit]').forEach(button => button.disabled = false); }
  }
  function fieldsForKind() {
    const form = $('admin-exception-form'); const kind = form.elements.kind.value;
    $('dialog-ranges').hidden = !['custom','block'].includes(kind); $('dialog-ranges').querySelectorAll('input').forEach(input => input.disabled = $('dialog-ranges').hidden);
    $('dialog-through-label').hidden = !(period && kind === 'closed'); form.elements.through.disabled = $('dialog-through-label').hidden;
  }
  function openEditor(date, kind, existing) {
    if (!existing && !kind) existing = state.exceptions.find(item => item.from === date && item.through === date);
    editingId = existing?.id || null; period = kind === 'period' || Boolean(existing && existing.from !== existing.through);
    const form = $('admin-exception-form'); form.reset(); form.elements.from.value = existing?.from || date; form.elements.through.value = existing?.through || date;
    form.elements.kind.value = existing?.kind || (kind === 'period' ? 'closed' : kind || 'habitual'); form.elements.reason.value = existing?.reason || '';
    $('dialog-title').textContent = period ? 'Bloquear período' : dateText(date); $('dialog-error').textContent = '';
    const matches = state.days.find(day => day.date === date); $('dialog-warning').textContent = matches?.reservations.length ? `${matches.reservations.length} reserva(s) existente(s). No se cancelarán ni modificarán.` : 'Los bloqueos por período tienen prioridad sobre los horarios personalizados.';
    $('dialog-reservations').replaceChildren();
    for (const reservation of matches?.reservations || []) $('dialog-reservations').append(node('p', callText(reservation.start) + ' · ' + (reservation.professional ? reservation.professional.name + ' — ' + reservation.professional.specialty : 'Sin profesional asignado (reserva anterior)')));
    $('dialog-intervals').replaceChildren(); (existing?.intervals.length ? existing.intervals : [{ start: form.elements.kind.value === 'block' ? 840 : 540, end: 960 }]).forEach((value,index) => range($('dialog-intervals'),value,'Franja ' + (index+1)));
    fieldsForKind(); $('admin-dialog').showModal(); motion.reveal($('admin-dialog'));
  }
  $('admin-exception-form').addEventListener('change', fieldsForKind);
  $('dialog-close').addEventListener('click', () => $('admin-dialog').close());
  $('dialog-add-range').addEventListener('click', () => { if ($('dialog-intervals').children.length < 8) range($('dialog-intervals')); });
  $('admin-exception-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget; const kind = form.elements.kind.value;
    if (kind === 'habitual') { if (!await confirmAction('Restablecer día', 'Se quitarán las excepciones de este día y se recortarán los períodos que lo bloqueen. No se cancelan reservas.')) return; await save('reset-day','POST',{ revision: state.revision, date: form.elements.from.value }); return; }
    const exception = { kind, from: form.elements.from.value, through: period && kind === 'closed' ? form.elements.through.value : form.elements.from.value, intervals: ['custom','block'].includes(kind) ? readRanges($('dialog-intervals')) : [], reason: form.elements.reason.value };
    await save('exception', editingId ? 'PUT' : 'POST', { revision: state.revision, exception }, editingId);
  });
  document.querySelectorAll('[data-quick]').forEach(item => item.addEventListener('click', () => openEditor(state.today, item.dataset.quick)));
  document.querySelectorAll('[data-tab]').forEach(item => item.addEventListener('click', () => motion.change(() => { document.querySelectorAll('[data-tab]').forEach(tab => { tab.setAttribute('aria-pressed', String(tab === item)); $('panel-' + tab.dataset.tab).hidden = tab !== item; }); })));
  for (const [id,direction] of [['admin-prev',-1],['admin-next',1]]) $(id).addEventListener('click', () => motion.change(() => { const months = [...new Set(state.days.map(day => day.date.slice(0,7)))]; month = months[months.indexOf(month)+direction] || month; renderCalendar(); }));
  $('admin-weekly-form').addEventListener('submit', event => { event.preventDefault(); const weekly = Array.from({ length: 7 }, () => []); document.querySelectorAll('.admin-weekly-day').forEach(day => { weekly[Number(day.dataset.day)] = day.querySelector('[data-active]').checked ? readRanges(day.querySelector('.admin-ranges')) : []; }); save('config','PUT',{ revision: state.revision, config: state.config, weekly }); });
  $('admin-settings-form').addEventListener('submit', event => { event.preventDefault(); const config = { ...state.config }; for (const [key,value] of new FormData(event.currentTarget)) config[key] = Number(value); save('config','PUT',{ revision: state.revision, config, weekly: state.weekly }); });
  $('admin-professional').addEventListener('change', async event => { if (saving) return; professionalId = event.target.value; month = null; $('admin-content').hidden = true; await load(); if (state?.professionalId === professionalId) motion.reveal('#admin-content'); });
  $('admin-health-check').addEventListener('click', async () => { $('admin-health-result').textContent = 'Verificando…'; try { const result = await api('health&probe=1'); const probe = result.probe; $('admin-health-result').textContent = 'Modo: ' + result.bookingMode + '. Almacenamiento: ' + (probe?.upstash === 'connected' ? 'Upstash conectado' : result.storageState === 'ok' && result.bookingMode === 'mock' ? 'archivo local disponible' : 'sin verificar') + '. OAuth: ' + (probe?.oauth === 'verified-through-freebusy' ? 'verificado' : result.oauth === 'not-configured' ? 'sin configurar' : 'sin verificar') + '. Calendar API: ' + (probe?.apiEnabled === 'reachable' ? 'disponible' : 'sin verificar') + '. Misael FreeBusy: ' + (probe?.professionals?.find(person => person.id === 'misael')?.freeBusy || 'sin verificar') + '. Tomás FreeBusy: ' + (probe?.professionals?.find(person => person.id === 'tomas')?.freeBusy || 'sin verificar') + '.'; } catch (error) { $('admin-health-result').textContent = error.message; } });
  $('admin-days').addEventListener('keydown', event => { const offset = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.key]; if (!offset) return; const buttons = [...$('admin-days').querySelectorAll('button')]; const index = buttons.indexOf(document.activeElement); if (index < 0) return; event.preventDefault(); buttons[Math.max(0, Math.min(buttons.length - 1, index + offset))]?.focus(); });
  $('admin-reload').addEventListener('click', () => load());
  $('admin-logout').addEventListener('click', async () => { try { await api('logout','POST',{}); location.assign('/admin/login'); } catch (error) { $('admin-status').textContent = error.message; } });
  load();
})();
