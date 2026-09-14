/*
 * Equipamiento y ambientación de la axonometría.
 * ---------------------------------------------------------------------------
 * Sólo se amuebla lo que se VE: bajo la losa de planta baja la mirada entra
 * apenas ~3 m detrás del vidriado, así que el estar y el comedor van contra el
 * vidrio; la planta alta se ve entera por el corte (dormitorio y baño).
 * Los muebles de adentro no proyectan sombra al césped (quedaría falsa); los de
 * afuera, sí. Árboles, matas y figuras dan escala y vida a la lámina.
 */
import type { Estilo, Item, Solido, XY } from './motor.ts';
import { EST, L, PL, arbol, caja, figura, mata, prisma, redondeado, rnd } from './piezas.ts';
import { PA, PB } from './niveles.ts';

const U = EST.mueble;
const T = EST.tela;
const O = EST.obra;
const ALF: Estilo = { sup: 'c-rug', e: 'c-rug', s: 'c-rug', sil: 'l-uari', ari: 'l-uari' };

type Lado = 'n' | 's' | 'e' | 'o';

const mueble = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  e: Estilo = U,
  afuera = false,
  mas: Partial<Solido> = {},
) => caja(x0, y0, x1, y1, z0, z1, e, 5, { sinSombra: !afuera, ...mas });

/** Silla: asiento + respaldo contra el lado indicado. */
function silla(x: number, y: number, z: number, lado: Lado, afuera = false): Solido[] {
  const a = 0.46;
  const t = 0.05;
  const zs = z + 0.45;
  const r = { n: [x, y + a - t, x + a, y + a], s: [x, y, x + a, y + t], e: [x + a - t, y, x + a, y + a], o: [x, y, x + t, y + a] }[lado];
  return [mueble(x, y, x + a, y + a, z, zs, U, afuera), mueble(r[0], r[1], r[2], r[3], zs, z + 0.88, U, afuera)];
}

/** Reposera a lo largo de X, con la cabecera al oeste. */
const reposera = (x: number, y: number, z: number, afuera: boolean): Solido[] => [
  mueble(x, y, x + 1.95, y + 0.68, z, z + 0.3, T, afuera),
  mueble(x, y, x + 0.55, y + 0.68, z + 0.3, z + 0.62, T, afuera),
];

const octogono = (cx: number, cy: number, r: number): XY[] =>
  Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI + Math.PI / 8;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as XY;
  });

export function equipamiento(sol: XY): Item[] {
  const it: Item[] = [];
  const zPB = PB + 0.42;
  // lo que apoya sobre una alfombra arranca 2 cm más arriba: si no, su caja se
  // mete en la de la alfombra y el orden del pintor queda indefinido
  const zr = PB + 0.02;

  // ---- planta baja: estar contra el vidriado ----
  it.push(mueble(13.5, 8.55, 19.9, 11.25, PB, zr, ALF));
  it.push(
    mueble(14.6, 10.1, 18.8, 10.95, zr, zPB, T, false, {
      extras: [16, 17.4].map((x) => L('l-uari', [x, 10.1, zPB], [x, 10.7, zPB])),
    }),
  );
  it.push(mueble(18.8, 8.9, 19.7, 10.95, zr, zPB, T));
  it.push(mueble(14.6, 10.7, 19.7, 10.95, zPB, PB + 0.8, T));
  it.push(mueble(19.45, 8.9, 19.7, 10.7, zPB, PB + 0.62, T));
  it.push(mueble(15.9, 9.1, 17.6, 9.75, zr, PB + 0.36));
  it.push(mueble(16.2, 9.25, 16.55, 9.5, PB + 0.36, PB + 0.43));
  for (const y of [8.75, 9.85]) {
    it.push(mueble(13.1, y, 13.9, y + 0.8, zr, PB + 0.4, T));
    it.push(mueble(13.1, y, 13.3, y + 0.8, PB + 0.4, PB + 0.78, T));
  }

  // ---- comedor ----
  it.push(mueble(8.3, 9.25, 11.1, 10.15, PB + 0.72, PB + 0.76));
  it.push(mueble(8.55, 9.6, 8.65, 9.8, PB, PB + 0.72));
  it.push(mueble(10.75, 9.6, 10.85, 9.8, PB, PB + 0.72));
  for (const x of [8.55, 9.45, 10.35]) it.push(...silla(x, 8.6, PB, 's'), ...silla(x, 10.35, PB, 'n'));

  // ---- bajo la terraza abierta: sillón de lectura y una planta grande ----
  it.push(mueble(21.35, 8.45, 21.9, 9, PB, PB + 0.45, O));
  it.push(mata(21.62, 8.72, PB + 0.45, 0.55, 5, null, 11));
  it.push(mueble(21.3, 11.6, 22.1, 12.4, PB, PB + 0.4, T));
  it.push(mueble(21.3, 12.2, 22.1, 12.4, PB + 0.4, PB + 0.82, T));

  // ---- terraza ----
  it.push(...reposera(8.2, 9.3, PA, false), ...reposera(8.2, 10.4, PA, false));
  it.push(mueble(10.45, 9.95, 10.85, 10.35, PA, PA + 0.4));
  it.push(mueble(6.4, 12.95, 13.2, 13.7, PA, PA + 0.6, O));
  for (let k = 0; k < 6; k++) it.push(mata(6.95 + k * 1.15, 13.32, PA + 0.6, 0.42 + rnd(k + 20) * 0.16, 5, null, 12 + k));
  it.push(figura(15.2, 8.3, PA, 6, null));

  // ---- planta alta: dormitorio ----
  const zc = PA + 0.52;
  const za = PA + 0.02;
  it.push(mueble(19.3, 15.95, 23.68, 18.45, PA, za, ALF));
  it.push(mueble(21.7, 16.25, 23.7, 18.05, za, PA + 0.3));
  it.push(mueble(21.72, 16.3, 23.66, 18, PA + 0.3, zc, T, false, { extras: [L('l-uari', [22.55, 16.3, zc], [22.55, 18, zc])] }));
  it.push(mueble(23.7, 16.1, 23.9, 18.2, PA, PA + 1.05));
  it.push(mueble(23.18, 16.45, 23.62, 17.1, zc, zc + 0.12, T));
  it.push(mueble(23.18, 17.2, 23.62, 17.85, zc, zc + 0.12, T));
  it.push(mueble(23.3, 15.7, 23.68, 16.08, za, PA + 0.48));
  it.push(mueble(23.3, 18.22, 23.68, 18.6, za, PA + 0.48));
  it.push(mueble(17.6, 17.2, 18.4, 18, PA, PA + 0.4, T));
  it.push(mueble(17.6, 17.8, 18.4, 18, PA + 0.4, PA + 0.8, T));
  it.push(mueble(19.3, 14.45, 21.9, 14.85, PA, PA + 0.78));
  it.push(mata(20, 14.65, PA + 0.78, 0.2, 5, null, 19));

  // ---- baño en el volado ----
  const zb = PA + 0.55;
  const tina = redondeado(25.9, 14.75, 27.7, 15.62, 0.3);
  const interior = redondeado(26.02, 14.86, 27.58, 15.51, 0.22).map(([x, y]) => [x, y, zb] as const);
  it.push(
    prisma(tina, PA, zb, U, 5, {
      sinSombra: true,
      extras: [PL('c-agua', ...interior), L('l-uari', ...interior, interior[0])],
    }),
  );
  const piletas = [16.6, 17.4].map((y) => redondeado(24.22, y, 24.58, y + 0.5, 0.14).map(([x, yy]) => [x, yy, PA + 0.88] as const));
  it.push(mueble(24.12, 16.35, 24.68, 18.15, PA + 0.4, PA + 0.88, U, false, { extras: piletas.flatMap((p) => [PL('c-u2', ...p), L('l-uari', ...p, p[0])]) }));
  it.push(mueble(24.12, 16.5, 24.15, 18, PA + 1.15, PA + 2.1, EST.baranda));
  it.push(mueble(26.9, 17.3, 28.7, 18.45, PA, PA + 0.04));
  it.push(mueble(26.9, 17.25, 28.7, 17.3, PA, PA + 2.05, EST.baranda));
  it.push(mata(28.25, 14.75, PA, 0.32, 5, null, 21));

  // ---- deck: reposeras, sombrilla, comedor bajo la pérgola, maceteros ----
  for (const x of [22.3, 24.9, 27.5]) it.push(...reposera(x, 6.15, 0, true));
  it.push(mueble(30.58, 6.78, 30.62, 6.82, 0, 2.2, O, true));
  it.push(prisma(octogono(30.6, 6.8, 1.25), 2.2, 2.32, T, 5));
  it.push(mueble(8.6, 5.1, 11, 6, 0.72, 0.76, EST.madera, true));
  it.push(mueble(8.85, 5.45, 8.95, 5.65, 0, 0.72, U, true));
  it.push(mueble(10.65, 5.45, 10.75, 5.65, 0, 0.72, U, true));
  for (const x of [8.8, 9.9]) it.push(...silla(x, 4.5, 0, 's', true), ...silla(x, 6.15, 0, 'n', true));
  it.push(mueble(32.2, 6.5, 32.85, 7.35, 0, 0.55, O, true));
  it.push(mata(32.52, 6.92, 0.55, 0.55, 5, null, 22));
  it.push(mueble(6.25, 1.25, 6.9, 2, 0, 0.55, O, true));
  it.push(mata(6.57, 1.62, 0.55, 0.5, 5, null, 23));
  it.push(figura(31.2, 1.5, 0, 6, sol, 0.1));

  return it;
}

export function ambientacion(sol: XY): Item[] {
  return [
    arbol(2.5, 3.65, 7.2, 2.3, 6, sol, 1),
    arbol(11.5, 23.6, 7.4, 2.4, 6, sol, 2),
    arbol(26.3, 23.9, 5, 1.6, 6, sol, 3),
    arbol(31.5, 22.9, 8, 2.5, 6, sol, 4),
    arbol(32.2, 12.6, 5.8, 1.8, 6, sol, 5),
    mata(33.1, 9.2, 0, 0.75, 6, sol, 6),
    mata(33.2, 16.4, 0, 0.85, 6, sol, 7),
    mata(0.9, 10.4, 0, 0.8, 6, sol, 8),
    mata(1, 17.2, 0, 0.9, 6, sol, 9),
    mata(0.9, 24.2, 0, 0.8, 6, sol, 10),
  ];
}
