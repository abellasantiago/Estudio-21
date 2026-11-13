# Fotos de proyectos

Tirá las imágenes acá y aparecen solas (no hace falta tocar el `.md` del proyecto):

```
src/assets/proyectos/<slug>/portada.jpg      -> portada (imagen grande)
src/assets/proyectos/<slug>/galeria-01.jpg   -> galería
src/assets/proyectos/<slug>/galeria-02.jpg
...
```

- Formatos aceptados: `jpg`, `jpeg`, `png`, `webp`, `avif`.
- Astro genera automáticamente AVIF + WebP + `srcset` y agrega `width`/`height`
  (sin saltos de layout / CLS).
- **Después de tirar fotos nuevas, correr `node scripts/optimizar-fotos.mjs`**:
  pasa las fuentes a AVIF (la calidad y el porqué están en la cabecera del
  script). Se puede correr siempre: lo que ya está convertido lo saltea.
- Si no hay `portada.*`, se usa la primera imagen de la carpeta como portada.
- La galería son todas las imágenes de la carpeta menos la portada, ordenadas por nombre.

## Slugs actuales

```
cavas-de-haedo        patios-maldonado      terrazas-de-italia
chana-i               sushi-wok             vila-rodona
patios-del-regimiento terrazas-de-cajal     villa-platero
patios-del-vitraux
```

Ejemplo: `src/assets/proyectos/terrazas-de-italia/portada.avif`
