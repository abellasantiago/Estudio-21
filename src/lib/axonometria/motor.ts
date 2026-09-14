/*
 * Motor de dibujo de la axonometría de "Quiénes somos".
 * ---------------------------------------------------------------------------
 * Una escena de verdad —sólidos en metros: X al este, Y al norte, Z arriba—
 * vista con una axonometría ORTOGONAL (rayos paralelos, sin fuga) desde el
 * sureste y desde arriba. Todo se resuelve en build: sale un SVG plano.
 *
 * Ocultamiento por algoritmo del pintor. Cada sólido se pinta con rellenos
 * opacos (tono de papel según hacia dónde mira la cara) y encima sus aristas;
 * lo que está más cerca se pinta después y tapa lo de atrás. El orden sale de
 * un orden topológico entre cajas que se pisan en pantalla: dos cajas que no se
 * cortan siempre tienen un eje que las separa, y ese eje dice cuál queda detrás
 * (la mirada avanza hacia −X, +Y y −Z).
 *
 * Jerarquía de línea de dibujo de arquitectura, automática:
 *   · silueta (arista con una sola cara visible) → trazo grueso;
 *   · arista entre dos caras visibles → trazo fino;
 *   · caras sobre un plano de corte → poché, con contorno más grueso todavía.
 */

export type XY = readonly [number, number];
export type V3 = readonly [number, number, number];

const EPS = 1e-6;

export interface Vista {
  az: number; // giro en planta (°), entre 0 y 90: se ve la cara sur y la este
  el: number; // elevación de la mirada (°)
  esc: number; // unidades de viewBox por metro
}

export interface Proy {
  p(x: number, y: number, z: number): XY;
  /** Distancia a lo largo de la mirada: mayor = más lejos. */
  prof(x: number, y: number, z: number): number;
  /** Vector unitario hacia la cámara. */
  T: V3;
  /** Unidades de viewBox por metro. */
  esc: number;
}

export function proyeccion({ az, el, esc }: Vista): Proy {
  const a = (az * Math.PI) / 180;
  const e = (el * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const ce = Math.cos(e);
  const se = Math.sin(e);
  return {
    p: (x, y, z) => [(x * ca + y * sa) * esc, -(z * ce + (y * ca - x * sa) * se) * esc],
    prof: (x, y, z) => (y * ca - x * sa) * ce - z * se,
    T: [ce * sa, -ce * ca, se],
    esc,
  };
}

export interface Caja {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

/** Región que quita un corte de esquina: x < X < x1 · y0 < Y < y · z0 < Z < z1. */
export interface Corte {
  x: number;
  y: number;
  z0: number;
  z1: number;
  /** Hasta dónde llega hacia el este (por defecto, sin límite). */
  x1?: number;
  /** Hasta dónde llega hacia el sur (por defecto, sin límite). */
  y0?: number;
}

/** Clases CSS de un sólido: un relleno por orientación de cara + dos trazos. */
export interface Estilo {
  sup: string; // cara superior
  e: string; // caras que miran al este (+X)
  s: string; // caras que miran al sur (−Y)
  sil: string; // silueta
  ari: string; // aristas entre dos caras visibles
  /** Relleno y contorno de sus caras cortadas (por defecto, poché macizo).
   *  El vidrio cortado no es un macizo: lleva su propio tono. */
  poche?: string;
  cor?: string;
}

/** Detalle suelto: en 3D (l/p) o ya en coordenadas de pantalla (L/P/O). */
export type Prim =
  | { k: 'l'; pts: V3[]; c: string }
  | { k: 'p'; pts: V3[]; c: string }
  | { k: 'L'; pts: XY[]; c: string }
  | { k: 'P'; pts: XY[]; c: string }
  | { k: 'O'; x: number; y: number; r: number; c: string; relleno: boolean }
  | { k: 'D'; d: string; c: string; trazo: boolean; bbox: readonly [XY, XY] }; // path ya armado, en pantalla

/** Prisma vertical: un polígono en planta extruido entre z0 y z1. */
export interface Solido {
  t: 's';
  planta: XY[];
  z0: number;
  z1: number;
  estilo: Estilo;
  fase: number;
  /** La cara superior es un plano de corte (un tabique cortado a media altura). */
  techoCortado?: boolean;
  /** Detalles pegados a sus caras: se pintan sobre los rellenos, bajo las aristas. */
  extras?: Prim[];
  sinSombra?: boolean;
}

/** Algo que no es un prisma (árbol, figura, baranda): caja para ordenar + dibujo. */
export interface Grupo {
  t: 'g';
  caja: Caja;
  fase: number;
  prims: (P: Proy) => Prim[];
  /** Polígonos que proyecta en el suelo (ya calculados). */
  sombra?: XY[][];
  /** 'contigua': sólo se juntan en un path partes SEGUIDAS de la misma clase —
   *  para grupos cuyas piezas se pisan entre sí y el orden interno importa. */
  fusion?: 'contigua';
}

export type Item = Solido | Grupo;

export interface Escena {
  /** El zócalo de la maqueta: se pinta primero y sus extras son el suelo. */
  base: Solido;
  items: Item[];
  cortes: Corte[];
  /** Corrimiento de la sombra sobre el suelo por cada metro de altura. */
  sol: XY;
  /** Rectángulo del suelo donde pueden caer sombras (el borde del zócalo). */
  recorteSombra: readonly [XY, XY];
  claseSombra: string;
}

export interface Elemento {
  d: string;
  c: string;
  trazo: boolean;
  fase: number;
  /** Posición en el orden del pintor (0 = lo primero que se pinta). */
  orden: number;
}

export interface Dibujo {
  elementos: Elemento[];
  limites: { x: number; y: number; w: number; h: number };
  /** Cajas que se interpenetran (su orden sale a ojo) y ciclos rotos. Tiene
   *  que quedar vacío: si no, algo se va a tapar mal. */
  avisos: string[];
}

// ---------------------------------------------------------------------------
// formato de path compacto (1 decimal, pares separados por espacio)
export const n1 = (v: number) => String(Math.round(v * 10) / 10);
const seq = (pts: readonly XY[]) => pts.map((q) => n1(q[0]) + ' ' + n1(q[1])).join(' ');
const poli = (pts: readonly XY[], cerrar: boolean) => 'M' + seq(pts) + (cerrar ? 'Z' : '');
const circulo = (x: number, y: number, r: number) =>
  `M${n1(x - r)} ${n1(y)}a${n1(r)} ${n1(r)} 0 1 0 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 0 ${n1(-2 * r)} 0`;

const areaFirmada = (pts: readonly XY[]) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
};

// ---------------------------------------------------------------------------
// caras visibles de un prisma
interface Cara {
  pts: V3[];
  c: string;
  cortada: boolean;
}

function enCorte(nx: number, ny: number, p: XY, q: XY, s: Solido, cortes: Corte[]) {
  for (const c of cortes) {
    if (s.z1 <= c.z0 + EPS || s.z0 >= c.z1 - EPS) continue;
    const y0 = c.y0 ?? -Infinity;
    const x1 = c.x1 ?? Infinity;
    if (nx > 0.999 && Math.abs(p[0] - c.x) < EPS && Math.max(p[1], q[1]) <= c.y + EPS && Math.min(p[1], q[1]) >= y0 - EPS)
      return true;
    if (ny < -0.999 && Math.abs(p[1] - c.y) < EPS && Math.min(p[0], q[0]) >= c.x - EPS && Math.max(p[0], q[0]) <= x1 + EPS)
      return true;
  }
  return false;
}

function carasVisibles(s: Solido, P: Proy, cortes: Corte[]): Cara[] {
  const planta = areaFirmada(s.planta) < 0 ? [...s.planta].reverse() : s.planta;
  const lados: (Cara & { prof: number })[] = [];
  for (let i = 0; i < planta.length; i++) {
    const p = planta[i];
    const q = planta[(i + 1) % planta.length];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    if (len < EPS) continue;
    const nx = dy / len;
    const ny = -dx / len;
    if (nx * P.T[0] + ny * P.T[1] <= EPS) continue; // mira para el otro lado
    const cortada = enCorte(nx, ny, p, q, s, cortes);
    lados.push({
      pts: [
        [p[0], p[1], s.z0],
        [q[0], q[1], s.z0],
        [q[0], q[1], s.z1],
        [p[0], p[1], s.z1],
      ],
      c: cortada ? (s.estilo.poche ?? 'poche') : Math.abs(ny) >= Math.abs(nx) ? s.estilo.s : s.estilo.e,
      cortada,
      prof: P.prof((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (s.z0 + s.z1) / 2),
    });
  }
  lados.sort((a, b) => b.prof - a.prof);
  const techo: Cara = {
    pts: planta.map(([x, y]) => [x, y, s.z1] as V3),
    c: s.techoCortado ? (s.estilo.poche ?? 'poche') : s.estilo.sup,
    cortada: !!s.techoCortado,
  };
  return [...lados, techo];
}

// aristas de las caras visibles, clasificadas por cuántas caras las comparten
function aristas(caras: Cara[]) {
  const m = new Map<string, { a: V3; b: V3; n: number; cor: boolean }>();
  const key = (v: V3) => `${v[0].toFixed(3)},${v[1].toFixed(3)},${v[2].toFixed(3)}`;
  for (const f of caras) {
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i];
      const b = f.pts[(i + 1) % f.pts.length];
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) continue;
      const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = m.get(k);
      if (e) {
        e.n++;
        e.cor ||= f.cortada;
      } else m.set(k, { a, b, n: 1, cor: f.cortada });
    }
  }
  return [...m.values()];
}

// ---------------------------------------------------------------------------
// sombras arrojadas sobre el suelo (z = 0)
const interX = (p: XY, q: XY, x: number): XY => [x, p[1] + ((q[1] - p[1]) * (x - p[0])) / (q[0] - p[0])];
const interY = (p: XY, q: XY, y: number): XY => [p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]), y];

/** Sutherland–Hodgman contra un rectángulo alineado a los ejes. */
export function recortar(poly: readonly XY[], [a, b]: readonly [XY, XY]): XY[] {
  let out: XY[] = [...poly];
  const lados: [(p: XY) => boolean, (p: XY, q: XY) => XY][] = [
    [(p) => p[0] >= a[0], (p, q) => interX(p, q, a[0])],
    [(p) => p[0] <= b[0], (p, q) => interX(p, q, b[0])],
    [(p) => p[1] >= a[1], (p, q) => interY(p, q, a[1])],
    [(p) => p[1] <= b[1], (p, q) => interY(p, q, b[1])],
  ];
  for (const [dentro, cruce] of lados) {
    const ent = out;
    out = [];
    for (let i = 0; i < ent.length; i++) {
      const cur = ent[i];
      const prev = ent[(i + ent.length - 1) % ent.length];
      if (dentro(cur)) {
        if (!dentro(prev)) out.push(cruce(prev, cur));
        out.push(cur);
      } else if (dentro(prev)) out.push(cruce(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

/** Sombra de un prisma: techo y base corridos + las caras laterales barridas. */
export function sombraPrisma(planta: readonly XY[], z0: number, z1: number, sol: XY): XY[][] {
  const zb = Math.max(0, z0);
  const sh = (x: number, y: number, z: number): XY => [x + z * sol[0], y + z * sol[1]];
  const polys: XY[][] = [planta.map(([x, y]) => sh(x, y, z1))];
  if (zb > EPS) polys.push(planta.map(([x, y]) => sh(x, y, zb)));
  for (let i = 0; i < planta.length; i++) {
    const p = planta[i];
    const q = planta[(i + 1) % planta.length];
    polys.push([sh(p[0], p[1], zb), sh(q[0], q[1], zb), sh(q[0], q[1], z1), sh(p[0], p[1], z1)]);
  }
  // Una planta convexa barrida por una traslación sigue siendo convexa: la
  // sombra entera es la envolvente de sus puntos → un polígono en vez de seis
  // (la sombra era el path más pesado del dibujo).
  return esConvexo(planta) ? [envolvente(polys.flat())] : polys;
}

function esConvexo(pl: readonly XY[]): boolean {
  let signo = 0;
  for (let i = 0; i < pl.length; i++) {
    const a = pl[i];
    const b = pl[(i + 1) % pl.length];
    const c = pl[(i + 2) % pl.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-9) continue;
    if (!signo) signo = Math.sign(cr);
    else if (Math.sign(cr) !== signo) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// orden del pintor
export function cajaDe(it: Item): Caja {
  if (it.t === 'g') return it.caja;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of it.planta) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { x0, y0, z0: it.z0, x1, y1, z1: it.z1 };
}

const fmtCaja = (c: Caja) => `[${c.x0} ${c.y0} ${c.z0} → ${c.x1} ${c.y1} ${c.z1}]`;

/** Contorno de una caja en pantalla (un hexágono): envolvente de sus 8 vértices. */
function contornoPantalla(c: Caja, P: Proy): XY[] {
  const pts: XY[] = [];
  for (const x of [c.x0, c.x1]) for (const y of [c.y0, c.y1]) for (const z of [c.z0, c.z1]) pts.push(P.p(x, y, z));
  return envolvente(pts);
}

/** Envolvente convexa de un conjunto de puntos (cadena monótona). */
function envolvente(entrada: readonly XY[]): XY[] {
  const pts = [...entrada].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const giro = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const abajo: XY[] = [];
  const arriba: XY[] = [];
  for (const p of pts) {
    while (abajo.length >= 2 && giro(abajo[abajo.length - 2], abajo[abajo.length - 1], p) <= 0) abajo.pop();
    abajo.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (arriba.length >= 2 && giro(arriba[arriba.length - 2], arriba[arriba.length - 1], p) <= 0) arriba.pop();
    arriba.push(p);
  }
  return [...abajo.slice(0, -1), ...arriba.slice(0, -1)];
}

/** ¿Se pisan de verdad dos contornos convexos? (ejes separadores; tocarse no cuenta).
 *  Comparar sólo rectángulos envolventes no alcanza: una losa larga en diagonal
 *  "pisa" medio dibujo y genera dependencias falsas que terminan en ciclos. */
function sePisan(A: XY[], B: XY[]): boolean {
  for (const poly of [A, B]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const nx = q[1] - p[1];
      const ny = p[0] - q[0];
      const len = Math.hypot(nx, ny);
      if (len < 1e-9) continue;
      let aMin = Infinity;
      let aMax = -Infinity;
      let bMin = Infinity;
      let bMax = -Infinity;
      for (const v of A) {
        const d = (v[0] * nx + v[1] * ny) / len;
        aMin = Math.min(aMin, d);
        aMax = Math.max(aMax, d);
      }
      for (const v of B) {
        const d = (v[0] * nx + v[1] * ny) / len;
        bMin = Math.min(bMin, d);
        bMax = Math.max(bMax, d);
      }
      if (aMax <= bMin + 0.05 || bMax <= aMin + 0.05) return false;
    }
  }
  return true;
}

/** −1: A va antes (detrás) · 1: B va antes · 0: las cajas se cortan. */
function detras(A: Caja, B: Caja): number {
  if (A.x1 <= B.x0 + EPS) return -1; // A al oeste: más lejos
  if (B.x1 <= A.x0 + EPS) return 1;
  if (A.y0 >= B.y1 - EPS) return -1; // A al norte: más lejos
  if (B.y0 >= A.y1 - EPS) return 1;
  if (A.z1 <= B.z0 + EPS) return -1; // A abajo: más lejos
  if (B.z1 <= A.z0 + EPS) return 1;
  return 0;
}

function ordenPintor(items: Item[], P: Proy): { orden: number[]; avisos: string[] } {
  const n = items.length;
  const cajas = items.map(cajaDe);
  const pant = cajas.map((c) => {
    let a = Infinity;
    let b = Infinity;
    let cc = -Infinity;
    let d = -Infinity;
    for (const x of [c.x0, c.x1])
      for (const y of [c.y0, c.y1])
        for (const z of [c.z0, c.z1]) {
          const [u, v] = P.p(x, y, z);
          a = Math.min(a, u);
          b = Math.min(b, v);
          cc = Math.max(cc, u);
          d = Math.max(d, v);
        }
    return [a, b, cc, d];
  });
  const prof = cajas.map((c) => P.prof((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, (c.z0 + c.z1) / 2));
  const contornos = cajas.map((c) => contornoPantalla(c, P));
  const avisos: string[] = [];
  const sig: number[][] = Array.from({ length: n }, () => []);
  const grado = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = pant[i];
      const b = pant[j];
      if (a[2] <= b[0] + 0.01 || b[2] <= a[0] + 0.01 || a[3] <= b[1] + 0.01 || b[3] <= a[1] + 0.01) continue;
      if (!sePisan(contornos[i], contornos[j])) continue;
      let o = detras(cajas[i], cajas[j]);
      if (o === 0) {
        o = prof[i] >= prof[j] ? -1 : 1;
        avisos.push(`se cortan: ${fmtCaja(cajas[i])} × ${fmtCaja(cajas[j])}`);
      }
      const [de, hacia] = o < 0 ? [i, j] : [j, i];
      sig[de].push(hacia);
      grado[hacia]++;
    }
  }
  // Kahn: entre los disponibles, primero el más lejano. Con cajas que no se
  // cortan no hay ciclos; si aparece uno, se rompe por el nodo con menos
  // predecesores pendientes (el que menos restricciones viola) y queda avisado.
  const hecho = new Array<boolean>(n).fill(false);
  const orden: number[] = [];
  while (orden.length < n) {
    let mejor = -1;
    for (let i = 0; i < n; i++)
      if (!hecho[i] && grado[i] <= 0 && (mejor < 0 || prof[i] > prof[mejor])) mejor = i;
    if (mejor < 0) {
      for (let i = 0; i < n; i++)
        if (!hecho[i] && (mejor < 0 || grado[i] < grado[mejor] || (grado[i] === grado[mejor] && prof[i] > prof[mejor])))
          mejor = i;
      avisos.push(`ciclo roto en ${fmtCaja(cajas[mejor])}`);
    }
    hecho[mejor] = true;
    orden.push(mejor);
    for (const k of sig[mejor]) grado[k]--;
  }
  return { orden, avisos };
}

// ---------------------------------------------------------------------------
// dibujo completo
type Parte = { c: string; trazo: boolean; d: string; fase?: number };

export function dibujar(esc: Escena, vista: Vista): Dibujo {
  const P = proyeccion(vista);
  if (!(P.T[0] > 0 && P.T[1] < 0)) throw new Error('axonometría: `az` tiene que estar entre 0° y 90°');

  const elementos: Elemento[] = [];
  let u0 = Infinity;
  let v0 = Infinity;
  let u1 = -Infinity;
  let v1 = -Infinity;
  const ext = (q: XY) => {
    if (q[0] < u0) u0 = q[0];
    if (q[0] > u1) u1 = q[0];
    if (q[1] < v0) v0 = q[1];
    if (q[1] > v1) v1 = q[1];
    return q;
  };
  const proj = (v: V3) => ext(P.p(v[0], v[1], v[2]));

  const primD = (x: Prim): Parte => {
    switch (x.k) {
      case 'l':
        return { c: x.c, trazo: true, d: poli(x.pts.map(proj), false) };
      case 'p':
        return { c: x.c, trazo: false, d: poli(x.pts.map(proj), true) };
      case 'L':
        return { c: x.c, trazo: true, d: poli(x.pts.map(ext), false) };
      case 'P':
        return { c: x.c, trazo: false, d: poli(x.pts.map(ext), true) };
      case 'O':
        ext([x.x - x.r, x.y - x.r]);
        ext([x.x + x.r, x.y + x.r]);
        return { c: x.c, trazo: !x.relleno, d: circulo(x.x, x.y, x.r) };
      case 'D':
        ext(x.bbox[0]);
        ext(x.bbox[1]);
        return { c: x.c, trazo: x.trazo, d: x.d };
    }
  };

  let orden = 0;
  // dentro de un mismo ítem, lo que comparte clase, tipo y fase va en un solo
  // path (menos nodos en el DOM); el orden de primera aparición se respeta
  const emitir = (partes: Parte[], fase: number, contigua = false) => {
    const idx = new Map<string, number>();
    const juntos: Elemento[] = [];
    for (const p of partes) {
      if (!p.d) continue;
      const f = p.fase ?? fase;
      const k = `${p.trazo ? 't' : 'r'}:${p.c}:${f}`;
      if (contigua) {
        if (juntos.length && idx.get(k) === juntos.length - 1) juntos[juntos.length - 1].d += p.d;
        else {
          idx.clear();
          idx.set(k, juntos.length);
          juntos.push({ d: p.d, c: p.c, trazo: p.trazo, fase: f, orden });
        }
        continue;
      }
      const i = idx.get(k);
      if (i === undefined) {
        idx.set(k, juntos.length);
        juntos.push({ d: p.d, c: p.c, trazo: p.trazo, fase: f, orden });
      } else juntos[i].d += p.d;
    }
    elementos.push(...juntos);
    orden++;
  };

  const solido = (s: Solido, entreMedio: Parte[] = []) => {
    const caras = carasVisibles(s, P, esc.cortes);
    const partes: Parte[] = caras.map((f) => ({ c: f.c, trazo: false, d: poli(f.pts.map(proj), true) }));
    for (const x of s.extras ?? []) partes.push(primD(x));
    partes.push(...entreMedio);
    const sil: string[] = [];
    const ari: string[] = [];
    const cor: string[] = [];
    for (const e of aristas(caras)) {
      const d = 'M' + seq([proj(e.a), proj(e.b)]);
      (e.cor ? cor : e.n > 1 ? ari : sil).push(d);
    }
    partes.push({ c: s.estilo.sil, trazo: true, d: sil.join('') });
    partes.push({ c: s.estilo.ari, trazo: true, d: ari.join('') });
    partes.push({ c: s.estilo.cor ?? 'cor', trazo: true, d: cor.join('') });
    emitir(partes, s.fase);
  };

  // sombras de todo lo que está parado sobre el zócalo, en un único path: con
  // fill-rule nonzero y todos los polígonos girando igual, las superposiciones
  // no se oscurecen de más (el relleno de un path se pinta una sola vez)
  let sombras = '';
  for (const it of esc.items) {
    const polys =
      it.t === 'g' ? (it.sombra ?? []) : it.sinSombra || it.z1 < 0.05 ? [] : sombraPrisma(it.planta, it.z0, it.z1, esc.sol);
    for (const poly of polys) {
      const rec = recortar(poly, esc.recorteSombra);
      if (rec.length < 3) continue;
      let pts = rec.map(([x, y]) => P.p(x, y, 0));
      if (Math.abs(areaFirmada(pts)) < 0.05) continue;
      if (areaFirmada(pts) < 0) pts = pts.reverse();
      sombras += poli(pts, true);
    }
  }

  solido(esc.base, [{ c: esc.claseSombra, trazo: false, d: sombras, fase: 6 }]);
  const { orden: secuencia, avisos } = ordenPintor(esc.items, P);
  for (const i of secuencia) {
    const it = esc.items[i];
    if (it.t === 's') solido(it);
    else emitir(it.prims(P).map(primD), it.fase, it.fusion === 'contigua');
  }

  return { elementos, limites: { x: u0, y: v0, w: u1 - u0, h: v1 - v0 }, avisos };
}
