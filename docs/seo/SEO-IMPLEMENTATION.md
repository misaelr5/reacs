# Implementación SEO e identidad de Reac Studio

Fecha: 20 de septiembre de 2026. Estado: cambios locales; no se realizó commit, push, deploy ni envío a IndexNow como parte de esta implementación. La validación pública inicial corresponde al 19/09; el sitio publicado aún debe recibir y verificar estos cambios.

## Objetivo y decisión de arquitectura

Que una persona o crawler identifique a Reac Studio, sus variantes, servicios, web oficial y relaciones entre páginas a partir del HTML. Se conserva el generador estático existente: Node.js 24, parse5, fuentes de contenido y Vercel. No hay necesidad de Next.js ni de incorporar un framework sólo para metadata.

Decisión **REUSE/ADAPT**: generador, contrato de servicios, parser, plantillas, contacto y pruebas existentes. **INTEGRATE**: schemas estándar, directivas de crawlers y protocolo IndexNow ya presente. **BUILD**: una ficha de servicio con intención propia y pruebas de regresión del grafo/HTTP. No se añadió ninguna dependencia. parse5 8.0.1 ya estaba instalado, tiene licencia MIT y permite trabajar sobre un árbol HTML conforme al estándar; [documentación del proyecto](https://parse5.js.org/). npm audit no reportó vulnerabilidades conocidas en el conjunto instalado durante esta revisión.

## Cambios por archivo e impacto esperado

| Archivo | Cambio | Razón e impacto esperado |
| --- | --- | --- |
| `site.config.mjs` | `title`, descripción, `alternateNames`; retirada URL Facebook inválida. | Una fuente de identidad coherente, sin perfiles deducidos. |
| `scripts/build.mjs` | Organization simple; aliases WebSite/Organization; IDs de WebPage/Service/breadcrumb/FAQ conectados; AboutPage y ContactPage; metadata pública; font preconnect; navegación/anchors; breadcrumbs visibles; llms generado. | Facilitar interpretación y mantenimiento, reducir contradicciones y completar relaciones entre páginas. |
| `Reac.dc.html` | Logo alt, primera explicación comercial explícita, identidad/alias visible, enlace landing, footer hacia destinos específicos; metadata regenerada. | Explicar qué hace Reac y para quién conservando diseño, H1, CTA y animaciones. |
| `index.html` | Sincronización exacta desde la home procesada. | Evitar diferencias entre fuente y copia servida. |
| `content/services.mjs` | Séptimo servicio `/landing-pages`, metadata específica, evidenceLabel y relaciones entre servicios. | Cubrir una oferta real con contenido propio, sin páginas por ciudad ni resultados inventados. |
| `vercel.json` | `trailingSlash:false`, redirección www, redirects de cuatro recursos duplicados y ruta landing. | Consolidar variantes; regla www requiere certificado válido antes del HTTP. |
| `scripts/serve.mjs` | Normalización 308 de barra final en preview. | Probar localmente la intención de rutas de producción. |
| `scripts/indexnow.mjs` | Lista indexable del manifiesto, rechazo de parámetros/privadas/noindex, eliminación explícita y comprobación HTTP previa. | Notificar sólo cambios públicos elegidos; dry-run sigue siendo predeterminado. |
| `robots.txt` | Generado: acceso público con exclusiones API/admin/dashboard/internal/preview/staging en ambos grupos de búsqueda. | Evitar reglas diferentes entre crawler general y OAI-SearchBot; no sustituye seguridad. |
| `sitemap.xml` | Generado: 17 canonicals indexables, sin lastmod inventado. | Añadir landing y conservar URLs existentes válidas. |
| `llms.txt` | Generado desde hechos/rutas centrales, aliases y perfiles; marcado experimental. | Evitar desactualización del directorio existente, sin atribuirle ranking. |
| `tests/site.test.mjs` | Recuento derivado del contenido y prueba de los siete servicios. | Evitar mantener conteos antiguos. |
| `tests/build-config.mjs` | Conteo real y verificación del origen restaurado también en llms. | Comprobar configuración e idempotencia del build. |
| `tests/performance.mjs` | Comprobar todas las navegaciones web ocultas en impresión. | El recurso ahora tiene breadcrumbs y navegación final; conservar impresión A4. |
| `tests/seo.test.mjs` (nuevo) | Metadata única, grafo, marca visible, BFS desde home, imágenes/srcset, robots e IndexNow. | Detectar regresiones que las verificaciones previas no cubrían. |
| `tests/seo-http.mjs` (nuevo) | Crawl HTTP de páginas, redirects, consultas, bots, privados y 404. | Contrastar HTML generado con comportamiento servido. |
| `README.md` | Arquitectura actual, comandos y documentación SEO. | Facilitar futuras ediciones y validaciones. |
| `docs/seo/SEO-AUDIT.md` (nuevo) | Hallazgos con severidad, evidencia, solución y estado. | Separar problemas reales de hipótesis y trabajo externo. |
| `docs/seo/SEO-IMPLEMENTATION.md` (nuevo) | Este registro de decisiones y validaciones. | Trazabilidad. |
| `docs/seo/SEARCH-CONSOLE-CHECKLIST.md` (nuevo) | Acciones externas concretas, dominios, Google/Bing, perfiles y confianza. | Completar activación con acceso del titular. |
| `docs/seo/CONTENT-ROADMAP.md` (nuevo) | Ocho temas priorizados con intención, persona, funnel, destino y evidencia faltante. | Crecer a partir de decisiones comerciales, sin fabricar demanda. |

Los archivos `dist/` y `artifacts/` se generan y están ignorados por Git. La ruta `/landing-pages` se genera desde contenido, no necesita una página HTML fuente duplicada. Los cuatro PDF se preservaron: no se afirmó una actualización editorial de su contenido.

## Identidad, indexabilidad y búsqueda con IA

Marca principal `Reac Studio`; aliases `ReacStudio`, `REAC Studio`, `reacstudio.com`. Dominio `https://reacstudio.com/`. IDs centrales `/#organization` y `/#website`; cada página tiene su `#webpage`, y cada servicio su `#service`. Las personas existentes están vinculadas a la organización; no se añadieron identidades.

Todas las páginas tienen metadata propia, canonical limpio, un H1 y HTML inicial completo. WebSite y Organization identifican la misma entidad en todas ellas. Instagram y TikTok usan URLs del proyecto; se retiró Facebook tras detectar el destino incorrecto. La home y Nosotros explican el alias en texto visible.

OAI-SearchBot continúa permitido para contenido público. `allowTraining:true` conserva la decisión previa; no se abrió GPTBot como supuesto requisito de búsqueda. No se publican fuentes, variables, claves privadas ni interfaces internas. Robots no es un control de acceso: la lista de archivos publicada y el backend mantienen la protección real.

Las FAQs permanecen visibles como disclosures nativos y su JSON-LD coincide con las respuestas. No se prometen FAQ rich results. llms se mantiene como directorio experimental, no como factor probado ni como sustituto de SEO. No se produjeron fragmentos artificiales, páginas por ciudad o testimonios.

## Arquitectura e intención de servicios

| Ruta | Intención principal | Intención secundaria / siguiente paso |
| --- | --- | --- |
| `/desarrollo-web` | Evaluar una web institucional o autogestionable | Contenido, mantenimiento, integraciones; ficha Más Servicios y contacto. |
| `/landing-pages` | Presentar una oferta/campaña concreta | Diferencia frente a web institucional, destino y medición; ejemplo académico y contacto. |
| `/marketing-digital` | Ordenar estrategia y canales | Priorización, consultas y seguimiento; equipo, Google Ads y Meta Ads. |
| `/google-ads` | Gestión de publicidad de búsqueda | Oferta-anuncio-landing-medición; checklist y propuesta. |
| `/meta-ads` | Publicidad en Instagram/Facebook | Materiales, destino, calidad del contacto; checklist y propuesta. |
| `/automatizacion-ia` | Evaluar automatización de tareas | Reglas frente a IA, revisión humana, errores y costos externos; proyectos y CRM. |
| `/sistemas-crm` | Organizar seguimiento y operaciones | Reutilizar/integrar/desarrollar, permisos y mantenimiento; ejemplos identificados. |

Home enlaza directamente los siete servicios. `/servicios` funciona como hub; fichas enlazan servicios relacionados y pruebas disponibles. `/proyectos` enlaza cada ejemplo al servicio pertinente, sin crear nuevas afirmaciones sobre resultados. Recursos enlazan al servicio correspondiente y al contacto. Todas las URLs indexables son alcanzables en tres clics o menos mediante `<a href>`; los servicios están a un clic.

## Validación ejecutada

| Comando / comprobación | Resultado |
| --- | --- |
| `npm run build` | OK: 20 HTML, 17 indexables; home fuente/copia sincronizadas. |
| `npm run lint` | OK: sintaxis y auditoría HTML/schema/enlaces/sitemap/seguridad de 20 páginas. |
| `npm run typecheck` | OK. |
| `npm test` | OK: 25 pruebas, incluidas 5 nuevas SEO; proveedores de contacto simulados. |
| `npm run test:browser` | OK: Chrome, 140 tamaños/página, 20 páginas con axe, cero grupos de violaciones y cero errores; nueve grupos de interacción. Analytics/consentimiento OK con transporte simulado. |
| `node tests/seo-http.mjs` | OK: 45 comprobaciones HTTP; 17 páginas indexables, aliases 308, 404 reales, parámetros/canonical, robots/sitemap y User-Agents de búsqueda. |
| `node tests/build-config.mjs` | OK: origen alternativo propagado y restaurado, build repetido idéntico. |
| `node tests/performance.mjs` | OK: tres muestras móviles de laboratorio e impresión A4; las dos navegaciones web se ocultan al imprimir. |
| Chrome sin JavaScript | OK: las 17 páginas indexables tienen H1 visible y contenido principal legible. Informe `artifacts/seo-nojs-report.json`. |
| `node scripts/security-scan.mjs` | Sin coincidencias de patrones conocidos en archivos actuales, históricos y salida pública. No es prueba de ausencia de cualquier secreto posible. |
| `npm audit --json` | Cero vulnerabilidades conocidas reportadas. |
| `git diff --check` | OK; avisos de normalización CRLF de Git sin errores de whitespace. |
| Imágenes de landing en Chrome | Capturas móvil y desktop generadas; móvil inspeccionada, diseño y flujo coherentes. No es prueba en hardware iPhone/Safari. |

JSON-LD validado mediante parseo y aserciones semánticas del grafo, unicidad, IDs, provider/publisher, breadcrumbs y FAQ visible. No se ejecutó Rich Results Test ni Schema.org Validator sobre una publicación nueva; quedan indicados en checklist externa. Esa limitación no se presenta como una validación oficial.

## Performance

Se añadieron preconexiones a los hosts reales de archivos de fuentes, conservando `display=swap`, formatos WebP, dimensiones, lazy loading fuera del primer bloque y prioridad de imagen del parallax. No se agregaron scripts ni dependencias al navegador. JavaScript propio de home: 18.734 bytes sin comprimir en la muestra inicial.

La muestra previa (`artifacts/performance-before-seo.json`) midió LCP 2.928 ms y CLS 0,00315 en home, LCP 980 ms en desarrollo web y 1.132 ms en Google Ads. Método: Chrome local, 390×844, caché fría, CPU ×4, 1,6 Mbps/150 ms; una observación por página. No son Core Web Vitals de campo ni p75 INP.

La muestra posterior (`artifacts/performance-report.json`) registró LCP de 2.352 ms en home, 1.220 ms en desarrollo web y 1.064 ms en Google Ads; CLS 0,00315 / 0 / 0. Interacción máxima observada 144 / 40 / 48 ms, respectivamente, no INP p75. Home mejoró en esa muestra, desarrollo web no; no se atribuye causalidad a partir de dos observaciones. JavaScript propio se mantuvo en 18.734 bytes. Impresión A4 y ocultación de ambas navegaciones web: OK. Hubo un fallo inicial del selector de impresión porque ahora existen dos navegaciones; se corrigió la prueba para comprobar ambas y pasó la repetición.

Las variaciones entre muestras no prueban causalidad ni mejora garantizada. Queda medir con PageSpeed/CrUX y Search Console después de publicar, especialmente la home visual y las fuentes externas.

## Cierre y límites

Un crawler del build nuevo puede determinar nombre principal, variantes, dominio, servicios y relaciones sin ejecutar JavaScript; lo comprueban el grafo y el crawl. No se afirma que Google ya haya elegido ese nombre o indexado los cambios. Falta publicar y verificar la versión live, corregir TLS de www, completar verificaciones de cuentas y datos legales, y probar recepción real del contacto.

Conceptos transferibles: HTML generado es suficiente para SEO sin migrar de framework; los IDs de schema conectan entidades en vez de duplicar empresas; rastreable, indexable e indexado son estados distintos.
