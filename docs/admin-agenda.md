# Panel administrativo de agenda — local

## Acceso y estado

- Login: http://127.0.0.1:4174/admin/login
- Panel: http://127.0.0.1:4174/admin/agenda
- Público: http://127.0.0.1:4174/agendar

`npm run admin:setup` crea una contraseña aleatoria de 256 bits en `.env.local` si no existe; nunca imprime su valor ni reemplaza un secreto existente. Abrir ese archivo **localmente** y copiar el valor de BOOKING_ADMIN_SECRET al login. Reiniciar `npm run dev` después de cambiar variables. No hay credenciales predeterminadas ni bypass de autenticación. El archivo y `.local/` están ignorados por Git. No agregar con `git add -f`.

El servidor se limita a loopback. Se puede revisar la interfaz con viewport móvil; no está expuesto a un teléfono por LAN. No se abrió túnel ni acceso público. Sin cuenta Google/Upstash configurada, todo funciona localmente con datos TEST.

Se pueden configurar hasta cuatro contraseñas mediante BOOKING_ADMIN_PASSWORD_HASHES, un array JSON de pares salt/hash scrypt (salt aleatorio de 16 bytes y hash de 64 bytes, ambos hex). Cuando existe, esas contraseñas reemplazan a BOOKING_ADMIN_SECRET en el login; el secreto aleatorio se conserva exclusivamente como clave interna de sesiones. Cambiar los hashes invalida las sesiones previas. No se guardan las contraseñas en texto plano ni en código. Para ejecutar el test de navegador con este modo, suministrar BOOKING_ADMIN_TEST_PASSWORD al proceso de pruebas; no se publica ni se agrega a Git.

## Modelo y persistencia

Documento versionado `AgendaState`: version, revision, config, weekly (siete arrays de franjas en minutos), exceptions y reservations. Tiene createdAt, updatedAt y updatedBy; cada excepción mantiene su auditoría propia. La identidad administrativa única es booking-admin. No hay edición de archivos para operar los horarios.

- **local:** `.local/booking-agenda-mock.json`, persistente entre reinicios. Escritura temporal + rename y exclusión mediante directorio de lock. No se reemplaza un documento cuya revisión haya cambiado. Si el proceso muere durante escritura puede quedar un `.lock`: detener el servidor, verificar que no queda otra instancia y retirar únicamente ese directorio vacío antes de reiniciar; no borrar el JSON.
- **upstash:** misma infraestructura REST ya utilizada por contacto. Clave `reac:agenda:v1:<sha256(modo:calendarId)>`. EVAL compara revisión y sustituye el documento de forma atómica. Configuración, semana, excepciones y admisión de reservas comparten ese documento para no leer estados parciales.
- **memory-test:** solo pruebas unitarias con repositorios inyectados. No se usa como persistencia del panel real.

BOOKING_STORAGE=local es el valor local por defecto. BOOKING_MODE=google_test usa Upstash por defecto y rechaza almacenamiento local. No se hace fallback silencioso si Redis falla. Los documentos mock y Google TEST están separados; no se migran fixtures automáticamente. Un cambio de almacenamiento o del Calendar ID global cambia el namespace; los IDs individuales no cambian el documento compartido. No cambiar namespaces sin planificar migración.

Config/weekly y excepciones no expiran. Las reservas del documento también se conservan; las sesiones y locks sí tienen TTL. Antes de producción hay que definir retención y cancelación/reconciliación operativa. El estado contiene motivos administrativos y metadatos de Calendar privados: tratar Redis y el archivo local como datos privados. Nunca copiarlos a dist ni a Git.

## Prioridad y significado de las reglas

```
Semana base (uno o varios intervalos por día)
  ↓ reemplazada por horario personalizado para esa fecha, si existe
  ↓ cierre de día/período y franjas bloqueadas (siempre ganan)
  ↓ duración + buffer antes/después + anticipación + horizonte
  ↓ Google FreeBusy
  ↓ reservas pendientes/confirmadas y locks
  ↓ slots públicos
```

La semana se puede apagar por día. Los intervalos deben avanzar dentro del mismo día (00:00–24:00 en API), en pasos de cinco minutos; los solapados/contiguos se fusionan. La UI usa controles horarios nativos; para intervalos hasta medianoche se puede usar 23:55 desde el panel. Hasta ocho intervalos por día. Solo hay un horario personalizado por fecha; se edita el existente. Los bloques superpuestos se aplican como unión: ningún slot que toque cualquiera de ellos pasa.

La duración se elige entre 15/30/45/60; buffers antes y después entre 0/5/10/15/30; anticipación entre 1/2/6/12/24 horas; horizonte entre 7/14/30/60 días calendario. Zona fija America/Argentina/Cordoba, resuelta en servidor con Intl/IANA. Una reunión debe caber dentro de una franja. La grilla avanza por duración. Los buffers se aplican a los intervalos ocupados, no como espacios artificiales entre todas las opciones. Los buffers pueden extenderse fuera del borde de la franja, pero deben quedar libres de bloqueos, reuniones de Google y reservas existentes.

Las reservas guardan sus intervalos y buffers originales. Un cambio de configuración no acorta una reunión existente ni libera su tramo ocupado. Cambiar reglas no cancela ni reprograma eventos. Usar disponibilidad habitual elimina excepciones de esa fecha y recorta períodos que la incluyan; pide confirmación. Los demás días del período siguen bloqueados. Eliminar una excepción también exige confirmación en UI.

## Revalidación y concurrencia

GET público y admin leen siempre del repositorio, sin caché HTTP (`no-store`). Una página pública abierta se actualiza al recibir un aviso BroadcastChannel del panel, al recuperar foco y cada 15 segundos mientras está visible. El aviso no incluye reglas privadas. POST no confía en la selección anterior: consulta el documento y admite el intervalo con compare-and-set, reconsulta Google y vuelve a evaluar reglas antes de insertar.

Si una regla cambió después de abrir `/agendar`, el servidor rechaza el slot con «Ese horario ya no está disponible. Elegí otro». Los intentos existentes se reconcilian mediante UUID/HMAC y event ID; no se crea una segunda reunión al reintentar. Los holds inciertos se conservan para evitar duplicados; pueden requerir revisión del calendario. Cambios externos/manuales en Google siguen fuera de una transacción común: persiste la limitación explicada en la documentación de booking.

Una modificación administrativa que ocurre después de admitir/revalidar una reserva en curso no cancela esa reserva. Las modificaciones y la creación remota de Google no pueden hacerse en una misma transacción; no se promete atomicidad con escritores externos.

## Autenticación, sesiones y CSRF

Contraseña de entorno con al menos 32 caracteres, sin espacios. Comparación de SHA-256 en tiempo constante. Login por POST JSON, nunca por URL. Ocho intentos por diez minutos por loopback/instancia local o contador Redis cuando corresponde. No hay PII ni secretos en logs del flujo.

Una sesión nueva tiene token opaco aleatorio de 256 bits; servidor almacena una clave HMAC derivada del token/secret. Cookie `reac_admin`, HttpOnly, SameSite=Strict, Path=/ y cuatro horas de TTL. Cookie Secure está preparada para producción, pero producción sigue rechazada por el gate. Logout borra el registro y expira cookie; otro login rota la sesión actual. Cambiar BOOKING_ADMIN_SECRET invalida sesiones previas. En modo local las sesiones están en memoria y reiniciar requiere ingresar nuevamente; en Upstash usan TTL real.

Toda mutación, incluido login/logout, exige Origin idéntico al origen del request. Si existe Referer debe coincidir; Fetch Metadata cross-site se rechaza. Se complementa con SameSite Strict y ausencia de CORS. La API solo acepta JSON acotado a 32 KiB. No se usa localStorage/sessionStorage para secretos o tokens. El navegador únicamente conserva la cookie HttpOnly.

`/admin/agenda` se valida server-side antes de leer/devolver HTML. Sin sesión redirige al login. Las plantillas están fuera de dist; no existe un `/admin-agenda.html` público. Toda API administrativa salvo el endpoint de login exige sesión (401), además del gate local. Las rutas preparadas para Vercel siguen deshabilitadas fuera de local y requieren revisión de empaquetado antes de cualquier publicación.

## API

Endpoint único `/api/admin` con action en query (ningún secreto en query):

| Acción | Método | Datos |
| --- | --- | --- |
| login | POST | password |
| logout | POST | sesión vigente |
| state | GET | configuración, excepciones, resumen, días y próximas llamadas del profesional; autenticado |
| health | GET | estados seguros de configuración y lectura del almacenamiento; autenticado |
| config | PUT | revision, config, weekly |
| exception | POST | revision, exception |
| exception&id=UUID | PUT / DELETE | revision y exception para PUT |
| reset-day | POST | revision, date |

Cada mutación exige la revisión que estaba viendo el panel. Una edición concurrente genera 409; recargar es una decisión explícita, no se sobrescribe silenciosamente. Hay límites de 300 excepciones y 367 días por período. Cada entrada se valida server-side.

El resumen usa datos calculados, no fixtures: horarios libres restantes de esta semana, slots base eliminados por reglas administrativas, reservas web confirmadas de la semana y próxima reserva web. Las reservas no incluyen todos los eventos de Google ni reconcilian cancelaciones externas automáticamente. El panel etiqueta todo el entorno TEST; si falla Google muestra disponibilidad no confirmada, no una cifra ficticia. No se envían eventos analytics desde admin ni motivos internos desde booking.

## Validación y operación

```
npm run build
npm run dev
npm run lint
npm run typecheck
npm test
node tests/agenda.browser.mjs
node tests/booking.browser.mjs
npm run test:browser
git diff --check
```

La prueba UI administrativa exige mock y una agenda sin excepciones preexistentes. Crea únicamente excepciones de prueba, las elimina por ID y restaura configuración/semana; no borra reservas. Incluye login real local, rechazo sin sesión, día, franja 14–17, sábado especial, período, semana, duración, editar/eliminar, razones privadas y reserva con selección desactualizada. Verifica 320/360/375/390/430/768/1024/1440/1920 en todas las secciones, login y editor; axe y consola. Los tests unitarios prueban persistencia, CAS, CSRF, sesiones, reglas y concurrencia sin enviar invitaciones.

No hubo conexión real a Google/Redis en la implementación local. No probar con invitados reales. Para Google TEST seguir [OAuth y Calendar](google-meet-booking.md). La autorización de producción sigue siendo exclusivamente **APROBADO PRODUCCIÓN**. Hasta entonces: sin commit, push, merge, deploy, cambios de dominio ni variables de Vercel.

Decisiones contrastadas con [OWASP sesiones](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Upstash EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval) y [FullCalendar licencias](https://fullcalendar.io/license). No se añadió FullCalendar: para un calendario mensual simple, la UI existente evita otra dependencia. No se incorporó código de terceros nuevo.

Movimiento: `reac-motion.js` reutiliza GSAP local para entradas de tarjetas, horarios, formulario y diálogo. View Transitions nativas animan pestañas, meses y confirmación; `reac-motion.css` habilita navegación entre las páginas compatibles. Sin soporte se aplica el cambio inmediatamente. Movimiento reducido cancela tweens activos y limpia sus estilos. Prueba: `node tests/motion.browser.mjs` con BOOKING_ADMIN_TEST_PASSWORD definido en el entorno, nunca en el repositorio. Semana inicial: lunes–viernes, 09:00–16:00, hora de Córdoba.

Elección de profesional: Misael (Desarrollador web) y Tomás (Especialista en marketing), definidos en `lib/booking-config.ts`. Cada uno tiene configuración, semana, excepciones, buffers y reservas independientes. El selector del admin consulta `professionalId=misael|tomas` y todas las escrituras llevan ese ID. Calendario, estadísticas y próximas llamadas se calculan para el profesional seleccionado. Los datos de clientes solo aparecen en el estado administrativo autenticado; las reservas antiguas sin datos se identifican como tales.

Compatibilidad: el documento tiene schema v2. Al leer v1 se copian las reglas efectivas de cada profesional (incluido el override antiguo `weeklyByProfessional`) a `professionalAgendas`. Se conservan revisión, auditoría, reservas y reglas raíz. La lectura es determinística; la siguiente escritura atómica persiste v2 y las siguientes lecturas no vuelven a migrar. Las reservas sin profesional permanecen sin asignar y bloquean conservadoramente a ambos. Las nuevas llevan `slotKeyVersion=3`; el evento/lock incluye profesional, inicio y duración, mientras el CAS valida solapamientos completos. Los reintentos antiguos conservan su event ID.

Calendar se resuelve con `GOOGLE_CALENDAR_ID_MISAEL` y `GOOGLE_CALENDAR_ID_TOMAS`; Google TEST exige ambos IDs distintos y rechaza `primary`. El ID global queda como fallback histórico fuera de Google TEST. El frontend recibe perfiles públicos, nunca esos IDs ni credenciales. Mock no necesita Google.

El frontend envía inicio y fin revisados; el servidor rechaza con 409 si cambió la duración o el horario ya no es elegible. Los clientes antiguos sin `end` siguen admitidos por compatibilidad. La admisión vuelve a validar reglas, buffers y ocupación con CAS y antes de insertar en Calendar. El formulario conserva el servicio y los datos al recargar horarios.

Diagnóstico: `npm run booking:doctor` no hace llamadas externas y muestra estados/nombres de variables. `/api/admin?action=health` exige sesión y gate local. OAuth/API no se declaran verificados sin una comprobación real autorizada. Logs JSON usan una lista cerrada de campos sin PII; los fallos inesperados devuelven un `errorId` `REAC-…` correlacionado. La interfaz no muestra stacks.

Validación: errores de campos devuelven field y un mensaje seguro. Teléfonos con espacios, guiones o paréntesis se normalizan a dígitos (y + inicial opcional), entre 7 y 15 dígitos. La privacidad sigue siendo obligatoria. El cliente conserva los datos, marca el campo y permite corregirlo. Cambiar de profesional limpia fecha/slot, consulta disponibilidad nueva y descarta respuestas fuera de orden.

Regresión específica: node --test tests/professionals.test.ts y node tests/professionals.browser.mjs (solo mock local; elimina únicamente sus propios UUID de prueba).
