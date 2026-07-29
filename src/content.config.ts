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
    codigo: z.string(), // ej. "E21·14"
    slug: z.string(),
    estado: z.enum(['proximamente', 'en-proceso', 'terminado']),
    ubicacion: z.string(),
    barrio: z.string().optional(), // PENDIENTE en varios proyectos
    anio: z.number().int(),
    unidades: z.number().int().optional(), // PENDIENTE
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
  }),
});

export const collections = { proyectos };
