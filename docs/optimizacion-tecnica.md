# Optimización de Reac Studio

Rama local `misaelr5/optimizacion`. Línea base reconstruida desde `2cca1b1`, con el mismo lockfile, Node 24.15.0 y Chrome. La comparación corresponde al sitio generado en `dist/`. Producción requiere una autorización de publicación independiente.

## Hallazgos y decisiones

| Hallazgo | Impacto / severidad | Esfuerzo / riesgo | Resolución |
|---|---|---|---|
| Cinco logos solicitados en móvil sumaban 304.610 bytes para marcas de 44–108 px de ancho máximo en escritorio. | Carga inicial / alta | Bajo / bajo | Reexportados para hasta 3× el ancho visible, conservando transparencia, proporción, enlaces y originales. Los cinco derivados suman 48.484 bytes. |
| La primera visita móvil descargaba el módulo de introducción y podía inicializar un shader mientras se pintaba el título. | Tiempo de respuesta / alta | Medio / medio | Introducción CSS en pantallas pequeñas, con puntero grueso o ahorro de datos. La entrada del título táctil deja visibles el texto y la acción desde el inicio. En escritorio el shader se importa después de confirmar que la animación puede arrancar y sombrea una vez por celda visual. |
| Scripts decorativos compartían la cola de ejecución anterior a la preparación del menú. | Primer render / alta | Medio / medio | El build pone GSAP y el controlador del menú por delante de las funciones secundarias. Se conserva el orden requerido para las transiciones entre páginas. |
| La preparación inicial de las entradas medía y transformaba nodos hasta el pie de página. | Hilo principal / alta | Medio / medio | Los bloques fuera de vista reciben una clase. El cálculo de transformaciones y la división del texto se ejecutan cuando se necesita cada entrada. |
| La segunda línea del título crecía de 71 a 102 px de alto al arrancar JavaScript en una ventana de 1350 px. | Estabilidad visual / alta | Bajo / bajo | El tamaño inicial de CSS coincide con el ajuste del navegador en los siete anchos medidos entre 320 y 2560 px. Se conserva el ajuste dinámico para frases largas. |
| La entrada visual ocultaba encabezados al árbol de accesibilidad. Lighthouse de escritorio detectó un H3 de planes sin su H2 anterior. | Lectura con tecnología asistiva / media | Bajo / bajo | El estado pendiente utiliza opacidad y deja los títulos disponibles por rol. La impresión muestra los encabezados aunque todavía no se haya recorrido la página. |
| La biblioteca de UI enviaba un controlador de carrusel que ninguna página generada utiliza. La atribución buscaba campos de un formulario retirado. | Transferencia y mantenimiento / media | Bajo / bajo | Eliminados el controlador, su generador huérfano y la escritura en campos inexistentes. El catálogo utiliza la grilla existente. |
| Pedir presupuesto desde un servicio perdía el contexto al abrir el canal. | Fricción comercial / media | Bajo / bajo | Los ocho servicios tienen un enlace directo a WhatsApp con texto editable que identifica el servicio. La segunda acción lleva a los canales alternativos. |
| El directorio para lectores de IA contenía URLs en texto plano. | Descubrimiento / media | Bajo / bajo | Enlaces Markdown, descripciones derivadas del catálogo editorial y vínculos a los seis casos publicados. |
| La portada conserva una hoja CSS bloqueante con estilos que se usan más abajo o en otros estados. | LCP / alta | Medio-alto / medio-alto | Pendiente separar CSS crítico respetando la cascada, las transiciones y la vista sin JavaScript. La cobertura de una sola pantalla no permite borrar selectores con seguridad. |

## Arquitectura y superficie pública

HTML estático en español, generación con Node y parse5, minificación con esbuild y TypeScript en el endpoint. GSAP implementa movimiento y OGL el campo gráfico opcional. El build genera 27 HTML y 24 rutas indexables. Vercel sirve archivos y aplica rewrites, redirects y headers. La aplicación carece de hidratación React, Server Components, autenticación y base de datos. La separación editorial existente en `content/` permite mantener datos coherentes entre HTML, metadatos y enlaces. El generador central sigue concentrando plantillas y packaging.

Se reutilizaron los componentes, el stack de pruebas y el flujo de contacto nativo. Se conservó el directorio de fuentes de imágenes. El proyecto mantiene las mismas dependencias y lockfile.

## SEO, GEO, experiencia y conversión

- Se verificaron titles y descripciones únicos, canonicals, Open Graph, Twitter Cards, robots, sitemap, imágenes, enlaces internos y coherencia de la entidad en JSON-LD. Las 24 páginas indexables tienen un H1 y una jerarquía sin saltos de nivel. Desarrollo web incorpora el alcance institucional y la procedencia en Córdoba. La página de sistemas explicita la intención de software a medida.
- `llms.txt` se genera desde las mismas fuentes que los servicios y casos. Las preguntas frecuentes siguen disponibles en HTML. La auditoría técnica puede comprobar que el contenido es accesible y coherente. Las impresiones, citas en respuestas generativas y solicitudes de presupuesto requieren observación posterior.
- Cobertura de interfaz en Chrome con teclado, movimiento reducido y JavaScript desactivado en los recorridos previstos. Se comprobaron hero, menú, catálogo, prueba social, FAQ, contacto y footer. Se validaron las ocho páginas de servicio, portada, portfolio y contacto también a 320 y 2560 px. Los datos de negocio existentes no se usaron como estimaciones de conversión.
- El evento `whatsapp_click` identifica servicio y ubicación del enlace. El texto del mensaje queda en el destino de WhatsApp. La prueba de Analytics intercepta la navegación externa, simula consentimiento y comprueba los eventos; un clic mide intención de contacto. La confirmación de una consulta corresponde al canal comercial.

## AppSec y privacidad

1. **Dependencias.** El registro de npm devolvió cero vulnerabilidades conocidas para el lockfile auditado. GSAP y OGL tienen consumidores activos. El barrido del repositorio y del build busca firmas conocidas de credenciales y sourcemaps accidentales. El resultado está en `artifacts/security-scan.json`.
2. **Endpoint y validación.** `api/contact.ts:3` devuelve 410 y no procesa ni almacena mensajes. El sitio público deriva el contacto a WhatsApp y email. No hay consultas SQL, cargas de archivos ni sesiones de usuarios en ese flujo. La lógica histórica de entrega en `lib/contact.ts` permanece fuera de la ruta activa.
3. **Navegador.** El build escapa valores editoriales y codifica el texto del enlace con URLSearchParams. Las inserciones de HTML revisadas en el banner y la introducción utilizan plantillas controladas. La CSP en `vercel.json:250` restringe scripts, conexiones, formularios y framing. Los atributos de estilo inline siguen permitidos para el sistema de animación. El preview prueba headers y redirecciones locales; la caché del CDN y HSTS efectivos deben comprobarse en el dominio cuando se autorice publicar.
4. **Medición.** `reac-site.js:99` distingue clic de canal y CTA. Se probaron aceptación, rechazo y retirada del consentimiento, además de la exclusión de parámetros privados de la fixture. La política comercial debe seguir evitando información personal en nombres de campaña.

## Skills y herramientas

Codex en Orca, Windows y PowerShell. Se inspeccionaron los inventarios del proyecto y global. Las cuatro skills GSAP preexistentes pertenecen al proyecto. Se instalaron para Codex `web-quality-audit`, `performance`, `core-web-vitals` y `accessibility` desde addyosmani/web-quality-skills en `afa8da942115f2961fdbfa80807ea0b232ff6c00`. Se revisaron el contenido y el analizador Bash de lectura antes de instalar. Se aplicaron sus flujos de medición, accesibilidad y diagnóstico.

Se reutilizaron `web-design-guidelines`, `seo-audit`, `schema`, `ai-seo`, `cro`, `playwright` y `security-best-practices`. Playwright CLI 0.1.25 y Lighthouse 13.6.0 se ejecutaron desde el entorno de herramientas de npm. Las skills para React, composición React y Next.js quedan fuera del stack detectado.

## Archivos modificados

- `premium/hero.js`, `premium/hero.css`, `premium/intro.js`, `premium/intro.css`, `premium/titles.css`, `premium/reveal.js`, `premium/loader.js`, `premium/loader-field.js`, `premium/loader.css` y `README.md` para la carga adaptativa y su documentación.
- `scripts/build.mjs`, `scripts/case-views.mjs`, `reac-ui.js`, `reac-site.js`, `content/services.mjs` y `llms.txt` para generación, contacto, SEO y limpieza de código.
- `Reac.dc.html`, `index.html` y los cinco WebP `uploads/logo-*-cutout.webp` para imágenes de marcas y dimensiones intrínsecas.
- `tests/loading.browser.mjs`, `tests/reveal.browser.mjs`, `tests/motion-startup.browser.mjs`, `tests/seo.test.mjs`, `tests/analytics.browser.mjs` y este informe para cobertura y trazabilidad.

## Mediciones de la entrega

Medianas de tres corridas de Lighthouse por dispositivo y versión, en la portada local con caché fría. KB decimales. El servidor local entrega sin compresión.

| Perfil | Versión | Performance | LCP | TBT | CLS | Transferencia |
|---|---|---:|---:|---:|---:|---:|
| Móvil | Base | 68 | 2,7 s | 946 ms | 0,0023 | 824,3 KB |
| Móvil | Entrega | 91 | 2,71 s | 49 ms | 0 | 509,8 KB |
| Escritorio | Base | 69 | 0,66 s | 759 ms | 0,0094 | 1055,9 KB |
| Escritorio | Entrega | 73 | 0,57 s | 644 ms | 0,0058 | 797,3 KB |

Los puntajes individuales finales fueron 92, 91, 90 en móvil y 73, 71, 79 en escritorio. SEO, accesibilidad y buenas prácticas alcanzaron 100 en ambos perfiles finales. El objetivo aspiracional de Performance 95 queda pendiente. TBT mide bloqueo durante la carga; INP requiere interacciones de usuarios reales.

### Red limitada en Playwright

Una muestra por ruta y versión en Chrome a 390 × 844, CPU 4×, 1,6 Mbps de bajada y latencia de 150 ms. Se ejercitó el menú en cada ruta.

| Ruta | LCP base / final (ms) | CLS base / final | Mayor interacción base / final (ms) |
|---|---:|---:|---:|
| `/` | 4768 / 3600 | 0,0412 / 0,0275 | 184 / 168 |
| `/desarrollo-web` | 2420 / 2436 | 0,0025 / 0 | 48 / 64 |
| `/google-ads` | 2188 / 3092 | 0 / 0 | 48 / 48 |

La muestra de Google Ads fue más lenta y desarrollo web quedó cerca de su línea base. Una observación por página deja abierta la causa. Se requiere un perfil repetido de estas rutas antes de atribuir el cambio a una modificación concreta.

| Recursos de portada, bytes | Base | Entrega |
|---|---:|---:|
| JS referenciado directamente | 139463 | 137094 |
| CSS agrupado | 176587 | 176717 |
| JS realmente solicitado durante la muestra | 193857 | 137094 |
| HTML y recursos solicitados durante la muestra | 798596 | 485837 |

### Validación y pendientes

El build de producción se probó con origen alternativo, restauración del origen canónico y repetición determinista. Pasaron lint, typecheck, las 32 pruebas unitarias y estructurales y 54 comprobaciones HTTP. Una ejecución intermedia de lint coincidió con la regeneración de dist y encontró el sitemap ausente. Se repitió con el build completo y pasó.

Las pruebas de navegador cubren 27 páginas, 189 combinaciones página/ancho, axe, analítica con consentimiento, grilla y detalle de proyectos, navegación y Escape, hero, FAQ, movimiento, carga fallida y uso sin JavaScript. Se comprobó acceso al título pendiente por rol. La verificación automatizada de accesibilidad se complementa con revisión humana con lector de pantalla antes de certificar conformidad WCAG.

Próxima prioridad: medir en un teléfono físico la hoja CSS bloqueante y separar los estilos de la primera pantalla de los del resto de la portada mediante una prueba comparativa que conserve la cascada. Tras una publicación autorizada, contrastar LCP, INP y CLS de campo al percentil 75, la indexación en Search Console y las consultas recibidas por servicio. Los JSON de cada corrida quedan en artifacts; optimization-comparison.json identifica los archivos utilizados.
