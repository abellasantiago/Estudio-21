import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Colección "proyectos".
 * Cada proyecto es un archivo .md en src/content/proyectos/.
 * El frontmatter lleva los datos; el cuerpo del .md es la descripción.
 *
 * Las imágenes NO van acá: se descubren por convención de carpetas
 * (ver src/lib/images.ts). Los campos `portada` y `galeria` quedan
 * disponibles como override opcional pero normalmente no se usan.
 */
const proyectos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/proyectos' }),
  schema: z.object({
    nombre: z.string(),
    slug: z.string(),
    estado: z.enum(['proximamente', 'en-proceso', 'terminado']),
    ubicacion: z.string(),
    barrio: z.string().optional(), // PENDIENTE en varios proyectos
    // Dirección de la obra (calle y número). Es lo que ubica la cruz del mapa
    // de situación y lo que se lee al pie de él.
    direccion: z.string().optional(),
    // [lon, lat] de esa dirección. Se geocodifica A MANO una vez (Nominatim) y
    // se verifica que el punto caiga en el barrio declarado; el build no toca
    // la red. Sin `coords` la ficha simplemente no muestra mapa.
    // ⚠ Tres proyectos están sobre un límite y la capa oficial de la IM los
    // pone en otro barrio del que usa el mercado (Terrazas de Cajal, Terrazas
    // de Italia, Villa Platero): el mapa pinta el barrio que contiene al punto
    // y rotula con `barrio`. Ver src/lib/mapa/lamina.ts.
    coords: z.tuple([z.number(), z.number()]).optional(),
    anio: z.number().int(),
    unidades: z.number().int().optional(), // PENDIENTE
    // Hay obras que no se cuentan en unidades (un local gastronómico, una
    // reforma). Ahí la ficha dice "No aplica", que NO es lo mismo que
    // "Pendiente": uno es un dato que no corresponde, el otro uno que falta.
    sinUnidades: z.boolean().optional(),
    // Qué ES la obra, para la card de "Proyectos". La card muestra
    // "barrio · año · N unidades"; en una obra sin unidades ese tercer dato
    // queda vacío y la card se lee más pobre que las otras nueve. Acá va lo
    // que ocupa ese lugar ("Restaurant"). Sólo se usa cuando no hay unidades:
    // el número manda. En la ficha técnica no cambia nada — ahí la celda se
    // llama "Unidades" y la respuesta correcta sigue siendo "No aplica".
    tipoObra: z.string().optional(),
    metros: z.number().optional(), // m² — PENDIENTE
    orden: z.number().optional(), // override manual del orden en la grilla
    portada: z.string().optional(), // override opcional del nombre de archivo
    galeria: z.array(z.string()).optional(), // override opcional
    // Encuadre manual de la portada en las cards de "Proyectos" (helicoidal +
    // grilla "Ver todos"): mismo `object-position` en ambas vistas, así se
    // ajusta una vez por proyecto en vez de por vista. Opcionales: por defecto
    // centrado sin zoom.
    portadaFoco: z.string().optional(), // object-position, ej. "50% 20%" o "left top"
    portadaZoom: z.number().optional(), // >=1, recorte extra sobre el foco (1 = sin zoom)
    // Override de la proporción de la portada GRANDE en la ficha del proyecto
    // (formato CSS aspect-ratio, ej. "1/1"). Por defecto 6/7 (vertical suave);
    // sólo hace falta tocarlo cuando esa proporción le queda mal a una foto
    // muy apaisada (recorta demasiado). No afecta la card del helicoidal.
    portadaAspecto: z.string().optional(),
  }),
});

export const collections = { proyectos };
