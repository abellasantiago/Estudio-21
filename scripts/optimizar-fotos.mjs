/**
 * Optimiza las fotos de `src/assets/` — se corre A MANO, no en el build.
 *
 *     node scripts/optimizar-fotos.mjs --dry    (sólo informa, no toca nada)
 *     node scripts/optimizar-fotos.mjs
 *
 * QUÉ HACE Y POR QUÉ ASÍ (todo medido, no estimado — ver "Fotos" en CLAUDE.md):
 *
 * - **Pasa todo a AVIF q80.** Se compararon mozjpeg, webp y avif a varias
 *   calidades, midiendo SSIM contra el original en la ruta de entrega más
 *   exigente del sitio (el visor de la galería, que sirve a `min(ancho,1800)`).
 *   AVIF q80 fue el único que bajó el peso en las tres familias de archivos sin
 *   costo visible. ⚠ **WebP quedó descartado**: a la calidad necesaria los
 *   archivos salían MÁS GRANDES que el JPEG original (+15% a +20%) y además más
 *   blandos (SSIM −1,3% a −1,7%), porque su encoder alisa el detalle fino.
 *   En los retratos recortados es peor todavía (SSIM 0,79–0,90: arruina el borde
 *   del alfa) contra 0,99 de AVIF.
 *
 * - **No reescala.** El ancho máximo que el sitio llega a pedir es 1800 (el
 *   visor) y las fuentes son de 2000, así que recortarlas parecía gratis: no lo
 *   es. Reescalar la fuente a 1800 obliga al navegador a un segundo remuestreo
 *   para llegar al ancho de pantalla, y eso costó hasta −3% de SSIM en las fotos
 *   con detalle fino. Los 200px de más son baratos; la nitidez, no.
 *
 * - **El alfa se conserva sólo donde significa algo.** Los retratos del equipo
 *   son recortes sobre transparencia (ver "Equipo · encuadre" en CLAUDE.md) y
 *   ese canal es el fondo de la foto. En `proyectos/` cualquier alfa es basura
 *   de un guardado mal hecho, así que se aplana contra el papel del sitio.
 *
 * - **Sólo convierte si el ahorro paga la conversión.** Reencodear cuesta una
 *   generación de pérdida, así que tiene que comprar algo: por debajo de
 *   `MIN_AHORRO` se deja la fuente intacta. Sin ese umbral el script tocaba
 *   fotos para ganar 0–4% (varias de Villa Platero, casi toda la galería de
 *   Sushi WOK, que ya venían bien comprimidas) — pérdida de calidad a cambio de
 *   nada. Por eso quedan `.jpg` y `.webp` sueltos entre los `.avif`: es a
 *   propósito, cada línea del log dice por qué, y `src/lib/images.ts` los
 *   descubre igual por convención de carpetas.
 *
 * - **No toca `src/assets/marca/`**: esos dos PNG son artwork y son la FUENTE de
 *   las piezas que genera `scripts/generar-marca.mjs` (ver "Marca" en CLAUDE.md).
 */

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const CALIDAD = 80;
const ESFUERZO = 6; // esfuerzo del encoder AVIF: más lento de escribir, más chico el archivo
const PAPEL = '#EDEAE4'; // --paper, para aplanar el alfa que no significa nada
const MIN_AHORRO = 8; // % mínimo de ahorro para que valga reencodear (ver cabecera)

const CARPETAS = [
  { dir: 'src/assets/proyectos', alfa: false }, // fotos: el alfa se aplana
  { dir: 'src/assets/equipo', alfa: true }, // recortes: el alfa ES la foto
];

const dry = process.argv.includes('--dry');

/**
 * Borra con reintentos. En Windows, si otro proceso tiene el archivo abierto un
 * instante (el indexador, un visor, un build en curso), `unlink` tira EBUSY y
 * cortaba la corrida a mitad de camino dejando el `.avif` nuevo AL LADO del
 * original — dos `portada.*` en la misma carpeta.
 */
function borrar(f) {
  for (let i = 0; i < 5; i++) {
    try {
      fs.unlinkSync(f);
      return true;
    } catch (e) {
      if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      // espera corta y sincrónica: son milisegundos y mantiene el orden del log
      const hasta = Date.now() + 200;
      while (Date.now() < hasta);
    }
  }
  return false;
}
const kb = (b) => (b / 1024).toFixed(0).padStart(5);
const mb = (b) => (b / 1048576).toFixed(2);

function fotos(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...fotos(p));
    else if (/\.(jpe?g|png|webp|avif)$/i.test(e.name)) out.push(p);
  }
  return out.sort();
}

let antes = 0;
let despues = 0;
const saltadas = [];
const convertidas = [];
const yaEstaban = [];
const sinBorrar = [];

for (const { dir, alfa } of CARPETAS) {
  if (!fs.existsSync(dir)) continue;
  console.log(`\n${dir}  (alfa: ${alfa ? 'se conserva' : 'se aplana'})`);

  for (const f of fotos(dir)) {
    const origBytes = fs.statSync(f).size;
    const meta = await sharp(f).metadata();
    antes += origBytes;

    /* Ya pasó por acá: re-encodear un avif sería una segunda generación de
     * pérdida en CADA corrida. Así el script es idempotente.
     * ⚠ sharp reporta los AVIF como `heif`, no como `avif` (AVIF es HEIF con
     * AV1 adentro). Preguntando sólo por 'avif' el guard no entra nunca y el
     * script se come su propia salida. */
    if (/\.avif$/i.test(f) || meta.format === 'heif' || meta.format === 'avif') {
      despues += origBytes;
      yaEstaban.push(f);
      continue;
    }

    let pipe = sharp(f);
    // El alfa que no significa nada se aplana: si no, AVIF guarda un canal
    // entero de opacidad constante.
    if (!alfa && meta.hasAlpha) pipe = pipe.flatten({ background: PAPEL });
    const buf = await pipe.avif({ quality: CALIDAD, effort: ESFUERZO }).toBuffer();

    const rel = f.split(path.sep).join('/');
    const etiqueta = `${rel.replace(dir + '/', '')}`;
    const fmt = `${meta.format}${meta.hasAlpha ? '+alfa' : ''}`;

    const ahorro = 100 - (buf.length / origBytes) * 100;
    if (ahorro < MIN_AHORRO) {
      despues += origBytes;
      saltadas.push(etiqueta);
      const motivo =
        ahorro <= 0
          ? 'el avif salía más pesado'
          : `el avif ahorraba sólo ${ahorro.toFixed(0)}%, menos del ${MIN_AHORRO}% que justifica reencodear`;
      console.log(`  =  ${kb(origBytes)} KB  ${etiqueta}  (${fmt}: ${motivo}, se deja)`);
      continue;
    }

    const destino = f.replace(/\.[^.]+$/, '.avif');
    if (!dry) {
      fs.writeFileSync(destino, buf);
      if (destino !== f && !borrar(f)) sinBorrar.push(f);
    }
    despues += buf.length;
    convertidas.push(etiqueta);
    console.log(
      `  ↓  ${kb(origBytes)} KB → ${kb(buf.length)} KB  (−${ahorro.toFixed(0).padStart(2)}%)  ${etiqueta}  ${fmt}`,
    );
  }
}

console.log(
  `\n${convertidas.length} convertidas, ${saltadas.length} dejadas como estaban, ${yaEstaban.length} ya eran avif`,
);
console.log(`antes:   ${mb(antes)} MB`);
console.log(`después: ${mb(despues)} MB  (−${(100 - (despues / antes) * 100).toFixed(0)}%)`);
if (sinBorrar.length) {
  console.log(`\n⚠ NO se pudo borrar el original de ${sinBorrar.length} archivo(s) — quedaron DUPLICADOS:`);
  for (const f of sinBorrar) console.log(`    ${f}`);
  console.log('  Cerrá lo que los tenga abiertos y volvé a correr el script (es idempotente).');
  process.exitCode = 1;
}
if (dry) console.log('\n(--dry: no se escribió nada)');
