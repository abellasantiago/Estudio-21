/**
 * Genera las piezas de marca derivadas (favicon, apple-touch-icon e imagen para
 * compartir en redes) a partir del logo original, con la paleta del sitio.
 *
 *   node scripts/generar-marca.mjs            -> escribe en public/
 *   node scripts/generar-marca.mjs <carpeta>  -> escribe ahí (para previsualizar)
 *
 * Fuente única: src/assets/marca/banner_negro.png (el logo real del estudio).
 * De ahí se recorta el "21" enmarcado para los iconos y se recolorea el lockup
 * completo para la imagen social. Las tipografías salen de los .woff de
 * Fontsource convertidos a .ttf en caliente (ver lib/woff-a-ttf.mjs): son las
 * MISMAS que usa el sitio, así la pieza social no desentona con el sitio real.
 */
import sharp from 'sharp';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { woffToTtf } from './lib/woff-a-ttf.mjs';

const OUT = process.argv[2] ?? 'public';
mkdirSync(OUT, { recursive: true });

// ---- paleta (espejo de los tokens de src/styles/global.css) ----
const INK = '#1A1916';
const PAPER = '#EAE8E2';
const PAPER_DEEP = '#E0DED7';
const CONCRETE_SOFT = '#8A8780';
const PETROL = '#1E4D49';

const LOGO = 'src/assets/marca/banner_negro.png';
// Artwork del icono: el "21" tal como venía en el favicon histórico (blanco
// sobre negro, con su encuadre propio). Se conserva la composición exacta —
// acá sólo se remapean blanco y negro a papel y tinta.
const ICONO = 'src/assets/marca/icono-21.png';

// ---- tipografías del sitio, como .ttf temporales para Pango ----
const fontDir = mkdtempSync(join(tmpdir(), 'e21-fonts-'));
const FONTS = {
  grotesk: woffToTtf(
    'node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff',
    join(fontDir, 'SpaceGrotesk-Bold.ttf'),
  ),
  mono: woffToTtf(
    'node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff',
    join(fontDir, 'IBMPlexMono-Medium.ttf'),
  ),
};

const hexToRgb = (h) => ({
  r: parseInt(h.slice(1, 3), 16),
  g: parseInt(h.slice(3, 5), 16),
  b: parseInt(h.slice(5, 7), 16),
});

/**
 * Repinta el artwork del logo en un solo color.
 *
 * El logo original es tinta opaca sobre transparente, y el "21" del recuadro
 * está CALADO (alpha 0), no pintado de blanco: por eso el recuadro funciona
 * sobre cualquier fondo. De ahí los dos modos:
 *   - por defecto: la tinta pasa a `color` y el calado queda transparente
 *     (el 21 deja ver el fondo, igual que en el logo original).
 *   - `calado: true`: se queda con el HUECO (el 21) pintado en `color` —
 *     sirve para armar los iconos, donde el 21 va en papel sobre tinta.
 */
async function repintar(src, color, { calado = false, extract } = {}) {
  let pipe = sharp(src).ensureAlpha();
  if (extract) pipe = pipe.extract(extract);
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const { r, g, b } = hexToRgb(color);
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
    const a = data[i + 3] / 255;
    // el artwork no llega a alpha 255 (viene en ~254): sin esta rampa, el
    // calado deja un velo de 1/255 sobre todo el recuadro y se ve un rectángulo
    // fantasma alrededor del "21".
    const cobertura = calado ? Math.min(1, Math.max(0, (1 - a - 0.04) / 0.92)) : a;
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
    out[o + 3] = Math.round(cobertura * 255);
  }
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

/** Recorta un buffer RGBA al contenido visible (alpha > umbral). */
async function recortarAlContenido(buf, umbral = 8) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let x0 = width, x1 = -1, y0 = height, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > umbral) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return sharp(buf).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

/** Texto con una tipografía del sitio, pintado en `color`. */
async function texto(str, { font, size, color = INK, tracking = 0, weight }) {
  const attrs = [`size="${size}pt"`, weight ? `weight="${weight}"` : '', tracking ? `letter_spacing="${tracking}"` : '']
    .filter(Boolean).join(' ');
  const render = await sharp({
    text: {
      text: `<span ${attrs}>${str}</span>`,
      rgba: true,
      font: font === 'mono' ? 'IBM Plex Mono' : 'Space Grotesk',
      fontfile: FONTS[font],
    },
  }).png().toBuffer();

  // Pango dibuja en negro: conservamos su alpha (el antialias del glifo) y
  // reemplazamos el RGB por el color pedido.
  const { data, info } = await sharp(render).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { r, g, b } = hexToRgb(color);
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    out[o] = r; out[o + 1] = g; out[o + 2] = b;
    out[o + 3] = data[i + 3];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/* ============================================================
   1) ICONOS — el "21" de siempre, con la paleta del sitio
   ------------------------------------------------------------
   Misma composición que el favicon histórico: sólo se remapea la escala de
   grises (negro -> --ink, blanco -> --paper). Al interpolar por luminancia se
   conserva el antialias de los bordes del glifo.
   ============================================================ */
async function generarIcono(tamaño, archivo) {
  const { data, info } = await sharp(ICONO)
    .resize(tamaño, tamaño, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const oscuro = hexToRgb(INK);
  const claro = hexToRgb(PAPER);
  const out = Buffer.alloc(tamaño * tamaño * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const t = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    out[o] = Math.round(oscuro.r + (claro.r - oscuro.r) * t);
    out[o + 1] = Math.round(oscuro.g + (claro.g - oscuro.g) * t);
    out[o + 2] = Math.round(oscuro.b + (claro.b - oscuro.b) * t);
    out[o + 3] = 255; // un icono siempre opaco (el original venía en alpha ~253)
  }

  await sharp(out, { raw: { width: tamaño, height: tamaño, channels: 4 } })
    .png()
    .toFile(join(OUT, archivo));
  console.log('·', archivo, `(${tamaño}×${tamaño})`);
}

/* ============================================================
   2) IMAGEN PARA COMPARTIR (Open Graph / WhatsApp) — 1200×630
   ============================================================ */
async function generarOg() {
  const W = 1200, H = 630;
  const M = 52; // margen de las marcas de registro

  // -- fondo: papel + "luz de estudio" (mismo gesto que .hero-stage::before) --
  const fondo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <radialGradient id="luz" cx="42%" cy="46%" r="62%">
        <stop offset="0%" stop-color="#FCFBF8" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#FCFBF8" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="vineta" cx="50%" cy="44%" r="76%">
        <stop offset="58%" stop-color="${INK}" stop-opacity="0"/>
        <stop offset="100%" stop-color="${INK}" stop-opacity="0.06"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <rect width="${W}" height="${H}" fill="url(#luz)"/>
    <rect width="${W}" height="${H}" fill="url(#vineta)"/>
  </svg>`);

  // -- marcas de registro en las esquinas (las mismas del sitio) --
  const L = 26, T = 1.5;
  const marca = (x, y, sx, sy) =>
    `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">
       <rect x="0" y="0" width="${L}" height="${T}" fill="${CONCRETE_SOFT}" opacity="0.55"/>
       <rect x="0" y="0" width="${T}" height="${L}" fill="${CONCRETE_SOFT}" opacity="0.55"/>
     </g>`;
  const marcas = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    ${marca(M, M, 1, 1)}${marca(W - M, M, -1, 1)}${marca(M, H - M, 1, -1)}${marca(W - M, H - M, -1, -1)}
  </svg>`);

  // -- "21" fantasma, sangrando por el borde derecho (como .ghost21) --
  const ghost = await texto('21', { font: 'grotesk', size: 470, color: PAPER_DEEP, weight: 700, tracking: -18000 });
  const ghostRecortado = await recortarAlContenido(ghost);
  const gMeta = await sharp(ghostRecortado).metadata();

  // -- logo del estudio recoloreado a tinta (el 21 del recuadro queda calado) --
  const logo = await repintar(LOGO, INK);
  const anchoLogo = 536;
  const altoLogo = Math.round((anchoLogo * 250) / 864);
  const logoEscalado = await sharp(logo).resize(anchoLogo, altoLogo, { fit: 'fill' }).png().toBuffer();

  // -- pie: regla petróleo + bajada en mono (mismo gesto que .eyebrow) --
  const bajada = await texto('ARQUITECTURA Y DESARROLLO · MONTEVIDEO, URUGUAY', {
    font: 'mono', size: 17, color: '#5A5850', tracking: 3400,
  });
  const bMeta = await sharp(bajada).metadata();

  const xIzq = 96;
  const yLogo = 212;
  const yPie = yLogo + altoLogo + 74;
  const anchoRegla = 42;

  const regla = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${anchoRegla}" height="2"><rect width="${anchoRegla}" height="2" fill="${PETROL}"/></svg>`,
  );

  await sharp(fondo)
    .composite([
      // el fantasma va primero: todo lo demás se apoya encima. Alineado al
      // mismo margen que las marcas de registro y sangrando sólo por arriba
      // (si sangra también a la derecha, el "1" se corta al medio del asta y
      // el corte se lee como un bloque, no como un fondo).
      { input: ghostRecortado, left: W - gMeta.width - M, top: -44 },
      { input: marcas, left: 0, top: 0 },
      { input: logoEscalado, left: xIzq, top: yLogo },
      { input: regla, left: xIzq, top: yPie + Math.round(bMeta.height / 2) - 1 },
      { input: bajada, left: xIzq + anchoRegla + 16, top: yPie },
    ])
    .png()
    .toFile(join(OUT, 'og-default.png'));
  console.log('·', 'og-default.png', `(${W}×${H})`);
}

console.log('Generando piezas de marca en', OUT + '/');
await generarIcono(512, 'favicon.png');
await generarIcono(512, 'apple-touch-icon.png');
await generarOg();
rmSync(fontDir, { recursive: true, force: true });
console.log('Listo.');
