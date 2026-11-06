/*
 * Lámina del mapa de situación — arma el SVG completo como string.
 *
 * El dibujo sale de geometría REAL, no de un archivo gráfico ni de la imagen
 * de un servicio de mapas (que traería sus colores, su tipografía y sus pines,
 * y al lado de la axonometría se leería como una captura pegada):
 *   · la costa es el borde sur del contorno del departamento;
 *   · la malla son los límites de los 62 barrios de la Intendencia;
 *   · las avenidas son las radiales, los dos bulevares y la rambla;
 *   · y alrededor de la obra, el callejero fino, que se funde con la distancia.
 * Todo eso vive ya simplificado en src/data/mapa/montevideo.json, que baja y
 * escribe `scripts/bajar-mapa.mjs` A MANO (ver su cabecera: el build no toca
 * la red). Acá sólo se proyecta y se serializa.
 *
 * Lo que cambia de una ficha a otra es el encuadre entero: cada plano está
 * armado alrededor de su obra (ver encuadre.ts).
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

/*
 * Los barrios que se rotulan, y cómo se escriben. Es una lista CURADA, y es
 * una decisión editorial, no técnica: la ficha la va a mirar un inversor, así
 * que se nombran los barrios conocidos y los de la zona donde querría comprar.
 * Montevideo tiene 62 y nombrarlos a todos hacía dos cosas malas: apretaba el
 * dibujo hasta volverlo ilegible, y lo llenaba de nombres que no le dicen nada
 * a nadie o que directamente no suman (Aires Puros, Castro Castellanos,
 * Casavalle, Las Acacias…).
 *
 * La clave es el nombre de la capa de la Intendencia —que junta barrios en un
 * polígono y no usa tildes— y el valor es cómo se escribe en el plano.
 * Sumar uno es agregar una línea acá; el resto del dibujo no se toca.
 */
const BARRIOS: Record<string, string> = {
  // la franja de la costa y el centro
  'CIUDAD VIEJA': 'CIUDAD VIEJA',
  'BARRIO SUR': 'BARRIO SUR',
  CENTRO: 'CENTRO',
  CORDON: 'CORDÓN',
  PALERMO: 'PALERMO',
  'PARQUE RODO': 'PARQUE RODÓ',
  'PUNTA CARRETAS': 'PUNTA CARRETAS',
  POCITOS: 'POCITOS',
  BUCEO: 'BUCEO',
  MALVIN: 'MALVÍN',
  'MALVIN NORTE': 'MALVÍN NORTE',
  'PUNTA GORDA': 'PUNTA GORDA',
  CARRASCO: 'CARRASCO',
  'CARRASCO NORTE': 'CARRASCO NORTE',
  // el anillo de adentro, los que cualquiera ubica
  AGUADA: 'AGUADA',
  'VILLA MUÑOZ RETIRO': 'VILLA MUÑOZ',
  'LA COMERCIAL': 'LA COMERCIAL',
  'TRES CRUCES': 'TRES CRUCES',
  'PQUE BATLLE VILLA DOLORES': 'PARQUE BATLLE',
  'LA BLANQUEADA': 'LA BLANQUEADA',
  UNION: 'UNIÓN',
  LARRAÑAGA: 'LARRAÑAGA',
  'JACINTO VERA': 'JACINTO VERA',
  'BRAZO ORIENTAL': 'BRAZO ORIENTAL',
  ATAHUALPA: 'ATAHUALPA',
  REDUCTO: 'REDUCTO',
  'PRADO NUEVA SAVONA': 'PRADO',
  'CAPURRO BELLA VISTA': 'CAPURRO',
};

/** Tope de rótulos por plano. Con más, el dibujo deja de respirar. */
const MAX_ROTULOS = 11;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const d = (ps: Punto[]) =>
  ps.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

/*
 * Segunda simplificación, ya en unidades del viewBox (1 unidad ≈ 1,2 px en
 * pantalla), con una tolerancia por capa.
 *
 * La primera pasada la hace `scripts/bajar-mapa.mjs` en metros (8 m), que es
 * lo justo para que el dato sirva a cualquier zoom; pero en este encuadre esos
 * 8 m son 0,4 unidades, más detalle del que se llega a ver. La tolerancia va
 * por capa porque no todas pesan lo mismo a la vista: la costa es la línea más
 * marcada del plano y la malla es una trama de fondo.
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
const TOL = { costa: 0.3, via: 0.45, malla: 0.6, detalle: 0.5 };

export function mapaSVG({ lon, lat, barrio }: Proyecto): string {
  const pr = proyector([lon, lat]);
  const { p, dentro, alto } = pr;
  const tramo = (ps: number[][]) => ps.map((q) => p(q as Punto));

  /* ---- la costa, que hace de tres cosas a la vez ----
     Un solo path: recorta el rayado del agua, pinta la tierra un tono más
     clara que el papel y traza la línea de costa. Escribirla dos veces
     (cerrada para el relleno, abierta para el trazo) costaba 10 de los 93 KB
     del SVG. Se cierra por ARRIBA, que en estos encuadres siempre es tierra;
     los tres puntos que la cierran caen FUERA del viewBox —la costa guardada
     se extiende bastante más allá del encuadre a los dos lados—, así que
     trazar el path cerrado no dibuja ninguna línea de más. */
  const costa = afinar(tramo(datos.costa), TOL.costa);
  /* Un encuadre entero tierra adentro no toca la costa. Hoy no pasa —la bahía
     sube bastante al norte y hasta el Prado la alcanza— pero si algún día
     entra un proyecto más al norte, el plano tiene que salir igual: sin agua,
     sin relleno de tierra y sin que se rompa nada. */
  const hayCosta = costa.length > 1 && costa.some(dentro);
  const a = costa[0] ?? [0, 0];
  const z = costa[costa.length - 1] ?? [0, 0];
  const tierra = hayCosta ? `${d(costa)}L${z[0].toFixed(1)} -40L${a[0].toFixed(1)} -40Z` : '';

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

  // ---- avenidas ----
  const via = (tramos: number[][][]) =>
    tramos
      .map(tramo)
      .filter((t) => t.some(dentro))
      .map((t) => d(afinar(t, TOL.via)))
      .join('');

  const [fx, fy] = p([lon, lat]);

  /* ---- el halo de callejero fino alrededor de la obra ----
     Lo que interesa de cerca es la cuadra, no el departamento: a medio
     kilómetro de la obra el plano muestra las calles una por una y de ahí se
     va fundiendo. Es el único lugar del dibujo con ese nivel de detalle, así
     que funciona como lo que es, un foco — y reemplaza a la mancha de color
     que marcaba el barrio, que además de no ser exacta competía con la cruz.
     Va por debajo de todo lo demás para no ganarle a la costa ni a las
     avenidas. */
  const radio = ((datos.radioDetalleM as number) / 1000) * pr.pxPorKm;
  /* Sólo las terciarias. Con las residenciales también, a 11 km de ancho la
     trama cae tan junta que el halo se pinta como una mancha negra: a esta
     escala una calle de barrio no es una línea, es ruido. Las terciarias —las
     que cruzan el barrio de lado a lado— sí se leen. */
  const detalle = (datos.detalle.ter as number[][][])
    .map(tramo)
    .filter((t) => t.some(([x, y]) => Math.hypot(x - fx, y - fy) < radio))
    .map((t) => d(afinar(t, TOL.detalle)))
    .join('');

  /* ---- agua: rayado horizontal, el recurso de toda la vida en un plano,
     recortado contra la tierra con una máscara ---- */
  const paso = 7;
  let rayado = '';
  if (hayCosta) for (let y = 0; y < alto + 40; y += paso) rayado += `M0 ${y}L${ANCHO} ${y}`;

  /* ---- rótulos, con anti-colisión ----
     Van de más cerca a más lejos de la obra y se descarta el que pisa a uno ya
     puesto, así gana siempre el que ubica. El ancho del texto se calcula a mano
     porque en el build no hay layout: IBM Plex Mono avanza 0,6 em por glifo,
     más el letter-spacing. */
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
    const aLaIzquierda = x > ANCHO * 0.74;
    const x0 = aLaIzquierda ? x - w : x;
    /* El aire de los costados es lo que evita que dos nombres que no se pisan
       pero quedan pegados se lean como uno solo ("AGUADA VILLA MUÑOZ"). */
    const caja: Caja = { x0: x0 - 7, x1: x0 + w + 7, y0: y - h, y1: y + h * 0.4 };
    const cabe = caja.x0 > 2 && caja.x1 < ANCHO - 2 && caja.y0 > 2 && caja.y1 < alto - 2;
    if (!forzar && (!libre(caja) || !cabe)) return null;
    puestos.push(caja);
    return aLaIzquierda ? ' text-anchor="end"' : '';
  }

  // ---- la cruz: primero, porque tiene prioridad sobre todo rótulo ----
  const r = 9;
  const foco = barrio.toUpperCase();
  const izq = fx > ANCHO * 0.74;
  const tx = fx + (izq ? -r * 1.9 : r * 1.9);
  const ty = fy - r * 1.6;
  const anchor = colocar(foco, tx, ty, FS_FOCO, true);
  // ni la cruz ni el halo de detalle reciben rótulos encima
  puestos.push({ x0: fx - r * 2.4, x1: fx + r * 2.4, y0: fy - r * 2.4, y1: fy + r * 2.4 });

  /* ---- grafismo: escala y norte, en petróleo como en la axonometría ----
     Se dibujan al final pero reservan su lugar ACÁ: un rótulo caía justo
     encima de la barra de escala. La barra toma el número redondo más grande
     que no pase del 30 % del ancho, así sigue al encuadre si cambia. */
  const KM_BARRA = [5, 4, 3, 2, 1, 0.5].find((km) => km <= pr.anchoKm * 0.3) ?? 1;
  const wBarra = KM_BARRA * pr.pxPorKm;
  const bx = 20;
  const by = alto - 20;
  puestos.push({
    x0: bx - 4,
    x1: bx + wBarra + anchoTexto(`${KM_BARRA} KM`, FS_REF) + 10,
    y0: by - 12,
    y1: by + 8,
  });
  puestos.push({ x0: ANCHO - 38, x1: ANCHO - 4, y0: 6, y1: 48 });

  const barrios = datos.barrios as Record<string, number[][][]>;
  const refs = Object.keys(BARRIOS)
    .filter((n) => barrios[n] && BARRIOS[n]!.toUpperCase() !== foco)
    .map((nombre) => {
      const anillo = barrios[nombre]![0]!;
      const cx = anillo.reduce((acc, q) => acc + q[0]!, 0) / anillo.length;
      const cy = anillo.reduce((acc, q) => acc + q[1]!, 0) / anillo.length;
      return { nombre, xy: p([cx, cy]), d2: (cx - lon) ** 2 + (cy - lat) ** 2 };
    })
    .filter(({ xy }) => xy[0] > 0 && xy[0] < ANCHO && xy[1] > 0 && xy[1] < alto)
    .sort((x, y) => x.d2 - y.d2)
    .map(({ nombre, xy }) => {
      const t = BARRIOS[nombre]!;
      /* El rótulo se corre hacia adentro si el centroide cae en la franja que
         la máscara de bordes funde, pero sólo hasta CORRIDA_MAX: más que eso
         el nombre ya no cae sobre su barrio y miente. En Carrasco, que está en
         el borde de la ciudad, es la diferencia entre nombrar dos vecinos y
         ninguno. Y si aun así choca, se prueba otra altura. */
      const CORRIDA_MAX = 24;
      const cx = Math.min(Math.max(xy[0], ANCHO * 0.085), ANCHO * 0.915);
      const cy = Math.min(Math.max(xy[1], alto * 0.14), alto * 0.86);
      if (Math.hypot(cx - xy[0], cy - xy[1]) > CORRIDA_MAX) return '';
      for (const dy of [0, -14, 14, -28, 28]) {
        const y = Math.min(Math.max(cy + dy, alto * 0.14), alto * 0.86);
        const an = colocar(t, cx, y, FS_REF);
        if (an === null) continue;
        return `<text class="m-ref" x="${cx.toFixed(1)}" y="${y.toFixed(1)}"${an}>${esc(t)}</text>`;
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, MAX_ROTULOS)
    .join('');

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

  // el halo del detalle: lleno hasta casi la mitad del radio y de ahí se apaga
  const halo =
    `<radialGradient id="m-ghalo" gradientUnits="userSpaceOnUse" ` +
    `cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="${radio.toFixed(1)}">` +
    `<stop offset="0" stop-color="#fff"/><stop offset="0.45" stop-color="#fff"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    `<mask id="m-halo"><rect width="${ANCHO}" height="${alto}" fill="url(#m-ghalo)"/></mask>`;

  return `<svg class="mapa" viewBox="0 0 ${ANCHO} ${alto}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Plano de ubicación: ${esc(barrio)}, Montevideo">
<defs>${grad('m-gx1', 0, 0, 1, 0)}${grad('m-gx2', 1, 0, 0, 0)}${grad('m-gy1', 0, 0, 0, 1)}${grad('m-gy2', 0, 1, 0, 0)}
${desvanecido}
${halo}
<path id="m-costa-d" d="${tierra}" vector-effect="non-scaling-stroke"/>
<mask id="m-agua"><rect width="${ANCHO}" height="${alto}" fill="#fff"/><use href="#m-costa-d" fill="#000"/></mask>
</defs>
<g mask="url(#m-borde)">
<g mask="url(#m-agua)"><path class="m-agua" d="${rayado}"/></g>
<use href="#m-costa-d" class="m-tierra"/>
<g mask="url(#m-halo)"><path class="m-detalle" d="${detalle}"/></g>
<path class="m-malla" d="${malla}"/>
<g class="m-viario"><path class="m-ram" d="${via(datos.vias.ram)}"/><path class="m-rad" d="${via(datos.vias.rad)}"/><path class="m-ani" d="${via(datos.vias.ani)}"/></g>
<use href="#m-costa-d" class="m-costa"/>
${refs}
</g>
<g class="m-foco">
<path class="m-cruz" d="M${(fx - r * 2.8).toFixed(1)} ${fy.toFixed(1)}h${(r * 5.6).toFixed(1)}M${fx.toFixed(1)} ${(fy - r * 2.8).toFixed(1)}v${(r * 5.6).toFixed(1)}"/>
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
