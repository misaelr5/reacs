# Pendientes para activar Reac Studio

Estado al 7 de septiembre de 2026: implementación y pruebas locales listas. Resend y Upstash se posponen por decisión de Misael. No hay credenciales de esos servicios configuradas; el formulario no confirma envíos ficticios. WhatsApp y email siguen como vías alternativas. Newsletter permanece deshabilitado.

## Próxima sesión: contacto y privacidad

- [ ] Crear cuenta Resend y verificar un remitente permitido. Si requiere dominio propio, confirmar primero su propiedad y DNS; no usar un remitente inventado.
- [ ] Crear Redis en Upstash y obtener URL/token REST.
- [ ] En Vercel, configurar `RESEND_API_KEY`, `CONTACT_FROM`, `CONTACT_TO`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y `CONTACT_RATE_LIMIT_SECRET` (aleatorio, mínimo 32 caracteres). Guardar claves únicamente en variables privadas.
- [ ] Mantener `SITE_URL=https://reacs-studio.vercel.app` hasta tener dominio definitivo. Para probar formularios en otro origen desplegado, configurar el origen de ese entorno de forma coherente.
- [ ] Completar y revisar los datos legales y la política de retención en privacidad.
- [ ] Reconstruir/desplegar tras configurar variables y comprobar una consulta controlada: recepción real, error seguro y ausencia de conversiones duplicadas.

## Después: publicación y medición

- [ ] Verificar estado READY del despliegue correspondiente al commit, home nueva, páginas de servicios, 404, CSP y API.
- [ ] Verificar Search Console y Bing, completar tokens públicos de `.env.example`, reconstruir y enviar `/sitemap.xml`.
- [ ] Validar GA4 y consentimiento en la cuenta real; configurar `contact_form_submit` como evento clave. WhatsApp/email son clics, no ventas.
- [ ] Revisar atribución UTMs/GCLID y consentimiento antes de activar campañas Ads.
- [ ] Comprobar archivo público IndexNow y ejecutar dry run antes de enviar URLs modificadas.
- [ ] Confirmar perfiles sociales oficiales y completar `socialProfiles`.
- [ ] Preparar dominio propio y redirects cuando corresponda. Business Profile solo si el negocio cumple sus requisitos reales.

## Cómo retomar

Pedir: «Retomemos docs/PENDIENTES.md: configuremos contacto y validemos una consulta real». No pegar secretos en el chat.

Desarrollo: `npm ci --ignore-scripts`, `npm run build`, `npm run dev`; abrir http://127.0.0.1:4174.

Validación de código: `npm run lint`, `npm run typecheck`, `npm test`. El README explica las pruebas adicionales y el informe registra resultados y límites.

Referencia: [informe completo](production-readiness.md), [guía técnica](../README.md), [variables necesarias](../.env.example).
