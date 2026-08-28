# Hero — Reac Studio

**Título**
> Ordená tu negocio
> en tres clics.

**Subtítulo**
> Marketing, web y automatización con IA en un solo lugar. Hacemos que te encuentren, te escriban y te compren — sin que tengas que estar atrás de todo.

**CTA (botón primario)**
> Escribinos →

**CTA secundario**
> Ver servicios

**Microcopy (debajo de los botones)**
> Sin compromiso · Te respondemos en el día

---

## Notas
- Tono: cercano argentino (voseo) + premium-brutalista.
- "en tres clics" va con gradiente (acento de color) para resaltar.
- El guion largo (—) del subtítulo es intencional, no reemplazar por coma.
- Pendiente: cuando haya números (ej. "duplicamos consultas en 90 días"),
  reforzar el subtítulo para más impacto.

## Dónde vive en el código
`Reac.dc.html`
- Título: función `buildTitle()` (~línea 851), array `segs`.
- Subtítulo: `<p class="hero-sub">` (~línea 208).
- CTA + microcopy: bloque de botones del hero (~línea 209-212).
