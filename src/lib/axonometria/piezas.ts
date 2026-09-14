/*
 * Piezas para armar la escena de la axonometría: estilos (clases CSS de
 * axonometria.css), prismas, texturas de fachada y de piso, y los grupos que
 * no son un prisma (escalera, listones, paneles, árboles, figuras). En metros.
 */
import { n1, sombraPrisma } from './motor.ts';
import type { Estilo, Grupo, Prim, Solido, V3, XY } from './motor.ts';

// ---- estilos: un relleno por orientación de cara + silueta / arista ----
export const EST = {
  obra: { sup: 'c-o1', e: 'c-o2', s: 'c-o3', sil: 'l-sil', ari: 'l-ari' },
  piedra: { sup: 'c-o1', e: 'c-p2', s: 'c-p3', sil: 'l-sil', ari: 'l-ari' },
  madera: { sup: 'c-m1', e: 'c-m2', s: 'c-m3', sil: 'l-msil', ari: 'l-mari' },
  vidrio: { sup: 'c-v', e: 'c-v', s: 'c-v', sil: 'l-vsil', ari: 'l-vari', poche: 'c-v', cor: 'l-vsil' },
  // barandas y mamparas: vidrio más leve, que no compita con los cerramientos
  baranda: { sup: 'c-vb', e: 'c-vb', s: 'c-vb', sil: 'l-vari', ari: 'l-vari', poche: 'c-vb', cor: 'l-vari' },
  mueble: { sup: 'c-u1', e: 'c-u2', s: 'c-u3', sil: 'l-usil', ari: 'l-uari' },
  tela: { sup: 'c-t1', e: 'c-t2', s: 'c-t3', sil: 'l-usil', ari: 'l-uari' },
  zocalo: { sup: 'c-suelo', e: 'c-z2', s: 'c-z3', sil: 'l-sil', ari: 'l-ari' },
} as const satisfies Record<string, Estilo>;

// ---- geometría básica ----
export const rect = (x0: number, y0: number, x1: number, y1: number): XY[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/** Rectángulo con esquinas redondeadas, antihorario. */
export function redondeado(x0: number, y0: number, x1: number, y1: number, r: number, seg = 3): XY[] {
  const out: XY[] = [];
  const esquinas: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of esquinas)
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * Math.PI) / 180;
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  return out;
}

export const caja = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  estilo: Estilo,
  fase: number,
  mas: Partial<Solido> = {},
): Solido => ({ t: 's', planta: rect(x0, y0, x1, y1), z0, z1, estilo, fase, ...mas });

export const prisma = (planta: XY[], z0: number, z1: number, estilo: Estilo, fase: number, mas: Partial<Solido> = {}): Solido => ({
  t: 's',
  planta,
  z0,
  z1,
  estilo,
  fase,
  ...mas,
});

export const L = (c: string, ...pts: V3[]): Prim => ({ k: 'l', pts, c });
export const PL = (c: string, ...pts: V3[]): Prim => ({ k: 'p', pts, c });

/** Pseudoaleatorio determinístico (el dibujo sale igual en cada build). */
export const rnd = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

// ---- texturas sobre un plano: S → (a, y=k, z) · E → (x=k, a, z) ----
type Plano = 'S' | 'E';
const en = (pl: Plano, k: number, a: number, z: number): V3 => (pl === 'S' ? [a, k, z] : [k, a, z]);

/** Carpintería de un paño vidriado: marco, montantes, travesaño y reflejos. */
export function vidriado(pl: Plano, k: number, a0: number, a1: number, z0: number, z1: number, paso: number, trav?: number): Prim[] {
  const out: Prim[] = [];
  const n = Math.max(1, Math.round((a1 - a0) / paso));
  const w = (a1 - a0) / n;
  out.push(L('l-mar', en(pl, k, a0, z0 + 0.06), en(pl, k, a1, z0 + 0.06)));
  out.push(L('l-mar', en(pl, k, a0, z1 - 0.06), en(pl, k, a1, z1 - 0.06)));
  if (trav !== undefined) out.push(L('l-mar', en(pl, k, a0, trav), en(pl, k, a1, trav)));
  for (let i = 1; i < n; i++) out.push(L('l-mar', en(pl, k, a0 + i * w, z0), en(pl, k, a0 + i * w, z1)));
  // reflejos: dos diagonales cortas, paño por medio (convención de dibujo)
  for (let i = 0; i < n; i += 2) {
    const za = z0 + (z1 - z0) * 0.32;
    const zb = z0 + (z1 - z0) * 0.58;
    for (const s of [0, 0.24]) out.push(L('l-ref', en(pl, k, a0 + i * w + w * 0.28 + s, za), en(pl, k, a0 + i * w + w * 0.5 + s, zb)));
  }
  return out;
}

/** Celosía de listones verticales: cada listón = frente + franja de su canto. */
export function celosia(pl: Plano, k: number, a0: number, a1: number, z0: number, z1: number, paso: number): Prim[] {
  const out: Prim[] = [L('l-mar', en(pl, k, a0, z0), en(pl, k, a1, z0)), L('l-mar', en(pl, k, a0, z1), en(pl, k, a1, z1))];
  const canto = Math.min(0.07, paso * 0.35);
  for (let a = a0 + paso * 0.6; a < a1 - paso * 0.3; a += paso) {
    out.push(PL('c-cel', en(pl, k, a, z0), en(pl, k, a + canto, z0), en(pl, k, a + canto, z1), en(pl, k, a, z1)));
    out.push(L('l-cel', en(pl, k, a, z0), en(pl, k, a, z1)));
  }
  return out;
}

/** Sillería: hiladas horizontales con juntas verticales trabadas. */
export function sillar(pl: Plano, k: number, a0: number, a1: number, z0: number, z1: number, alto = 0.45, largo = 1.3): Prim[] {
  const out: Prim[] = [];
  let fila = 0;
  for (let z = z0; z < z1 - 0.05; z += alto, fila++) {
    const zt = Math.min(z + alto, z1);
    if (zt < z1 - 0.01) out.push(L('l-jun', en(pl, k, a0, zt), en(pl, k, a1, zt)));
    for (let a = a0 + (fila % 2 ? largo / 2 : largo); a < a1 - 0.12; a += largo) out.push(L('l-jun', en(pl, k, a, z), en(pl, k, a, zt)));
  }
  return out;
}

/** Tablas (o baldosas) sobre un plano horizontal, esquivando huecos [x0,y0,x1,y1]. */
export function tablas(
  z: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  paso: number,
  huecos: [number, number, number, number][] = [],
  c = 'l-tab',
  juntas = 0,
): Prim[] {
  const out: Prim[] = [];
  let fila = 0;
  for (let y = y0 + paso; y < y1 - 0.02; y += paso, fila++) {
    let tramos: [number, number][] = [[x0, x1]];
    for (const [hx0, hy0, hx1, hy1] of huecos) {
      if (y <= hy0 || y >= hy1) continue;
      tramos = tramos.flatMap(([a, b]) => {
        const r: [number, number][] = [];
        if (hx0 > a) r.push([a, Math.min(b, hx0)]);
        if (hx1 < b) r.push([Math.max(a, hx1), b]);
        return r.filter(([p, q]) => q - p > 0.05);
      });
    }
    for (const [a, b] of tramos) out.push(L(c, [a, y, z], [b, y, z]));
    // juntas a tope de las tablas, salteadas entre filas
    if (juntas)
      for (let x = x0 + juntas * (0.3 + rnd(fila) * 0.7); x < x1 - 0.2; x += juntas * (0.8 + rnd(fila + x) * 0.6))
        if (tramos.some(([a, b]) => x > a + 0.1 && x < b - 0.1)) out.push(L(c, [x, y - paso, z], [x, y, z]));
  }
  return out;
}

// ---- grupos de cajas chicas que no se pisan entre sí ----
type CajaXY = [number, number, number, number, number, number]; // x0 y0 x1 y1 z0 z1

function carasCaja([x0, y0, x1, y1, z0, z1]: CajaXY, e: Estilo, bordes: string): Prim[] {
  const sur: V3[] = [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]];
  const este: V3[] = [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]];
  const sup: V3[] = [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  return [
    { k: 'p', pts: sur, c: e.s },
    { k: 'p', pts: este, c: e.e },
    { k: 'p', pts: sup, c: e.sup },
    L(bordes, [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]),
    L(bordes, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1]),
    L(bordes, [x1, y0, z1], [x1, y0, z0]),
  ];
}

/** Cajas sueltas dibujadas como un solo ítem (lejanas primero). */
export function grupoCajas(cajas: CajaXY[], e: Estilo, bordes: string, fase: number, sol: XY | null, extra: Prim[] = []): Grupo {
  const orden = [...cajas].sort((a, b) => b[1] - a[1] || a[0] - b[0] || a[4] - b[4]);
  return {
    t: 'g',
    fase,
    fusion: 'contigua',
    caja: {
      x0: Math.min(...cajas.map((c) => c[0])),
      y0: Math.min(...cajas.map((c) => c[1])),
      x1: Math.max(...cajas.map((c) => c[2])),
      y1: Math.max(...cajas.map((c) => c[3])),
      z0: Math.min(...cajas.map((c) => c[4])),
      z1: Math.max(...cajas.map((c) => c[5])),
    },
    sombra: sol ? cajas.flatMap((c) => sombraPrisma(rect(c[0], c[1], c[2], c[3]), c[4], c[5], sol)) : undefined,
    prims: () => [...orden.flatMap((c) => carasCaja(c, e, bordes)), ...extra],
  };
}

// ---- ambientación: árboles, matas, figuras ----
const circuloSuelo = (cx: number, cy: number, r: number, n = 18): XY[] =>
  Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)] as XY);

/** Copa (en ortogonal una esfera es un círculo): contorno festoneado, como una
 *  copa dibujada a mano, y unos pocos lóbulos interiores del lado en sombra. */
function copa(cx: number, cy: number, R: number, semilla: number): Prim[] {
  // festón: un arco por lóbulo entre puntos del perímetro (flecha 0,11 R hacia
  // afuera). Con comandos de arco el path pesa ~5 veces menos que muestreado,
  // y relleno + contorno van en un solo elemento (c-copa lleva los dos).
  // Las matas chicas (R de pocas unidades) con el festón de un árbol se leían
  // como círculos lisos: llevan menos lóbulos y más marcados, y sin sombreado
  // interior (a ese tamaño los arcos parecían una boca dentro de un globo).
  const chica = R < 12;
  const n = chica ? 6 : Math.max(7, Math.round(R / 2.6));
  const pts: XY[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI + rnd(semilla + 31) * 0.8;
    const r0 = R * (0.86 + rnd(semilla * 7 + i) * 0.06);
    return [cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)] as XY;
  });
  const flecha = R * (chica ? 0.2 : 0.11);
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const cuerda = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const rho = n1((cuerda * cuerda) / (8 * flecha) + flecha / 2);
    d += `A${rho} ${rho} 0 0 1 ${n1(q[0])} ${n1(q[1])}`;
  }
  // volumen: trazos cortos concéntricos del lado en sombra (abajo a la
  // derecha: el sol viene de atrás), como el sombreado a lápiz de una copa
  let s = '';
  for (let k = 0; k < (chica ? 0 : 3); k++) {
    const a0 = ((10 + k * 27 + rnd(semilla + 3 + k) * 10) * Math.PI) / 180;
    const a1 = a0 + ((28 + rnd(semilla + 5 + k) * 14) * Math.PI) / 180;
    const rr = R * (0.8 - k * 0.1 - rnd(semilla + 9 + k) * 0.05);
    s += `M${n1(cx + rr * Math.cos(a0))} ${n1(cy + rr * Math.sin(a0))}A${n1(rr)} ${n1(rr)} 0 0 1 ${n1(cx + rr * Math.cos(a1))} ${n1(cy + rr * Math.sin(a1))}`;
  }
  const bbox: [XY, XY] = [
    [cx - R * 1.05, cy - R * 1.05],
    [cx + R * 1.05, cy + R * 1.05],
  ];
  return [
    { k: 'D', d: d + 'Z', c: 'c-copa', trazo: false, bbox },
    { k: 'D', d: s, c: 'l-copa2', trazo: true, bbox },
  ];
}

export function arbol(x: number, y: number, alto: number, r: number, fase: number, sol: XY, semilla = 1): Grupo {
  const hc = alto - r;
  return {
    t: 'g',
    fase,
    caja: { x0: x - r, y0: y - r, z0: 0, x1: x + r, y1: y + r, z1: alto },
    sombra: [
      circuloSuelo(x + hc * sol[0], y + hc * sol[1], r * 0.9),
      [[x - 0.12, y], [x + 0.12, y], [x + 0.12 + hc * 0.6 * sol[0], y + hc * 0.6 * sol[1]], [x - 0.12 + hc * 0.6 * sol[0], y + hc * 0.6 * sol[1]]],
    ],
    prims: (P) => {
      const b = P.p(x, y, 0);
      const c = P.p(x, y, hc);
      const R = r * P.esc;
      const pie = c[1] + R * 0.88; // donde el tronco entra en la copa
      return [
        { k: 'L', pts: [b, [b[0], pie - R * 0.25]], c: 'l-tronco' },
        { k: 'L', pts: [[b[0], pie + (b[1] - pie) * 0.18], [b[0] - R * 0.24, pie - R * 0.2]], c: 'l-tronco' },
        ...copa(c[0], c[1], R, semilla),
      ];
    },
  };
}

/** Mata o arbusto (una copa baja apoyada en z). */
export function mata(x: number, y: number, z: number, r: number, fase: number, sol: XY | null, semilla = 3): Grupo {
  return {
    t: 'g',
    fase,
    caja: { x0: x - r, y0: y - r, z0: z, x1: x + r, y1: y + r, z1: z + 2 * r },
    sombra: sol && z < 0.05 ? [circuloSuelo(x + r * sol[0], y + r * sol[1], r * 0.9, 12)] : undefined,
    prims: (P) => {
      const c = P.p(x, y, z + r * 0.85);
      return copa(c[0], c[1], r * P.esc, semilla);
    },
  };
}

/** Figura humana de escala, de pie. `paso` abre las piernas (caminando). */
export function figura(x: number, y: number, z: number, fase: number, sol: XY | null, paso = 0): Grupo {
  return {
    t: 'g',
    fase,
    caja: { x0: x - 0.25, y0: y - 0.2, z0: z, x1: x + 0.25, y1: y + 0.2, z1: z + 1.75 },
    sombra: sol && z < 0.05 ? [[[x - 0.16, y], [x + 0.16, y], [x + 0.16 + 1.6 * sol[0], y + 1.6 * sol[1]], [x - 0.16 + 1.6 * sol[0], y + 1.6 * sol[1]]]] : undefined,
    prims: (P) => {
      const e = P.esc;
      const at = (dx: number, h: number): XY => {
        const q = P.p(x, y, z + h);
        return [q[0] + dx * e, q[1]];
      };
      // silueta llena, como las figuras de escala de una lámina: hombros,
      // brazos sueltos al costado del cuerpo y piernas
      const cuerpo: XY[] = [
        at(-0.08, 1.49),
        at(-0.22, 1.43),
        at(-0.26, 0.86),
        at(-0.2, 0.84),
        at(-0.165, 1.2),
        at(-0.15, 0.88),
        at(-0.13 - paso, 0),
        at(-0.035 - paso * 0.4, 0),
        at(0, 0.76),
        at(0.035 + paso * 0.4, 0),
        at(0.13 + paso, 0),
        at(0.15, 0.88),
        at(0.165, 1.2),
        at(0.2, 0.84),
        at(0.26, 0.86),
        at(0.22, 1.43),
        at(0.08, 1.49),
      ];
      const cab = at(0, 1.62);
      return [
        { k: 'P', pts: cuerpo, c: 'c-fig' },
        { k: 'O', x: cab[0], y: cab[1], r: 0.115 * e, c: 'c-fig', relleno: true },
      ];
    },
  };
}
