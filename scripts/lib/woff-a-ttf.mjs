/**
 * WOFF (v1) -> TTF. WOFF1 es sfnt con cada tabla comprimida con zlib, así que
 * alcanza con inflar tabla por tabla y rearmar el sfnt. (WOFF2 usa Brotli +
 * transformaciones de glyf/loca: mucho más complejo, por eso usamos los .woff.)
 */
import { inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

export function woffToTtf(srcPath, outPath) {
  const b = readFileSync(srcPath);
  if (b.toString('latin1', 0, 4) !== 'wOFF') throw new Error('no es WOFF1: ' + srcPath);

  const flavor = b.readUInt32BE(4);
  const numTables = b.readUInt16BE(12);

  const tables = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    const tag = b.toString('latin1', o, o + 4);
    const offset = b.readUInt32BE(o + 4);
    const compLength = b.readUInt32BE(o + 8);
    const origLength = b.readUInt32BE(o + 12);
    const checksum = b.readUInt32BE(o + 16);
    const raw = b.subarray(offset, offset + compLength);
    const data = compLength < origLength ? inflateSync(raw) : raw.subarray(0, origLength);
    if (data.length !== origLength) throw new Error(`tabla ${tag}: largo inesperado`);
    tables.push({ tag, checksum, data });
  }

  tables.sort((a, x) => (a.tag < x.tag ? -1 : a.tag > x.tag ? 1 : 0));

  // cabecera sfnt
  const entrySelector = Math.floor(Math.log2(numTables));
  const searchRange = 2 ** entrySelector * 16;
  const head = Buffer.alloc(12);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(numTables, 4);
  head.writeUInt16BE(searchRange, 6);
  head.writeUInt16BE(entrySelector, 8);
  head.writeUInt16BE(numTables * 16 - searchRange, 10);

  const dir = Buffer.alloc(numTables * 16);
  const chunks = [];
  let offset = 12 + numTables * 16;
  tables.forEach((t, i) => {
    const o = i * 16;
    dir.write(t.tag, o, 4, 'latin1');
    dir.writeUInt32BE(t.checksum, o + 4);
    dir.writeUInt32BE(offset, o + 8);
    dir.writeUInt32BE(t.data.length, o + 12);
    chunks.push(t.data);
    const pad = (4 - (t.data.length % 4)) % 4;
    if (pad) chunks.push(Buffer.alloc(pad));
    offset += t.data.length + pad;
  });

  const out = Buffer.concat([head, dir, ...chunks]);
  writeFileSync(outPath, out);
  return outPath;
}
