/*
 * Encuadre del mapa de situación: uno POR PROYECTO, centrado en la obra.
 *
 * Primero fue un encuadre fijo, el mismo en las diez fichas, para poder
 * comparar un proyecto con otro. Se cambió (2026-11-06) porque en la ficha no
 * se comparan: se mira una obra. Con el encuadre de toda la ciudad, un
 * proyecto del norte —Villa Platero, en Millán— quedaba como una cruz chiquita
 * arriba a la izquierda, y lo que se leía era Montevideo, no el proyecto. Ahora
 * cada plano está centrado en su obra y muestra los barrios que la rodean.
 *
 * ⚠ La contra, y es real: a esta escala los proyectos tierra adentro (el Prado,
 * Brazo Oriental) ya no muestran la costa, porque están a 6 km de ella y
 * meterla pedía un encuadre del doble de ancho — justo el que se sacó. Esos
 * planos se leen por la trama de barrios y de avenidas, no por la silueta.
 */

/** Ancho del encuadre, igual en los diez: cambia el centro, no la escala. */
export const ANCHO_KM = 11;

/** Alto = ancho / esto. 1,78 ≈ la proporción de una banda cómoda en la ficha. */
export const PROPORCION = 1.78;

/*
 * El proyecto no va en el centro exacto sino un poco por ENCIMA (a un 43 % del
 * alto). Así el encuadre toma algo más de ciudad del lado del sur, que es
 * donde está la costa: con esto los de La Blanqueada alcanzan a mostrar la
 * rambla, que sin el sesgo les quedaba a unos cientos de metros del borde.
 */
const Y_BASE = 0.43;

/*
 * Y los proyectos de los extremos se corren todavía un poco más, en contra de
 * la ciudad, para que el encuadre muestre la zona urbana y no el campo.
 *
 * Centrar a rajatabla funciona bien en Pocitos o el Cordón, que están rodeados
 * de ciudad por los cuatro lados. En Carrasco la mitad este del plano era agua
 * y chacras, y en el Prado la mitad norte era Casavalle y Las Acacias: medio
 * dibujo gastado en lo que no se quiere mostrar. Moviendo la obra hacia AFUERA
 * del cuadro —a la derecha si está al este, arriba si está al norte—, el
 * encuadre se come ese vacío y entra más ciudad.
 *
 * `NUCLEO` es el corazón de la zona que le interesa a un inversor (Parque
 * Batlle / Pocitos), no el centro geométrico del departamento. El corrimiento
 * crece con la distancia hasta `DIST_PLENA` y ahí se planta: pasado ese punto
 * no se corre más, porque la obra se iría del cuadro.
 */
const NUCLEO: [number, number] = [-56.148, -34.898];
const DIST_PLENA_KM = 4.5;
const CORRIMIENTO_X = 0.15;
const CORRIMIENTO_Y = 0.13;

/** Ancho del viewBox. 1 unidad = 1 px cuando el mapa se dibuja a 560 de ancho. */
export const ANCHO = 560;

const KM_POR_GRADO = 111.32;

export interface Proyector {
  /** lon/lat → coordenadas del viewBox */
  p(punto: [number, number]): [number, number];
  /** ¿el punto cae dentro del viewBox, con margen? */
  dentro(xy: [number, number]): boolean;
  alto: number;
  pxPorKm: number;
  anchoKm: number;
  altoKm: number;
}

/** Dónde cae la obra dentro del cuadro, en fracciones de 0 a 1. */
export function posicionEnCuadro(obra: [number, number]): [number, number] {
  const [oLon, oLat] = obra;
  const k = Math.cos((oLat * Math.PI) / 180);
  const dx = (oLon - NUCLEO[0]) * KM_POR_GRADO * k; // + = al este del núcleo
  const dy = (oLat - NUCLEO[1]) * KM_POR_GRADO; // + = al norte
  const dist = Math.hypot(dx, dy);
  if (dist < 0.01) return [0.5, Y_BASE];
  const t = Math.min(dist / DIST_PLENA_KM, 1);
  return [
    0.5 + CORRIMIENTO_X * t * (dx / dist),
    // en pantalla el norte es arriba: al norte del núcleo, la obra sube
    Y_BASE - CORRIMIENTO_Y * t * (dy / dist),
  ];
}

/** @param obra lon/lat del proyecto: es lo que encuadra el plano. */
export function proyector(obra: [number, number], ancho = ANCHO): Proyector {
  const [oLon, oLat] = obra;
  // un grado de longitud mide menos cuanto más lejos del ecuador; a esta
  // latitud, el 82% de un grado de latitud
  const k = Math.cos((oLat * Math.PI) / 180);
  const altoKm = ANCHO_KM / PROPORCION;
  const anchoGrados = ANCHO_KM / (KM_POR_GRADO * k);
  const altoGrados = altoKm / KM_POR_GRADO;

  const [fx, fy] = posicionEnCuadro(obra);
  const lon0 = oLon - anchoGrados * fx;
  const lon1 = lon0 + anchoGrados;
  const lat1 = oLat + altoGrados * fy; // fy se mide desde ARRIBA
  const lat0 = lat1 - altoGrados;

  const alto = Math.round((ancho * altoKm) / ANCHO_KM);
  const margen = Math.round(ancho * 0.07);

  return {
    p: ([lon, lat]) => [
      ((lon - lon0) / (lon1 - lon0)) * ancho,
      alto - ((lat - lat0) / (lat1 - lat0)) * alto,
    ],
    dentro: ([x, y]) => x > -margen && x < ancho + margen && y > -margen && y < alto + margen,
    alto,
    pxPorKm: ancho / ANCHO_KM,
    anchoKm: ANCHO_KM,
    altoKm,
  };
}
