# Auditoría SEO de Reac Studio

Inspección pública: 19 de septiembre de 2026, 07:13–07:20 UTC. Implementación y validación local: 20 de septiembre de 2026. Base Git: `ba616a7`, rama `main`, árbol inicialmente limpio. Este documento distingue evidencia del sitio publicado y cambios locales; no certifica una publicación posterior.

## Arquitectura y alcance

- Sitio estático en Node.js 24.15.0/npm 11.12.1. No usa Next.js, App Router, Pages Router, React hydration ni Metadata API. Migrarlo no aporta una solución necesaria al problema observado.
- `Reac.dc.html` es la home editable; `scripts/build.mjs` la procesa con parse5 y sincroniza `index.html`. `dist/` contiene el HTML completo publicado por Vercel.
- `content/services.mjs` tenía seis servicios; `content/editorial.mjs` está vacío y excluye borradores. Ya existían servicios, nosotros, proyectos, contacto y cuatro recursos HTML/PDF.
- `site.config.mjs` centraliza origen, datos empresariales, contacto, perfiles, medición y verificación. `vercel.json` controla redirecciones, rewrites y encabezados. Sin base de datos ni autenticación de usuarios; `/api/contact` es el único backend.
- Formulario con validación, comprobación de origen, límites de tamaño, rate limiting y proveedores del lado servidor. Variables secretas excluidas de `dist/`. No se enviaron consultas reales ni se modificaron cuentas externas.
- CSS y JavaScript propios, imágenes WebP con dimensiones y `srcset`, fuentes externas con `display=swap`, favicons PNG/ICO y Open Graph existentes. No se añadió manifest de aplicación: no hay una funcionalidad PWA que lo justifique.
- Archivos históricos `support.js` y `scripts/fix-parallax.py` no forman parte del build publicado. No se ejecutaron ni se incorporaron al despliegue.

## Hallazgos y resolución

| ID / prioridad | Problema / severidad | Evidencia inicial | Solución | Estado |
| --- | --- | --- | --- | --- |
| E01 / P0 | Aliases de marca ausentes / HIGH | WebSite y Organization del HTML público tenían `name: Reac Studio`, sin `alternateName`. | Configurar variantes y reutilizarlas en ambos nodos; identidad visible en home/nosotros. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E02 / P0 | HTTPS de www inválido / HIGH | Node: `ERR_TLS_CERT_ALTNAME_INVALID`; certificado observado sólo cubría `reacstudio.com`. Curl: `SEC_E_WRONG_PRINCIPAL`. HTTP www redirigía al HTTPS defectuoso. | Regla permanente www → dominio principal preparada. Conectar/verificar dominio y certificado en Vercel. | CÓDIGO LISTO; CERTIFICADO EXTERNO PENDIENTE |
| E03 / P0 | Tipo local no sustentado / MEDIUM | `Organization` también tenía `ProfessionalService`, subtipo de LocalBusiness, sin datos de negocio local suficientes. | Organization único y Service por servicio, IDs estables. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E04 / P0 | Enlace Facebook no identifica a Reac / MEDIUM | `facebook.com/profile.php?id=reacstudio` termina en `facebook.com/` y título Facebook. | Retirar enlace de HTML, sameAs y llms; no inferir una URL alternativa. | IMPLEMENTADO; URL OFICIAL PENDIENTE |
| E05 / P1 | Variantes con barra final devuelven 404 / MEDIUM | `/desarrollo-web/` y `/recursos/auditoria-sitio-web/` fallaban. | `trailingSlash:false`; preview local refleja normalización 308. | PROBADO LOCALMENTE; VERIFICAR VERCEL AL PUBLICAR |
| E06 / P1 | Recursos con URL duplicada / LOW | `/recursos/auditoria-sitio-web` servía 200 con canonical hacia `.html`. | Cuatro 308 a URLs HTML existentes; no migrar sus canonicals ni enlaces históricos. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E07 / P1 | Home no presentaba la empresa en su primera explicación comercial / MEDIUM | Hero hablaba de webs/campañas sin nombrar Reac ni público; identidad aparecía más abajo. | Introducción con marca, tres áreas y empresas/PyMEs/profesionales, manteniendo H1 y diseño. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E08 / P1 | Landing pages carecía de página de intención propia / MEDIUM | Oferta incluida en desarrollo web y campañas; ejemplo académico existente. | `/landing-pages`, alcance propio, proceso, FAQ, CTA, enlaces y evidencia identificada como académica. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E09 / P1 | Relaciones y anchors mejorables / MEDIUM | Footer de automatización apuntaba a `#servicios`; fichas usaban “Ver la información disponible”; proyectos no enlazaban a su servicio. | Destinos directos, anchors descriptivos, enlaces proyectos → servicios y recursos → servicios. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E10 / P1 | Breadcrumb schema sin navegación visible en algunos recursos / LOW | Generador agregaba BreadcrumbList a toda página no raíz, incluso documentos sin breadcrumbs. | Schema sólo con breadcrumb visible; añadirlo en cuatro recursos, oculto al imprimir junto con navegación web. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E11 / P1 | Jerarquía de equipo en Nosotros / LOW | H1 seguido por nombres H3 sin H2 de grupo. | Sección “Quiénes integran Reac Studio” H2; AboutPage y ContactPage conectadas. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E12 / P1 | Conexión tardía a hosts de archivos de fuentes / LOW | Sólo preconnect al host de CSS Fontshare; archivos descargados de otros hosts. | Preconnect con crossorigin a CDN Fontshare y Google Fonts cuando se utilizan. | IMPLEMENTADO; MÉTRICAS EN DOCUMENTO DE VALIDACIÓN |
| E13 / P2 | IndexNow admite entradas no canónicas / MEDIUM | Script aceptaba parámetros, rutas privadas/noindex y rutas arbitrarias del mismo host. | Validar contra manifiesto indexable; eliminación explícita; estado público verificado antes de enviar. | PROBADO SIN ENVÍOS |
| E14 / P2 | llms mantenido por separado / LOW | URLs, servicios y perfiles duplicados manualmente. | Generarlo desde configuración y servicios; declarar carácter experimental. | IMPLEMENTADO Y PROBADO LOCALMENTE |
| E15 / externo | Datos legales y recepción del formulario pendientes / HIGH comercial | Configuración legal vacía; preview sin `.env.local`; GET público de contacto 405 no demuestra entrega. | No inventar datos o credenciales. Completar y probar recepción mediante checklist externa. | PENDIENTE EXTERNO |

No se detectó un bloqueo CRITICAL general del rastreo. La presencia en el índice no se puede inferir de una respuesta HTTP correcta.

## Lo que ya funcionaba antes

El crawl público de las 16 URLs del sitemap encontró 16 respuestas 200, 16 canonicals autorreferentes, 16 titles y descriptions únicos y un H1 por página. Los 21 destinos internos únicos revisados, incluidos PDF y privacidad, respondieron 200. No había páginas huérfanas entre las URLs del sitemap. El contenido esencial y JSON-LD ya estaban en HTML inicial; no correspondía diagnosticar ausencia de renderizado ni metadata duplicada.

HTTP → HTTPS y el host histórico `reacs-studio.vercel.app` devolvían 308; el segundo preservaba ruta y parámetros. `/index.html` y `/Reac.dc.html` redirigían a `/`. Una URL inventada devolvía 404 real. `/404.html` respondía 200 con noindex; no se encontró un soft-404 general. `/gracias` y `/politica-de-privacidad` tenían noindex intencional. GET `/api/contact` devolvía 405 y `X-Robots-Tag: noindex, nofollow`. No había nofollow global accidental.

Home con UTM conservaba canonical limpio. `robots.txt` permitía Googlebot/bingbot por grupo general y OAI-SearchBot por grupo explícito, excluyendo API. Las imágenes HTML inspeccionadas tenían alt y dimensiones; alt vacío era adecuado para paisajes decorativos. El logo ahora tiene alt Reac Studio. Favicons y OG ya existían y se preservaron.

Los User-Agents Mozilla, Googlebot, bingbot y OAI-SearchBot recibieron el mismo HTML de home: 122.506 bytes, SHA256 `e02b7a54b07480e9a40a4b514d7265895e2ad219f0e3c273cc4fede3b3d95ebb`. Esto sólo prueba respuestas desde la IP de auditoría, no acceso desde rangos reales de crawlers ni indexación.

## Marca, contenido y evidencia

Instagram devolvió OG title “Reac Studio | Soluciones IT (@reacstudio)” y URL coincidente. TikTok coincide con configuración y handle proporcionado y respondió 200, pero no expuso metadatos suficientes para validar su contenido externamente. Su confirmación manual queda pendiente. No se añadieron LinkedIn, ratings, direcciones, premios, clientes ni resultados.

La fuente ya identifica a Misael Ledesma y Tomás Ortiz y sus roles; se conservaron, sin añadir credenciales. Los proyectos comerciales, personales y académicos mantienen sus etiquetas. No se abrieron casos de estudio independientes: faltan permisos/datos verificables para algunos alcances y resultados. El roadmap indica qué reunir antes de ampliar cada caso.

## Criterios técnicos y fuentes

- [Google: nombres de sitio](https://developers.google.com/search/docs/appearance/site-names): WebSite y aliases coherentes con identidad visible; no confundir nombre del sitio con title. Rich Results Test no valida site names.
- [Google: Organization](https://developers.google.com/search/docs/appearance/structured-data/organization) y [Schema.org ProfessionalService](https://schema.org/ProfessionalService): datos reales, identidad única y elección de tipo justificada.
- [Google: optimización para IA generativa](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): SEO y contenido útil; llms.txt no aporta un beneficio de ranking demostrado ni sustituye HTML.
- [OpenAI: crawlers](https://developers.openai.com/api/docs/bots): OAI-SearchBot y GPTBot tienen finalidades independientes. Se conservó la política previa de entrenamiento.
- [Google: actualizaciones](https://developers.google.com/search/updates): FAQ rich results retirados en 2026; FAQPage se conserva sólo como semántica fiel a preguntas visibles, sin promesas de presentación enriquecida.
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) e [IndexNow](https://www.indexnow.org/documentation): URLs canónicas y cambios reales; no inventar lastmod ni enviar todo en cada build.

## Límites de la auditoría

No hay acceso acreditado a Search Console, Bing Webmaster Tools ni datos CrUX. No se comprobó ranking, selección de canonical por Google, volumen de consultas, citas en asistentes ni resultados comerciales. Las verificaciones locales de schemas comprueban sintaxis, nodos, enlaces y coherencia con HTML; la validación externa de URLs publicadas queda en la checklist. El problema del certificado necesita actuación fuera del repositorio.
