# Agenda Reac Studio — cierre local verificado

Fecha: 26 de septiembre de 2026. Rama: `feature/google-meet-booking`. Producción bloqueada. Sin commit, push, merge ni deploy.

## Estado recuperado

Antes de editar se ejecutaron branch, status, diff, diff --stat y diff --check. Había 12 archivos versionados modificados y 38 nuevos sin seguimiento. Se conservaron todos. No se encontraron marcadores TODO/FIXME/HACK/TEMP/XXX en los módulos de agenda, API, contenido, scripts y tests revisados. El servidor anterior estaba detenido; se inició nuevamente en loopback.

Ya estaban implementados el documento v2, las reglas por profesional, selección de calendario, resumen público, próximas llamadas, detalle privado, confirmaciones nativas, diagnóstico, logs y la protección de duración mediante inicio/fin. Su presencia no se tomó como prueba: se ejecutaron las suites contra el código actual.

## Pendientes y correcciones de esta reanudación

- Un slot previamente mostrado que dejaba de ser elegible por bloqueo o cambio de semana devolvía 400. Ahora el formulario actual recibe 409 y debe elegir nuevamente. Se conserva la respuesta 400 para una solicitud inválida del contrato antiguo sin hora de fin.
- La validación al salir de un campo hacía `focus()` y podía impedir avanzar con Tab. Ahora muestra el error sin recuperar el foco; el error queda vinculado al campo con `aria-describedby`. La validación al confirmar sí dirige el foco al campo correspondiente.
- Los errores de transporte podían mostrar mensajes técnicos del navegador. Ahora se muestran mensajes comprensibles en español, manteniendo los datos para reintentar.
- Se corrigió la alineación del selector administrativo, se prefijaron los códigos de error con `REAC-` y el diagnóstico ahora usa el mismo almacenamiento predeterminado que runtime en Google TEST.
- Faltaban pruebas explícitas de migración repetida, preservación de reservas, cambios de buffers/semana, rechazo por ocupación del proveedor y correlación de logs sin datos personales. Se añadieron sin eliminar ni relajar pruebas anteriores.
- La prueba pública antigua dejaba una reserva simulada persistida. Ahora recoge su UUID y elimina únicamente ese registro al finalizar. Se retiró el único fixture añadido por esa prueba durante esta reanudación; las siete reservas que existían al retomar quedaron idénticas.
- La documentación todavía decía esquema v1 y horarios compartidos. Se actualizó al contrato vigente.

## Multi-profesional y persistencia

Misael: Desarrollador web. Tomás: Especialista en marketing. Ambos parten de lunes a viernes, 09:00–16:00, hora de Córdoba; duración predeterminada de 30 minutos. Cada uno tiene semana, excepciones, duración, buffers y reservas independientes. El selector cambia tanto los datos del panel como las consultas y escrituras autenticadas. Las estadísticas corresponden al profesional elegido.

La migración v1 → v2 copia las reglas efectivas a `professionalAgendas`, preserva cualquier semana individual heredada, reservas, excepciones y metadatos. Leer dos veces el mismo v1 produce el mismo resultado; guardar v2 y volver a leer no duplica datos. Se persiste en la siguiente escritura mediante control de revisión y reemplazo atómico. No se inventa profesional para reservas antiguas: quedan «Sin asignar» y bloquean conservadoramente a ambos.

El repositorio local se respaldó en `.local/backups/agenda-resume-20260926-204123.json` antes de las modificaciones. Las pruebas restauraron configuración, semanas y excepciones. Se compararon los datos resultantes con ese respaldo, sin imprimir datos de clientes.

El inicio y fin revisados viajan juntos. Una duración nueva no puede ampliar silenciosamente una llamada ya revisada. La admisión atómica vuelve a comprobar reglas y solapamientos completos, incluidos buffers; FreeBusy se consulta antes de crear el evento. La idempotencia mantiene una única reserva ante reintentos del mismo UUID y contenido.

## UX y administración

Recorrido público: profesional → día → horario → datos y consentimiento → «Tu llamada» → confirmar → resultado. El resumen contiene profesional/especialidad, servicio, fecha, hora, duración y Google Meet. La selección queda marcada por texto, borde y estado nativo. Refrescar horarios conserva servicio y campos; cambiar profesional limpia el horario anterior y descarta respuestas tardías.

El detalle administrativo incluye profesional, fecha/hora, duración, nombre, email, teléfono, empresa, servicio, mensaje, estado y modo. No se publica en disponibilidad ni confirmación pública. Las reservas anteriores que carecen de datos se muestran honestamente, sin rellenar información ficticia. No se añadió un CRM ni edición compleja de clientes.

Se revisaron visualmente `/`, `/agendar`, `/admin/login` y `/admin/agenda`, preservando diseño, tipografías y CTA existentes. Capturas: `artifacts/final-{home,booking,login,admin}-{375,1440}.png`; flujo y detalle: `artifacts/booking-polish-mobile.png` y `artifacts/admin-polish-desktop.png`. Los artefactos son locales e ignorados por Git.

Se reutilizan GSAP instalado, View Transitions y controles HTML nativos. Los dialogs usan `showModal`, foco y Escape nativos. Se comprobaron acciones rápidas, cambios de pestaña, reduced motion activado durante la animación y ausencia de GSAP/View Transitions. Referencias: [dialog de MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) y [Calendar events.insert](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert). No se incorporaron dependencias nuevas.

## Google readiness y seguridad

`GOOGLE_CALENDAR_ID_MISAEL` y `GOOGLE_CALENDAR_ID_TOMAS` resuelven sus respectivos calendarios; el ID global es un fallback heredado. Los tests verifican las rutas de Calendar y FreeBusy mediante respuestas simuladas. Los IDs no se devuelven al frontend público.

Resultado real de `npm run booking:doctor`: modo mock, almacenamiento local, dos profesionales habilitados, OAuth y ambos calendarios sin configurar, API no verificada. Faltan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_CALENDAR_ID_MISAEL`, `GOOGLE_CALENDAR_ID_TOMAS`, `BOOKING_TEST_EMAILS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y `CONTACT_RATE_LIMIT_SECRET`. Redirect preparado: `http://127.0.0.1:4280/oauth/callback`.

El diagnóstico normal no contacta servicios externos. El endpoint de diagnóstico exige autenticación y entorno local. No se conectó Google real, no se ejecutó el probe externo y no se crearon eventos ni invitaciones reales.

Logs JSON limitados a fecha, evento, identificador, profesional, estado y código. No contienen contraseñas, tokens, email, teléfono o mensaje. Los errores inesperados incluyen un código `REAC-XXXXXXXX` correlacionable, sin stack. Continúan las cookies HttpOnly/SameSite Strict, control de origen, validación, límites y gate de producción. Las contraseñas solicitadas permanecen como hashes locales y ambas se comprobaron mediante login real.

## Validación ejecutada

| Comando | Resultado |
| --- | --- |
| `npm run lint` | 31 archivos; auditoría HTML/schema/enlaces/seguridad de 21 páginas |
| `npm run typecheck` | Sin errores |
| `npm test` | 76 aprobados, 0 fallos, 0 omitidos |
| `npm run build` | 21 páginas HTML, 17 indexables |
| `git diff --check` | Sin errores de whitespace; avisos informativos LF/CRLF de Git |
| `node tests/booking.browser.mjs` | Flujo público, consentimiento, errores/retry, conflictos y Meet simulado; 9 anchos; axe sin infracciones |
| `node tests/agenda.browser.mjs` | 6 escenarios; 36 combinaciones sección/ancho, más login y dialog; rechazo real 409 tras bloqueo |
| `node tests/professionals.browser.mjs` | 6 escenarios: dos profesionales 09:00/200, duplicados/409, cambio de profesional, validación y respuestas fuera de orden |
| `node tests/polish.browser.mjs` | 5 recorridos, 18 comprobaciones responsive, axe en éxito/detalle, cero errores JS |
| `node tests/motion.browser.mjs` | Pestañas rápidas, dialog/Escape, GSAP, reduced motion y fallback aprobados |
| `npm run test:browser` | 147 comprobaciones responsive, 21 páginas axe, 0 grupos de infracciones, 9 interacciones; analytics aprobado |

Anchos específicos de agenda: 320, 360, 375, 390, 430, 768, 1024, 1440 y 1920 px. Chrome real automatizado con viewports emulados; no se afirma prueba física de teclado iOS/Android, Safari ni lectores de pantalla. Axe y teclado aportan evidencia, no certificación universal.

Casos obligatorios: A/B Misael y Tomás mismo día 09:00 → 200; C duplicado → 409; D cambio de profesional recalcula; E cambio de duración de Misael no modifica Tomás; F bloqueo de Misael 11:00 mantiene Tomás 11:00; G formulario revisado de 30 min tras cambio a 60 → 409 sin reserva; H/I flujo completo a 375 px usando teclado → confirmado en mock.

## Límites y siguiente paso

La operación real de Google, OAuth, permisos, Meet y Redis sigue sin verificar por falta de configuración y por la instrucción expresa de permanecer en mock. Calendar no ofrece una transacción conjunta FreeBusy+insert: un escritor externo todavía puede introducir un solapamiento. Producción también requiere límites por cliente confiable, revisión de retención/privacidad y recuperación operativa de reservas inciertas, descritos en `google-meet-booking.md`.

El próximo paso de revisión es usar las URLs locales. Una fase externa requiere autorización separada. Solamente el texto exacto **APROBADO PRODUCCIÓN** habilita posteriormente trabajo de producción; no se ejecutó ninguna acción de esa fase.

Conceptos transferibles: idempotencia evita duplicar reintentos; compare-and-set evita sobrescribir o admitir reservas sobre un estado viejo; una migración determinística conserva datos sin convertir cada arranque en una nueva modificación.

## URLs y Git

- http://127.0.0.1:4174/
- http://127.0.0.1:4174/agendar
- http://127.0.0.1:4174/admin/login
- http://127.0.0.1:4174/admin/agenda

Rama `feature/google-meet-booking`. Último commit existente: `b02fa09`; no se creó ningún commit. Working tree con 12 archivos versionados modificados y 39 nuevos sin seguimiento (incluido este informe), nada staged. `git diff --stat`: 12 archivos, 51 inserciones y 12 eliminaciones; ese comando no cuenta los módulos nuevos sin seguimiento. Inventario completo guardado localmente en `artifacts/final-git-status.txt`.
