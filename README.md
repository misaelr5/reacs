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
- `scripts/fix-parallax.py`: inyección idempotente del ajuste de viewport del parallax.
- `vercel.json`: build, rewrite de `/gracias` y headers básicos.

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
python -m py_compile scripts/fix-parallax.py
python scripts/fix-parallax.py
git diff --check
```

Para una revisión visual, probar al menos 390 px y 1440 px de ancho, teclado, `prefers-reduced-motion`, formularios y el desplazamiento completo hasta el footer.

## Parallax y performance

El parallax usa un único ciclo `requestAnimationFrame` por frame de scroll y actualiza las capas con `translate3d`. Las mediciones de layout se hacen sólo cuando cambia el viewport o se detecta el contenedor scrolleable.

En mobile se ocultan las dos capas lejanas y se conserva una sola capa frontal. Los filtros complejos de imagen se reemplazan por opacidad y overlays CSS para reducir rasterización y consumo de GPU.

## Configuración pendiente

Antes de producción hay que reemplazar `FORM_ENDPOINT` en `reac-site.js` por el endpoint real de Formspree y probar la recepción de mensajes. También deben completarse los datos legales de la política de privacidad y configurar el DNS del dominio oficial.

## Deploy en Vercel

El proyecto usa:

```json
{
  "buildCommand": "python scripts/fix-parallax.py",
  "outputDirectory": "."
}
```

El build no debe borrar ni regenerar assets sin verificar sus referencias. `/gracias` se resuelve mediante el rewrite de `vercel.json`.

## Estado

La rama de trabajo contiene las mejoras de SEO, responsive, accesibilidad, conversión, analytics, carrusel de proyectos, equipo y performance del parallax. Los bloqueadores externos —Formspree, DNS, datos legales y deploy final— deben resolverse antes de considerar el sitio listo para producción.
