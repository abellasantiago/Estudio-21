# Fotos del equipo

Una foto por persona. El nombre del archivo = el `slug` de la persona:

```
src/assets/equipo/gustavo-abella.jpg
src/assets/equipo/guillermo-tosi.jpg
src/assets/equipo/lucia-arrieta.jpg
src/assets/equipo/santiago-abella.jpg
src/assets/equipo/sofia-tosi.jpg
src/assets/equipo/federico-cardozo.jpg
```

- Formatos aceptados: `jpg`, `jpeg`, `png`, `webp`, `avif`.
- Ideal en formato vertical / retrato (la card usa proporción 4:5), ~800×1000 px o más.
- Son **recortes sobre transparencia**: traer el archivo CON alfa (png o webp).
  Después correr `node scripts/optimizar-fotos.mjs`, que los pasa a AVIF
  conservando el alfa — en estos archivos es la conversión que más pesa: los
  seis retratos bajaron de 2,8 MB a 270 KB.
- Si se cambia una foto hay que volver a medir su encuadre (`zoom`/`x`/`y` en
  `equipo.ts`): ver "Equipo · encuadre de los retratos" en `CLAUDE.md`.
- Mientras no haya foto, se muestra un placeholder con las iniciales.

Los slugs se definen en [`src/data/equipo.ts`](../../data/equipo.ts).
