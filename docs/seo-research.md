# REAC Studio: investigación SEO, GEO y arquitectura de contenido

Fecha de revisión: 7 de septiembre de 2026.

Este documento registra la auditoría inicial y las decisiones recomendadas. No certifica que las correcciones ya estén implementadas, desplegadas o indexadas. Las comprobaciones del sitio público corresponden a la versión recibida durante esta revisión, antes de la implementación principal.

## Evidencia inicial

- El proyecto es HTML/CSS/JavaScript estático con un runtime declarativo en `support.js`. No hay `package.json` ni framework de routing. `vercel.json` ejecuta `python scripts/fix-parallax.py` y publica el directorio raíz.
- `Reac.dc.html` es la fuente editable y `index.html` es la salida servida. La sincronización entre ambos debe ser explícita y verificable.
- Una petición HTTP a `https://reacs-studio.vercel.app/` devolvió **200** y **122 expresiones `{{ ... }}` sin procesar**. Entre ellas están `{{ titleNodes }}` y `{{ f.q }}`. La inspección se hizo sobre el cuerpo HTTP, sin ejecutar JavaScript.
- En `index.html`, el H1 depende de `{{ titleNodes }}`; proceso, proyectos y FAQ incluyen expresiones como `{{ step.title }}`, `{{ step.body }}`, `{{ p.name }}`, `{{ p.summary }}`, `{{ f.q }}` y `{{ f.a }}`. El navegador obtiene esos textos del runtime, pero el HTML inicial no los contiene en sus elementos correspondientes.
- `robots.txt`, `sitemap.xml`, canonical, Open Graph y JSON-LD utilizan `https://reacstudio.com/`, aunque la URL pública indicada y comprobada es `https://reacs-studio.vercel.app/`. No se comprobó propiedad ni puesta en producción del dominio propio.
- El sitemap inicial enumera la home y cuatro recursos HTML. Los cuatro recursos contienen texto estático, título, descripción, H1 y `BreadcrumbList`, sin expresiones pendientes. Sus canonical también utilizan el dominio propio sin confirmar.
- Las tarjetas de recursos de la home enlazan únicamente los PDF. Los recursos HTML necesitan enlaces internos visibles para su descubrimiento y uso.
- La home tiene `Organization`, `WebSite`, `WebPage` y `FAQPage`. No hay `sameAs` ni `areaServed` en la entidad inicial.
- El HTML contiene los nombres y roles de **Misael Ledesma — Desarrollo Web & Tecnología** y **Tomás Ortiz — Marketing & Growth**. Los proyectos ya distinguen casos comerciales, personales y académicos; varios stacks o alcances figuran pendientes de confirmar.
- Los contactos existentes son `https://wa.me/5493544434403` y `mailto:ledesma.rme@gmail.com`. No se encontraron perfiles oficiales de Instagram, Facebook o TikTok enlazados en la home. Estos datos se constataron en código; la recepción y titularidad no se comprobaron.
- `politica-de-privacidad.html`, `gracias.html` y `404.html` tienen `noindex, follow`. La existencia de un archivo `404.html` no prueba por sí sola que una ruta inexistente responda HTTP 404.

## Decisión de renderizado

**Recomendación: ADAPTAR el sitio estático existente.** Entregar en el HTML inicial el H1, servicios, proceso, todos los proyectos publicados, FAQ, equipo y navegación. JavaScript debe mejorar las interacciones, conservando la presentación actual.

La solución puede usar generación estática en build con datos y plantillas compartidos, o HTML estático mantenido con una sincronización comprobable. No hace falta introducir Next.js, una base de datos ni un CMS para resolver este P0. Tampoco conviene entregar una página distinta según el user agent del crawler.

Si se conserva un runtime para controles visuales, evitar que al iniciar sustituya texto real por plantillas o duplique el contenido. El carrusel puede mover tarjetas existentes; el FAQ puede expandir respuestas ya presentes. El contenido no debe desaparecer cuando fallan scripts o recursos externos.

Google ejecuta JavaScript, pero recomienda considerar renderizado del servidor o prerenderizado porque otros bots pueden no ejecutarlo. No debe diagnosticarse una falta de indexación real de Google solo a partir del HTML inicial: la prueba específica de Google requiere inspección de URL. En este proyecto, el requisito de HTML completo también responde a la compatibilidad con múltiples crawlers. [Documentación oficial de JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).

## Arquitectura propuesta y mapa de intención

Doce superficies principales: once páginas de negocio y un índice de recursos. Son una propuesta de implementación, no un inventario de rutas ya publicadas.

| URL | Intención principal | Contenido propio necesario | CTA recomendado |
| --- | --- | --- | --- |
| `/` | Entender qué es REAC y qué conecta | Propuesta del equipo, resumen de servicios, trabajo remoto, proyectos y personas | Pedir diagnóstico |
| `/servicios` | Elegir una solución según el problema | Comparación de web, marketing, Ads, automatización y sistemas; orientación sin repetir cada landing | Consultar por un servicio |
| `/desarrollo-web` | Contratar desarrollo web para una empresa | Web institucional frente a landing, alcance, proceso, mantenimiento, ejemplos reales | Conversar sobre una web |
| `/marketing-digital` | Ordenar una estrategia y gestión de marketing | Diagnóstico, canales, planificación, medición y relación con paid media | Revisar estrategia digital |
| `/google-ads` | Contratar gestión de publicidad en Google | Intención de búsqueda, campañas, medición, landing, separación entre honorarios e inversión | Revisar campañas de Google |
| `/meta-ads` | Contratar publicidad en Instagram y Facebook | Audiencias, creatividades, oferta, seguimiento de consultas y experimentación | Revisar campañas de Meta |
| `/automatizacion-ia` | Resolver procesos repetitivos con automatización | Casos apropiados, reglas frente a IA, integración, límites y supervisión humana | Evaluar un proceso |
| `/sistemas-crm` | Organizar leads e integrar herramientas | CRM existente frente a desarrollo a medida, flujo comercial, integraciones, permisos y alcance | Mapear seguimiento comercial |
| `/proyectos` | Comprobar qué trabajo realiza REAC | Casos ya presentes con problema, solución, alcance y categoría real; métricas solo con evidencia | Consultar por un proyecto similar |
| `/nosotros` | Identificar al equipo y su forma de trabajo | Nombres, roles y biografías existentes; trabajo remoto y colaboración | Conocer cómo trabajar juntos |
| `/contacto` | Iniciar una consulta | Formulario operativo, WhatsApp, email y qué información ayuda a definir alcance | Enviar consulta |
| `/recursos` | Encontrar guías prácticas | Índice editorial por temática, recursos existentes y vínculos hacia servicios relacionados | Leer una guía / solicitar revisión |

Conservar inicialmente las URLs de los cuatro recursos ya existentes:

- `/recursos/auditoria-sitio-web.html`
- `/recursos/auditoria-google-ads.html`
- `/recursos/auditoria-meta-ads.html`
- `/recursos/auditoria-negocio-digital.html`

Enlazar primero al recurso HTML y ofrecer dentro de él la descarga PDF. Evitar cambiar estas cuatro URLs solo por estética. Si se decide una migración posterior, conservar redirecciones permanentes individuales y actualizar enlaces/canonical/sitemap juntos.

Cada landing necesita un H1 específico, explicación temprana, alcance, proceso, prueba disponible, FAQ útil y contacto. Los enlaces entre páginas deben ser elementos `<a href>` reales. No crear páginas por ciudad con texto intercambiable. La cobertura remota de Argentina y LATAM puede expresarse en la oferta sin insinuar clientes, oficinas o presencia física en esas regiones.

## Configuración del sitio y entidad

Centralizar `SITE_URL` con el valor público comprobado hasta que el propietario confirme y conecte un dominio propio. Derivar de esa configuración canonical, sitemap, `og:url`, imágenes sociales y los identificadores JSON-LD. No aplicar redirecciones hacia un dominio pendiente.

Usar `lang="es-AR"` de forma consistente con el contenido. Las páginas necesitan títulos y descripciones propios; evitar cambiar el idioma técnico sin adaptar realmente el contenido. La canonical debe estar en el HTML inicial y señalar una URL indexable coherente con el sitemap.

Recomendación de JSON-LD:

- `Organization` para REAC, con `@id` estable, nombre, URL, descripción, email existente y un recurso de logo real.
- `WebSite` compartido y `WebPage` por URL.
- `Service` por servicio, con `provider` apuntando a REAC y `areaServed` coherente con la oferta remota indicada por Misael.
- `Person` para los dos integrantes, usando solo nombres, roles y biografía presentes. No inferir cargo de fundador, titulaciones adicionales ni años de experiencia.
- `BreadcrumbList` para páginas interiores cuando los breadcrumbs también sean útiles en la interfaz.
- `Article` solo para artículos reales, con autor y fechas comprobables. Un nuevo build no equivale a una actualización editorial.
- `FAQPage` solamente si las preguntas y respuestas correspondientes están publicadas en la misma página.

**No usar `ProfessionalService` como atajo.** Schema.org lo declara obsoleto por su confusión con `Service`. `Organization` + `Service` refleja mejor una agencia remota sin inventar datos de un establecimiento local. [Schema.org: ProfessionalService](https://schema.org/ProfessionalService).

`areaServed` acepta texto además de entidades geográficas. Puede representar Argentina y Latinoamérica conforme a la oferta indicada; no es una prueba de oficinas ni de historial de clientes. `sameAs` debe omitirse hasta contar con las URLs oficiales reales. No publicar campos vacíos o textos «pendiente» en JSON-LD. [Schema.org: Organization](https://schema.org/Organization).

Los rich results de FAQ dejaron de aparecer en Google el **7 de mayo de 2026**. La documentación del tipo para Google fue retirada en junio. No presentar `FAQPage` como una oportunidad vigente de obtener ese resultado enriquecido. [Registro oficial de Google, entradas del 8 de mayo y 15 de junio de 2026](https://developers.google.com/search/updates).

## Crawlers y visibilidad generativa

| Sistema | Decisión recomendada | Alcance y límite |
| --- | --- | --- |
| Google Search / AI Overviews / AI Mode | Permitir Googlebot, contenido y recursos necesarios; verificar inclusión en Search Console | Accesibilidad técnica no garantiza indexación ni aparición |
| Bing / Copilot | Permitir Bingbot; sitemap coherente y notificación IndexNow cuando haya cambios publicados | La notificación no garantiza indexación ni citas |
| ChatGPT Search | Permitir explícitamente OAI-SearchBot, además de no bloquearlo en la infraestructura | La regla trata búsqueda; no implica dar permiso de entrenamiento |
| GPTBot | Mantener una decisión separada de OAI-SearchBot | Se relaciona con entrenamiento de modelos de OpenAI |
| ChatGPT-User | No tratarlo como requisito de indexación | Se usa para visitas iniciadas por usuarios; no determina inclusión en Search |
| Google-Extended | Evaluar como decisión específica de uso de contenido | Controla entrenamiento y grounding en productos Gemini/Vertex; no es el control de posicionamiento de Google Search |

OpenAI documenta que OAI-SearchBot y GPTBot son configuraciones independientes. También publica rangos IP para verificar acceso en infraestructuras que filtran bots. Una cadena de user agent por sí sola no autentica un crawler. No hace falta agregar reglas para productos que REAC no utiliza, como OAI-AdsBot, solo porque aparezcan en la lista. [Crawlers oficiales de OpenAI](https://developers.openai.com/api/docs/bots).

Google distingue Googlebot de Google-Extended. Por tanto, no conviene bloquear Google-Extended automáticamente si el objetivo incluye grounding en Gemini sin revisar antes esa decisión empresarial. Tampoco se debe afirmar que permitir entrenamiento sea necesario para Google Search. [Crawlers oficiales de Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers).

La guía actual de Google prioriza contenido original y útil, estructura técnica clara y buenas prácticas SEO. No requiere archivos «para IA», un schema especial ni fragmentar artificialmente todos los textos. Google declara que `llms.txt` no ayuda ni perjudica su visibilidad o rankings. No se recomienda añadirlo al proyecto como promesa de GEO. [Guía de optimización generativa de Google, actualizada el 10 de julio de 2026](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Desde el 31 de agosto de 2026, Google documenta disponibilidad global del control **Settings > Search generative AI** en Search Console. La inclusión es el valor predeterminado y puede heredarse de una propiedad superior. Comprobar que la propiedad de REAC no esté excluida; no es una configuración que pueda verificarse leyendo el repositorio. [Control oficial de inclusión](https://support.google.com/webmasters/answer/16908024).

Search Console dispone de un informe de **impresiones** generativas por páginas, países, fechas y dispositivos. Puede no mostrar datos si aún no hay suficientes impresiones; no interpretar esa ausencia como prueba automática de bloqueo. [Informe oficial de rendimiento generativo](https://support.google.com/webmasters/answer/16984139?hl=en).

Bing Webmaster Tools ofrece AI Performance para observar citas y páginas referenciadas en experiencias compatibles, incluidas Copilot y resúmenes de Bing. Sus métricas no equivalen a ranking, autoridad ni clientes obtenidos. [Anuncio oficial de Bing](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview).

## IndexNow: integración recomendada

**INTEGRAR el protocolo HTTP existente**, sin SDK ni dependencia nueva. Preparar un script de operación que lea la configuración del sitio y acepte una lista de URLs realmente creadas, modificadas o eliminadas.

1. Configurar una clave válida y servir el archivo de verificación en el host que se notificará.
2. Comprobar que la clave publicada y las URLs pertenecen a ese host.
3. Ejecutar un modo de revisión que muestre las URLs y el destino sin enviar nada.
4. Notificar después de que el despliegue esté publicado y comprobado; no durante un build de preview ni al cargar cada página.
5. Registrar estado y errores, sin interpretar una respuesta 200 como confirmación de indexación.

El protocolo admite hasta 10.000 URLs por solicitud. La clave debe verificarse desde un archivo servido por el sitio. Una respuesta 202 puede indicar verificación pendiente y 429 exceso de solicitudes. No automatizar reenvíos de todo el sitio sin cambios. [Especificación IndexNow](https://www.indexnow.org/documentation).

El sitemap y IndexNow se complementan: inventario de URLs canónicas y aviso de cambios. Usar `lastmod` solo cuando refleje modificaciones reales del contenido. [Recomendación oficial de Bing sobre sitemap e IndexNow](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search).

## Medición y Google Ads

Propuesta de contrato de eventos para la implementación posterior:

| Evento | Qué debe significar |
| --- | --- |
| `whatsapp_click` | Clic real que abre WhatsApp; no confirma conversación ni lead |
| `email_click` | Clic real en un enlace `mailto:`; no confirma envío |
| `contact_form_start` | Primer inicio de interacción con el formulario en la sesión de formulario |
| `contact_form_submit` | Backend/proveedor aceptó correctamente la consulta; no el mero clic en enviar |
| `diagnostic_cta_click` | Clic real en un CTA de diagnóstico |
| `service_cta_click` | Clic real en un CTA vinculado a un servicio identificable |
| `booking_start` / `booking_complete` | Solo si existe un sistema de reservas y se puede verificar cada etapa |

Los eventos pueden incluir identificadores estables de página, servicio y ubicación del CTA. No enviar nombre, email, teléfono, mensaje libre ni URLs con datos personales a herramientas analíticas. No atribuir un valor monetario inventado a un lead.

Validar eventos en DebugView y Realtime; revisar doble disparo, consentimiento rechazado/aceptado/revocado y errores de formulario. [Verificación de eventos GA4](https://support.google.com/analytics/answer/9267735?hl=en).

Elegir una ruta de medición para cada conversión: importar el evento de GA4 o configurar una conversión directa de Google Ads. Evitar contabilizar dos veces el mismo resultado. No medir la visita directa a `/gracias` como una consulta aceptada. [Configuración oficial de conversiones web](https://support.google.com/google-ads/answer/16560108?hl=en).

Enviar cada campaña al servicio correspondiente, manteniendo coherencia entre búsqueda, anuncio, página y CTA. El contenido debe responder a las expectativas creadas por el anuncio. Relevancia, utilidad y navegación forman parte de la experiencia de destino; no se puede prometer un Quality Score concreto. [Google Ads: landing page](https://support.google.com/google-ads/answer/14086?hl=en_us_us).

## Datos que faltan o requieren confirmación

- Propiedad y dominio definitivo; DNS y acceso de administración para migrarlo.
- URLs oficiales de redes sociales. No deducirlas a partir del nombre comercial.
- Titularidad operativa de WhatsApp y email; prueba de recepción.
- Backend o proveedor de formularios operativo, credenciales de servidor y destinatario real.
- Credenciales/configuración de IndexNow y host donde se publicará la verificación.
- Acceso a Search Console, Bing Webmaster Tools, GA4 y Google Ads. La presencia de un identificador en código no prueba propiedad ni configuración correcta de la cuenta.
- Datos legales aplicables: responsable, tratamiento real, proveedores, retención y canal de derechos. Necesitan confirmación del negocio; no completar con una identidad fiscal inventada.
- Logo de marca apropiado como asset estable. La gráfica Open Graph actual no debe asumirse automáticamente como el logo institucional.
- Vigencia de precios existentes: USD 150/mes para marketing, USD 200 para web y USD 250 para automatización aparecen en la fuente. No convertirlos en ofertas definitivas o compromisos nuevos sin revisar alcance y vigencia.
- Stacks y alcance de proyectos que aún contienen notas de confirmación, permisos para publicar material y métricas verificables. No sustituirlos por datos plausibles.
- Información sobre atención presencial, necesaria para decidir elegibilidad en Google Business Profile.

Google Business Profile exige contacto presencial con clientes, salvo excepciones específicas. Un negocio exclusivamente online no es elegible. La posibilidad de trabajar remotamente en Argentina y LATAM no habilita a inventar una oficina ni una zona de atención presencial. [Elegibilidad oficial de Google Business Profile](https://support.google.com/business/answer/13763036?hl=en).

## Checklist manual posterior a la implementación

- [ ] **Google Search Console:** verificar la propiedad exacta, enviar el sitemap del host correcto, inspeccionar home y landings; revisar canonical elegida, indexación y recursos bloqueados.
- [ ] **Google Search generative AI:** comprobar inclusión/herencia y consultar el informe de impresiones si hay datos.
- [ ] **Bing Webmaster Tools:** verificar sitio, enviar sitemap, inspeccionar URLs y errores; establecer línea base de búsqueda y citas AI si están disponibles.
- [ ] **GA4:** confirmar propiedad y stream, comprobar un solo etiquetado, consentimiento y eventos reales; definir qué resultado cuenta como evento clave.
- [ ] **Google Ads:** confirmar cuenta, objetivos y conversión; elegir importación o tag directo sin duplicar; probar cada landing y contacto antes de invertir.
- [ ] **IndexNow:** publicar archivo de clave, revisar URLs, enviar cambios de producción y comprobar recepción. Mantener separado el estado «enviado» del estado «indexado».
- [ ] **Dominio propio:** confirmar propiedad, conectar DNS/HTTPS, actualizar configuración central, desplegar y verificar antes de redirigir el host anterior.
- [ ] **Perfiles sociales:** obtener URLs oficiales, comprobar nombre/logo/contacto y agregarlas a enlaces visibles y `sameAs`.
- [ ] **Google Business Profile:** confirmar elegibilidad presencial primero; no crear perfiles, oficinas o direcciones por razones de SEO.
- [ ] **Contenido empresarial:** confirmar biografías, precios y proyectos; documentar permisos y evidencia para cualquier métrica publicada.
- [ ] **Contacto y privacidad:** realizar una consulta de prueba autorizada hasta la recepción; confirmar textos y proveedores con el responsable del negocio.

## Plan recomendado para 90 días

### Días 1–30: base técnica y medición

Corregir y validar el HTML inicial, canonical y enlaces internos. Publicar las páginas de negocio con intención diferenciada y conservar los recursos útiles. Verificar Search Console, Bing y medición; registrar la línea base por página, dispositivo y canal. Probar contacto de extremo a extremo antes de activar campañas.

Revisar con los dos integrantes el inventario de afirmaciones: servicios, alcances, roles y proyectos. Elegir los casos con mejor evidencia para ampliar primero. No fijar objetivos numéricos de tráfico o leads antes de conocer la línea base y la capacidad comercial.

### Días 31–60: profundidad y consultas útiles

Ampliar uno o dos casos reales con decisiones de implementación, capturas propias y alcance confirmado. Publicar dos recursos trabajados con el equipo, por ejemplo «Qué debe tener una web para generar consultas» y «Cómo conectar una web con WhatsApp y un CRM», usando la implementación real como ejemplo solo después de validarla.

Relacionar cada recurso con su servicio correspondiente. Revisar consultas reales de Search Console/Bing y preguntas recibidas en ventas para mejorar las landings. Si ya funcionan contacto y medición, probar una campaña acotada por servicio y presupuesto acordado, evaluando calidad de consulta y costo, sin prometer resultados.

### Días 61–90: aprender y ajustar

Revisar indexación, páginas con impresiones y pocas consultas, términos irrelevantes de Ads, calidad de leads y desempeño móvil. Priorizar mejoras por evidencia: propuesta, alcance, formulario, prueba disponible o rendimiento. Evitar producir más páginas si las existentes todavía no responden bien a su intención.

Publicar uno o dos recursos adicionales donde REAC tenga experiencia propia. Revisar citas e impresiones generativas como indicadores de descubrimiento, junto con conversaciones y oportunidades reales. Ajustar el próximo trimestre según datos, capacidad del equipo y servicios rentables; no usar una búsqueda aislada en una IA como auditoría de autoridad.

## Validación que deberá acompañar la entrega final

La entrega final debe separar **implementado localmente**, **verificado localmente**, **publicado** y **pendiente externo**. Como mínimo: HTML servido sin expresiones, páginas sin JavaScript, links internos, canonical/schema/sitemap coherentes, estado HTTP 404, responsive 320/390 px, contacto y consentimiento. Validar JSON-LD sintáctica y semánticamente; no confundir JSON válido con elegibilidad de rich results.

Las métricas de laboratorio deben registrar herramienta, dispositivo simulado y condiciones. No equivalen a Core Web Vitals de usuarios reales. La indexación, las citas generativas, el ranking y la conversión comercial requieren observación posterior; este documento no ofrece garantías sobre ellos.
