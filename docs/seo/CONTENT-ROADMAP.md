# Roadmap de contenido de Reac Studio

Fecha de revisión: 2026-09-19. Estado: planificación editorial; esta lista no publica artículos ni casos nuevos.

## Objetivo y evidencia disponible

Ayudar a empresas, negocios y profesionales a decidir qué necesitan y facilitar consultas con contexto. La prioridad es resolver una decisión cercana a los servicios que Reac ya ofrece; no producir páginas para acumular palabras clave.

La arquitectura existente usa un generador estático con fichas en `content/services.mjs`, un hub `/recursos`, cuatro checklists HTML/PDF y proyectos documentados en `/proyectos`. `content/editorial.mjs` tiene un contrato para artículos revisados y está vacío. No hace falta agregar un CMS o un blog independiente para empezar.

Las consultas siguientes son hipótesis editoriales basadas en la oferta y las preguntas de las fichas, no volúmenes verificados ni preguntas atribuidas a clientes. No hay un export de Search Console, términos de campañas o entrevistas que permita cuantificar demanda o conversión. La prioridad refleja cercanía a una decisión comercial, evidencia disponible y esfuerzo de producción; se revisará con datos propios.

## Pilares y recorridos

1. **Web útil para el negocio:** `/desarrollo-web` y `/landing-pages`, conectados con la auditoría web y trabajos cuyo alcance esté documentado.
2. **Captación y campañas:** `/marketing-digital`, `/google-ads` y `/meta-ads`, conectados con sus checklists y con una página de destino pertinente.
3. **Seguimiento y procesos:** `/sistemas-crm` y `/automatizacion-ia`, conectados con la auditoría del negocio digital y ejemplos que identifiquen su naturaleza comercial o académica.

Cada recurso debe resolver su pregunta primero y enlazar al servicio pertinente donde ayude a avanzar. Usar enlaces HTML con texto que describa el destino, no repetir todos los servicios en cada párrafo. Google recomienda enlaces rastreables y texto de enlace descriptivo: [buenas prácticas de enlaces](https://developers.google.com/search/docs/crawling-indexing/links-crawlable).

## Temas priorizados

Todos son contenidos buscables; los checklists y comparaciones también pueden compartirse durante una conversación comercial. El orden no implica una estimación de tráfico.

| Orden | Query principal | Intención / persona / etapa | Título tentativo | Destino comercial | Acción y razón estratégica | Evidencia que falta antes de publicar o ampliar |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | cómo saber si mi web necesita un rediseño | Diagnóstico; dueño de negocio con web; consideración | ¿Tu web necesita un rediseño o cambios puntuales? | `/desarrollo-web` | Ampliar `/recursos/auditoria-sitio-web.html`: conservar su URL y checklist, añadir criterios para distinguir fallos de contenido, contacto y rendimiento. Puede ayudar a acotar un pedido de rediseño. | Revisar la checklist actual, capturas autorizadas y pruebas reproducibles para cada ejemplo; datos de consultas y rendimiento si se menciona impacto. |
| 2 | landing page vs sitio web | Comparación comercial; profesional o responsable de marketing; consideración | Landing page o sitio web: qué conviene según tu objetivo | `/landing-pages` y `/desarrollo-web` | Guía original en `/recursos/landing-page-vs-sitio-web`, usando diferencias de alcance y mantenimiento. Resuelve una decisión sin crear páginas duplicadas de servicios. | Ejemplos revisados de cada alternativa y límites de alcance; no atribuir conversiones al proyecto académico Landing para Profesional. |
| 3 | auditoría Google Ads checklist | Diagnóstico; negocio con campañas activas; consideración | Qué revisar en Google Ads antes de aumentar el presupuesto | `/google-ads` y `/landing-pages` | Ampliar `/recursos/auditoria-google-ads.html` con coherencia búsqueda-anuncio-destino y diferencia entre clic, consulta y oportunidad. Reutiliza un activo publicado. | Revisión actual de la interfaz y documentación oficial; datos anonimizados y autorización si se muestran cuentas; no prometer menor costo por consulta. |
| 4 | auditoría Meta Ads consultas de calidad | Diagnóstico; negocio que recibe mensajes desde anuncios; consideración | Cómo revisar tus campañas de Meta Ads y la calidad de las consultas | `/meta-ads` | Ampliar `/recursos/auditoria-meta-ads.html` con oferta, piezas, destino y respuesta posterior. Ayuda a investigar por qué mensajes y oportunidades no coinciden. | Fuentes oficiales vigentes y un ejemplo reproducible; permisos y contexto completo si se usan anuncios o datos de terceros. |
| 5 | auditoría negocio digital | Diagnóstico; dueño que coordina web, anuncios y planillas; descubrimiento a consideración | Cómo detectar dónde se pierden consultas en tu negocio digital | `/marketing-digital`, `/sistemas-crm` y `/automatizacion-ia` | Ampliar `/recursos/auditoria-negocio-digital.html` con un mapa del recorrido y responsabilidades. Permite priorizar una intervención antes de sumar herramientas. | Descripción validada de un flujo real, fuentes de datos y definición de cada etapa; evitar afirmar pérdidas o ahorros sin medición. |
| 6 | web autogestionable para empresa de servicios | Evaluación de solución; empresa que necesita actualizar servicios y sucursales; decisión | Más Servicios: alcance de una web autogestionable con WordPress | `/desarrollo-web` | Profundizar la ficha `/proyectos#mas-servicios` antes de abrir una URL de caso. Reutilizar lo documentado: contenido, sucursales, mapas, contacto y capacitación. | Confirmar permiso de publicación, responsabilidades, tecnologías y capturas actuales; resultados solo con evidencia y período. No inventar testimonio ni cifras. |
| 7 | CRM a medida o CRM existente | Comparación; responsable comercial que usa mensajes y planillas; consideración | CRM existente o desarrollo a medida: cómo decidir con tu proceso | `/sistemas-crm` | Guía en `/recursos/crm-existente-o-a-medida`, con `/proyectos#crm-comercial` como ejemplo académico identificado. Comparar adecuación, exportación, permisos y mantenimiento, no solo funcionalidades. | Investigación actual de opciones, costos y limitaciones para el caso elegido; separar el ejercicio académico de experiencia con clientes y no inventar ahorro. |
| 8 | información de una empresa para buscadores e IA | Informativa; empresa con presencia digital poco clara; descubrimiento a consideración | Qué debe explicar tu web sobre tu empresa para buscadores y asistentes de IA | `/desarrollo-web` | Guía en `/recursos/informacion-empresa-buscadores-ia` con nombre, oferta, fuentes, HTML accesible y relaciones entre páginas. Usar Reac como ejemplo propio del trabajo técnico, sin presentarlo como caso de mejora de ranking. | Capturas y validación del HTML publicado; fuentes oficiales actuales; distinguir posibilidad de rastreo de indexación, visibilidad o citación real. |

Las URLs nuevas de esta tabla son propuestas, no rutas publicadas. Los títulos deben describir una pregunta concreta y coincidir con el contenido, sin repetir ciudades ni usar el año solo para aparentar actualidad. [Recomendaciones oficiales para títulos](https://developers.google.com/search/docs/appearance/title-link).

## Secuencia de producción y medición

1. Revisar los cuatro recursos existentes y sus enlaces antes de crear artículos adicionales. Si cambia el contenido, revisar también el PDF asociado y registrar una fecha real de actualización.
2. Preparar primero la comparación landing/web y ampliar el caso Más Servicios cuando se disponga de la evidencia pendiente. No abrir rutas de caso que solo repliquen una ficha breve.
3. Para cada pieza, reunir la fuente, el ejemplo, el revisor y la acción útil que habilita. Usar `content/editorial.mjs` únicamente cuando el contenido esté completo y revisado; los borradores no deben entrar al sitemap.
4. Publicar de forma gradual, enlazar desde `/recursos` y desde el servicio pertinente, y comprobar enlaces, metadata, canonical y lectura móvil.
5. Tras publicar, revisar indexación, consultas e impresiones en Search Console y las consultas comerciales atribuibles con las limitaciones de medición correspondientes. No equiparar un clic de contacto con un lead ni usar el número de artículos como indicador de negocio.

El criterio editorial es aportar explicación original y evidencia verificable; la recomendación no depende de que Google prefiera una extensión de texto. [Guía oficial de contenido útil](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Decisiones aplicadas a servicios

La nueva ficha `/landing-pages` corresponde a una oferta ya presente en la home y a una decisión distinta de contratar una web institucional o gestionar anuncios. Se apoya en el proyecto académico existente, mantiene esa clasificación y no atribuye resultados comerciales. Su contenido trata el canal de origen, el alcance y el recorrido de consulta. La pertinencia del contenido y la navegación de una landing también está respaldada por la [explicación oficial de Google Ads](https://blog.google/products/ads-commerce/search-ads-and-the-importance-of-landing-page-navigation/); esto no demuestra demanda para una query ni garantiza conversiones.

Las fichas conservan el origen real de Reac en Villa Dolores, Córdoba, y el trabajo remoto. Los títulos y descripciones priorizan el servicio y la decisión del visitante; no se crean variantes por ciudad. Las fichas de evidencia usan etiquetas descriptivas para que el destino y, cuando corresponda, el carácter académico del proyecto sean claros antes del clic.
