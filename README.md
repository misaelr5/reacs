# Reac Studio

Sitio comercial estático con HTML completo y función de contacto en Vercel. Dominio configurado: https://reacs-studio.vercel.app.

**Para retomar la activación:** [pendientes en orden de ejecución](docs/PENDIENTES.md). Las cuentas Resend/Upstash quedan para la próxima sesión.

## Desarrollo

Requiere Node.js 24 y npm:

```powershell
npm ci --ignore-scripts
npm run build
npm run dev
```

Abrir http://127.0.0.1:4174. El servidor está limitado a esta computadora. Reconstruir después de editar contenido y reiniciar el servidor después de cambiar configuración o backend; no hay hot reload.

## Arquitectura

- `Reac.dc.html`: fuente de la home; el build sincroniza `index.html`.
- `content/services.mjs`: seis páginas de servicios.
- `content/editorial.mjs`: publicaciones revisadas; borradores excluidos.
- `site.config.mjs`: dominio, identidad, contactos, medición y clave pública IndexNow.
- `reac-home.css`, `reac-pages.css`, `reac-site.css`: presentación.
- `reac-ui.js`: interacciones; `reac-site.js`: consentimiento, medición y contacto.
- `scripts/build.mjs`: genera `dist/`, metadata, schema, sitemap y robots con una lista de archivos permitidos.
- `lib/contact.ts`, `api/contact.ts`: validación, antispam y entrega del lado servidor.
- `vercel.json`: build, rutas y encabezados.

`support.js` y el script Python antiguo son históricos y no intervienen en la publicación. No ejecutar Python para construir esta versión. Los cuatro recursos HTML/PDF conservan sus URLs; los PDF no se regeneraron.

## Configuración

Copiar `.env.example` a `.env.local` para desarrollo y configurar las variables también en Vercel. Nunca incluir secretos en HTML o Git.

Contacto requiere `RESEND_API_KEY`, `CONTACT_FROM` (remitente verificado), `CONTACT_TO`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` y `CONTACT_RATE_LIMIT_SECRET` (secreto aleatorio de al menos 32 caracteres). Sin configuración devuelve un error seguro. Newsletter permanece deshabilitado.

`SITE_URL` es un origen HTTPS sin ruta. Se usa en canonical, schema, sitemap, robots y validación de origen del backend. `npm run build` no carga `.env.local`: para cambiar el origen localmente definir `$env:SITE_URL` en PowerShell y quitarlo al finalizar. Vercel usa sus variables de entorno.

Los tokens Google/Bing y la clave de propiedad IndexNow son públicos. Los datos legales y perfiles pendientes deben completarse con información real.

## Validación

```powershell
npm run build
npm run lint
npm run typecheck
npm test
npm run test:browser
node tests/performance.mjs
node tests/build-config.mjs
node scripts/security-scan.mjs
npm audit
git diff --check
```

Navegador y performance requieren servidor en 4174 y Chrome instalado. Playwright viene con la herramienta de accesibilidad. `lint` es comprobación sintáctica y estructural propia, no ESLint. TypeScript comprueba backend y pruebas TS. Las pruebas de entrega y analytics usan proveedores simulados, sin mensajes reales.

## Publicación

Vercel instala con `npm ci --ignore-scripts`, construye con `npm run build`, publica `dist/` y despliega `api/contact.ts`. Verificar READY, HTTP, rutas, CSP y recepción real después de publicar. Completar privacidad antes de activar captación.

```powershell
npm run indexnow -- /desarrollo-web /google-ads
```

Ese comando solo muestra el payload. Después de publicar el archivo de propiedad, agregar `--submit` para enviarlo. No se envía automáticamente durante el build.

Ver [informe y checklist](docs/production-readiness.md) e [investigación inicial](docs/seo-research.md). Esta versión aún no fue verificada en producción.
