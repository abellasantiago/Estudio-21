/*
 * La casa de la axonometría de "Quiénes somos".
 * ---------------------------------------------------------------------------
 * Vivienda unifamiliar de dos plantas sobre una maqueta de 34 × 26 m:
 *   · planta baja: pabellón vidriado (estar, comedor, cocina) de 18 × 12 m,
 *     con un volumen de servicio en sillería al oeste;
 *   · planta alta: caja de hormigón de 25 × 6 m con celosía de madera al sur,
 *     que vuela 5 m hacia el este sobre el jardín (el baño queda en el volado);
 *   · afuera: terraza sobre el pabellón, pérgola de listones, deck y piscina.
 *
 * Dos cortes de esquina escalonados, como en una lámina de presentación:
 *   · planta alta + cubierta: se quita el cuadrante X > 17 · Y < 18.5 → se ve
 *     el dormitorio y el baño, con los tabiques cortados a media altura;
 *   · terraza de planta baja: se quita X 21–24.5 · Y < 14 → se ve la escalera.
 * Las caras que caen sobre esos planos salen en poché (lo resuelve el motor).
 *
 * Ejes: X este · Y norte · Z arriba. Niveles en metros.
 */
import { dibujar } from './motor.ts';
import type { Corte, Dibujo, Item, Prim, Solido, V3, Vista, XY } from './motor.ts';
import { EST, L, PL, caja, celosia, grupoCajas, prisma, sillar, tablas, vidriado } from './piezas.ts';
import { ambientacion, equipamiento } from './equipamiento.ts';
import { CUB, L1, L2, PA, PB } from './niveles.ts';

/* Giro y elevación elegidos comparando vistas en cajas del tamaño real de la
   lámina: 35/42 conserva la fachada larga (la celosía) como protagonista, deja
   ver más interior por el corte que la 30/38 original y es menos apaisada
   (≈1,48 contra 1,59) → el dibujo llena más la columna. */
export const VISTA = { az: 35, el: 42, esc: 13 } as const;
/** Sol alto desde el nor-noroeste: la sombra cae hacia el observador. */
export const SOL: XY = [0.34, -0.8];

export const CORTES: Corte[] = [
  { x: 21, y: 14, z0: PB + 0.01, z1: PA + 0.01, x1: 24.5 },
  { x: 17, y: 18.5, z0: PA + 0.01, z1: 9 },
];

const O = EST.obra;
const M = EST.madera;
const PANEL = { sup: 'c-pv', e: 'c-o2', s: 'c-o3', sil: 'l-usil', ari: 'l-uari' };

type Rect = [number, number, number, number];
const aZ = ([x0, y0, x1, y1]: Rect, z: number): V3[] => [
  [x0, y0, z],
  [x1, y0, z],
  [x1, y1, z],
  [x0, y1, z],
];
const contorno = (r: Rect, z: number, c: string): Prim => {
  const p = aZ(r, z);
  return L(c, ...p, p[0]);
};
const baldosas = (z: number, x0: number, y0: number, x1: number, y1: number, paso: number, c = 'l-tab2'): Prim[] => {
  const out: Prim[] = [];
  for (let x = x0 + paso; x < x1 - 0.05; x += paso) out.push(L(c, [x, y0, z], [x, y1, z]));
  for (let y = y0 + paso; y < y1 - 0.05; y += paso) out.push(L(c, [x0, y, z], [x1, y, z]));
  return out;
};

// ---------------------------------------------------------------------------
// zócalo de la maqueta + todo lo que está a ras del suelo
function zocalo(): Solido {
  const pileta: Rect = [20.5, 2.25, 32, 5.35];
  const borde: Rect = [20.2, 1.95, 32.3, 5.65];
  const hondo = -1.3;
  const agua = -0.14;
  const [px0, py0, px1, py1] = pileta;
  const onda = (x0: number, x1: number, y: number, s: number): Prim =>
    L('l-onda', ...Array.from({ length: 15 }, (_, i) => [x0 + ((x1 - x0) * i) / 14, y + Math.sin(i * 1.25 + s) * 0.07, agua] as V3));

  const ex: Prim[] = [
    // canto de la maqueta: la capa de tierra bajo el césped
    L('l-fin', [0, 0, -0.16], [34, 0, -0.16], [34, 26, -0.16]),
    // deck de madera (esquiva la piscina)
    PL('c-deck', [6, 1, 0], [33, 1, 0], [33, 7.6, 0], [6, 7.6, 0]),
    ...tablas(0, 6, 1, 33, 7.6, 0.3, [borde], 'l-tab', 2.4),
    L('l-ari', [24.4, 7.6, 0], [33, 7.6, 0], [33, 1, 0], [6, 1, 0], [6, 6, 0]),
    // piscina: borde de piedra, paredes interiores que se ven, agua
    PL('c-borde', ...aZ(borde, 0)),
    PL('c-pz1', [px0, py1, 0], [px1, py1, 0], [px1, py1, hondo], [px0, py1, hondo]),
    PL('c-pz2', [px0, py0, 0], [px0, py1, 0], [px0, py1, hondo], [px0, py0, hondo]),
    PL('c-agua', ...aZ(pileta, agua)),
    L('l-agua', [px0, py0, agua], [px0, py1, agua], [px1, py1, agua]),
    // escalones sumergidos en la cabecera oeste
    ...[0.4, 0.8, 1.2].map((d) => L('l-onda', [px0 + d, py0, agua], [px0 + d, py0 + 1.3, agua], [px0, py0 + 1.3, agua])),
    onda(23.2, 27.4, 3.35, 0),
    onda(27.9, 31.2, 4.45, 1.7),
    onda(25.2, 28.1, 4.85, 3.1),
    contorno(borde, 0, 'l-ari'),
    contorno(pileta, 0, 'l-ari'),
  ];
  // senda de losetas desde el frente del terreno
  for (let k = 0; k < 7; k++) {
    const r: Rect = [3.55, 0.35 + k * 0.78, 4.65, 0.81 + k * 0.78];
    ex.push(PL('c-losa', ...aZ(r, 0)), contorno(r, 0, 'l-fin'));
  }
  return caja(0, 0, 34, 26, -1.1, 0, EST.zocalo, 1, { extras: ex });
}

// ---------------------------------------------------------------------------
function escalera(): Item {
  const n = 17;
  const huella = 0.27;
  const contra = (PA - PB) / (n + 1);
  const x0 = 22.75;
  const x1 = 23.85;
  const y0 = 14 - n * huella;
  const pasos = Array.from({ length: n }, (_, i) => {
    const top = PB + (i + 1) * contra;
    return [x0, y0 + i * huella, x1, y0 + (i + 1) * huella, top - 0.06, top] as [number, number, number, number, number, number];
  });
  const xb = x0 + 0.04;
  const baranda: Prim[] = [L('l-bar', [xb, y0 + huella * 0.5, PB + contra + 0.9], [xb, 14, PA + 0.9])];
  for (let i = 0; i < n; i += 4) {
    const y = y0 + (i + 0.5) * huella;
    const z = PB + (i + 1) * contra;
    baranda.push(L('l-bar', [xb, y, z], [xb, y, z + 0.9 - (huella * 0.5 * contra) / huella]));
  }
  return grupoCajas(pasos, M, 'l-msil', 2, null, baranda);
}

// ---------------------------------------------------------------------------
function estructura(): Item[] {
  const it: Item[] = [];

  // ---- volumen de servicio en sillería ----
  it.push(
    caja(2, 6, 6, 22, 0, PA, EST.piedra, 2, {
      extras: [
        ...sillar('S', 6, 2, 6, 0, PA),
        ...sillar('E', 6, 6, 22, 0, PA),
        PL('c-vo', [4.35, 6, 0.7], [4.75, 6, 0.7], [4.75, 6, 2.9], [4.35, 6, 2.9]),
        L('l-mar', [4.35, 6, 0.7], [4.75, 6, 0.7], [4.75, 6, 2.9], [4.35, 6, 2.9], [4.35, 6, 0.7]),
      ],
    }),
  );

  // ---- planta baja: piso, vidriados, columnas, escalera ----
  it.push(caja(6, 7.6, 24.4, 20, 0, PB, O, 2, { extras: baldosas(PB, 6, 7.6, 24.4, 20, 1.2) }));
  it.push(caja(6, 8, 21, 8.05, PB, L1, EST.vidrio, 2, { sinSombra: true, extras: vidriado('S', 8, 6, 21, PB, L1, 2.5, 2.55) }));
  it.push(caja(23.95, 14, 24, 20, PB, L1, EST.vidrio, 2, { sinSombra: true, extras: vidriado('E', 24, 14, 20, PB, L1, 2, 2.55) }));
  for (const x of [11, 16]) it.push(caja(x, 8.15, x + 0.16, 8.31, PB, L1, O, 2));
  for (const x of [9.5, 15, 20]) it.push(caja(x, 13.84, x + 0.16, 14, PB, L1, O, 2));
  it.push(escalera());

  // ---- losa entre plantas: terraza (sur) + piso de la planta alta ----
  it.push(caja(6, 7.4, 21, 14, L1, PA, O, 3, { extras: tablas(PA, 6, 7.4, 21, 14, 0.3, [], 'l-tab', 2.4) }));
  it.push(
    // arranca en X = 6: sobre el volumen de servicio (X 2–6) la caja alta apoya
    // directo en la cubierta de piedra, que está a este mismo nivel
    prisma([[6, 14], [21, 14], [24, 14], [29, 14], [29, 20], [6, 20]], L1, PA, O, 3, {
      extras: [...tablas(PA, 17, 14, 24, 18.5, 0.26, [], 'l-tab2', 1.9), ...baldosas(PA, 24.12, 14.3, 28.7, 18.5, 0.6)],
    }),
  );
  it.push(caja(6.05, 7.42, 21, 7.47, PA, PA + 1.05, EST.baranda, 5, { sinSombra: true }));

  // ---- planta alta: muros perimetrales ----
  it.push(
    caja(4, 14, 17, 14.3, PA, L2, O, 3, {
      extras: [...celosia('S', 14, 4.3, 16.8, PA + 0.14, L2 - 0.1, 0.24), L('l-ari', [4, 14, PA + 0.14], [17, 14, PA + 0.14])],
    }),
  );
  it.push(
    caja(4, 19.7, 29, 20, PA, L2, O, 3, {
      extras: [
        PL('c-vo', [18.4, 19.7, 4.55], [23.4, 19.7, 4.55], [23.4, 19.7, 6.25], [18.4, 19.7, 6.25]),
        ...vidriado('S', 19.7, 18.4, 23.4, 4.55, 6.25, 1.25),
        PL('c-vo', [25.2, 19.7, 4.8], [28.3, 19.7, 4.8], [28.3, 19.7, 6.25], [25.2, 19.7, 6.25]),
        ...vidriado('S', 19.7, 25.2, 28.3, 4.8, 6.25, 1.55),
      ],
    }),
  );
  it.push(caja(4, 14.3, 4.3, 19.7, PA, L2, O, 3));
  it.push(caja(28.7, 18.5, 29, 19.7, PA, L2, O, 3));

  // ---- tabiques: en la zona abierta se cortan a 2,40 m (tope en poché) ----
  const T = PA + 2.4;
  it.push(caja(24, 14.3, 24.12, 18.5, PA, T, O, 3, { techoCortado: true }));
  it.push(caja(24, 18.5, 24.12, 19.7, PA, L2, O, 3));
  it.push(caja(17, 15.5, 18.1, 15.62, PA, T, O, 3, { techoCortado: true }));
  it.push(caja(19, 15.5, 24, 15.62, PA, T, O, 3, { techoCortado: true }));
  it.push(caja(15.8, 15.5, 17, 15.62, PA, L2, O, 3));

  // ---- cubierta, pretiles, paneles, lucernario ----
  it.push(prisma([[4, 14], [17, 14], [17, 18.5], [29, 18.5], [29, 20], [4, 20]], L2, CUB, O, 4));
  it.push(caja(4, 14, 17, 14.2, CUB, CUB + 0.35, O, 4));
  it.push(caja(4, 14.2, 4.2, 19.8, CUB, CUB + 0.35, O, 4));
  it.push(caja(4, 19.8, 29, 20, CUB, CUB + 0.35, O, 4));
  it.push(caja(28.8, 18.5, 29, 19.8, CUB, CUB + 0.35, O, 4));
  const pv: [number, number, number, number, number, number][] = [];
  const pvLineas: Prim[] = [];
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 8; i++) {
      const x = 5.1 + i * 1.12;
      const y = 15.2 + j * 1.95;
      const z = CUB + 0.22;
      pv.push([x, y, x + 1, y + 1.7, CUB + 0.12, z]);
      pvLineas.push(L('l-pv', [x, y + 0.57, z], [x + 1, y + 0.57, z]), L('l-pv', [x, y + 1.13, z], [x + 1, y + 1.13, z]), L('l-pv', [x + 0.5, y, z], [x + 0.5, y + 1.7, z]));
    }
  it.push(grupoCajas(pv, PANEL, 'l-uari', 4, null, pvLineas));
  it.push(caja(15.2, 16.2, 16.5, 18.8, CUB, CUB + 0.3, EST.vidrio, 4, { sinSombra: true }));

  // ---- pérgola de listones sobre el deck ----
  for (const x of [11.3, 16.7]) it.push(caja(x, 3.83, x + 0.15, 3.98, 0, 2.9, O, 4));
  it.push(caja(6, 3.8, 17, 4, 2.9, 3.15, M, 4));
  it.push(caja(6, 7.2, 17, 7.4, 2.9, 3.15, M, 4));
  const listones = Array.from({ length: 24 }, (_, i) => 6.3 + i * 0.45).map(
    (x) => [x, 3.8, x + 0.07, 7.4, 3.15, 3.33] as [number, number, number, number, number, number],
  );
  it.push(grupoCajas(listones, M, 'l-mari', 4, SOL));

  return it;
}

export function axonometria(vista: Vista = VISTA): Dibujo {
  return dibujar(
    {
      base: zocalo(),
      items: [...estructura(), ...equipamiento(SOL), ...ambientacion(SOL)],
      cortes: CORTES,
      sol: SOL,
      recorteSombra: [
        [0, 0],
        [34, 26],
      ],
      claseSombra: 'c-sombra',
    },
    vista,
  );
}
