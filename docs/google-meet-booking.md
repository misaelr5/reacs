# Agenda Google Meet — fase local

Para activar únicamente Google TEST con dos calendarios, usar la [guía operativa paso a paso](google-test-setup.md).

Esta fase no autoriza publicación. Rama: `feature/google-meet-booking`. No hacer commit en main, push, merge, deploy ni cambios en Vercel. El gate pedido por el propietario es el texto exacto **APROBADO PRODUCCIÓN**, seguido de una revisión y activación separada; ese texto no activa código automáticamente.

## Arquitectura y decisiones

Reac es HTML estático + JavaScript, Node 24 y funciones TypeScript. No usa Next.js, React ni Tailwind. `/agendar` usa el generador, navegación, tipografía, colores, privacidad y analytics existentes. Se mantiene WhatsApp, email y formulario. La extensión administrativa agrega persistencia de reglas/reservas y sesiones administrativas; no hay login de visitantes. Ver [panel administrativo](admin-agenda.md).

Frontend → GET `/api/booking` → configuración central + FreeBusy + reservas retenidas → días y slots públicos. POST → origen, tamaño, antispam, validación, rate limit → vincular request UUID y datos con HMAC → reclamar slot atómicamente → consultar evento determinístico → reconsultar FreeBusy → `events.insert` → Calendar genera Meet → confirmación. El navegador solo recibe los slots y los datos de su confirmación; nunca detalles de otros eventos.

**REUSE:** Node test runner, Playwright/axe existentes, `Intl` con reglas IANA, analytics con consentimiento, validación de email y Upstash REST del contacto. **INTEGRATE:** API oficial Calendar y OAuth con refresh token del propietario. **BUILD:** UI nativa, slots y coordinación específica. Sin nuevas dependencias. Se investigó Cal.com como alternativa; una plataforma completa agrega operación y alcance para una sola agenda. No se incorpora ni se recomienda un fork sin auditarlo.

OAuth de usuario se eligió frente a service accounts porque estas últimas requieren delegación de dominio para invitados, innecesaria para una cuenta del propietario. Usamos REST oficial con `fetch`, sin SDK pesado para tres operaciones. El transporte Redis es compartido con contacto; Resend no participa en invitaciones de Calendar.

## Modos y horario TEST

- `mock` (predeterminado): **solo loopback, fuera de Vercel y de NODE_ENV=production**. Con BOOKING_STORAGE=local, reglas y reservas persisten en `.local/booking-agenda-mock.json` (ignorado por Git), sin llamadas de red. Los tests unitarios inyectan memoria aislada. Confirmación identificada como TEST; sin botón ni enlace Meet ficticio.
- `google_test`: misma restricción local, calendario dedicado (no `primary`), credenciales voluntarias y lista explícita de emails de prueba. Crea eventos reales `[TEST]` y Meet reales. Usa `sendUpdates=none`, pero Google advierte que algunos correos pueden enviarse: **solo cuentas de prueba propias**, jamás clientes. `invitationSent` permanece false; no se presume entrega.
- `production`: **bloqueado con 503 en esta fase**, incluso con credenciales. Ningún modo crea eventos en un deployment. La habilitación futura requiere implementación/revisión autorizada del gate, límites por IP Vercel, configuración comercial y pruebas reales; no basta cambiar una variable.

`lib/agenda-rules.ts` inicializa el documento editable: America/Argentina/Cordoba, lunes a viernes, 09:00–16:00, 30 minutos, buffer antes 15 y después 15, mínimo 120 minutos de anticipación y horizonte 30 días. La franja predeterminada de 09:00–16:00 fue solicitada por el usuario; el sistema continúa en **TEST**. Se ofrecen comienzos cada 30 minutos, de 09:00 a 15:30. Los buffers filtran solapamientos alrededor de reservas y bloqueos; no añaden huecos a una grilla vacía. `lib/booking-config.ts` conserva servicios y compatibilidad de tests del motor anterior. En runtime el documento persistido es la fuente de verdad. La UI muestra hora de Córdoba; las horas ambiguas/inexistentes por DST se omiten.

## Concurrencia, idempotencia y recuperación

El registro persistente admite reservas mediante compare-and-set atómico: comprueba reglas actuales e intervalos completos con buffers y registra la reserva pendiente en una sola actualización. Así también protege contra grillas nuevas después de cambiar duración/horarios. Se mantienen los locks de slots (dos horas después de su inicio), vinculación UUID/HMAC y lease de 120 s. El event ID es determinístico por calendario, profesional y slot, válido para Google (subconjunto base32hex). El documento guarda reglas, motivos internos y metadatos privados de reservas; no se sirve al público. Locks y sesiones guardan hashes y contadores, no contraseñas. Las respuestas completas de Google permanecen del lado servidor.

Tras timeout/error incierto posterior al intento de inserción, se conserva el slot y el frontend congela los datos para reintentar la misma solicitud. El backend consulta ese evento antes de insertar otra vez, incluso si ya cerró la anticipación mínima. Si se recarga/cierra la pestaña durante un resultado incierto, el UUID no se conserva en almacenamiento del navegador: revisar el calendario antes de volver a reservar; el slot sigue retenido. Esta es una limitación explícita de recuperación de fase uno. Los holds inciertos pueden bloquear un horario hasta expirar; preferimos eso a duplicar reuniones. La URL Meet queda guardada por Google en el evento. Si su creación está pendiente, el botón de consulta repite la misma solicitud sin crear otra reserva.

FreeBusy + insert **no es una transacción de Google**: las reservas de esta API quedan coordinadas entre sí, pero un evento creado manualmente o por otra aplicación entre esas dos llamadas puede solaparse. Usar un calendario dedicado y un único escritor de reservas; monitoreo/reconciliación de cambios externos queda pendiente de producción. No se implementan cancelaciones/reprogramaciones en este alcance. Un slot cancelado no se reutiliza automáticamente.

## Google Cloud y OAuth: pasos manuales

1. Crear un proyecto de desarrollo en Google Cloud y habilitar **Google Calendar API**.
2. Configurar Google Auth Platform / pantalla de consentimiento. En modo externo Testing, agregar tu cuenta de desarrollo como test user. No usar cuentas de clientes.
3. Crear un OAuth client de tipo **Web application**. Agregar el redirect exacto `http://127.0.0.1:4280/oauth/callback`. No hace falta un redirect público ni un endpoint OAuth en Vercel.
4. Crear dos calendarios secundarios dedicados de pruebas en Google Calendar, propiedad de esa cuenta y compatibles con Google Meet: Reac Test — Misael y Reac Test — Tomás. Copiar cada Calendar ID desde configuración/integración. Deben ser distintos y `primary` está rechazado.
5. Copiar `.env.example` a `.env.local` **solo si no existe**. Completar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET de desarrollo. `.env.local` está ignorado; nunca agregarlo con `git add -f`.
6. Ejecutar `node --env-file=.env.local scripts/booking-oauth.mjs`. Abrir la URL impresa y autorizar voluntariamente tu cuenta de desarrollo. Solicita `calendar.events.owned` y `calendar.freebusy`, acceso offline; la cuenta debe ser dueña de ambos calendarios secundarios. El callback local valida state, intercambia code y guarda refresh token en `.env.local`; no imprime tokens, no crea eventos. El servidor expira en cinco minutos. En cuentas externas Testing los refresh tokens pueden vencer a los siete días; repetir autorización cuando corresponda.
7. Completar GOOGLE_CALENDAR_ID_MISAEL, GOOGLE_CALENDAR_ID_TOMAS, BOOKING_TEST_EMAILS (emails de tus cuentas de prueba separados por comas) y las variables Upstash de un entorno de desarrollo. Configurar BOOKING_MODE=google_test y BOOKING_STORAGE=upstash; reiniciar el servidor local. El documento de mock no se migra a Google TEST automáticamente.
8. Reservar solo con una cuenta allowlisted. Verificar evento, zona, attendee y Meet en el calendario de pruebas. Si aparece pending, usar «Consultar enlace Meet». No asegurar recepción de correo con sendUpdates=none.

## Variables

| Variable | Uso |
| --- | --- |
| BOOKING_MODE | mock por defecto; google_test voluntario; production bloqueado |
| BOOKING_STORAGE | local o upstash; google_test requiere upstash |
| BOOKING_ADMIN_SECRET | Contraseña administrativa; crear con npm run admin:setup |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | OAuth client de desarrollo, servidor |
| GOOGLE_REFRESH_TOKEN | Autorización offline del propietario, servidor |
| GOOGLE_CALENDAR_ID_MISAEL / GOOGLE_CALENDAR_ID_TOMAS | Calendario dedicado de cada profesional |
| GOOGLE_CALENDAR_ID | Fallback heredado para datos antiguos; Google TEST exige ambos IDs individuales y distintos |
| BOOKING_TEST_EMAILS | Lista cerrada de invitados de prueba propios |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | Redis de desarrollo; transporte compartido con contacto |
| CONTACT_RATE_LIMIT_SECRET | Secreto aleatorio mínimo 32 caracteres; HMAC; no cambiar mientras haya reservas pendientes |

No se necesita GOOGLE_REDIRECT_URI en runtime: el helper local tiene un callback fijo que debe coincidir con Cloud. Ningún secreto pasa al build público. `.env.example` contiene solo nombres y valores vacíos.

## Local y validación

```
npm run build
npm run dev
```

Abrir **http://127.0.0.1:4174/agendar**. Sin `.env.local` se usa mock. El servidor sirve dist y está ligado a 127.0.0.1; reconstruir después de editar frontend y reiniciar tras modificar backend/env. No hay hot reload.

```
npm run lint
npm run typecheck
npm test
node tests/booking.browser.mjs
npm run test:browser
git diff --check
```

Pruebas unitarias: slots, buffer, DST, entradas inválidas, límites, origen, gate, concurrencia, idempotencia, fallos y recuperación. Contratos Google y Redis con respuestas simuladas, sin envíos reales. Browser: recorrido mock, teclado, axe, 320/360/375/390/430/768/1024/1440/1920, conflicto, falta de disponibilidad, error/retry y pending Meet simulado. Suites generales verifican navegación, enlaces de WhatsApp, contacto y analytics. El contacto sin credenciales conserva 503; no significa entrega real.

Analytics usa `window.ReacAnalytics.track`: booking_opened, booking_date_selected, booking_time_selected, professional_selected, booking_form_started, booking_completed, booking_failed. Solo propiedades estáticas, sin nombre/email/teléfono/mensaje, y sujeto al consentimiento existente. En localhost no se envían eventos reales.

## Seguridad y pasos previos a producción

POST JSON limitado a 8 KiB, campos acotados, email validado, campos desconocidos rechazados, honeypot, consentimiento, origen exacto, Fetch Metadata, slots permitidos, HMAC, respuestas no-store y errores sin secretos. Rate limit local: 120 lecturas y 30 intentos POST por diez minutos compartidos por loopback; Redis obligatorio en google_test y fail-closed. UI usa textContent para datos dinámicos; descripción Calendar escapa HTML. No hay CORS público. El OAuth helper no forma parte de dist.

Antes de cualquier activación autorizada: acordar horario comercial, autorizar OAuth de producción y calendario, revisar consentimiento y política de privacidad con el uso de Google, Upstash y retención, configurar cuotas y antispam para tráfico público, identificar cliente mediante header confiable de Vercel, habilitar sendUpdates=all con lenguaje honesto (solicitud a Google no acredita llegada al inbox), ampliar recuperación/cancelación según operación, y probar Google/Redis reales con cuentas controladas. Repetir tests, lint, typecheck, build, diff, secretos, responsive y verificación de home. No existe una certificación end-to-end real mientras el propietario no configure y autorice esos servicios.

Fuentes oficiales consultadas:
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://cal.com/blog/calcom-v6-4 (evaluación de alternativa; no se incorporó código)

Elección de profesional: Misael (Desarrollador web) y Tomás (Especialista en marketing), definidos en `lib/booking-config.ts`. Cada uno tiene configuración, semana, excepciones, buffers y reservas independientes. El selector del admin consulta `professionalId=misael|tomas` y todas las escrituras llevan ese ID. Calendario, estadísticas y próximas llamadas se calculan para el profesional seleccionado. Los datos de clientes solo aparecen en el estado administrativo autenticado; las reservas antiguas sin datos se identifican como tales.

Compatibilidad: el documento tiene schema v2. Al leer v1 se copian las reglas efectivas de cada profesional (incluido el override antiguo `weeklyByProfessional`) a `professionalAgendas`. Se conservan revisión, auditoría, reservas y reglas raíz. La lectura es determinística; la siguiente escritura atómica persiste v2 y las siguientes lecturas no vuelven a migrar. Las reservas sin profesional permanecen sin asignar y bloquean conservadoramente a ambos. Las nuevas llevan `slotKeyVersion=3`; el evento/lock incluye profesional, inicio y duración, mientras el CAS valida solapamientos completos. Los reintentos antiguos conservan su event ID.

Calendar se resuelve con `GOOGLE_CALENDAR_ID_MISAEL` y `GOOGLE_CALENDAR_ID_TOMAS`; Google TEST exige ambos, distintos, y no acepta `primary` ni el fallback global. Usar calendarios separados para agendas Google independientes. El frontend recibe perfiles públicos, nunca esos IDs ni credenciales. Mock no necesita Google.

El frontend envía inicio y fin revisados; el servidor rechaza con 409 si cambió la duración o el horario ya no es elegible. Los clientes antiguos sin `end` siguen admitidos por compatibilidad. La admisión vuelve a validar reglas, buffers y ocupación con CAS y antes de insertar en Calendar. El formulario conserva el servicio y los datos al recargar horarios.

Diagnóstico: `npm run booking:doctor` no hace llamadas externas y muestra estados/nombres de variables. `/api/admin?action=health` exige sesión y gate local. OAuth/API no se declaran verificados sin una comprobación real autorizada. Logs JSON usan una lista cerrada de campos sin PII; los fallos inesperados devuelven un `errorId` `REAC-…` correlacionado. La interfaz no muestra stacks.

Validación: errores de campos devuelven field y un mensaje seguro. Teléfonos con espacios, guiones o paréntesis se normalizan a dígitos (y + inicial opcional), entre 7 y 15 dígitos. La privacidad sigue siendo obligatoria. El cliente conserva los datos, marca el campo y permite corregirlo. Cambiar de profesional limpia fecha/slot, consulta disponibilidad nueva y descarta respuestas fuera de orden.

Regresión específica: node --test tests/professionals.test.ts y node tests/professionals.browser.mjs (solo mock local; elimina únicamente sus propios UUID de prueba).
