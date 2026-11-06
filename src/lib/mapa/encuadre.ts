/*
 * Encuadre del mapa de situación: el mismo en las diez fichas.
 *
 * Que sea FIJO es la decisión de fondo. Con un encuadre por proyecto cada
 * ficha mostraría un recorte distinto y no se podría comparar una obra con
 * otra; con uno solo, el inversor aprende la silueta una vez y después lee de
 * un vistazo si un proyecto está sobre la costa o tierra adentro, al este o al
 * oeste. El precio es que el encuadre tiene que contener a TODOS los proyectos.
 *
 * ⚠ 15 km es el piso. Villa Platero (Millán 4096, el más al oeste) y Sushi WOK
 * (Boston 6208, el más al este) están a 12,1 km; con el margen que necesitan la
 * cruz y su rótulo para no quedar pegados al borde, por debajo de 15 km uno de
 * los dos se cae del mapa. Si algún día entra un proyecto más al este que
 * Carrasco o más al oeste que el Prado, hay que volver a medir esto.
 */
export const ENCUADRE = {
  /** Centro, elegido para que entren los diez puntos, la bahía, la península y
   *  la punta de Punta Carretas (que es lo que hace reconocible la silueta). */
  centro: [-56.1277, -34.8855] as [number, number],
  anchoKm: 16.5,
  /** Alto = ancho / esto. 1,78 ≈ la proporción de una banda cómoda en la ficha. */
  proporcion: 1.78,
};

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

export function proyector(ancho = ANCHO): Proyector {
  const [cLon, cLat] = ENCUADRE.centro;
  // un grado de longitud mide menos cuanto más lejos del ecuador; a esta
  // latitud, el 82% de un grado de latitud
  const k = Math.cos((cLat * Math.PI) / 180);
  const anchoKm = ENCUADRE.anchoKm;
  const altoKm = anchoKm / ENCUADRE.proporcion;
  const semiLon = anchoKm / 2 / (KM_POR_GRADO * k);
  const semiLat = altoKm / 2 / KM_POR_GRADO;
  const lon0 = cLon - semiLon,
    lon1 = cLon + semiLon;
  const lat0 = cLat - semiLat,
    lat1 = cLat + semiLat;
  const alto = Math.round((ancho * altoKm) / anchoKm);
  const margen = Math.round(ancho * 0.07);

  return {
    p: ([lon, lat]) => [
      ((lon - lon0) / (lon1 - lon0)) * ancho,
      alto - ((lat - lat0) / (lat1 - lat0)) * alto,
    ],
    dentro: ([x, y]) =>
      x > -margen && x < ancho + margen && y > -margen && y < alto + margen,
    alto,
    pxPorKm: ancho / anchoKm,
    anchoKm,
    altoKm,
  };
}
