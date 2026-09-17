# Microdiagnósticos digitales — lote 01 / Top 5

**Fecha de investigación:** 15 de septiembre de 2026
**Estado:** preparación e investigación pública. No se enviaron mensajes, formularios ni solicitudes de contacto.
**Fuentes:** [lote 01](lote-01-arquitectura-ingenieria.md), sitios corporativos públicos y capturas locales en `artifacts/prospeccion/lote-01/`.

## Método y límites

Se revisaron la home, servicios, portfolio/proyectos, bloque de nosotros, contacto, formulario cuando existe y footer de los cinco sitios. En los cinco casos son páginas de una sola navegación o secciones ancla; no se completaron campos. Las revisiones visuales se hicieron a 1440 px y 390 px.

Un **hecho** describe lo visto. Una **interpretación** es una hipótesis comercial que debe confirmarse con la empresa. No se infieren métricas, presupuesto, pérdida de consultas ni procesos internos.

### Corrección importante respecto del lote inicial

En el HTML inicial de Gargiulo aparecen contadores `+0`, pero después de cargar la página la captura muestra valores animados. No se considera una falla vendible ni se usa en el ranking.

## Ranking actualizado

| Puesto | Empresa | Oportunidad | Servicio de entrada | Estado |
| ---: | --- | --- | --- | --- |
| 1 | Andino Construcciones | Alta | Web Comercial | **GO** |
| 2 | FUZION Arquitectura | Alta | Web Comercial | **GO** |
| 3 | DUARQ SRL | Alta | Web Comercial | **GO** |
| 4 | Edgardo Gargiulo A&A | Media | Web Comercial | **HOLD** |
| 5 | Lovera Lufft Arquitectura | Baja | Landing + Conversión | **DROP** |

La decisión no califica la calidad profesional de las empresas. Evalúa si la evidencia actual justifica un contacto de Reac con una hipótesis de proyecto suficientemente concreta.

---

## 1. Andino Construcciones — GO

**Fuentes y capturas:** [sitio público](https://www.andinoconstrucciones.com/andinoconstrucciones), [desktop](../../artifacts/prospeccion/lote-01/andino-formulario-desktop.png), [mobile](../../artifacts/prospeccion/lote-01/andino-formulario-mobile.png).

### Qué revisamos

Home, menú de obras/desarrollos, servicios, nosotros, portfolio, formulario de contacto y footer; visualmente a 1440 px y 390 px.

### Lo que ya funciona

- El sitio sí comunica una trayectoria de más de 40 años, enumera servicios y presenta categorías de obra, planos y desarrollos.
- Hay dirección, teléfono, email y proyectos/obras públicamente identificables.

### Prioridad 1 — experiencia mobile y navegación

- **Hecho:** a un viewport de 390 px, el documento mide 1.049 px de ancho; la captura muestra navegación truncada horizontalmente. En desktop el documento mide 1.440 px, por lo que no es sólo una imagen grande.
- **Por qué importa:** una persona que llega desde móvil debe poder leer la navegación y elegir una categoría sin desplazamiento lateral inesperado.
- **Recomendación:** reconstruir el layout mobile-first, menú y bloques de portfolio con ancho fluido; probar 320–430 px antes de publicar.
- **Dificultad:** Media.
- **Servicio Reac:** Web Comercial.

### Prioridad 2 — formulario y estado de envío

- **Hecho:** el bloque de contacto muestra “¡Tus datos se enviaron con éxito!” junto al formulario antes de que se haya enviado nada; sólo aparecen nombre, email y asunto.
- **Por qué importa:** el estado visible no deja claro cuándo una consulta fue procesada, y el formulario no distingue una obra, plano o desarrollo.
- **Recomendación:** corregir el estado inicial/confirmación y añadir una selección breve de tipo de consulta, ubicación y escala aproximada; conservar una vía directa de contacto.
- **Dificultad:** Baja–Media.
- **Servicio Reac:** Landing + Conversión, como módulo del proyecto web.

### Prioridad 3 — jerarquía de portfolio y contacto

- **Hecho:** el portfolio contiene muchas categorías de obra y desarrollo, pero en la captura hay grandes vacíos antes de Desarrollo y Contacto; los proyectos aparecen con títulos mínimos y sin un siguiente paso contextual.
- **Por qué importa:** la trayectoria existe, pero el recorrido no prioriza claramente qué tipo de proyecto quieren captar.
- **Recomendación:** seleccionar casos por vertical, añadir resumen/alcance visible y CTA por tipo de encargo.
- **Dificultad:** Media.
- **Servicio Reac:** Web Comercial.

### Valor económico del problema

**Oportunidad alta.** Hay un problema técnico/visual comprobable en mobile, más una fricción de formulario, dentro de una empresa con varias líneas y obras visibles. Es defendible como un proyecto de presencia y conversión, no como un simple retoque cosmético.

### Qué venderíamos

- **Servicio de entrada:** Web Comercial.
- **Upsell posible:** Landing + Conversión para desarrollos o una categoría prioritaria, sólo después de definir cuál quieren captar.

### Alcance hipotético

Arquitectura de información por obra/planos/desarrollos; sistema responsive; portfolio seleccionable; página de contacto con estado correcto y calificación inicial; CTA por categoría; medición básica del clic de contacto.

### Diagnóstico de una página listo para entregar

**Andino Construcciones**
**Qué revisamos:** sitio público, categorías de obra y desarrollo, formulario y experiencia mobile.

**Lo que ya funciona:** trayectoria y oferta amplias; datos de contacto y obras visibles.

**Prioridad 1:** el layout se desborda a 390 px y corta la navegación. **Recomendación:** resolver primero responsive y jerarquía mobile.

**Prioridad 2:** la confirmación aparece antes del envío y el formulario no contextualiza la consulta. **Recomendación:** corregir estado y pedir tipo de proyecto/datos mínimos.

**Prioridad 3:** portfolio y contacto pierden continuidad por vacíos y falta de CTA contextual. **Recomendación:** ordenar casos y próximos pasos por categoría.

**Próximo paso recomendado:** corregir el recorrido mobile y el formulario antes de invertir en atraer más visitas.

### Guion de video (3–5 min)

- **0:00–0:20:** “Revisé el sitio de Andino desde desktop y móvil, con foco en cómo una persona pasa de una obra o desarrollo a una consulta.”
- **0:20–0:50:** reconocer trayectoria, variedad de obras y datos de contacto visibles.
- **0:50–2:00:** mostrar el desborde a 390 px y explicar que la navegación no queda contenida en la pantalla.
- **2:00–3:00:** mostrar el formulario: el mensaje de éxito ya está visible y no se solicita contexto de proyecto.
- **3:00–4:00:** conectar portfolio/contacto: primero responsive, después formulario, por último casos y CTA por categoría.
- **Final:** “Si les sirve, podemos conversar sobre cómo resolver primero este recorrido sin cambiar lo que ya comunica su trayectoria.”

### Canal y mensaje revisado

- **Canal recomendado:** email corporativo publicado. Es apto para adjuntar o enlazar luego un diagnóstico breve; no se verificó entregabilidad.
- **Mensaje (61 palabras, no enviado):**

  > Al revisar Andino en móvil, el sitio queda con un ancho de 1.049 px en una pantalla de 390 px y la navegación se corta horizontalmente. También el formulario exhibe la confirmación antes de enviarlo. Para una firma con obras, planos y desarrollos, es un recorrido que vale la pena ordenar. ¿Te comparto un Diagnóstico Digital breve con tres prioridades?

---

## 2. FUZION Arquitectura — GO

**Fuentes y capturas:** [sitio público](https://www.fuzionarq.com/), [desktop](../../artifacts/prospeccion/lote-01/fuzion-servicios-desktop.png), [mobile](../../artifacts/prospeccion/lote-01/fuzion-servicios-mobile.png).

### Qué revisamos

Página de inicio, índice, introducción, equipo, servicios, proyectos, bloque de diferenciación y contacto/footer, en desktop y mobile.

### Lo que ya funciona

- El equipo y sus credenciales se presentan con nombre, especialidad y antecedentes; hay una oferta genuinamente multidisciplinaria.
- El portfolio identifica proyectos concretos para Porsche, Genco, Cencosud, terminales, colegios y desarrollos en Argentina/Costa Rica.

### Prioridad 1 — propuesta B2B demasiado lineal

- **Hecho:** toda la oferta —diseño, impacto ambiental, factibilidad, pliegos, auditorías y project management— se presenta como texto continuo en una sola página; a 390 px el documento tiene 19.639 px de alto.
- **Por qué importa:** alguien que llega por una necesidad concreta debe recorrer mucha información antes de reconocer un servicio y su siguiente paso.
- **Recomendación:** definir 3–4 recorridos por necesidad (por ejemplo, factibilidad, licitación, gestión/obra y sostenibilidad) con una página o bloque de entrada claro para cada uno.
- **Dificultad:** Media–Alta.
- **Servicio Reac:** Web Comercial.

### Prioridad 2 — CTA y contacto sin contexto

- **Hecho:** la página publica email, celular y dirección en el footer, pero no presenta un CTA de consulta ni formulario contextual entre servicios/proyectos.
- **Por qué importa:** el portfolio prueba capacidad, pero no convierte esa prueba en una acción concreta para un potencial cliente B2B.
- **Recomendación:** insertar CTA por servicio y un contacto breve que pregunte objetivo/tipo de proyecto; medir cuál recorrido genera interés.
- **Dificultad:** Media.
- **Servicio Reac:** Landing + Conversión, incluido como fase posterior.

### Prioridad 3 — legibilidad y jerarquía mobile

- **Hecho:** la captura mobile no se desborda horizontalmente, pero concentra párrafos muy extensos y numerosas imágenes en una sola secuencia vertical.
- **Por qué importa:** no es un error técnico, pero reduce la posibilidad de escaneo rápido de servicios y casos desde un teléfono.
- **Recomendación:** resumir la primera capa, usar resúmenes con enlaces a detalle y priorizar casos B2B relevantes.
- **Dificultad:** Media.
- **Servicio Reac:** Web Comercial.

### Valor económico del problema

**Oportunidad alta.** FUZION parece tener trabajo B2B y capacidad compleja; el problema no es falta de credenciales sino traducirlas en recorridos comerciales claros. Esa reorganización es razonablemente vendible como proyecto, no como corrección aislada.

### Qué venderíamos

- **Servicio de entrada:** Web Comercial.
- **Upsell posible:** Landing + Conversión para una campaña o vertical que el equipo defina como prioritario.

### Alcance hipotético

Posicionamiento inicial por necesidades B2B; arquitectura de información y microcopy; páginas de servicio; selección de casos por vertical; CTA contextual; formulario con tipo de proyecto/objetivo; analítica de CTA.

### Diagnóstico de una página listo para entregar

**FUZION Arquitectura**
**Qué revisamos:** presentación, equipo, servicios B2B, proyectos, contacto y versión mobile.

**Lo que ya funciona:** equipo multidisciplinario con credenciales; portfolio de proyectos reconocibles y diversos.

**Prioridad 1:** demasiadas especialidades viven en un único recorrido textual. **Recomendación:** ordenar la oferta por necesidad de cliente.

**Prioridad 2:** servicios y portfolio no contienen un siguiente paso contextual. **Recomendación:** CTA y contacto por servicio/proyecto.

**Prioridad 3:** mobile es funcional, pero demasiado largo para escanear. **Recomendación:** resumir la primera capa y priorizar casos.

**Próximo paso recomendado:** elegir tres servicios B2B prioritarios y construir el recorrido de consulta antes de impulsar tráfico.

### Guion de video (3–5 min)

- **0:00–0:20:** “Revisé FUZION desde la perspectiva de una empresa que llega buscando una necesidad técnica puntual.”
- **0:20–0:50:** destacar equipo, clientes/proyectos y amplitud técnica comprobable.
- **0:50–2:00:** recorrer cómo factibilidad, pliegos, auditorías y project management aparecen en una única secuencia.
- **2:00–3:00:** mostrar que el contacto queda al final sin un CTA específico después de cada solución.
- **3:00–4:00:** priorizar rutas por necesidad, CTA/formulario y después optimización mobile.
- **Final:** “Si les sirve, podemos conversar sobre cómo convertir la capacidad que ya muestran en recorridos comerciales más claros.”

### Canal y mensaje revisado

- **Canal recomendado:** email corporativo publicado, por la naturaleza documental/técnica del diagnóstico. No se verificó entregabilidad.
- **Mensaje (64 palabras, no enviado):**

  > En FUZION vi una capacidad muy amplia —factibilidad, pliegos, auditorías y project management— respaldada por proyectos concretos. Hoy esas especialidades aparecen en una sola secuencia extensa y el contacto queda al final, sin un recorrido por necesidad. Preparé tres observaciones para ordenar esa entrada B2B sin simplificar la propuesta técnica. ¿Te sirve que te comparta el Diagnóstico Digital breve?

---

## 3. DUARQ SRL — GO

**Fuentes y capturas:** [sitio público](https://duarq.com/), [desktop](../../artifacts/prospeccion/lote-01/duarq-home-desktop.png), [mobile](../../artifacts/prospeccion/lote-01/duarq-home-mobile.png).

### Qué revisamos

Home, menú, obras, estudio, consultoría, contactos, footer y mobile. No se completó el formulario de comentarios que aparece separado del contacto comercial.

### Lo que ya funciona

- La oferta cubre proyectos, obra, asesoramiento y consultoría para ámbitos residenciales, comerciales, industriales y hospitalarios.
- Hay varias direcciones de email corporativo y teléfonos publicados, además de una ubicación física en CABA.

### Prioridad 1 — presencia comercial heredada y credibilidad visual

- **Hecho:** se ven referencias a WordPress.com, un bloque de comentarios en vez de un formulario comercial y emails con sintaxis visible como `_{contacto@duarq.com.ar}`. La captura mobile conserva una composición de plantilla/archivo técnico y tipografías muy dispares.
- **Por qué importa:** la capacidad profesional existe en el texto, pero la interfaz no ofrece una presentación equivalente para quien evalúa una firma de arquitectura/construcción.
- **Recomendación:** diseñar una web comercial contemporánea con servicios, sectores, portfolio y datos corporativos normalizados.
- **Dificultad:** Alta.
- **Servicio Reac:** Web Comercial.

### Prioridad 2 — ruta de consulta fragmentada

- **Hecho:** aparecen cuatro emails y dos teléfonos dentro de Contacto; el único formulario visible en la página es un bloque de comentarios de la plataforma, no una solicitud de proyecto.
- **Por qué importa:** una persona nueva debe decidir a qué dirección escribir sin una guía por tipo de necesidad.
- **Recomendación:** unificar el primer contacto en una consulta de proyecto con selector de servicio/sector y reglas de derivación internas que se definan con DUARQ.
- **Dificultad:** Media.
- **Servicio Reac:** Landing + Conversión como fase dentro del rediseño.

### Valor económico del problema

**Oportunidad alta.** No se trata de un microajuste: la presencia pública requiere una actualización completa para alinear portfolio, variedad de especialidades y contacto. El alcance justifica una conversación de proyecto si la empresa está abierta a renovar su sitio.

### Qué venderíamos

- **Servicio de entrada:** Web Comercial.
- **Upsell posible:** Seguimiento + Automatización sólo si, en una reunión, confirman volumen/derivación de consultas que requiera una operación más formal.

### Alcance hipotético

Nueva arquitectura de páginas; propuesta por tipo de obra; portfolio con filtros/casos; credenciales y equipo; contacto unificado; normalización de emails/CTAs; SEO técnico y medición básica. No asumir CRM ni automatización hasta mapear el proceso real.

### Diagnóstico de una página listo para entregar

**DUARQ SRL**
**Qué revisamos:** presencia pública, servicios, obras, contactos y recorrido mobile.

**Lo que ya funciona:** cobertura técnica amplia; varios canales y ubicación empresarial visibles.

**Prioridad 1:** la interfaz conserva artefactos de plataforma y presentación inconsistente. **Recomendación:** reemplazarla por una web comercial que traduzca los servicios a sectores y casos.

**Prioridad 2:** los canales están dispersos y el formulario visible no es comercial. **Recomendación:** crear una única entrada de proyecto con derivación clara.

**Próximo paso recomendado:** definir qué tres sectores/servicios quieren priorizar y rediseñar la presencia alrededor de ellos.

### Guion de video (3–5 min)

- **0:00–0:20:** “Revisé DUARQ para entender cómo se presenta su capacidad de obra y consultoría a una empresa nueva.”
- **0:20–0:50:** reconocer servicios de estudio, obra y consultoría, más los canales publicados.
- **0:50–2:10:** mostrar referencias de plataforma, estilo visual heterogéneo y el formulario de comentarios separado.
- **2:10–3:10:** mostrar los cuatro emails/dos teléfonos sin una entrada única para proyecto.
- **3:10–4:10:** ordenar: definir sectores prioritarios, diseñar casos/servicios, unificar consulta; automatización sólo si se valida operación.
- **Final:** “Si les sirve, podemos conversar sobre cómo modernizar esta presencia sin perder la amplitud técnica que ya tienen.”

### Canal y mensaje revisado

- **Canal recomendado:** email `contacto@duarq.com.ar`, publicado como cuenta corporativa. No se verificó entregabilidad.
- **Mensaje (67 palabras, no enviado):**

  > En DUARQ se ve una oferta amplia de obra, estudio y consultoría, pero la presencia actual conserva referencias de WordPress.com, emails con sintaxis visible y un formulario de comentarios separado del contacto comercial. Para una firma que trabaja proyectos residenciales, industriales y hospitalarios, ahí hay una oportunidad de presentación y recorrido. ¿Te comparto un Diagnóstico Digital breve con tres prioridades concretas?

---

## 4. Edgardo Gargiulo A&A — HOLD

**Fuentes y capturas:** [sitio público](https://www.gargiuloarquitectos.com.ar/), [desktop](../../artifacts/prospeccion/lote-01/gargiulo-home-desktop.png), [mobile](../../artifacts/prospeccion/lote-01/gargiulo-home-mobile.png).

### Qué revisamos

Home, servicios, portfolio, preguntas frecuentes, CTA de WhatsApp, footer y versión mobile.

### Lo que ya funciona

- La propuesta se entiende rápido: arquitectura, planificación y dirección de obra en Mendoza, con más de 30 años declarados.
- Tiene servicios diferenciados, FAQ, proyectos y CTA de consulta. La captura mobile no muestra desborde horizontal.

### Prioridad 1 — jerarquía vertical y espacios sin contenido

- **Hecho:** las capturas desktop y mobile contienen separaciones verticales muy extensas entre servicios, CTA y módulos de confianza; el documento desktop mide 14.617 px de alto.
- **Por qué importa:** no prueba una caída de conversión, pero puede diluir la continuidad entre servicio, prueba y acción para una consulta nueva.
- **Recomendación:** revisar espaciados y secuencia de módulos con una prueba de lectura; acercar evidencia/CTA a cada servicio prioritario.
- **Dificultad:** Media.
- **Servicio Reac:** Web Comercial.

### Prioridad 2 — CTA único a WhatsApp

- **Hecho:** las llamadas a acción visibles “Solicitar consultoría” dirigen a WhatsApp; no se observó un formulario de proyecto equivalente en la página revisada.
- **Por qué importa:** WhatsApp puede ser adecuado, pero no captura contexto estructurado para servicios distintos desde la web pública.
- **Recomendación:** mantener WhatsApp y sumar un formulario breve/alternativa de consulta por proyecto; validar con el equipo qué canal prefieren operar.
- **Dificultad:** Baja–Media.
- **Servicio Reac:** Landing + Conversión, sólo si confirman interés.

### Valor económico del problema

**Oportunidad media.** Hay mejoras plausibles de jerarquía y entrada de contacto, pero no una falla inequívoca del nivel de Andino o DUARQ. Antes de outreach conviene contar con una observación aún más ligada al servicio que quieren vender.

### Qué venderíamos

- **Servicio de entrada:** Web Comercial, sólo como conversación exploratoria de optimización.
- **Upsell posible:** ninguno identificado con evidencia actual.

### Alcance hipotético

Auditoría de jerarquía y recorrido; compactación de módulos; CTA contextual por servicio; formulario/alternativa de consulta; selección de casos y pruebas de confianza. No requiere reconstrucción total sin una conversación de objetivos.

### Diagnóstico de una página listo para entregar

**Edgardo Gargiulo A&A**
**Qué revisamos:** propuesta, servicios, proyectos, FAQ, CTA y navegación mobile.

**Lo que ya funciona:** propuesta comprensible, trayectoria declarada, servicios y consulta por WhatsApp visibles.

**Prioridad 1:** secuencia muy espaciada entre contenido clave. **Recomendación:** compactar y conectar servicio, prueba y CTA.

**Prioridad 2:** consulta sólo por WhatsApp en el recorrido observado. **Recomendación:** decidir si sumar una alternativa breve de proyecto.

**Próximo paso recomendado:** medir/validar internamente si WhatsApp ya resuelve la calificación antes de cambiar la web.

### Guion de video (3–5 min)

- **0:00–0:20:** “Revisé cómo una persona llega a servicios y consulta desde desktop y móvil.”
- **0:20–0:50:** destacar propuesta clara, trayectoria, FAQ y CTA existente.
- **0:50–2:10:** mostrar la distancia vertical entre módulos y explicar que es una oportunidad de continuidad, no un fallo probado.
- **2:10–3:00:** señalar que WhatsApp es la única ruta observada y que conviene confirmar si cubre el contexto necesario.
- **3:00–4:00:** priorizar primero la validación del proceso actual y luego ajustes de jerarquía/alternativa de contacto.
- **Final:** “Si les sirve, podemos conversar sobre cómo contrastar esto con el modo en que reciben y priorizan consultas hoy.”

### Canal y mensaje revisado

- **Canal recomendado:** **HOLD**. WhatsApp es el CTA publicado, pero no es el mejor primer canal para una hipótesis aún moderada; no se preparará envío.
- **Mensaje anterior:** descartado para uso inmediato, porque se apoyaba en los contadores `+0` del HTML inicial, no en una falla visual persistente.

---

## 5. Lovera Lufft Arquitectura — DROP

**Fuentes y capturas:** [sitio público](https://www.loveralufft.com/), [desktop](../../artifacts/prospeccion/lote-01/lovera-formulario-desktop.png), [mobile](../../artifacts/prospeccion/lote-01/lovera-formulario-mobile.png).

### Qué revisamos

Home, nosotros, obras terminadas/en ejecución/en proyecto, métricas, formulario, contacto/footer y mobile.

### Lo que ya funciona

- La división entre obras terminadas, en ejecución y en proyecto comunica actividad y portfolio de manera inmediata; la navegación mobile es limpia.
- La página presenta responsables, ubicación, teléfonos, emails y un formulario simple y visible.

### Prioridad 1 — métricas públicas en cero

- **Hecho:** la captura muestra `0` para “M2 obras construidas” y `0` para “M2 obras en proyecto y ejecución”, aun cuando el sitio muestra proyectos y obras en curso.
- **Por qué importa:** puede resultar incoherente con el portfolio, pero no conocemos qué dato desean publicar ni si la métrica es deliberada.
- **Recomendación:** revisar la decisión de mostrar esas métricas y corregirlas o eliminarlas si no son datos que quieran sostener.
- **Dificultad:** Baja.
- **Servicio Reac:** Web Comercial, pero como ajuste pequeño, no como proyecto suficiente.

### Prioridad 2 — formulario sin contexto de proyecto

- **Hecho:** el formulario pide nombre y apellido, celular y e-mail, sin mensaje, tipo de obra ni etapa de consulta.
- **Por qué importa:** puede limitar la información disponible antes de responder, pero la web ofrece otros canales y no hay evidencia de que eso sea un problema para el equipo.
- **Recomendación:** si la empresa lo considera útil, añadir un único selector/campo de proyecto; validar antes su proceso de respuesta.
- **Dificultad:** Baja.
- **Servicio Reac:** Landing + Conversión, sólo si surge un objetivo comercial mayor.

### Valor económico del problema

**Oportunidad baja.** La identidad, portfolio, estados de obra y responsive se perciben bien resueltos. Las dos mejoras encontradas son pequeñas y no justifican por sí solas un proyecto de Reac ni un outreach frío de alta calidad.

### Qué venderíamos

- **Servicio de entrada:** ninguno ahora.
- **Upsell posible:** no corresponde sin una necesidad explícita de campaña o calificación comercial.

### Alcance hipotético

Sólo una mejora puntual de métricas/formulario si la empresa manifiesta una necesidad. No preparar una propuesta ni intentar convertirla en rediseño completo.

### Diagnóstico de una página listo para entregar

**Lovera Lufft Arquitectura**
**Qué revisamos:** portfolio, estados de obra, formulario, datos de contacto y versión mobile.

**Lo que ya funciona:** portfolio ordenado por estado; identidad y datos de contacto claros; mobile sólido.

**Prioridad 1:** dos métricas visibles están en cero. **Recomendación:** validar/corregir o retirar esos valores.

**Prioridad 2:** el formulario no recoge contexto. **Recomendación:** cambiarlo sólo si el equipo necesita calificar consultas antes de responder.

**Próximo paso recomendado:** no priorizar una intervención digital sin que aparezca una necesidad comercial mayor.

### Guion de video (3–5 min)

- **0:00–0:20:** “Revisé el recorrido de portfolio a contacto, especialmente en mobile.”
- **0:20–0:50:** destacar la separación por estado de obra, identidad y navegación.
- **0:50–1:50:** señalar las métricas en cero y enmarcarlas como una decisión a validar, no como un daño demostrado.
- **1:50–2:40:** mostrar que el formulario no contiene contexto y explicar que sólo vale cambiarlo si la operación lo necesita.
- **2:40–3:20:** concluir que no recomiendo una intervención amplia hoy.
- **Final:** “Si más adelante necesitan captar o calificar un tipo de encargo específico, podemos revisar ese recorrido puntual.”

### Canal y mensaje revisado

- **Canal recomendado:** ninguno. Estado **DROP**.
- **Mensaje anterior:** descartado. El problema disponible no es lo bastante importante para justificar un primer contacto frío útil y respetuoso.

---

## GO / HOLD / DROP

| Estado | Empresa | Decisión |
| --- | --- | --- |
| GO | Andino Construcciones | Problema mobile reproducible, formulario confuso y portfolio/servicios con alcance suficiente para Web Comercial. |
| GO | FUZION Arquitectura | Fuerte capacidad B2B y portfolio, con oportunidad clara de ordenar oferta, CTA y recorrido. |
| GO | DUARQ SRL | La actualización requerida es estructural y sujeta a una propuesta clara de Web Comercial. |
| HOLD | Edgardo Gargiulo A&A | Mejoras reales, pero evidencia económica todavía moderada; no sostener outreach con el error de contadores inicial. |
| DROP | Lovera Lufft Arquitectura | El sitio funciona bien en lo esencial; los hallazgos son ajustes pequeños, no un proyecto convincente. |

## Prospecto que contactaría primero

### Andino Construcciones

Es el caso con evidencia más contundente y menos especulativa: hay un desborde medible en 390 px, navegación truncada en captura y un estado de formulario visible antes de cualquier envío. Además, la empresa tiene una oferta que justifica ordenar portfolio, responsive y contacto como proyecto coherente.

### Mensaje que usaría

> Al revisar Andino en móvil, el sitio queda con un ancho de 1.049 px en una pantalla de 390 px y la navegación se corta horizontalmente. También el formulario exhibe la confirmación antes de enviarlo. Para una firma con obras, planos y desarrollos, es un recorrido que vale la pena ordenar. ¿Te comparto un Diagnóstico Digital breve con tres prioridades?

No fue enviado.

## Si responde “sí”

1. **Respuesta:** agradecer y aclarar que se enviará una revisión breve, no una propuesta ni una auditoría exhaustiva.
2. **Diagnóstico:** completar la página de Andino de este documento con tres capturas/citas y revisar una vez más el estado público del sitio el día de entrega.
3. **Entrega:** enviar un PDF de una página o video de 3–5 minutos que muestre responsive, formulario y prioridad de portfolio/CTA; evitar afirmar efectos no medidos.
4. **Siguiente paso:** proponer una conversación de 20 minutos sólo para confirmar objetivo comercial, categorías prioritarias, cómo procesan consultas y si un alcance de Web Comercial tiene sentido. Si no hay fit, cerrar la conversación sin propuesta.

## Archivos creados

- [Informe de microdiagnósticos](lote-01-top5-diagnosticos.md)
- [Capturas y reporte técnico](../../artifacts/prospeccion/lote-01/capture-report.json)
- Script local reproducible de captura: `artifacts/prospeccion/capture-lote-01.mjs`

## Producción

- 0 mensajes enviados.
- 0 formularios enviados.
- 0 interacciones con prospectos.
- 0 deploys.
- 0 pushes.
- 0 commits.
- 0 cambios en producción.
