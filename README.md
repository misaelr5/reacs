# Reac Studio

Sitio comercial estático con HTML completo y contacto directo por WhatsApp y email. Dominio canónico de producción: https://reacstudio.com. El host `reacs-studio.vercel.app` queda como alias técnico anterior y redirige al dominio oficial.

**Estado del contacto (9 de noviembre de 2026):** por decisión del responsable, no se utiliza formulario ni se requieren Resend/Upstash. [Pendientes de privacidad, medición y publicación](docs/PENDIENTES.md).

## Reglas de diseño

- **Nunca usar texto subrayado** en links, botones ni etiquetas (`text-decoration: underline`). Los links se distinguen por color, peso o un ícono de flecha, nunca por subrayado.
- La única tipografía del sitio es **Satoshi**. No usar fuentes del sistema como reemplazo visible ni tipografías de fantasía.

## Desarrollo

Requiere Node.js 24 y npm:

```powershell
npm ci --ignore-scripts
npm run build
npm run dev
```

Abrir http://127.0.0.1:4174. El servidor está limitado a esta computadora. Reconstruir después de editar contenido y reiniciar el servidor después de cambiar configuración o backend; no hay hot reload.

## Arquitectura

- `Reac.dc.html`: fuente de la home; el build sincroniza `index.html`.
- `content/services.mjs`: ocho páginas de servicios, incluidas `/landing-pages` y `/ciberseguridad`.
- `content/editorial.mjs`: publicaciones revisadas; borradores excluidos.
- `content/cases.mjs`: seis casos destacados, compartidos entre home, portfolio y páginas `/proyectos/:slug` mediante `scripts/case-views.mjs`. La home muestra una grilla con mockups permanentes y un breve resumen de cada trabajo. `/proyectos` reúne los casos y el resto del catálogo de `content/projects.html` en una grilla continua, con entradas ascendentes GSAP y un total calculado desde el contenido. Sin JavaScript o con movimiento reducido se muestran todos los proyectos.
- `site.config.mjs`: dominio, identidad, contactos, medición y clave pública IndexNow.
- `reac-home.css`, `reac-pages.css`, `reac-site.css`: estilos de base. `premium/` añade el sistema visual de la home y `premium/pages.css` lo extiende a las páginas generadas.
- `premium/showcase.css` y `premium/process.js`: módulo visual de cuatro servicios en `#proceso`, con escenas GSAP, pausa manual y movimiento reducido. Se preserva el diseño actual; `premium/rhythm.css` pospone el render fuera de pantalla y lo restablece para impresión.
- `premium/navigation.css` y `reac-ui.js`: cabecera flotante con logo, menú de seis destinos con iconos y CTA. GSAP anima la apertura y el cierre; el desplegable nativo funciona sin JavaScript. View Transitions conecta las páginas compatibles y respeta movimiento reducido. `reac-ui.js` bloquea el primer render para preparar el menú antes de la captura de transición.
- `reac-ui.js`: interacciones; `reac-site.js`: consentimiento, medición y contacto.
- `scripts/build.mjs`: genera `dist/`, metadata, schema, sitemap y robots con una lista de archivos permitidos. Agrupa el CSS publicado por página con nombre basado en su contenido, conservando el orden original; los archivos fuente permanecen separados. Conserva la preparación de la navegación antes de la captura de View Transitions.
- `api/contact.ts`: responde 410 al formulario retirado; `lib/contact.ts` conserva la entrega anterior como referencia inactiva.
- `premium/intro.css` y `premium/intro.js`: introducción breve con el símbolo real, una vez por sesión y sin bloquear interacción; se omite con movimiento reducido. `premium/loader.js` añade el dibujo del símbolo con GSAP y solicita el campo OGL de `loader-field.js` mediante importación dinámica. Si el módulo llega tarde o falla, la introducción CSS termina por sí sola. `premium/arrival.js` anima encabezados internos e imágenes diferidas.
- `premium/contact.css`: contacto directo compartido entre la home y `/contacto`.
- `vercel.json`: build, rutas y encabezados.

`support.js` y el script Python antiguo son históricos y no intervienen en la publicación. No ejecutar Python para construir esta versión. Los cuatro recursos HTML/PDF conservan sus URLs; los PDF no se regeneraron.

## Configuración

Copiar `.env.example` a `.env.local` para desarrollo y configurar las variables también en Vercel. Nunca incluir secretos en HTML o Git.

El contacto público funciona con enlaces nativos a WhatsApp y email; no requiere credenciales ni procesa mensajes en el servidor. `/api/contact` devuelve 410 y no llama a proveedores. `lib/contact.ts` y sus pruebas conservan la implementación anterior como referencia inactiva. Newsletter permanece deshabilitado.

`SITE_URL` es un origen HTTPS sin ruta. Se usa en canonical, schema, sitemap, robots y validación de origen del backend. `PUBLIC_CONTACT_EMAIL` sustituye el contacto público sólo cuando existe un buzón real y verificado; si está vacío se conserva el correo actual. `npm run build` no carga `.env.local`: para cambiar valores localmente, definirlos en PowerShell y quitarlos al finalizar. Vercel usa sus variables de entorno.

Los tokens Google/Bing y la clave de propiedad IndexNow son públicos. Los datos legales y perfiles pendientes deben completarse con información real.

## Validación

Las capturas de Travel Days y Comunidad Cristiana se obtuvieron de sus sitios públicos el 4 de noviembre de 2026 (hora de Argentina/Uruguay), ambos con HTTP 200. Los originales y el registro de captura quedan en `artifacts/`; sólo se publican las versiones WebP de 1440 y 640 px. El caso de WordPress usa una representación editorial, sin identidad del cliente ni archivos del incidente. Los alcances de los casos provienen del responsable del proyecto; no se atribuyen métricas de negocio.

Los mockups actuales de seguridad, REAC LEADS, Travel Days y Comunidad Cristiana fueron suministrados por el responsable del proyecto. Se exportan a WebP de 1440 y 640 px con el prefijo `mockup-`. Son presentaciones visuales; los indicadores del mockup de seguridad y los datos de ejemplo del CRM no se usan como resultados del trabajo. REAC LEADS se presenta como una aplicación local de uso interno, con repositorio privado y alcance confirmado por su responsable.

```powershell
npm run build
npm run lint
npm run typecheck
npm test
npm run test:browser
node tests/performance.mjs
node tests/build-config.mjs
node tests/seo-http.mjs
node scripts/security-scan.mjs
npm audit
git diff --check
```

Navegador y performance requieren servidor en 4174 y Chrome instalado. Playwright viene con la herramienta de accesibilidad. `lint` es comprobación sintáctica y estructural propia, no ESLint. TypeScript comprueba backend y pruebas TS. Las pruebas de entrega y analytics usan proveedores simulados, sin mensajes reales.

`tests/motion-startup.browser.mjs` comprueba que la rotación y las ocho entradas de títulos se ejecuten realmente, además del centrado sin JavaScript. Para comprobar ambos motores, definir `TEST_BROWSERS=chromium,firefox` y disponer del Firefox de Playwright (`node node_modules/playwright-core/cli.js install firefox`); `FIREFOX_EXECUTABLE` permite indicar un ejecutable de prueba alternativo. La suite general lo ejecuta en Chrome por defecto.

Ejecutar `tests/build-config.mjs` antes de las pruebas de navegador: reconstruye y reemplaza `dist/` varias veces. No ejecutar builds en paralelo ni mientras el navegador está leyendo ese directorio.

El build minifica el CSS con esbuild y publica scripts minificados bajo `/js/` con nombres basados en su contenido. Vercel configura un año de caché `immutable` para `/styles/` y `/js/`; al cambiar el contenido cambia la URL, por lo que no se reutiliza una versión anterior. Se conservan el orden del CSS y el atributo `blocking="render"` del script de navegación. El código fuente sigue separado y editable.

Validación de optimización local del 11 de noviembre de 2026: CSS de la home de aproximadamente 213 KB a 177 KB (36 KB al comprimir con gzip localmente; no es una medición de transferencia de Vercel). Una muestra de Chrome con caché fría, CPU 4x y red de 1,6 Mbps/150 ms dio LCP de 4,08 s en la home, 3,04 s en `/desarrollo-web` y 2,52 s en `/google-ads`; CLS de 0,036 en la home y 0 en esas páginas internas. Son muestras de laboratorio locales, con margen de mejora en carga inicial; no certifican Core Web Vitals de producción. Consultar `artifacts/performance-report.json` y repetir la medición sobre el dominio después de un despliegue autorizado.

## Publicación

Vercel instala con `npm ci --ignore-scripts`, construye con `npm run build`, publica `dist/` y despliega el endpoint retirado `api/contact.ts` (410). Después de una publicación autorizada, verificar READY, HTTP, rutas, CSP y enlaces de WhatsApp/email sin enviar mensajes automáticamente. Los datos legales que aún faltan se registran en `docs/PENDIENTES.md`.

```powershell
npm run indexnow -- /desarrollo-web /google-ads
```

Ese comando solo muestra el payload. Después de publicar el archivo de propiedad, agregar `--submit` para enviarlo. No se envía automáticamente durante el build.

Solo acepta rutas canónicas indexables del build, sin parámetros ni fragmentos. Para una página pública eliminada usar `npm run indexnow -- --deleted=/ruta-eliminada`; al enviar comprueba que responda 404/410. Las URLs activas deben responder 200. La aceptación de IndexNow no confirma indexación.

## SEO e identidad de marca

La configuración central define `Reac Studio` y sus variantes `ReacStudio`, `REAC Studio` y `reacstudio.com`. El build conecta Organization, WebSite, WebPage y Service mediante IDs estables; genera metadata, sitemap, robots y el directorio experimental `llms.txt`. No hay Next.js, base de datos ni autenticación de usuarios en este sitio.

Consultar [auditoría](docs/seo/SEO-AUDIT.md), [implementación y validación](docs/seo/SEO-IMPLEMENTATION.md), [acciones externas](docs/seo/SEARCH-CONSOLE-CHECKLIST.md) y [roadmap editorial](docs/seo/CONTENT-ROADMAP.md). La validación HTTP requiere el servidor local activo. Los cambios de dominio/certificado y la indexación se verifican aparte de las pruebas del repositorio.

Ver [informe y checklist](docs/production-readiness.md) e [investigación inicial](docs/seo-research.md). El informe del 7 de septiembre es histórico: su formulario y proveedores fueron reemplazados por contacto directo. Para la versión actual consultar [pendientes](docs/PENDIENTES.md) y verificar el despliegue y el dominio de forma independiente al push.

Despliegue manual al proyecto existente: `npx --yes vercel@59.11.2 deploy --prod --yes --scope misaellovespias-projects`. El push a la rama de trabajo no debe considerarse una publicación automática confirmada.
