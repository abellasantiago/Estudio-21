/*
 * /axonometria.svg — la lámina de "Quiénes somos", servida como archivo.
 *
 * Son ~120 KB (~27 KB con gzip) que antes viajaban inline en el HTML de la home
 * y los bajaba TODO el mundo, teléfonos incluidos, donde la columna gráfica va
 * `display:none`. Acá se emite como un asset estático y Axonometria.astro lo
 * pide sólo cuando el dibujo se va a ver (≥900px).
 *
 * En `output: 'static'` Astro lo prerenderiza a dist/axonometria.svg en el build.
 */
import type { APIRoute } from 'astro';
import { laminaSVG } from '../lib/axonometria/lamina';

export const GET: APIRoute = () =>
  new Response(laminaSVG(), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' },
  });
