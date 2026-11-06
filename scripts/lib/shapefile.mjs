/*
 * Lector mínimo de shapefile (.shp tipo 5 = polígono + .dbf) con reproyección
 * de UTM 21S (EPSG:32721) a WGS84. Lo justo para leer la capa de barrios de la
 * Intendencia de Montevideo en `bajar-mapa.mjs`; no pretende ser general.
 */
import { readFileSync } from 'node:fs';

// --- UTM 21S -> WGS84 (Transverse Mercator inversa, fórmulas de Snyder) ---
const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
const LON0 = (-57 * Math.PI) / 180, FE = 500000, FN = 10000000;

function utmALonLat(E, N) {
  const x = E - FE, M = (N - FN) / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256));
  const phi1 =
    mu + (3 * e1 / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
    ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const s = Math.sin(phi1), c = Math.cos(phi1), t = Math.tan(phi1);
  const C1 = ep2 * c * c, T1 = t * t;
  const N1 = a / Math.sqrt(1 - e2 * s * s);
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * s * s, 1.5);
  const D = x / (N1 * k0);
  const lat = phi1 - ((N1 * t) / R1) * (D * D / 2 -
    ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 +
    ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon = LON0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 +
    ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / c;
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

/** Devuelve { <valor del campo `clave`>: [anillo, ...] } con los vértices en lon/lat. */
export function leerPoligonos(base, clave) {
  // .dbf: cabecera con los campos y después registros de ancho fijo
  const dbf = readFileSync(`${base}.dbf`);
  const nRec = dbf.readUInt32LE(4), hLen = dbf.readUInt16LE(8), rLen = dbf.readUInt16LE(10);
  const campos = [];
  for (let p = 32; dbf[p] !== 0x0d; p += 32) {
    campos.push({ nombre: dbf.toString('utf8', p, p + 11).replace(/\0.*$/, ''), len: dbf[p + 16] });
  }
  const filas = [];
  for (let i = 0; i < nRec; i++) {
    let o = hLen + i * rLen + 1, fila = {};
    for (const c of campos) { fila[c.nombre] = dbf.toString('utf8', o, o + c.len).trim(); o += c.len; }
    filas.push(fila);
  }

  // .shp: cabecera de 100 bytes y después un registro por forma
  const shp = readFileSync(`${base}.shp`);
  const formas = [];
  for (let p = 100; p < shp.length; ) {
    const largo = shp.readInt32BE(p + 4) * 2, c = p + 8;
    if (shp.readInt32LE(c) === 5) {
      const nPartes = shp.readInt32LE(c + 36), nPuntos = shp.readInt32LE(c + 40);
      const partes = [];
      for (let i = 0; i < nPartes; i++) partes.push(shp.readInt32LE(c + 44 + i * 4));
      const base0 = c + 44 + nPartes * 4, anillos = [];
      for (let i = 0; i < nPartes; i++) {
        const ini = partes[i], fin = i + 1 < nPartes ? partes[i + 1] : nPuntos, r = [];
        for (let j = ini; j < fin; j++) {
          r.push(utmALonLat(shp.readDoubleLE(base0 + j * 16), shp.readDoubleLE(base0 + j * 16 + 8)));
        }
        anillos.push(r);
      }
      formas.push(anillos);
    } else formas.push(null);
    p = c + largo;
  }

  const salida = {};
  filas.forEach((fila, i) => { if (formas[i]) salida[fila[clave]] = formas[i]; });
  return salida;
}
