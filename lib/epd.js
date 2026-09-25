// Vierfarb-E-Paper (NOTE4C): 400x300, Schwarz / Weiß / Gelb / Rot.
export const WIDTH = 400;
export const HEIGHT = 300;

// Reine Palettenfarben, mit denen gezeichnet wird. Geräte-Index laut NOTE4C-Referenzfirmware:
// 0 = schwarz, 1 = weiß, 2 = gelb, 3 = rot (2 Bit pro Pixel, höchstwertige Bits zuerst).
export const PALETTE = [
  { name: 'black', rgb: [0, 0, 0], index: 0 },
  { name: 'white', rgb: [255, 255, 255], index: 1 },
  { name: 'yellow', rgb: [255, 220, 0], index: 2 },
  { name: 'red', rgb: [210, 0, 0], index: 3 },
];

export const COLORS = Object.fromEntries(PALETTE.map((p) => [p.name, `rgb(${p.rgb.join(',')})`]));

// Kantenglättung erzeugt Mischfarben zwischen genau zwei Palettenfarben (z.B. Schwarz auf Gelb).
// Deshalb: das Farbpaar suchen, auf dessen Verbindungslinie der Pixel am besten liegt, und dann
// auf das nähere Ende runden. So entstehen keine falschen Säume (z.B. rote Pixel an schwarzer
// Schrift auf gelbem Grund). Dabei wird zugunsten der "Tinte" gerundet, damit dünne Striche bleiben.
const PAIRS = [];
for (let i = 0; i < PALETTE.length; i++) {
  for (let j = i + 1; j < PALETTE.length; j++) PAIRS.push([PALETTE[i], PALETTE[j]]);
}

const INK = { black: 3, red: 2, yellow: 1, white: 0 };

function pickEnd(p, q, t) {
  const [strong, weak, share] = INK[p.name] >= INK[q.name] ? [p, q, 1 - t] : [q, p, t];
  const threshold = strong.name === 'black' ? 0.25 : weak.name === 'white' ? 0.3 : 0.5;
  return share >= threshold ? strong : weak;
}

function nearest(r, g, b) {
  let best = null;
  let bestDist = Infinity;
  for (const [p, q] of PAIRS) {
    const dx = q.rgb[0] - p.rgb[0];
    const dy = q.rgb[1] - p.rgb[1];
    const dz = q.rgb[2] - p.rgb[2];
    let t = ((r - p.rgb[0]) * dx + (g - p.rgb[1]) * dy + (b - p.rgb[2]) * dz) / (dx * dx + dy * dy + dz * dz);
    t = Math.min(1, Math.max(0, t));
    const er = r - (p.rgb[0] + t * dx);
    const eg = g - (p.rgb[1] + t * dy);
    const eb = b - (p.rgb[2] + t * dz);
    const dist = er * er + eg * eg + eb * eb;
    if (dist < bestDist) {
      bestDist = dist;
      // t = Anteil von q. "Tinte" gewinnt früh: Schwarz schon ab 25 % Anteil, Farbe gegen Weiß ab 30 %.
      best = pickEnd(p, q, t);
    }
  }
  return best;
}

/**
 * Rastet jeden Pixel (inkl. Kantenglättung der Schrift) hart auf die 4 Palettenfarben ein.
 * Ändert `rgba` in-place und liefert den 2bpp-Framebuffer (30000 Bytes) für die LAN-Upload-API.
 */
export function quantize(rgba, width = WIDTH, height = HEIGHT) {
  const frame = Buffer.alloc((width * height) / 4);
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    const a = rgba[o + 3] / 255;
    // gegen weißes Papier mischen
    const r = rgba[o] * a + 255 * (1 - a);
    const g = rgba[o + 1] * a + 255 * (1 - a);
    const b = rgba[o + 2] * a + 255 * (1 - a);
    const c = nearest(r, g, b);
    rgba[o] = c.rgb[0];
    rgba[o + 1] = c.rgb[1];
    rgba[o + 2] = c.rgb[2];
    rgba[o + 3] = 255;
    frame[p >> 2] |= c.index << (6 - (p & 3) * 2);
  }
  return frame;
}
