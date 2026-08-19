# Imagen de la sección "Quiénes somos"

La sección de presentación (la primera después del hero) tiene una **columna
gráfica a la izquierda**. Para llenarla, tirá el archivo acá con este nombre:

```
src/assets/estudio/presentacion.jpg
```

- Formatos aceptados: `jpg`, `jpeg`, `png`, `webp`, `avif`.
- Aparece sola, no hay que listarla en ningún lado.
- El hueco es **apaisado** y la imagen se recorta a `cover`: ideal algo
  horizontal de ~1600×1200 px o más (una obra terminada, el equipo trabajando,
  una maqueta, un detalle constructivo).
- Mientras no exista, se muestra un placeholder con la grilla de blueprint
  del sitio.

Si en vez de una foto se quiere poner un gráfico (un plano, un SVG, una
animación), hay que cambiar la columna izquierda de
[`Presentacion.astro`](../../components/sections/Presentacion.astro) — el
placeholder está pensado para reemplazarse entero.
