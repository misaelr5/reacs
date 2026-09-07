# Reac Studio — informe de implementación

7 de septiembre de 2026. Alcance: repositorio, pruebas locales y verificación HTTP del despliegue público.

## 1. Resumen ejecutivo

Se implementó HTML completo antes de ejecutar JavaScript, conservando diseño, parallax, símbolo oficial, proyectos y navegación. Se agregaron seis landings y páginas institucionales, configuración central de dominio, contacto protegido y medición con consentimiento.

La versión pasó las validaciones descritas abajo y se publicó en producción con el código de `9cb40c8`. Vercel confirmó READY en `dpl_BEMKcRocSXy1zN6Ax4XLLvCUZR1B` y asignó https://reacs-studio.vercel.app. Se verificaron home y servicios HTTP 200, cero plantillas pendientes, canonical correcto, sitemap, CSP, redirección 308 y 404. Se corrigió una importación TypeScript que fallaba al empaquetar la función mediante `rewriteRelativeImportExtensions`; tipos y 18 tests volvieron a pasar. API responde 405 ante GET y 503 controlado mientras faltan proveedores. Faltan credenciales reales, datos legales y cuentas de medición para operar la captación. No se enviaron correos reales. Los cambios concurrentes de símbolo y navegación se conservaron.

## 2. P0 corregidos y arquitectura

| Causa inicial | Corrección |
| --- | --- |
| 122 expresiones de plantilla en la respuesta HTML pública | Contenido real de título, proceso, proyectos, FAQ y equipo; build rechaza expresiones pendientes |
| Metadata apuntaba a un dominio sin confirmar | Origen central https://reacs-studio.vercel.app y prueba de sustitución en todas las páginas |
| Publicación del directorio raíz | `dist/` contiene solo archivos permitidos; fuentes, secretos y runtime antiguo excluidos |
| Formulario sin proveedor conectado | Endpoint implementado, con error seguro hasta configurarse; éxito solo tras aceptación del proveedor |
| Contenido dependiente del compilador del navegador | HTML estático e interacciones progresivas; FAQ nativa y contenido disponible sin JS |

Decisión: ADAPTAR el sitio y REUTILIZAR su presentación. Se evaluó introducir un generador completo; se eligió un build pequeño con parse5 para analizar HTML estructuralmente, sin framework en el navegador ni base de datos del producto. INTEGRAR Resend y Upstash evita construir correo y un contador que falle entre instancias serverless. Las integraciones están implementadas, aún sin cuentas reales.

`Reac.dc.html` es fuente; el build sincroniza `index.html`. Contenido de servicios y fragmentos compartidos generan el resto.

## 3. Seguridad

Se retiró de la publicación el runtime que compilaba expresiones con `new Function`. CSP no permite eval ni scripts inline. Los estilos inline existentes se permiten explícitamente; los bloques CSS se extraen a archivos. Se configuraron HSTS, nosniff, bloqueo de framing, política de referencia, restricciones de permisos y API sin caché.

Contacto: POST, origen exacto, cuerpo máximo de 12 KB, campos permitidos, consentimiento, rechazo de duplicados, honeypot y filtro básico de enlaces. Límite compartido de cinco solicitudes por diez minutos mediante Redis atómico. Clave temporal de IP con HMAC; sin mensajes en logs. En producción se confía únicamente en el encabezado de IP documentado de Vercel. Remitente/destinatario se fijan en servidor; mensaje en texto plano y timeouts.

La idempotencia reduce duplicados dentro de una ventana de diez minutos; no garantiza exactamente una entrega entre ventanas. Fallos de Redis o configuración cierran el envío con error seguro. Aceptación de Resend no prueba recepción en bandeja de entrada.

Pendiente: activar proveedores, verificar remitente, probar abuso y entrega desplegados, completar privacidad, retención y acuerdos. El escaneo de patrones y dependencias no equivale a un pentest exhaustivo.

Fuentes: [Vercel Node](https://vercel.com/docs/functions/runtimes/node-js), [IP de Vercel](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for), [Upstash REST](https://upstash.com/docs/redis/features/restapi), [Resend](https://resend.com/docs/api-reference/emails/send-email).

## 4. SEO

19 documentos HTML, 16 indexables:

- `/`, `/servicios`, `/desarrollo-web`, `/marketing-digital`, `/google-ads`, `/meta-ads`, `/automatizacion-ia`, `/sistemas-crm`.
- `/proyectos`, `/nosotros`, `/contacto`, `/recursos`.
- Los cuatro recursos HTML existentes, conservando sus rutas y PDF.

Gracias, privacidad y 404 llevan noindex. Se genera título, descripción, canonical, OG, Twitter, lenguaje, sitemap y robots coherentes. Hay enlaces internos a servicios y recursos HTML, redirecciones de variantes `.html` nuevas y 404 real verificado localmente.

Schema: Organization, WebSite, WebPage, BreadcrumbList, Service, Person para integrantes existentes y FAQ basada en contenido visible. Sin reseñas, puntuaciones, direcciones o perfiles inventados. El contrato editorial permite Article para publicaciones revisadas con fechas reales; no se agregaron artículos nuevos.

La indexación efectiva requiere inspección en Search Console; el build solo verifica preparación técnica. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## 5. GEO/AEO

Se explicita entidad, integrantes, servicios y trabajo remoto en Argentina y LATAM. Cada servicio describe alcance, entregables, criterios de elección, proceso y preguntas comerciales, con referencias a proyectos existentes. No se inventaron resultados ni experiencia.

Robots permite búsqueda general y OAI-SearchBot, excluyendo API. Entrenamiento y búsqueda se configuran de forma independiente. No se agregó contenido distinto por crawler ni archivos de supuesta optimización mágica. No se garantizan citas o rankings. [Google: funciones de IA](https://developers.google.com/search/docs/appearance/ai-features).

## 6. Performance y accesibilidad

Se eliminó React/ReactDOM/GSAP de la entrega, la espera artificial del preloader y dependencias remotas de capas del hero. Una captura pasó de 2.213.250 bytes a WebP de 111.740 bytes, con variante 640 px de 26.068 bytes; originales conservados. JavaScript propio de home: 17.378 bytes sin compresión.

Una muestra fría por página en Chrome local, 390×844, CPU 4×, red simulada 1,6 Mbps y 150 ms:

| Página | LCP | CLS | Máxima interacción observada |
| --- | ---: | ---: | ---: |
| Home | 1.856 ms | 0,00315 | 152 ms |
| Desarrollo web | 988 ms | 0 | 40 ms |
| Google Ads | 1.164 ms | 0,0000074 | 40 ms |

No son métricas de campo, p75 INP ni comparación de rendimiento antes/después. TTFB local no representa Vercel. El antivirus del equipo inyectó recursos, limitando la pureza del laboratorio.

76 combinaciones responsive: 19 páginas en 320, 390, 768 y 1440 px, sin overflow. Axe no detectó violaciones bajo las reglas ejecutadas en las 19 páginas. Se verificaron menú, teclado, foco, carrusel, FAQ, contraste, movimiento reducido e impresión A4 de recursos. Axe registró advertencias de fetch de CSS externo bloqueado por CSP; se distinguen de errores de la aplicación. No es certificación WCAG ni prueba Safari/dispositivos físicos. PDF originales sin regenerar.

## 7. Analytics

GA4 solo carga en el origen de producción y con consentimiento. Eventos: `whatsapp_click`, `email_click`, `contact_form_start`, `contact_form_submit`, `diagnostic_cta_click`, `service_cta_click`. No se envía contenido del formulario; se eliminan queries de URLs analíticas. Revocar consentimiento deshabilita medición y elimina cookies conocidas.

La conversión de formulario requiere éxito del backend. Visitar o recargar gracias no genera conversiones. Tests de consentimiento, errores y éxito usan dobles de prueba, sin telemetría real. Newsletter permanece deshabilitado.

## 8. Google Ads

Landings específicas con propuesta, alcance y CTA; evento de consulta confirmada preparado para configurar como evento clave e importar. Un clic WhatsApp/email no es lead recibido ni venta.

No se activaron campañas, gasto ni etiquetas publicitarias. Consentimiento publicitario permanece denegado. Antes de invertir, verificar atribución real y consentimiento: al limpiar queries analíticas, no debe asumirse atribución de UTMs/GCLID sin prueba/configuración adicional. Evitar duplicar conversiones con medición automática de formularios o página de gracias.

## 9. Archivos y reutilización

| Grupo | Archivos principales |
| --- | --- |
| Presentación | `Reac.dc.html`, `index.html`, `reac-home.css`, `reac-site.css`, `reac-pages.css`, `reac-ui.js`, `reac-site.js`, `politica-de-privacidad.html` |
| Contenido/configuración | `site.config.mjs`, `content/services.mjs`, `content/editorial.mjs`, `.env.example`, `vercel.json`, `robots.txt`, `sitemap.xml` |
| Construcción/operación | `scripts/build.mjs`, `html.mjs`, `audit-html.mjs`, `check.mjs`, `serve.mjs`, `indexnow.mjs`, `security-scan.mjs` dentro de scripts |
| API | `api/contact.ts`, `lib/contact.ts` |
| Tooling | `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, pruebas dentro de `tests/` |
| Assets/documentación | WebP de hero y portfolio dentro de `uploads/`, `README.md`, este informe y `docs/seo-research.md` |

Dependencias de desarrollo: parse5 (MIT), TypeScript, tipos Node y axe/Playwright. El producto usa JS nativo. Resend y Upstash se integran por API sin SDK adicional; fuentes externas existentes conservadas. Investigación inicial y alternativas en [seo-research.md](seo-research.md).

## 10. Comandos y resultados

| Comando | Resultado |
| --- | --- |
| `npm run build` | 19 HTML, 16 indexables |
| `npm run lint` | Sintaxis y estructura aprobadas; no es ESLint |
| `npm run typecheck` | Backend y pruebas TS estrictas aprobados |
| `npm test` | Pruebas de contacto y sitio aprobadas con proveedores simulados |
| `npm run test:browser` | Responsive, 19 páginas axe, interacciones y analytics aprobados |
| `node tests/performance.mjs` | Tres muestras e impresión A4 verificadas |
| `node tests/build-config.mjs` | Origen alternativo propagado a 19 páginas; build repetible y origen restaurado |
| `node scripts/security-scan.mjs` | Sin coincidencias de patrones revisados en fuente, historial y salida |
| `npm audit` | Cero vulnerabilidades reportadas en dependencias instaladas |
| `npm run indexnow -- /desarrollo-web /google-ads` | Dry run válido; sin envío externo |
| `git diff --check` | Sin errores de espacios |

Reportes locales en `artifacts/`: browser, analytics, performance, build-config, security-scan, dependency-audit y capturas. Están ignorados por Git y excluidos de publicación.

PROBADO: comportamiento local descrito, despliegue READY y comprobaciones HTTP de producción indicadas arriba. NO PROBADO: entrega real, indexación, cuentas, Ads y métricas de campo. SUPUESTO: conservar alias actual hasta contar con dominio propio listo.

## 11. Checklist manual para Misael

1. **Contacto/legal:** configurar variables de `.env.example`, remitente verificado Resend, Upstash y secreto privado aleatorio de al menos 32 caracteres. Completar responsable, contacto legal, jurisdicción y retención reales antes de captar datos.
2. **Publicación:** desplegar por flujo habitual; comprobar READY, contenido nuevo por HTTP, 404, redirects, CSP y API. Hacer una consulta controlada, verificar recepción y manejo de fallos.
3. **Search Console:** verificar propiedad correcta, token si corresponde, sitemap e inspección de home/landing; revisar canonical elegida e indexación.
4. **Business Profile:** confirmar elegibilidad; no inventar dirección para negocio exclusivamente online. [Requisitos oficiales](https://support.google.com/business/answer/13763036?hl=en).
5. **Bing:** verificar propiedad, enviar sitemap y revisar URLs/rastreo. Acceso permitido no implica indexación.
6. **GA4:** confirmar propiedad `G-8VJDB377CE`, consentimiento y DebugView; revisar eventos automáticos duplicados. Formulario confirmado como evento clave, clics separados.
7. **Google Ads:** vincular cuentas e importar una conversión principal; probar atribución antes de gastar. Configurar etiquetas/CSP publicitarias cuando exista alcance y consentimiento adecuado.
8. **IndexNow:** publicar y verificar archivo de propiedad, revisar dry run y usar `--submit` solo para URLs cambiadas. Aceptación no garantiza indexación.
9. **Social:** confirmar URLs oficiales y completar `socialProfiles`; reconstruir schema.
10. **Dominio propio:** verificar propiedad, DNS/TLS, cambiar `SITE_URL` en build y función, reconstruir y configurar redirecciones permanentes del host anterior. Revisar sitemap, GSC, analítica y origen del formulario.
11. **Operación:** revisar cuotas/costos y errores de proveedores; documentar responsables y recuperación. Integrar newsletter antes de habilitarlo.

## 12. Plan de 90 días

| Período | Trabajo prioritario | Evidencia |
| --- | --- | --- |
| 1–15 | Credenciales/legal, publicación, entrega, medición y rastreo | Consulta recibida, evento confirmado e inspección de URLs |
| 16–30 | Revisar intención y consultas de las landings; perfiles oficiales | Impresiones por página, errores resueltos y leads cualificados |
| 31–60 | Casos reales autorizados y recursos basados en preguntas de prospectos | Evidencia, revisión editorial, enlaces internos y conversiones |
| 61–90 | Ajustar según demanda/calidad; Ads con atribución verificada | Costo por consulta cualificada y tasa de cierre observada |

Evitar páginas por ciudad y artículos masivos sin demanda/evidencia. Priorizar dudas comerciales y decisiones respaldadas por trabajo real. Medir calidad de consultas junto con visibilidad. Plan ampliado y fuentes en investigación SEO/GEO.

## Qué conviene aprender

1. Mejora progresiva: contenido HTML primero; JS enriquece la experiencia y no condiciona su existencia.
2. Frontera de confianza: límites, credenciales y destinatarios pertenecen al servidor; el rate limit debe compartirse entre instancias.
3. Medición: clic, aceptación del proveedor, recepción y venta son etapas distintas; separarlas evita conversiones falsas.
