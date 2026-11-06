/*
 * Lámina del mapa de situación — arma el SVG completo como string.
 *
 * El dibujo sale de geometría REAL, no de un archivo gráfico ni de la imagen
 * de un servicio de mapas (que traería sus colores, su tipografía y sus pines,
 * y al lado de la axonometría se leería como una captura pegada):
 *   · la costa es el borde sur del contorno del departamento;
 *   · la malla son los 62 barrios oficiales de la Intendencia;
 *   · las avenidas son las radiales, los dos bulevares y la rambla.
 * Todo eso vive ya simplificado en src/data/mapa/montevideo.json, que baja y
 * escribe `scripts/bajar-mapa.mjs` A MANO (ver su cabecera: el build no toca
 * la red). Acá sólo se proyecta y se serializa.
 *
 * Lo único que cambia de una ficha a otra son tres cosas: qué barrio se pinta,
 * dónde cae la cruz y qué dice su rótulo. El resto del dibujo es idéntico.
 */
import datos from '../../data/mapa/montevideo.json';
import { ANCHO, proyector } from './encuadre.ts';

type Punto = [number, number];

export interface Proyecto {
  /** Coordenadas de la dirección (ver `coords` en el frontmatter del proyecto). */
  lon: number;
  lat: number;
  /** Cómo nombra el estudio la zona: es lo que dice la ficha, y va en la cruz. */
  barrio: string;
}

/* Nombres de la capa oficial que no se escriben como la gente los dice: la IM
   junta barrios en un polígono ("PRADO NUEVA SAVONA") y abrevia. En el plano va
   el nombre corto. Los que no están acá se escriben tal cual. */
const ROTULO: Record<string, string> = {
  'PRADO NUEVA SAVONA': 'PRADO',
  'PQUE BATLLE VILLA DOLORES': 'PARQUE BATLLE',
  'CAPURRO BELLA VISTA': 'CAPURRO',
  'COLON CENTRO Y NOROESTE': 'COLÓN',
  'VILLA MUÑOZ RETIRO': 'VILLA MUÑOZ',
  'MAROÑAS PARQUE GUARANI': 'MAROÑAS',
  'MERCADO MODELO Y BOLIVAR': 'MERCADO MODELO',
  'TRES OMBUES PBLO VICTORIA': 'TRES OMBÚES',
  'PUNTA RIELES BELLA ITALIA': 'PUNTA RIELES',
  'LA PALOMA TOMKINSON': 'LA PALOMA',
  'JARDINES DEL HIPODROMO': 'J. DEL HIPÓDROMO',
};

/* Barrios que se rotulan, por orden de prioridad: primero los que orientan
   (la península, el Centro) y después los de la costa. El que no entre sin
   pisar a otro se cae solo (ver `colocar`). */
const REFERENCIAS = [
  'CIUDAD VIEJA', 'CENTRO', 'POCITOS', 'CARRASCO', 'PRADO NUEVA SAVONA',
  'PUNTA CARRETAS', 'BUCEO', 'MALVIN', 'PUNTA GORDA', 'UNION',
  'LA BLANQUEADA', 'CORDON', 'BRAZO ORIENTAL', 'PALERMO', 'PARQUE RODO',
  'TRES CRUCES', 'AGUADA', 'SAYAGO', 'ATAHUALPA', 'CERRO',
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const d = (ps: Punto[]) =>
  ps.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

/*
 * Segunda simplificación, ya en unidades del viewBox (1 unidad ≈ 1,2 px en
 * pantalla), con una tolerancia por capa.
 *
 * La primera pasada la hace `scripts/bajar-mapa.mjs` en metros (8 m), que es
 * lo justo para que el dato sirva a cualquier zoom; pero en este encuadre esos
 * 8 m son 0,27 unidades, muchísimo más detalle del que se llega a ver. La
 * malla de barrios sola eran 2.756 puntos para un trazo de 0,7 px de grosor
 * —un tercio del peso del SVG— y el dibujo sale igual con la mitad.
 * La tolerancia va por capa porque no todas pesan lo mismo a la vista: la
 * costa es la línea más marcada del plano y la malla es una trama de fondo.
 */
function afinar(ps: Punto[], tol: number): Punto[] {
  if (ps.length < 3) return ps;
  const dist2 = (p: Punto, a: Punto, b: Punto) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = dx * dx + dy * dy;
    if (!L) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L));
    return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2;
  };
  const guardar = new Uint8Array(ps.length);
  guardar[0] = guardar[ps.length - 1] = 1;
  const pila: [number, number][] = [[0, ps.length - 1]];
  while (pila.length) {
    const [i0, i1] = pila.pop()!;
    let im = -1;
    let dm = 0;
    for (let i = i0 + 1; i < i1; i++) {
      const dd = dist2(ps[i]!, ps[i0]!, ps[i1]!);
      if (dd > dm) {
        dm = dd;
        im = i;
      }
    }
    if (im > 0 && dm > tol * tol) {
      guardar[im] = 1;
      pila.push([i0, im], [im, i1]);
    }
  }
  return ps.filter((_, i) => guardar[i]);
}

/** Tolerancias en unidades del viewBox, de la línea más marcada a la más tenue. */
const TOL = { costa: 0.3, barrio: 0.3, via: 0.45, malla: 0.6 };

/** ¿El punto cae dentro del anillo? Trazado de rayo clásico. */
function enAnillo([x, y]: Punto, anillo: number[][]) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i] as Punto;
    const [xj, yj] = anillo[j] as Punto;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}
/** Un polígono con agujeros: dentro si lo cruza un número impar de anillos. */
const enBarrio = (p: Punto, anillos: number[][][]) =>
  anillos.reduce((n, r) => n + (enAnillo(p, r) ? 1 : 0), 0) % 2 === 1;

/** Qué barrio oficial contiene a la dirección. */
export function barrioDe(lon: number, lat: number): string | null {
  const barrios = datos.barrios as Record<string, number[][][]>;
  return Object.keys(barrios).find((n) => enBarrio([lon, lat], barrios[n]!)) ?? null;
}

export function mapaSVG({ lon, lat, barrio }: Proyecto): string {
  const pr = proyector();
  const { p, dentro, alto } = pr;
  const tramo = (ps: number[][]) => ps.map((q) => p(q as Punto));

  /* ---- la costa, que hace de tres cosas a la vez ----
     Un solo path: recorta el rayado del agua, pinta la tierra un tono más
     clara que el papel y traza la línea de costa. Escribirla dos veces
     (cerrada para el relleno, abierta para el trazo) costaba 10 de los 93 KB
     del SVG. Se cierra por ARRIBA, que en este encuadre siempre es tierra; los
     tres puntos que la cierran caen FUERA del viewBox —la costa guardada se
     extiende bastante más allá del encuadre a los dos lados—, así que trazar
     el path cerrado no dibuja ninguna línea de más. */
  const costa = afinar(tramo(datos.costa), TOL.costa);
  const a = costa[0]!;
  const z = costa[costa.length - 1]!;
  const tierra = `${d(costa)}L${z[0].toFixed(1)} -40L${a[0].toFixed(1)} -40Z`;

  /* ---- la malla de lindes ----
     NO sale de los 62 polígonos: dibujarlos uno por uno trazaba cada límite
     interior dos veces (lo comparten los dos barrios vecinos). `lindes` ya
     viene deduplicada y cosida en cadenas largas desde el script de bajada,
     que es lo que deja simplificarla de verdad. */
  const malla = (datos.lindes as number[][][])
    .map(tramo)
    .filter((t) => t.some(dentro))
    .map((t) => d(afinar(t, TOL.malla)))
    .join('');

  /* ---- el barrio que contiene a la obra ----
     ⚠ Se pinta el barrio que CONTIENE a la dirección, que no siempre es el que
     dice el frontmatter: tres proyectos están sobre un límite y la Intendencia
     los pone en otro barrio del que usa el mercado (Terrazas de Cajal, Terrazas
     de Italia y Villa Platero). La mancha es geografía; el nombre que se lee es
     el del estudio, y va en la cruz. Por eso el barrio pintado NO se rotula:
     diría una cosa y la cruz, otra. */
  const oficial = barrioDe(lon, lat);
  const barrios = datos.barrios as Record<string, number[][][]>;
  const manchado = oficial
    ? (barrios[oficial] ?? [])
        .map(tramo)
        .filter((r) => r.some(dentro))
        .map((r) => `${d(afinar(r, TOL.barrio))}Z`)
        .join('')
    : '';

  // ---- avenidas ----
  const via = (tramos: number[][][]) =>
    tramos
      .map(tramo)
      .filter((t) => t.some(dentro))
      .map((t) => d(afinar(t, TOL.via)))
      .join('');

  /* ---- agua: rayado horizontal, el recurso de toda la vida en un plano,
     recortado contra la tierra con una máscara ---- */
  const paso = 7;
  let rayado = '';
  for (let y = 0; y < alto + 40; y += paso) rayado += `M0 ${y}L${ANCHO} ${y}`;

  /* ---- rótulos, con anti-colisión ----
     Van por prioridad y se descarta el que pisa a uno ya puesto. Sin esto, en
     la península se superponían CIUDAD VIEJA, CENTRO y BARRIO SUR en una
     mancha ilegible: los centroides de barrios chicos caen a pocos píxeles unos
     de otros. El ancho del texto se calcula a mano porque en el build no hay
     layout: IBM Plex Mono avanza 0,6 em por glifo, más el letter-spacing. */
  const FS_REF = 8;
  const FS_FOCO = 11;
  const LS = 0.13;
  const anchoTexto = (t: string, fs: number) => t.length * fs * 0.6 + (t.length - 1) * fs * LS;
  type Caja = { x0: number; x1: number; y0: number; y1: number };
  const puestos: Caja[] = [];
  const libre = (c: Caja) =>
    !puestos.some((o) => c.x1 > o.x0 && c.x0 < o.x1 && c.y1 > o.y0 && c.y0 < o.y1);
  /** Reserva el lugar del rótulo; devuelve el text-anchor, o null si no entra. */
  function colocar(texto: string, x: number, y: number, fs: number, forzar = false) {
    const w = anchoTexto(texto, fs);
    const h = fs * 1.5;
    const aLaIzquierda = x > ANCHO * 0.72;
    const x0 = aLaIzquierda ? x - w : x;
    const caja: Caja = { x0: x0 - 2, x1: x0 + w + 2, y0: y - h * 0.8, y1: y + h * 0.3 };
    const cabe = caja.x0 > 2 && caja.x1 < ANCHO - 2 && caja.y0 > 2 && caja.y1 < alto - 2;
    if (!forzar && (!libre(caja) || !cabe)) return null;
    puestos.push(caja);
    return aLaIzquierda ? ' text-anchor="end"' : '';
  }

  // ---- la cruz: primero, porque tiene prioridad sobre todo rótulo ----
  const [fx, fy] = p([lon, lat]);
  const r = 9;
  const foco = barrio.toUpperCase();
  const izq = fx > ANCHO * 0.72;
  /* Villa Platero (Millán 4096) queda a 26 px del techo: con el rótulo arriba
     se cortaría. Cuando la cruz cae en la franja de arriba, el nombre va abajo. */
  const arriba = fy > alto * 0.17;
  const tx = fx + (izq ? -r * 1.8 : r * 1.8);
  const ty = fy + (arriba ? -r * 1.5 : r * 2.4);
  const anchor = colocar(foco, tx, ty, FS_FOCO, true);
  puestos.push({ x0: fx - r * 1.7, x1: fx + r * 1.7, y0: fy - r * 1.7, y1: fy + r * 1.7 });

  /* ---- grafismo: escala y norte, en petróleo como en la axonometría ----
     Se dibujan al final pero reservan su lugar ACÁ: "PUNTA CARRETAS" cae justo
     encima de la barra de escala. */
  const KM_BARRA = 4;
  const wBarra = KM_BARRA * pr.pxPorKm;
  const bx = 20;
  const by = alto - 20;
  puestos.push({
    x0: bx - 4,
    x1: bx + wBarra + anchoTexto(`${KM_BARRA} KM`, FS_REF) + 10,
    y0: by - 10,
    y1: by + 8,
  });
  puestos.push({ x0: ANCHO - 36, x1: ANCHO - 6, y0: 8, y1: 46 });

  const refs = REFERENCIAS.map((nombre) => {
    if (nombre === oficial || !barrios[nombre]) return '';
    /* Tampoco el que ya nombra la cruz: Villa Platero está en Paso de las
       Duranas según la IM pero el estudio lo llama Prado, así que sin esto el
       mapa escribía "PRADO" dos veces, en la cruz y en el barrio de al lado. */
    if ((ROTULO[nombre] ?? nombre).toUpperCase() === foco) return '';
    const anillo = barrios[nombre]![0]!;
    const cx = anillo.reduce((s, q) => s + q[0]!, 0) / anillo.length;
    const cy = anillo.reduce((s, q) => s + q[1]!, 0) / anillo.length;
    const [x, y] = p([cx, cy]);
    const t = ROTULO[nombre] ?? nombre;
    const an = colocar(t, x, y, FS_REF);
    if (an === null) return '';
    return `<text class="m-ref" x="${x.toFixed(1)}" y="${y.toFixed(1)}"${an}>${esc(t)}</text>`;
  }).join('');

  const grad = (id: string, x1: number, y1: number, x2: number, y2: number) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">` +
    `<stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/>` +
    `</linearGradient>`;

  /* El dibujo no termina en seco contra el rectángulo: se disuelve en los
     cuatro bordes, igual que el pabellón wireframe del hero. Sin esto las
     avenidas quedaban cortadas a cuchillo contra el borde de arriba. */
  const desvanecido =
    `<mask id="m-borde"><rect width="${ANCHO}" height="${alto}" fill="#fff"/>` +
    `<rect width="${Math.round(ANCHO * 0.1)}" height="${alto}" fill="url(#m-gx1)"/>` +
    `<rect x="${Math.round(ANCHO * 0.9)}" width="${Math.round(ANCHO * 0.1)}" height="${alto}" fill="url(#m-gx2)"/>` +
    `<rect width="${ANCHO}" height="${Math.round(alto * 0.13)}" fill="url(#m-gy1)"/>` +
    `<rect y="${Math.round(alto * 0.87)}" width="${ANCHO}" height="${Math.round(alto * 0.13)}" fill="url(#m-gy2)"/>` +
    `</mask>`;

  return `<svg class="mapa" viewBox="0 0 ${ANCHO} ${alto}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de ubicación: ${esc(barrio)}, Montevideo">
<defs>${grad('m-gx1', 0, 0, 1, 0)}${grad('m-gx2', 1, 0, 0, 0)}${grad('m-gy1', 0, 0, 0, 1)}${grad('m-gy2', 0, 1, 0, 0)}
${desvanecido}
<path id="m-costa-d" d="${tierra}" vector-effect="non-scaling-stroke"/>
<mask id="m-agua"><rect width="${ANCHO}" height="${alto}" fill="#fff"/><use href="#m-costa-d" fill="#000"/></mask>
</defs>
<g mask="url(#m-borde)">
<g mask="url(#m-agua)"><path class="m-agua" d="${rayado}"/></g>
<use href="#m-costa-d" class="m-tierra"/>
<path class="m-malla" d="${malla}"/>
<g class="m-viario"><path class="m-ram" d="${via(datos.vias.ram)}"/><path class="m-rad" d="${via(datos.vias.rad)}"/><path class="m-ani" d="${via(datos.vias.ani)}"/></g>
<use href="#m-costa-d" class="m-costa"/>
<path class="m-barrio" d="${manchado}"/>
${refs}
</g>
<g class="m-foco">
<path class="m-cruz" d="M${(fx - r * 2.6).toFixed(1)} ${fy.toFixed(1)}h${(r * 5.2).toFixed(1)}M${fx.toFixed(1)} ${(fy - r * 2.6).toFixed(1)}v${(r * 5.2).toFixed(1)}"/>
<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${r}"/>
<circle class="m-nucleo" cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="3"/>
<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}"${anchor}>${esc(foco)}</text>
</g>
<g class="m-graf">
<path d="M${bx} ${by}h${wBarra.toFixed(1)}M${bx} ${by - 3.5}v7M${(bx + wBarra).toFixed(1)} ${by - 3.5}v7M${(bx + wBarra / 2).toFixed(1)} ${by - 2}v4"/>
<text x="${(bx + wBarra + 6).toFixed(1)}" y="${(by + 3.4).toFixed(1)}">${KM_BARRA} KM</text>
<circle cx="${ANCHO - 22}" cy="22" r="8.5"/>
<path d="M${ANCHO - 22} 28V15.5M${ANCHO - 24.6} 19l2.6 -3.5 2.6 3.5"/>
<text class="m-n" x="${ANCHO - 22}" y="41">N</text>
</g>
</svg>`;
}
