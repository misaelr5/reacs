# Sistema comercial local — Diagnóstico Digital

**Estado:** borrador operativo local. No es una campaña activa, no autoriza búsqueda de empresas ni contacto.

## Principio operativo

El Diagnóstico Digital no es un servicio adicional ni una auditoría técnica exhaustiva. Es una revisión manual, breve y honesta para decidir si existe un problema comercial observable que Reac puede ayudar a resolver. Cada observación debe basarse en evidencia pública o en información aportada por la empresa; las hipótesis se etiquetan como hipótesis.

## ICP

### ICP principal de validación (30 días)

**Empresas de servicios B2B de Argentina que cotizan por WhatsApp, email o formulario y tienen una presencia digital desactualizada, confusa o desconectada.**

Foco inicial: Córdoba y empresas remotas donde haya un decisor o canal comercial identificable. No es un vertical rígido: la condición de entrada es vender servicios de valor medio o alto, recibir consultas y depender de presupuestos.

Por qué primero:

- El dolor es visible en la web, los CTA, WhatsApp y el recorrido de presupuesto.
- Reac puede ofrecer web, captación y seguimiento como módulos relacionados, sin forzar un paquete único.
- Es sencillo formular una observación concreta sin inventar resultados.
- Permite producir casos sobre recorridos, no sólo sobre diseño.

No tomar como ICP independiente “empresas que pautan”, “web desactualizada” o “usan WhatsApp”: son señales para priorizar dentro del ICP.

### ICP secundarios

1. **Estudios profesionales con servicios consultivos**: arquitectura, ingeniería, contabilidad, consultoría o despachos que reciben consultas cualificadas. Tienen alta necesidad de confianza y claridad, pero ciclos de decisión potencialmente más lentos.
2. **Inmobiliarias locales o regionales**: alto volumen de consultas, WhatsApp y necesidad de seguimiento. Se valida en segundo lugar porque es un mercado más competido y requiere entender bien la operación comercial antes de proponer automatización.

Centros de capacitación y negocios puramente B2C quedan fuera del primer mes: pueden tener fit, pero mezclarlos reduciría el aprendizaje.

## Lead scoring (0–100)

Registrar evidencia y fecha junto a cada punto. No sumar por intuición ni penalizar una señal que no puede observarse.

| Bloque | Máximo | Señales |
| --- | ---: | --- |
| Fit | 30 | Servicio B2B o estudio profesional 10; presupuesto/cotización como flujo central 10; tamaño y complejidad comercial aparentes compatibles 10. |
| Problema observable | 35 | Sin web o web débil 8; propuesta/servicios confusos 7; experiencia mobile débil 5; CTA/contacto insuficiente 5; WhatsApp como único recorrido 4; formularios/presupuesto manuales 3; tráfico o anuncios a una home genérica 3. |
| Intención o crecimiento | 20 | Campañas activas, publicaciones frecuentes, contratación, nueva sucursal/marca o expansión. Hasta 5 por señal verificable. |
| Accesibilidad | 15 | Decisor o rol comercial identificable 5; email corporativo o formulario 4; Instagram/LinkedIn activo 3; WhatsApp empresarial o canal directo 3. |

- **75–100: prioridad alta.** Personalizar y pedir permiso para enviar un Diagnóstico Digital.
- **60–74: observar/nutrir.** Registrar señal faltante y revisar en 30 días; no insistir.
- **Menos de 60: no prospectar todavía.** No hay suficiente fit, dolor o canal responsable.

Regla adicional: un score alto no autoriza contacto si el dato de contacto no es público, el canal no es apropiado o existe una solicitud de no contacto.

## Modelo CRM mínimo

Empezar en una sola tabla de Notion o Google Sheets. Airtable/Supabase sólo cuando haya dolor real de automatización.

| Grupo | Campos |
| --- | --- |
| Identidad | ID, empresa, URL, rubro, ciudad/región, tamaño aparente, fuente pública. |
| Contacto | Nombre/rol si es público, canal preferido, email corporativo, Instagram/LinkedIn/WhatsApp, permiso/contexto, no contactar. |
| Investigación | Score, evidencia de score, problema observable, hipótesis, fecha, investigador. |
| Pipeline | Estado, fecha primer contacto, respuesta, Diagnóstico solicitado, reunión, propuesta, valor potencial cualitativo, resultado, motivo perdido. |
| Acción | Próxima acción, fecha próxima acción, responsable, última interacción. |

Si una empresa requiere más de dos interacciones, sumar una segunda tabla `Actividades`: ID prospecto, fecha, canal, resumen, resultado y próxima acción. No guardar datos personales innecesarios ni notas sensibles.

## Pipeline

| Estado | Entrada | Salida | Próxima acción | KPI |
| --- | --- | --- | --- | --- |
| Investigado | Registro con evidencia mínima | Score calculado | Puntuar | Investigados/semana |
| Calificado | Score completo | 75+ o pasa a observar | Elegir canal y observación | % calificados |
| Seleccionado | Prioridad alta y canal legítimo | Primer mensaje preparado | Revisar personalización | Seleccionados |
| Contactado | Mensaje individual enviado | Responde, rebota o vence ventana | Registrar respuesta | Contactos |
| Respondió | Existe respuesta humana | Acepta/rechaza/deriva | Resolver o pedir permiso | Tasa respuesta |
| Diagnóstico | Permiso para enviar/revisar | Entregado y próximo paso definido | Preparar 1 página/video | Diagnósticos |
| Reunión | Reunión confirmada | Realizada, reprogramada o no-show | Preparar preguntas | Show rate |
| Propuesta | Fit alto y alcance claro | Aceptada, perdida o seguimiento | Enviar propuesta específica | Propuestas |
| Seguimiento | Propuesta abierta con próxima fecha | Ganado o perdido | Aportar dato útil o cerrar ciclo | Días sin acción |
| Ganado / Perdido | Decisión final o cierre explícito | — | Documentar aprendizaje | Cierres y motivos |

No usar “contactado” como estado permanente: toda fila activa debe tener una próxima acción y una fecha.

## SOP — Diagnóstico Digital (15–25 minutos)

1. **Contexto, 0–3 min:** empresa, servicio prioritario, cliente aparente, ciudad, objetivo comercial visible y fuente de llegada probable.
2. **Descubrimiento, 3–6 min:** buscar cómo llega una persona: Google, Maps, redes, anuncios visibles, referido o link directo. Registrar sólo lo observable.
3. **Presencia, 6–9 min:** propuesta, claridad de a quién ayudan, prueba de confianza y diferencia.
4. **Web, 9–14 min:** revisar hero, navegación, servicios, experiencia mobile, velocidad perceptual, CTA y evidencia. No ejecutar pruebas invasivas.
5. **Conversión, 14–17 min:** identificar formulario, WhatsApp, llamada, reserva o presupuesto; describir fricción concreta.
6. **Seguimiento y medición, 17–19 min:** marcar como observable, no observable o preguntable. Nunca asumir que no usan CRM/analytics sólo porque no se ve.
7. **Priorización, 19–22 min:** elegir tres fugas, explicar por qué importan y proponer una acción por fuga.
8. **Entrega, 22–25 min:** completar una página o grabar video de 3–5 minutos. Definir un único siguiente paso.

Detener el diagnóstico si no hay evidencia suficiente: “No observable” es una conclusión válida.

## Score comunicable del diagnóstico

Usar cuatro dimensiones: **Captación, Conversión, Seguimiento y Medición**. Para cada una elegir:

- **Bien:** existe un recorrido claro y evidencia suficiente.
- **Mejorable:** se observa fricción o información incompleta con impacto probable.
- **Crítico:** hay una fuga concreta que bloquea o confunde el siguiente paso.
- **No observable:** no hay evidencia pública; se confirma en reunión si procede.

No promediar ni convertirlo en un número. La salida del diagnóstico son tres prioridades, no una calificación científica.

## Plantilla de una página

```text
DIAGNÓSTICO DIGITAL
Empresa: [nombre]                         Fecha: [fecha]
Qué revisamos: [canales y páginas observadas]

Lo que ya funciona
1. [evidencia concreta]
2. [evidencia concreta]

Estado del recorrido
Captación: [Bien / Mejorable / Crítico / No observable]
Conversión: [Bien / Mejorable / Crítico / No observable]
Seguimiento: [Bien / Mejorable / Crítico / No observable]
Medición: [Bien / Mejorable / Crítico / No observable]

Tres fugas prioritarias
1. Problema: [hecho observable]
   Por qué importa: [fricción para una consulta]
   Acción recomendada: [acción acotada]
   Prioridad: [Alta / Media / Baja]

2. [mismo formato]
3. [mismo formato]

Próximo paso único
[Ej.: Antes de aumentar tráfico, recomendamos corregir el recorrido de contacto.]
```

## Guion para video de 3–5 minutos

- **0:00–0:20:** “Revisé [canales]. No es una auditoría exhaustiva: son tres prioridades para entender dónde hay más fricción.”
- **0:20–1:00:** “Primero, dos cosas que ya están funcionando: [evidencia 1] y [evidencia 2].”
- **1:00–3:30:** explicar cada fuga como hecho → impacto probable → acción sugerida. Decir “parece”, “no pude observar” o “convendría confirmar” cuando corresponda.
- **3:30–4:30:** ordenar: “Yo priorizaría primero [acción], después [acción], y recién entonces [acción].”
- **4:30–5:00:** “Si querés, vemos en una conversación corta si esto coincide con cómo trabajan hoy y si hay un alcance concreto que tenga sentido.”

## Outreach: plantillas de preparación, no envío

Toda plantilla requiere una observación real entre corchetes. Si no se puede completar, no se usa.

**Instagram DM**

> Vi que [observación concreta en perfil/sitio]. Para alguien que llega desde [canal], [fricción] puede hacer más difícil dar el próximo paso. Si te sirve, te mando una revisión breve con las tres prioridades que miraría.

**Email** — asunto: `recorrido de consultas`

> [Nombre], vi [observación específica]. No sé cómo gestionan hoy [proceso], pero desde afuera parece que [fricción] puede complicar una consulta. Preparé una revisión corta con tres prioridades posibles. ¿Te la envío?

**WhatsApp, sólo con contexto o permiso suficiente**

> Hola, [nombre]. Te escribo por [contexto verificable / presentación / consulta previa]. Noté [observación] y pensé que podía servirte una revisión breve del recorrido de contacto. ¿Querés que te la comparta?

**LinkedIn**

> [Nombre], vi [señal concreta]. Me llamó la atención [observación del recorrido], porque suele afectar cómo llega una consulta a [empresa]. ¿Te sirve que te comparta una revisión corta con tres prioridades?

No incluir links, catálogo, precios ni pedir una reunión en el primer mensaje. Una respuesta afirmativa es el CTA.

## Follow-ups

**3–4 días, aporta valor**

> Te dejo una observación adicional: [hecho útil y específico]. No hace falta responder si no es prioridad; si querés, te envío el resumen de tres puntos.

**7–10 días, cierre respetuoso**

> Cierro el tema por ahora para no insistir. Si en otro momento querés revisar [problema], respondeme con “diagnóstico” y te comparto el resumen.

## Respuestas a objeciones

| Objeción | Respuesta breve |
| --- | --- |
| Ya tenemos diseñador/agencia | “Perfecto. El diagnóstico puede servir sólo para contrastar el recorrido y priorizar; no busca reemplazar un equipo que ya funciona.” |
| No necesitamos web | “Puede ser. Antes que vender una web, miraría si el canal actual deja claro qué hacer después de una consulta.” |
| No tenemos presupuesto | “Entiendo. No hace falta avanzar ahora; puedo dejarte la prioridad que evitaría invertir en algo que todavía no resuelve el cuello de botella.” |
| Mandame precios / ¿cuánto sale? | “Depende de cuál sea el problema y del alcance. Primero confirmaría si hay fit; después puedo delimitar qué incluye y qué no.” |
| Ahora no | “De acuerdo. ¿Tiene sentido retomarlo en [mes] o prefieren dejarlo cerrado?” |
| Pasame información | “Te envío un resumen breve de qué revisamos y las tres prioridades. Si alguna aplica, conversamos sobre ese punto.” |
| Tenemos alguien para Ads | “Bien. El foco puede no ser Ads: muchas veces conviene revisar primero dónde termina una consulta y cómo se sigue.” |
| WhatsApp nos funciona | “Puede funcionar muy bien. La pregunta útil es si permite ordenar, responder y seguir cada consulta sin perder oportunidades.” |

## Reunión de 20 minutos

- **0–4 min, contexto:** confirmar objetivo, servicio prioritario y qué motivó la conversación.
- **4–16 min, descubrimiento:** ¿cómo consiguen clientes?, ¿qué servicios priorizan?, ¿qué canal trae consultas?, ¿cuánto volumen reciben?, ¿quién responde?, ¿dónde se registra?, ¿qué pasa después?, ¿cómo hacen seguimiento?, ¿qué intentaron?, ¿qué bloquea hoy?
- **16–20 min, siguiente paso:** resumir problema, urgencia y opción apropiada; acordar una única acción.

No pedir métricas sensibles ni hacer una presentación larga de Reac.

## Calificación posterior a reunión

- **Fit alto:** problema claro, impacto reconocido, interlocutor con autoridad o acceso a ella, urgencia razonable, capacidad de implementar y un servicio de Reac claramente apropiado.
- **Fit medio:** dolor real pero urgencia, autoridad, presupuesto o alcance todavía ambiguos. Mantener siguiente acción fechada.
- **No fit:** no hay problema relevante, no hay capacidad/permiso de actuar, expectativa incompatible o el servicio correcto no es de Reac.

## Estructura de propuesta

1. Contexto y evidencia del Diagnóstico Digital.
2. Problema y objetivo acordados.
3. Alcance y entregables.
4. Qué no incluye.
5. Timeline por hitos.
6. Inversión y forma de pago.
7. Responsabilidades de Reac y cliente.
8. Métricas o señales que se revisarán.
9. Próximo paso de aceptación.

Cada propuesta debe resolver una prioridad identificada; nunca partir de un catálogo genérico.

## Ofertas iniciales sin precio publicado

| Oferta | Cliente ideal y problema | Alcance / entregable | Duración de planificación | Upsell | No ofrecer si |
| --- | --- | --- | --- | --- | --- |
| Landing + Conversión | Servicio con tráfico o campañas pero recorrido de consulta débil | Landing, propuesta, CTA y ruta de contacto | 2–4 semanas según activos | Medición, Ads, seguimiento | No hay oferta clara ni capacidad de atender consultas. |
| Web Comercial | Empresa con presencia desactualizada o confusa | Arquitectura, páginas clave, servicios, contacto y base de analítica | 4–6 semanas según contenido | Landing, mantenimiento, captación | El problema principal es respuesta/seguimiento y no la web. |
| Seguimiento + Automatización | Equipo que recibe consultas pero pierde continuidad | Mapa de proceso, registro, automatización acotada y handoff | 2–4 semanas después de mapear | CRM, dashboards, capacitación | No existe un proceso mínimo ni responsable de operar el sistema. |

Los rangos son referencias de planificación, no compromisos: se validan en cada propuesta.

## Dashboard KPI semanal

Registrar números absolutos y conversiones:

| Etapa | KPI | Fórmula |
| --- | --- | --- |
| Investigación | Prospectos investigados / calificados | calificados ÷ investigados |
| Contacto | Contactos personalizados | respuestas ÷ contactos |
| Diagnóstico | Diagnósticos enviados | diagnósticos ÷ respuestas |
| Reunión | Reuniones realizadas | reuniones ÷ diagnósticos |
| Propuesta | Propuestas serias | propuestas ÷ reuniones |
| Cierre | Ganados | ganados ÷ propuestas |

Agregar: tiempo hasta primer contacto, días sin próxima acción, motivos perdidos y canal que originó cada respuesta. No medir likes como KPI comercial.

## Plan operativo de 30 días

| Semana | Objetivo | Trabajo |
| --- | --- | --- |
| 1 | Preparar y aprender | Crear CRM, rubric de score, plantilla, guion y 20–25 investigaciones autorizadas. Enviar sólo mensajes personalizados cuando exista autorización. |
| 2 | Validar | Revisar respuestas, mejorar observaciones, investigar 20–25 más y preparar diagnósticos solicitados. |
| 3 | Repetir | Completar 20–25 investigaciones, realizar reuniones calificadas y documentar objeciones reales. |
| 4 | Convertir aprendizaje | Completar 20–25 investigaciones, preparar propuestas sólo para fit alto y revisar el embudo completo. |

Referencia de aprendizaje, no garantía: 80–100 empresas investigadas, 30–40 contactos personalizados, 5 diagnósticos, 3 reuniones calificadas y una o más propuestas serias.

## Procedimiento para futuros lotes de 20 prospectos

1. Elegir un subsegmento y una ciudad por lote; no mezclar ICPs.
2. Usar búsquedas futuras como `"pedir presupuesto" + [ciudad] + [rubro]`, `[rubro] + WhatsApp + [ciudad]`, `site:linkedin.com/company [servicio] [ciudad]` o Maps para categorías específicas.
3. Excluir franquicias sin decisor local, negocios sin oferta entendible, datos no públicos, competidores directos, empresas que pidieron no contacto y scores menores a 60.
4. Registrar 20, puntuar por evidencia, elegir sólo 75+ y redactar una observación individual antes de cualquier contacto autorizado.
5. Revisar el lote a los siete días: qué señal produjo respuestas y qué señal no aportó.

## Qué haría mañana

1. Copiar la tabla CRM y la plantilla de una página a la herramienta elegida.
2. Definir un subsegmento único del ICP principal y sus exclusiones.
3. Ensayar un Diagnóstico Digital con un caso propio o ya autorizado, cronometrándolo a 25 minutos.
4. Cuando autorices investigación pública, crear el primer lote de 20 sin contactarlo todavía; puntuarlo y revisar la calidad antes de redactar mensajes.
