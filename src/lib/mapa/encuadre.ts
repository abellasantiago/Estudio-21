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
 * Más que esto se nota como un desencuadre.
 */
const SESGO = 0.07;

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

/** @param obra lon/lat del proyecto: es lo que centra el plano. */
export function proyector(obra: [number, number], ancho = ANCHO): Proyector {
  const [oLon, oLat] = obra;
  // un grado de longitud mide menos cuanto más lejos del ecuador; a esta
  // latitud, el 82% de un grado de latitud
  const k = Math.cos((oLat * Math.PI) / 180);
  const altoKm = ANCHO_KM / PROPORCION;
  const semiLon = ANCHO_KM / 2 / (KM_POR_GRADO * k);
  const semiLat = altoKm / 2 / KM_POR_GRADO;

  const lon0 = oLon - semiLon;
  const lon1 = oLon + semiLon;
  // el sesgo corre el marco hacia el sur, o sea la obra hacia arriba
  const lat0 = oLat - semiLat * (1 + SESGO * 2);
  const lat1 = oLat + semiLat * (1 - SESGO * 2);

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
