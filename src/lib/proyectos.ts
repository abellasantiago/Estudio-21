import type { CollectionEntry } from 'astro:content';

/**
 * El orden EDITORIAL de los proyectos, en un solo lugar.
 *
 * Primero lo activo hoy (en proceso), después lo que viene (próximamente) y al
 * final el track record (terminados); dentro de cada grupo, por año
 * descendente. Es independiente del orden de los archivos en la colección.
 *
 * Vive acá y no en el componente porque hay dos recorridos que TIENEN que ser
 * el mismo: el cilindro de la home y las flechas Anterior / Siguiente de la
 * ficha. Si se desincronizaran, la flecha llevaría a un proyecto distinto del
 * que sigue en el cilindro. (El desplegable del navbar arma la misma lista
 * pero agrupada por estado, así que repite el criterio de año a mano.)
 */
export const ordenEstado = { 'en-proceso': 0, proximamente: 1, terminado: 2 } as const;

export function ordenEditorial(
  proyectos: CollectionEntry<'proyectos'>[],
): CollectionEntry<'proyectos'>[] {
  return [...proyectos].sort((a, b) => {
    const ea = ordenEstado[a.data.estado];
    const eb = ordenEstado[b.data.estado];
    if (ea !== eb) return ea - eb;
    return b.data.anio - a.data.anio;
  });
}

/**
 * Los dos vecinos de un proyecto en ese recorrido, **en ciclo**: después del
 * último viene el primero. El cilindro de la home es justamente eso, un anillo
 * sin principio ni fin, así que las flechas de la ficha no se quedan sin
 * destino en las puntas (y ninguna ficha muestra una sola flecha, que es lo
 * que rompía la simetría de los dos costados).
 */
export function vecinos(proyectos: CollectionEntry<'proyectos'>[], slug: string) {
  const orden = ordenEditorial(proyectos);
  const i = orden.findIndex((p) => p.data.slug === slug);
  if (i < 0 || orden.length < 2) return { anterior: null, siguiente: null };
  return {
    anterior: orden[(i - 1 + orden.length) % orden.length]!.data,
    siguiente: orden[(i + 1) % orden.length]!.data,
  };
}
