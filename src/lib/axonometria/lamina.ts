/*
 * Lámina de la axonometría — arma el SVG completo como string.
 *
 * Vive acá y no en Axonometria.astro porque el dibujo NO viaja en el HTML: se
 * sirve como archivo aparte (src/pages/axonometria.svg.ts → /axonometria.svg) y
 * la página lo pide sólo cuando hay dos columnas, o sea ≥900px. Son ~120 KB
 * (~27 KB con gzip) que antes bajaban TODOS los teléfonos para no verlos nunca:
 * la columna gráfica va `display:none` por debajo de 900px.
 *
 * El reparto de la animación por etapas de obra y el grafismo de lámina son los
 * mismos de siempre; lo único que cambió es que se serializa a texto en vez de
 * resolverse con JSX.
 */
import { axonometria, VISTA } from './casa.ts';
import { proyeccion } from './motor.ts';

/** Sólo hace falta para el <title>: el resto son números y clases nuestras. */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function laminaSVG(): string {
  const { elementos, limites, avisos } = axonometria();
  if (avisos.length) {
    console.warn(`[axonometría] ${avisos.length} avisos de orden:\n${avisos.join('\n')}`);
  }

  // ---- reparto de la animación: cada path cae en uno de PASOS tramos --------
  // Las fases son las etapas de obra que marca el modelo; dentro de cada una se
  // respeta el orden del pintor → cada etapa se dibuja de atrás hacia adelante.
  const PASOS = 48;
  const FASES: Record<number, [number, number]> = {
    1: [0, 0.14], // terreno, deck, piscina
    2: [0.12, 0.34], // planta baja
    3: [0.32, 0.54], // losa y planta alta
    4: [0.52, 0.68], // cubierta, pérgola
    5: [0.66, 0.84], // equipamiento
    6: [0.82, 1], // sombras, vegetación, figuras
  };
  // el sombreado de las copas (arcos cortos) entra con fundido junto con la
  // copa, que ya es un relleno: dibujado con dash se adelantaría a su árbol
  const FUNDIDO = new Set(['l-copa2']);

  const porFase = new Map<number, number>();
  for (const e of elementos) porFase.set(e.fase, (porFase.get(e.fase) ?? 0) + 1);
  const vistos = new Map<number, number>();
  const paths = elementos.map((e) => {
    const i = vistos.get(e.fase) ?? 0;
    vistos.set(e.fase, i + 1);
    const [f0, f1] = FASES[e.fase] ?? [0, 1];
    const t = f0 + (i / (porFase.get(e.fase) ?? 1)) * (f1 - f0);
    const k = Math.min(PASOS - 1, Math.floor(t * PASOS));
    const dibuja = e.trazo && !FUNDIDO.has(e.c);
    return { d: e.d, cls: `${e.c} ${dibuja ? 't' : 'r'} k${k}`, dibuja };
  });
  // Las reglas de los tramos viajan DENTRO del SVG: así tampoco llegan a los
  // teléfonos, y un <style> inline se aplica igual al inyectarse en el
  // documento.
  const reglasPasos = Array.from({ length: PASOS }, (_, k) => `.axo .k${k}{--k:${k}}`).join('');

  // ---- grafismo de lámina, en el plano del terreno --------------------------
  const P = proyeccion(VISTA);
  const n1 = (v: number) => Math.round(v * 10) / 10;
  const pt = (x: number, y: number, z: number) => P.p(x, y, z).map(n1).join(' ');

  // escala gráfica paralela al canto sur de la maqueta: 0 · 5 · 10 m
  const ZB = -1.1; // base de la maqueta
  const yE = -2.1;
  const escala =
    `M${pt(0, yE, ZB)} ${pt(10, yE, ZB)}` +
    [0, 2.5, 5, 7.5, 10]
      .map((x, i) => `M${pt(x, yE, ZB)} ${pt(x, yE - (i % 2 ? 0.28 : 0.55), ZB)}`)
      .join('');
  const rotulos = [0, 5, 10].map((x) => {
    const [u, v] = P.p(x, yE - 1.95, ZB);
    return { u: n1(u), v: n1(v), t: x === 10 ? '10 m' : String(x) };
  });

  // norte: un círculo apoyado en el suelo (en axonometría, una elipse) con la
  // flecha hacia +Y — fuera del zócalo, en el hueco de arriba a la izquierda
  const cN: [number, number] = [-3.4, 24.2];
  const RN = 1.3;
  const circuloN =
    'M' +
    Array.from({ length: 33 }, (_, i) => {
      const a = (i / 32) * 2 * Math.PI;
      return pt(cN[0] + RN * Math.cos(a), cN[1] + RN * Math.sin(a), 0);
    }).join(' ');
  const flechaN =
    `M${pt(cN[0], cN[1] - RN * 0.75, 0)} ${pt(cN[0], cN[1] + RN * 1.3, 0)}` +
    `M${pt(cN[0] - 0.38, cN[1] + RN * 0.72, 0)} ${pt(cN[0], cN[1] + RN * 1.3, 0)} ${pt(
      cN[0] + 0.38,
      cN[1] + RN * 0.72,
      0,
    )}`;
  const [uN, vN] = P.p(cN[0], cN[1] + RN * 2.35, 0);

  // viewBox: el dibujo + el grafismo, con aire alrededor
  const xs = [limites.x, limites.x + limites.w, P.p(cN[0] - RN, cN[1], 0)[0], P.p(0, yE - 2, ZB)[0] - 4];
  const ys = [limites.y, limites.y + limites.h, vN - 11, P.p(10, yE - 2, ZB)[1] + 6];
  const x0 = Math.min(...xs) - 6;
  const x1 = Math.max(...xs) + 6;
  const y0 = Math.min(...ys) - 6;
  const y1 = Math.max(...ys) + 6;
  const viewBox = `${n1(x0)} ${n1(y0)} ${n1(x1 - x0)} ${n1(y1 - y0)}`;

  const titulo =
    'Axonometría seccionada de una casa de dos plantas: planta baja vidriada, ' +
    'dormitorio y baño en la planta alta, terraza, pérgola y piscina.';

  return (
    `<svg class="axo" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet"` +
    ` xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="axo-titulo">` +
    `<title id="axo-titulo">${esc(titulo)}</title>` +
    `<style>${reglasPasos}</style>` +
    paths
      .map((p) => `<path class="${p.cls}" d="${p.d}"${p.dibuja ? ' pathLength="1"' : ''}/>`)
      .join('') +
    `<path class="l-graf r k45" d="${circuloN}"/>` +
    `<path class="l-graf t k45" pathLength="1" d="${flechaN}"/>` +
    `<text class="axo-txt r k46" x="${n1(uN)}" y="${n1(vN)}" text-anchor="middle">N</text>` +
    `<path class="l-graf t k44" pathLength="1" d="${escala}"/>` +
    rotulos
      .map((r) => `<text class="axo-txt r k46" x="${r.u}" y="${r.v}" text-anchor="middle">${r.t}</text>`)
      .join('') +
    `</svg>`
  );
}
