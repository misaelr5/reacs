# Reac Studio

Sitio web estático de Reac Studio para presentar servicios de marketing digital, desarrollo web, automatizaciones y recursos de diagnóstico.

## Stack

- HTML estático.
- Runtime declarativo incluido en `support.js`.
- CSS y JavaScript propios, sin `package.json` ni build de Node.
- Vercel como hosting.
- GA4 cargado sólo en producción y después del consentimiento del visitante.
- Formspree preparado para contacto y newsletter.

## Archivos principales

- `Reac.dc.html`: fuente editable con el runtime declarativo.
- `index.html`: salida publicada que sirve el sitio.
- `reac-site.css`: estilos compartidos, responsive, accesibilidad y performance.
- `reac-site.js`: consentimiento, analytics, formularios y eventos de conversión.
- `support.js`: runtime del sitio.
- `vercel.json`: salida estática, rewrite de `/gracias` y headers básicos.

Cuando una modificación afecta el markup visible, actualizar ambos HTML principales y verificar que no queden divergencias accidentales.

## Desarrollo local

Desde la raíz del repositorio:

```powershell
python -m http.server 4173
```

Abrir [http://localhost:4173/](http://localhost:4173/).

El sitio funciona como archivos estáticos; no se requiere instalar dependencias para visualizarlo.

## Validaciones

```powershell
node --check reac-site.js
git diff --check
```

Para una revisión visual, probar al menos 390 px y 1440 px de ancho, teclado, `prefers-reduced-motion`, formularios y el desplazamiento completo hasta el footer.

## Escena Digital Systems y performance

La escena de cables LED usa SVG Bézier multicapa, CSS y un único ciclo `requestAnimationFrame` por frame de scroll. Los planos de fondo, medio y primer plano se mueven mediante `transform`, sin dependencias 3D ni renders React por cada píxel.

En mobile se reduce la cantidad de cables y el costo de los filtros. La composición mantiene contenido legible y respeta `prefers-reduced-motion`.

## Configuración pendiente

El formulario de contacto y el newsletter usan el endpoint de Formspree configurado en `reac-site.js`. Después de publicar, conviene hacer un envío real desde producción y confirmar la recepción en el email destino. También deben completarse los datos legales de la política de privacidad y configurar el DNS del dominio oficial.

## Deploy en Vercel

El proyecto usa:

```json
{
  "outputDirectory": "."
}
```

El build no debe borrar ni regenerar assets sin verificar sus referencias. `/gracias` se resuelve mediante el rewrite de `vercel.json`.

## Estado

La rama de trabajo contiene las mejoras de SEO, responsive, accesibilidad, conversión, analytics, carrusel de proyectos, equipo y la escena de infraestructura digital. Los bloqueadores externos —DNS y datos legales— deben resolverse antes de considerar el sitio listo para producción.
