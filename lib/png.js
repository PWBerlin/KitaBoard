// Minimaler PNG-Encoder für den 2bpp-Framebuffer: indiziertes PNG mit 4 Palettenfarben.
// Die Pixelreihenfolge (2 Bit pro Pixel, höchstwertige Bits zuerst) ist in PNG und im Framebuffer gleich,
// deshalb werden die Zeilen unverändert übernommen.
import { deflateSync } from 'node:zlib';
import { PALETTE, WIDTH, HEIGHT } from './epd.js';

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** 2bpp-Frame (Index 0 schwarz, 1 weiß, 2 gelb, 3 rot) → PNG */
export function frameToPng(frame, width = WIDTH, height = HEIGHT) {
  const rowBytes = Math.ceil(width / 4);
  if (frame.length !== rowBytes * height) throw new Error('Frame hat die falsche Größe');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 2; // Bittiefe
  ihdr[9] = 3; // Palette
  const plte = Buffer.alloc(4 * 3);
  for (const p of PALETTE) plte.set(p.rgb, p.index * 3);
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (rowBytes + 1)] = 0; // Filter "None"
    frame.copy(raw, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
