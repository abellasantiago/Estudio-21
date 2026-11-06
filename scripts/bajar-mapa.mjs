/*
 * bajar-mapa.mjs — baja la geometría del mapa de situación y la deja lista
 * en src/data/mapa/montevideo.json.
 *
 *   node scripts/bajar-mapa.mjs
 *
 * ⚠ ESTO NO CORRE EN EL BUILD, y es a propósito. El build tiene que ser
 * reproducible y andar sin red (GitHub Actions, un hosting cualquiera). Las
 * tres fuentes son servicios públicos que se caen: mientras se armaba esto,
 * Overpass devolvió 502 "at capacity" varias veces seguidas y dos mirrors no
 * contestaron. Se baja a mano, se mira el resultado y se commitea el JSON.
 *
 * Lo bajado queda en .cache/mapa/ (gitignoreada): volver a correr el script no
 * vuelve a pedir lo que ya está. Para forzar la bajada, borrar esa carpeta.
 *
 * Fuentes:
 *   · Costa  — contorno del departamento de Montevideo (Nominatim/OSM). Su
 *     borde sur ES la costa real, con la bahía y la península.
 *   · Barrios — capa oficial de la Intendencia de Montevideo (62 polígonos,
 *     shapefile en UTM 21S). El servidor arma el zip en dos pasos: primero se
 *     pide el generador y después el archivo que deja en /sit/tmp/.
 *   · Avenidas — Overpass/OSM, sólo las radiales, los dos bulevares y la rambla.
 *
 * Licencia: OSM es ODbL → el crédito "© OpenStreetMap" va al pie del mapa
 * (ver Mapa.astro). La capa de la IM es de su catálogo de datos abiertos.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { leerPoligonos } from './lib/shapefile.mjs';

const UA = 'estudio21-sitio/1.0 (generador del mapa de situacion)';
const CACHE = '.cache/mapa';
const SALIDA = 'src/data/mapa/montevideo.json';

/* Recorte: algo más grande que el encuadre que se dibuja (ver src/lib/mapa/
   encuadre.ts), para poder cerrar o abrir el zoom sin volver a bajar nada. */
const RECORTE = { lon: [-56.29, -55.99], lat: [-34.97, -34.80] };
/* Radio del callejero fino que se baja alrededor de cada obra. El plano no
   dibuja toda la ciudad calle por calle —sería ilegible y pesadísimo— sino un
   halo de detalle alrededor del proyecto, que se funde con la distancia. */
const RADIO_DETALLE_M = 1100;

/* Simplificación en metros. El dibujo sale a ~29 m por píxel (16,5 km en 560),
   así que 8 m es menos de un tercio de píxel: no se ve, y saca el 95% de los
   vértices. */
const TOLERANCIA_M = 8;

const log = (...a) => console.log(...a);
mkdirSync(CACHE, { recursive: true });
mkdirSync('src/data/mapa', { recursive: true });

/*
 * Baja y cachea. Reintenta con espera creciente porque Overpass contesta 502
 * "at capacity" cada dos por tres —su propio mensaje de error pide
 * exponential backoff— y la mitad de las corridas de este script se caían ahí.
 */
async function bajar(nombre, url, opciones = {}) {
  const destino = `${CACHE}/${nombre}`;
  if (existsSync(destino)) { log(`· ${nombre} (en caché)`); return readFileSync(destino); }
  const INTENTOS = 6;
  for (let i = 1; i <= INTENTOS; i++) {
    log(`↓ ${nombre}${i > 1 ? ` (intento ${i})` : ''}`);
    let r;
    try {
      r = await fetch(url, { headers: { 'User-Agent': UA }, ...opciones });
    } catch (e) {
      if (i === INTENTOS) throw e;
      await new Promise((s) => setTimeout(s, i * 15000));
      continue;
    }
    if (r.ok) {
      const b = Buffer.from(await r.arrayBuffer());
      writeFileSync(destino, b);
      await new Promise((s) => setTimeout(s, 1200)); // cortesía con Nominatim
      return b;
    }
    if (i === INTENTOS) throw new Error(`${nombre}: HTTP ${r.status} después de ${INTENTOS} intentos`);
    log(`  HTTP ${r.status}, reintento en ${i * 15} s`);
    await new Promise((s) => setTimeout(s, i * 15000));
  }
}

// ---------- 1. costa ----------
const nom = JSON.parse(await bajar('departamento.json',
  'https://nominatim.openstreetmap.org/search?q=Montevideo,+Uruguay&format=json&polygon_geojson=1&limit=1&featuretype=settlement'));
const anilloDepto = nom[0].geojson.coordinates[0];

// ---------- 2. barrios ----------
if (!existsSync(`${CACHE}/barrios/sig_barrios.shp`)) {
  // el generador de la IM responde un HTML y deja el zip en /sit/tmp/
  await bajar('barrios-generar.html',
    'https://intgis.montevideo.gub.uy/sit/php/common/datos/generar_zip2.php?nom_tab=sig_barrios&tipo=gis');
  await bajar('barrios.zip', 'https://intgis.montevideo.gub.uy/sit/tmp/sig_barrios.zip');
  mkdirSync(`${CACHE}/barrios`, { recursive: true });
  execFileSync('unzip', ['-oq', `${CACHE}/barrios.zip`, '-d', `${CACHE}/barrios`]);
}
const barriosCrudos = leerPoligonos(`${CACHE}/barrios/sig_barrios`, 'BARRIO');

// ---------- 3. coordenadas de las obras (para el halo de detalle) ----------
/* Se leen del frontmatter en vez de repetirlas acá: si se agrega un proyecto,
   el halo lo sigue solo. */
const obras = readdirSync('src/content/proyectos')
  .filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(`src/content/proyectos/${f}`, 'utf8').match(/^coords:\s*\[([-\d.]+),\s*([-\d.]+)\]/m))
  .filter(Boolean)
  .map((m) => [Number(m[1]), Number(m[2])]); // [lon, lat]
log(`· ${obras.length} obras con coordenadas`);

// ---------- 4. avenidas ----------
const consulta = `[out:json][timeout:90];way["highway"~"^(motorway|trunk|primary|secondary)$"]` +
  `(${RECORTE.lat[0]},${RECORTE.lon[0]},${RECORTE.lat[1]},${RECORTE.lon[1]});out geom;`;
const osm = JSON.parse(await bajar('vias.json', 'https://overpass-api.de/api/interpreter',
  { method: 'POST', body: new URLSearchParams({ data: consulta }) }));

// ---------- 5. callejero fino alrededor de cada obra ----------
const consultaDetalle =
  `[out:json][timeout:170];(` +
  obras
    .map(([lon, lat]) =>
      `way["highway"~"^(tertiary|residential|unclassified|living_street|pedestrian)$"]` +
      `(around:${RADIO_DETALLE_M},${lat},${lon});`)
    .join('') +
  `);out geom;`;
const osmDetalle = JSON.parse(await bajar('detalle.json', 'https://overpass-api.de/api/interpreter',
  { method: 'POST', body: new URLSearchParams({ data: consultaDetalle }) }));

// ---------- recorte y simplificación ----------
const KMG = 111320; // metros por grado de latitud
const K = Math.cos(((RECORTE.lat[0] + RECORTE.lat[1]) / 2) * Math.PI / 180);
const aMetros = ([lon, lat]) => [lon * KMG * K, lat * KMG];
const dentro = ([lon, lat]) =>
  lon > RECORTE.lon[0] && lon < RECORTE.lon[1] && lat > RECORTE.lat[0] && lat < RECORTE.lat[1];

/** Douglas–Peucker sobre metros (la tolerancia es una distancia real). */
function simplificar(puntos, tolM) {
  if (puntos.length < 3) return puntos;
  const m = puntos.map(aMetros);
  const dist2 = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    if (!L) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L;
    t = Math.max(0, Math.min(1, t));
    return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2;
  };
  const marcas = new Uint8Array(puntos.length);
  marcas[0] = marcas[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [i0, i1] = pila.pop();
    let im = -1, dm = 0;
    for (let i = i0 + 1; i < i1; i++) {
      const d = dist2(m[i], m[i0], m[i1]);
      if (d > dm) { dm = d; im = i; }
    }
    if (im > 0 && dm > tolM * tolM) { marcas[im] = 1; pila.push([i0, im], [im, i1]); }
  }
  return puntos.filter((_, i) => marcas[i]);
}
const red = (p) => [+p[0].toFixed(5), +p[1].toFixed(5)]; // 5 decimales ≈ 1 m
const limpiar = (ps, tol = TOLERANCIA_M) => simplificar(ps, tol).map(red);

/* ---------------------------------------------------------------------------
 * Dos pasadas de "coser" antes de simplificar. Las dos existen por el mismo
 * motivo: el dato viene PARTIDO en pedacitos, y Douglas–Peucker no puede
 * simplificar a través de un corte. Cosidos, los mismos trazos pesan la mitad.
 * ------------------------------------------------------------------------- */

const clave = ([lon, lat]) => `${lon.toFixed(6)},${lat.toFixed(6)}`;

/**
 * Une polilíneas que terminan donde empieza otra, hasta que no se pueda más.
 * OSM parte cada avenida en decenas de ways (un cruce, un cambio de carriles,
 * un tramo con otro nombre de calle): las radiales llegaban como ~600 pedazos
 * de dos puntos cada uno, y cada pedazo cuesta un "M x y L x y" entero.
 */
function encadenar(lineas) {
  const porInicio = new Map();
  for (const l of lineas) {
    const k = clave(l[0]);
    if (!porInicio.has(k)) porInicio.set(k, []);
    porInicio.get(k).push(l);
  }
  const usada = new Set();
  const salida = [];
  for (const linea of lineas) {
    if (usada.has(linea)) continue;
    usada.add(linea);
    const cadena = [...linea];
    for (;;) {
      const siguientes = porInicio.get(clave(cadena.at(-1))) ?? [];
      const sig = siguientes.find((l) => !usada.has(l));
      if (!sig) break;
      usada.add(sig);
      cadena.push(...sig.slice(1));
    }
    salida.push(cadena);
  }
  return salida;
}

/**
 * Convierte los polígonos de barrio en la MALLA de lindes, sin repetidos.
 * Dos barrios vecinos comparten su límite, así que dibujando los 62 polígonos
 * cada línea interior se trazaba dos veces: la mitad de los 21 KB de la malla
 * eran el mismo trazo encima del mismo trazo. Se deduplica por segmento (antes
 * de simplificar, porque si no cada lado elegiría vértices distintos y ya no
 * coincidirían) y después se cosen las cadenas que quedan.
 */
function lindesDe(poligonos) {
  const vistos = new Set();
  const segmentos = [];
  for (const anillos of Object.values(poligonos)) {
    for (const anillo of anillos) {
      for (let i = 1; i < anillo.length; i++) {
        const a = anillo[i - 1], b = anillo[i];
        const ka = clave(a), kb = clave(b);
        const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (vistos.has(k)) continue;
        vistos.add(k);
        segmentos.push([a, b]);
      }
    }
  }
  return encadenar(segmentos);
}

/** Parte una polilínea en los tramos que caen dentro del recorte. */
function recortar(puntos) {
  const tramos = []; let actual = null;
  for (const p of puntos) {
    if (dentro(p)) { (actual ??= (tramos.push([]), tramos.at(-1))).push(p); }
    else { if (actual) actual.push(p); actual = null; }
  }
  return tramos.filter((t) => t.length > 1);
}

const costa = recortar(anilloDepto).sort((a, b) => b.length - a.length)[0];

/* Los polígonos de barrio se guardan enteros (simplificados): se usan para
   pintar el barrio de la obra y para saber cuál la contiene. La malla que se
   DIBUJA no sale de acá sino de `lindes`, que no tiene líneas repetidas. */
const recortados = {};
for (const [nombre, anillos] of Object.entries(barriosCrudos)) {
  const vivos = anillos.filter((r) => r.some(dentro));
  if (vivos.length) recortados[nombre] = vivos;
}
const lindes = lindesDe(recortados).map((l) => limpiar(l));
const barrios = Object.fromEntries(
  Object.entries(recortados).map(([n, rs]) => [n, rs.map((r) => limpiar(r))]),
);

const RADIALES = new Set(['Avenida Agraciada','Avenida General Flores','Avenida 8 de Octubre',
  'Avenida Italia','Avenida General Rivera','Avenida 18 de Julio','Camino Maldonado',
  'Avenida Millán','Avenida Luis Alberto de Herrera','Avenida General San Martín','Bulevar España']);
const ANILLOS = new Set(['Bulevar General Artigas','Bulevar José Batlle y Ordóñez']);
const juntar = (filtro) => {
  const pedazos = [];
  for (const w of osm.elements) {
    const n = w.tags?.name;
    if (!n || !filtro(n) || !w.geometry) continue;
    pedazos.push(...recortar(w.geometry.map((g) => [g.lon, g.lat])));
  }
  return encadenar(pedazos).map((l) => limpiar(l));
};
const vias = {
  rad: juntar((n) => RADIALES.has(n)),
  ani: juntar((n) => ANILLOS.has(n)),
  ram: juntar((n) => n.startsWith('Rambla')),
};

/* El callejero fino, separado en dos niveles y sin filtro de nombre (son
   calles comunes). Se guardan los dos y el dibujo elige: a 11 km de ancho, la
   trama de calles residenciales cae tan junta que se pinta como una mancha
   negra, así que el plano usa sólo las terciarias —las calles que cruzan el
   barrio, que a esta escala todavía se leen como calles—. Las residenciales
   quedan en el archivo por si algún día el encuadre se cierra. */
const porClase = (clases) => {
  const pedazos = [];
  for (const w of osmDetalle.elements) {
    if (!w.geometry || !clases.includes(w.tags?.highway)) continue;
    pedazos.push(...recortar(w.geometry.map((g) => [g.lon, g.lat])));
  }
  return encadenar(pedazos).map((l) => limpiar(l, TOLERANCIA_M * 2));
};
const detalle = {
  ter: porClase(['tertiary', 'unclassified', 'living_street']),
  res: porClase(['residential', 'pedestrian']),
};

const datos = {
  generado: new Date().toISOString().slice(0, 10),
  recorte: RECORTE,
  toleranciaM: TOLERANCIA_M,
  fuentes: {
    costa: 'OpenStreetMap vía Nominatim — contorno del departamento de Montevideo',
    barrios: 'Intendencia de Montevideo, capa sig_barrios (datos abiertos)',
    vias: 'OpenStreetMap vía Overpass',
  },
  costa: limpiar(costa),
  barrios,
  lindes,
  vias,
  detalle,
  radioDetalleM: RADIO_DETALLE_M,
};
writeFileSync(SALIDA, JSON.stringify(datos));

const n = (o) => Object.values(o).flat().flat().length;
log(`\n${SALIDA}`);
log(`  costa    ${costa.length} → ${datos.costa.length} puntos`);
log(`  barrios  ${Object.keys(barrios).length} polígonos, ${n(barrios)} puntos`);
log(`  lindes   ${lindes.length} trazos, ${lindes.flat().length} puntos (sin repetir)`);
log(`  vías     ${vias.rad.length + vias.ani.length + vias.ram.length} tramos, ${n(vias)} puntos`);
log(`  detalle  ter ${detalle.ter.length} trazos / ${detalle.ter.flat().length} pts · res ${detalle.res.length} / ${detalle.res.flat().length} (halo ${RADIO_DETALLE_M} m)`);
log(`  archivo  ${(readFileSync(SALIDA).length / 1024).toFixed(0)} KB`);
