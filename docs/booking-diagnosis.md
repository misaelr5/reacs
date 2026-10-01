# Diagnóstico y corrección local de reservas

Rama: feature/google-meet-booking. URL: http://127.0.0.1:4174/agendar. Sin commit, push, merge ni despliegue.

## Hallazgos reproducidos

1. El 400 de validación agrupaba errores de email, teléfono, profesional y consentimiento bajo el mismo mensaje de privacidad. Un teléfono como (03544) 123456 era rechazado aunque consent=true. Se reprodujo ese caso; no se capturó el formulario personal original del usuario, por lo que no se atribuye su intento concreto a un campo sin evidencia.
2. No había un mismatch de provider/providerId: el contrato real es professionalId=misael|tomas. Sí faltaba filtrar por ese ID en el motor de slots y añadirlo a las claves de slot, lease y evento. Misael a las 10:00 devolvía 200 y Tomás a las mismas 10:00 devolvía 409 slot_taken. En navegador, después de confirmar Misael a las 09:00, ese horario desaparecía también para Tomás.
3. Cambiar de profesional solo limpiaba la selección: no pedía disponibilidad nueva.
4. La grilla agregaba ambos buffers a todos los comienzos, por lo que ofrecía opciones cada 60 minutos. Ahora ofrece cada duración (30 minutos), y los buffers se verifican alrededor de intervalos ocupados.
5. Google y Upstash no estaban configurados, pero mock sí reservaba con datos válidos: no eran causa del rechazo local. GSAP y View Transitions tampoco bloquearon el submit reproducido.

## Corrección

- Validación estricta por campo y errores seguros, con foco, aria-invalid y conservación de datos. Teléfono normalizado, privacidad obligatoria.
- GET /api/booking?professionalId=misael|tomas; POST /api/booking con professionalId en el JSON.
- Persistencia, solapamientos, locks y eventos separados por profesional; UUID de petición sigue enlazado globalmente al contenido para impedir que un reintento cambie de dueño.
- Grilla 09:00–15:30, lunes–viernes, hora de Córdoba; nunca ofrece una reunión que termine después de las 16:00.
- Cambio de persona recarga disponibilidad y descarta respuestas fuera de orden.
- Misma semana base; weeklyByProfessional permite overrides futuros sin duplicar sistemas.
- Documento v1 compatible: reservas sin profesional conservadas y bloqueadas para ambos por precaución. No se inventa una asignación. Eventos/fingerprints anteriores se recuperan, incluyendo teléfonos formateados.
- Backup local previo en .local/backups; verificado que las cuatro reservas previas y las reglas no cambiaron.

## Pruebas reales

- POST http://127.0.0.1:4174/api/booking · misael · 2026-09-30T12:00:00.000Z · HTTP 200 · mock
- POST http://127.0.0.1:4174/api/booking · tomas · 2026-09-30T12:00:00.000Z · HTTP 200 · mock

La hora 12:00 UTC de esos requests corresponde a las 09:00 en Córdoba. Se verificaron registros confirmed de ambos profesionales, bloqueo 409 de duplicados por persona, recálculo al cambiar y descarte de respuestas antiguas. Tomás se probó con movimiento reducido y sin View Transition API. Las llamadas externas de la aplicación fueron cero; las solicitudes del script de Kaspersky inyectado por esta PC se interceptaron únicamente en el contexto de prueba. Los cuerpos de request/response guardados en artifacts/professionals-browser-report.json usan datos ficticios, nunca los del usuario. La prueba elimina únicamente sus UUID de prueba.

Quality gate: lint correcto (29 scripts, 21 páginas); typecheck correcto; 67 tests correctos; build correcto (21 páginas); git diff --check sin errores (solo avisos de normalización CRLF). Suites booking, agenda, motion y professionals de navegador correctas. Suite general: 147 comprobaciones responsive, 21 páginas axe, 0 grupos de infracciones, 9 interacciones y 0 errores; analytics fixtures correctas. Servidor local reiniciado con la versión final y stderr vacío en la verificación.

## Archivos de esta corrección

- lib/booking.ts
- lib/booking-slots.ts
- lib/agenda-rules.ts
- lib/agenda-repository.ts
- lib/agenda-admin.ts
- reac-booking.js
- reac-booking.css
- content/booking.html y salida regenerada dist/agendar.html
- tests/booking.test.ts
- tests/agenda.test.ts
- tests/booking.browser.mjs
- tests/agenda.browser.mjs
- tests/professionals.test.ts (nuevo)
- tests/professionals.browser.mjs (nuevo)
- docs/admin-agenda.md
- docs/google-meet-booking.md
- docs/booking-diagnosis.md (este informe)

## Límites

Sigue en mock local. No se crean eventos reales, Meet reales ni invitaciones. La conexión real de Google y producción no se activaron. Un FreeBusy real del calendario compartido podrá bloquear a ambos profesionales.
