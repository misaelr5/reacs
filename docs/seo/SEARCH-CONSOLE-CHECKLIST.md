# Acciones externas para Misael

Ejecutar sobre la versión publicada. Las casillas abiertas no implican que se haya accedido o configurado ninguna cuenta.

## Dominio y publicación

- [x] Publicar la versión validada y comprobar el estado READY del despliegue de Vercel. Completado el 20/09/2026; detalle en `SEO-IMPLEMENTATION.md`.
- [x] Conectar y verificar `www.reacstudio.com` en Vercel. TLS corregido y verificado el 20/09/2026, sin cambios de DNS.
- [x] Comprobar HTTP, www HTTPS y alias histórico: terminan en `https://reacstudio.com/`, preservando ruta/parámetros cuando corresponde. Portada www e internas devuelven 308 al dominio principal.
- [x] Verificar en producción las 17 páginas indexables, incluidos los siete servicios, robots, sitemap, variantes con slash y URL inexistente. Estados 200/308/404 correctos y sin X-Robots-Tag noindex en páginas comerciales.
- [ ] Si existen previews públicos, comprobar su protección y política de indexación en Vercel sin exponerlos como contenido de producción.

## Google Search Console

- [ ] Verificar propiedad de dominio `reacstudio.com` mediante DNS. Si se usa prefijo de URL, elegir exactamente `https://reacstudio.com/`; el campo `GOOGLE_SITE_VERIFICATION` admite el token público real.
- [ ] Enviar `https://reacstudio.com/sitemap.xml` y comprobar lectura correcta; la versión nueva contiene 17 URLs indexables, salvo futuras publicaciones revisadas.
- [ ] Inspeccionar home con prueba en vivo. Comparar canonical declarada y seleccionada por Google; revisar HTML renderizado y recursos accesibles.
- [ ] Inspeccionar y solicitar indexación de `/landing-pages`, `/desarrollo-web`, `/marketing-digital`, `/automatizacion-ia`, `/google-ads`, `/meta-ads`, `/sistemas-crm`, `/nosotros` y `/contacto` según prioridades. Una solicitud no garantiza indexación.
- [ ] Revisar Pages/Indexing: errores 404 reales, duplicados, canonical alternativa, “rastreada/descubierta sin indexar” y bloqueos. Mantener noindex intencional en gracias/404/privacidad; no desbloquear páginas privadas.
- [ ] Revisar Core Web Vitals móvil y desktop. Si faltan datos de campo, registrar esa ausencia; no reemplazarlos con una puntuación de laboratorio.
- [ ] Revisar el estado HTTPS donde esté disponible y contrastar con las pruebas del dominio/certificado.
- [ ] En rendimiento, segmentar consultas de marca: `reac studio`, `reacstudio`, `REAC Studio`, `reac studio argentina`, `reac studio desarrollo web`, `reac studio marketing`, `reacstudio.com`.
- [ ] Registrar impresiones, clics, CTR, posición y páginas por consulta/dispositivo/país; comparar períodos completos equivalentes. Separar marca de consultas comerciales sin marca.
- [ ] Revisar semanalmente al inicio, registrar fecha de publicación y cambios, y evitar atribuir oscilaciones de un día a una modificación aislada.
- [ ] Revisar Settings → Search generative AI → Include conforme al objetivo del negocio y la [documentación actual](https://support.google.com/webmasters/answer/16908024). No se cambió esta opción desde el repositorio.
- [ ] Consultar el informe de rendimiento de IA generativa si aparece en la propiedad. La [guía oficial](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) enlaza los controles e informes vigentes; contrastar disponibilidad real en la cuenta.

## Validación pública de identidad

- [ ] En [Schema.org Validator](https://validator.schema.org/), validar la home y una página de servicio publicada: WebSite, Organization, WebPage, Service, breadcrumbs e IDs.
- [ ] Usar [Rich Results Test](https://search.google.com/test/rich-results) para tipos actualmente soportados. No usarlo como prueba de site name: Google indica que WebSite/site names no están soportados allí. No esperar FAQ rich results.
- [ ] Revisar favicon, nombre y descripciones de previews sociales con la URL publicada. Solicitar actualización de caché sólo si la plataforma muestra contenido anterior.

## Bing y búsquedas con IA

- [ ] Verificar propiedad en Bing Webmaster Tools, importar desde Search Console si corresponde o utilizar el token público real `BING_SITE_VERIFICATION`.
- [ ] Enviar sitemap e inspeccionar las páginas prioritarias; revisar indexación, errores y canonical.
- [ ] Después de publicar, revisar el archivo público de propiedad IndexNow y previsualizar sólo URLs nuevas/modificadas/eliminadas. Enviar explícitamente con `--submit` cuando el payload coincida con los cambios publicados. Aceptación HTTP no equivale a indexación.
- [ ] Revisar WAF/firewall/logs si hay fallos de acceso de crawlers verificados. No abrir rutas privadas para permitir búsqueda.
- [ ] Probar periódicamente consultas de marca y servicio en Google, Bing y asistentes con búsqueda, registrando fecha, consulta, enlaces citados y limitaciones. No convertir una respuesta aislada en una métrica de autoridad.

## Google Business Profile y redes

- [ ] Confirmar si existe un Google Business Profile y si el negocio cumple los [requisitos de elegibilidad](https://support.google.com/business/answer/13763036). Un negocio sólo online no justifica inventar atención presencial u oficina.
- [ ] Si es elegible y existe, usar nombre real `Reac Studio` sin keywords añadidas, web `https://reacstudio.com/`, categoría apropiada, descripción y servicios reales, logo y datos de contacto coherentes.
- [ ] Verificar en Instagram y TikTok nombre, logo, descripción y enlace al dominio oficial. TikTok no pudo verificarse completamente por metadatos durante la auditoría.
- [ ] Obtener la URL oficial exacta de Facebook. La antigua `profile.php?id=reacstudio` llevaba a Facebook genérico y fue retirada; no sustituirla por una URL deducida.
- [ ] Asegurar que los perfiles oficiales enlacen al dominio correcto y que cualquier dato empresarial público coincida entre canales.

## Confianza y contacto

- [ ] Confirmar datos legales, responsable del tratamiento, proveedores, retención y textos de privacidad con información real y revisión pertinente.
- [ ] Configurar/verificar Resend y Upstash en el entorno servidor y realizar una consulta de prueba autorizada hasta la recepción. Probar WhatsApp y email publicados.
- [ ] Confirmar permisos para capturas y casos; reunir tecnologías, alcance, fechas y resultados verificables antes de publicar nuevas afirmaciones. Mantener identificados los proyectos académicos/personales.
- [ ] Confirmar vigencia y alcance de las referencias de precios existentes antes de promocionarlas.
