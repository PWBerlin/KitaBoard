// Zeichnet den Tagesplan für Kinder: 400×300, Schwarz/Weiß/Gelb/Rot.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { WIDTH, HEIGHT, COLORS, quantize } from './epd.js';
import { frameToPng } from './png.js';
import { WEEKDAYS, dayPlan } from './plan.js';

GlobalFonts.registerFromPath(fileURLToPath(new URL('../fonts/DejaVuSansCondensed.ttf', import.meta.url)), 'Board');
GlobalFonts.registerFromPath(fileURLToPath(new URL('../fonts/DejaVuSansCondensed-Bold.ttf', import.meta.url)), 'BoardBold');

const { black: K, white: W, yellow: Y, red: R } = COLORS;

function text(ctx, str, x, y, { size = 14, bold = false, color = K, align = 'left' } = {}) {
  ctx.font = `${size}px ${bold ? 'BoardBold' : 'Board'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
}

function line(ctx, w = 3) {
  ctx.lineWidth = w;
  ctx.strokeStyle = K;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function circle(ctx, x, y, r, fill, strokeIt = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (strokeIt) ctx.stroke();
}

/** Strichmännchen; s = Größe (Kopfradius) */
function person(ctx, x, y, s, shirt) {
  line(ctx, Math.max(2, s / 3));
  circle(ctx, x, y, s, Y);
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(x - s * 1.1, y + s * 3.4);
  ctx.lineTo(x - s * 0.8, y + s * 1.3);
  ctx.lineTo(x + s * 0.8, y + s * 1.3);
  ctx.lineTo(x + s * 1.1, y + s * 3.4);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y + s * 3.4); ctx.lineTo(x - s * 0.6, y + s * 5);
  ctx.moveTo(x + s * 0.5, y + s * 3.4); ctx.lineTo(x + s * 0.6, y + s * 5);
  ctx.moveTo(x - s * 0.9, y + s * 1.8); ctx.lineTo(x - s * 1.8, y + s * 2.8);
  ctx.moveTo(x + s * 0.9, y + s * 1.8); ctx.lineTo(x + s * 1.8, y + s * 2.8);
  ctx.stroke();
}

// ---------------------------------------------------------------- Symbole (Mittelpunkt cx/cy, Größe ca. 150 px)
/** Kita: Rutsche mit Leiter (ein Kind rutscht), daneben drei Kinder, die sich an den Händen halten */
function drawKita(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const ground = 52;
  line(ctx, 3);
  // Leiter (steht auf dem Boden)
  ctx.beginPath();
  ctx.moveTo(-2, ground); ctx.lineTo(6, -58);
  ctx.moveTo(18, ground); ctx.lineTo(26, -58);
  for (let i = 0; i < 6; i++) {
    const y = ground - 12 - i * 17;
    const dx = ((ground - y) / (ground + 58)) * 8;
    ctx.moveTo(-2 + dx, y); ctx.lineTo(18 + dx, y);
  }
  ctx.stroke();
  ctx.fillStyle = K;
  ctx.fillRect(2, -64, 30, 6); // Plattform
  // Rutsche: rote Bahn von der Plattform bis zum Boden
  ctx.beginPath();
  ctx.moveTo(30, -64);
  ctx.bezierCurveTo(56, -62, 58, 30, 92, ground - 8);
  ctx.lineTo(92, ground);
  ctx.bezierCurveTo(52, 40, 48, -50, 30, -54);
  ctx.closePath();
  ctx.fillStyle = R; ctx.fill(); ctx.stroke();
  // Kind sitzt oben auf der Bahn, Arme hoch
  circle(ctx, 44, -74, 7, Y);
  ctx.beginPath();
  ctx.moveTo(45, -67); ctx.lineTo(49, -58); // Körper
  ctx.moveTo(49, -58); ctx.lineTo(60, -50); // Beine die Bahn hinunter
  ctx.moveTo(46, -64); ctx.lineTo(36, -80); // Arme hoch
  ctx.moveTo(47, -64); ctx.lineTo(56, -82);
  ctx.stroke();
  // Boden
  ctx.fillStyle = K;
  ctx.fillRect(-92, ground, 190, 3);
  // Drei gleich große Kinder an den Händen
  const kids = [-78, -52, -26];
  const shirts = [Y, R, Y];
  kids.forEach((x, i) => person(ctx, x, ground - 28, 5.6, shirts[i]));
  line(ctx, 2);
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const y = ground - 28 + 5.6 * 2.8;
    ctx.moveTo(kids[i] + 5.6 * 1.8, y); ctx.lineTo(kids[i + 1] - 5.6 * 1.8, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Zuhause/Wochenende: unser Haus, davor die Familie an den Händen */
function drawHome(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  const ground = 56;
  line(ctx, 3);
  drawHouse(ctx, -52, ground, 1);
  // Familie: zwei Große, ein Kind in der Mitte, alle an den Händen
  const fam = [[26, 11, Y], [58, 7, R], [90, 11, Y]];
  for (const [x, s, shirt] of fam) person(ctx, x, ground - s * 5, s, shirt);
  line(ctx, 2.5);
  ctx.beginPath();
  ctx.moveTo(26 + 11 * 1.8, ground - 11 * 5 + 11 * 2.8); ctx.lineTo(58 - 7 * 1.8, ground - 7 * 5 + 7 * 2.8);
  ctx.moveTo(58 + 7 * 1.8, ground - 7 * 5 + 7 * 2.8); ctx.lineTo(90 - 11 * 1.8, ground - 11 * 5 + 11 * 2.8);
  ctx.stroke();
  ctx.fillStyle = K;
  ctx.fillRect(-112, ground, 228, 3); // Boden
  ctx.restore();
}

/** Haus mit rotem Dach, Schornstein, Herz im Fenster; (x, ground) = Mitte unten */
function drawHouse(ctx, x, ground, k = 1) {
  ctx.save(); ctx.translate(x, ground); ctx.scale(k, k);
  line(ctx, 3 / Math.max(k, 0.5));
  ctx.fillStyle = K; ctx.fillRect(22, -104, 12, 26); ctx.strokeRect(22, -104, 12, 26); // Schornstein
  ctx.fillStyle = Y; ctx.fillRect(-46, -64, 92, 64); ctx.strokeRect(-46, -64, 92, 64); // Wand
  ctx.beginPath(); ctx.moveTo(-58, -62); ctx.lineTo(0, -112); ctx.lineTo(58, -62); ctx.closePath();
  ctx.fillStyle = R; ctx.fill(); ctx.stroke(); // Dach
  ctx.fillStyle = K; ctx.fillRect(8, -40, 22, 40); // Tür
  ctx.fillStyle = W; ctx.fillRect(-36, -48, 32, 26); ctx.strokeRect(-36, -48, 32, 26); // Fenster
  // Herz im Fenster
  ctx.beginPath(); ctx.moveTo(-20, -39);
  ctx.bezierCurveTo(-22, -46, -31, -45, -31, -38); ctx.bezierCurveTo(-31, -33, -24, -30, -20, -26);
  ctx.bezierCurveTo(-16, -30, -9, -33, -9, -38); ctx.bezierCurveTo(-9, -45, -18, -46, -20, -39);
  ctx.closePath(); ctx.fillStyle = R; ctx.fill();
  ctx.restore();
}

/** Schwimmen: Kopf mit Badekappe und Arm über Wellen */
function drawSwim(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  line(ctx, 3);
  // Arm (Kraulbewegung)
  ctx.beginPath(); ctx.moveTo(10, -2); ctx.quadraticCurveTo(28, -40, 52, -20); ctx.stroke();
  circle(ctx, 54, -18, 5, Y);
  // Kopf mit Badekappe und Brille
  circle(ctx, -8, -8, 20, Y);
  ctx.beginPath(); ctx.arc(-8, -8, 20, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath();
  ctx.fillStyle = R; ctx.fill(); ctx.stroke();
  ctx.fillStyle = K;
  circle(ctx, -15, -4, 5, K, false); circle(ctx, 0, -4, 5, K, false);
  ctx.fillRect(-11, -5, 7, 2);
  // Wellen
  for (let row = 0; row < 3; row++) {
    ctx.beginPath();
    const y = 18 + row * 14;
    for (let x = -60; x <= 60; x += 20) ctx.arc(x + 10, y, 10, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

/** Spielzeugtag: Feuerwehrauto */
function drawToy(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  line(ctx, 3);
  // Aufbau (hinten) und Fahrerhaus (vorne rechts)
  ctx.fillStyle = R;
  ctx.beginPath(); ctx.roundRect(-66, -22, 90, 46, 4); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(24, 24); ctx.lineTo(24, -34); ctx.lineTo(48, -34); ctx.lineTo(66, -6); ctx.lineTo(66, 24); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Fenster im Fahrerhaus
  ctx.fillStyle = W;
  ctx.beginPath(); ctx.moveTo(32, -26); ctx.lineTo(45, -26); ctx.lineTo(57, -8); ctx.lineTo(32, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Blaulicht (gelb) auf dem Dach
  ctx.fillStyle = Y; ctx.beginPath(); ctx.roundRect(30, -44, 14, 10, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(26, -52); ctx.lineTo(22, -58); ctx.moveTo(37, -50); ctx.lineTo(37, -60); ctx.moveTo(48, -52); ctx.lineTo(52, -58); ctx.stroke();
  // Leiter auf dem Aufbau
  ctx.beginPath();
  ctx.moveTo(-72, -30); ctx.lineTo(20, -40); ctx.moveTo(-72, -40); ctx.lineTo(20, -50);
  for (let i = 0; i < 7; i++) { const x = -64 + i * 13; const t = (x + 72) / 92 * 10; ctx.moveTo(x, -30 - t); ctx.lineTo(x, -40 - t); }
  ctx.stroke();
  ctx.fillStyle = K; ctx.fillRect(-2, -22, 6, 10); // Leiterhalter
  // Rolltore / Streifen
  ctx.fillStyle = Y; ctx.fillRect(-66, 6, 132, 7); ctx.strokeRect(-66, 6, 132, 7);
  ctx.fillStyle = W;
  ctx.fillRect(-58, -14, 22, 16); ctx.strokeRect(-58, -14, 22, 16);
  ctx.fillRect(-30, -14, 22, 16); ctx.strokeRect(-30, -14, 22, 16);
  // Räder
  for (const x of [-42, 44]) { circle(ctx, x, 28, 13, K); circle(ctx, x, 28, 5, W); }
  ctx.fillStyle = Y; ctx.fillRect(62, 14, 6, 6); // Scheinwerfer
  ctx.restore();
}

/** Pläne Mo–So der Woche, in der `plan` liegt */
function weekPlans(plan, closed) {
  const noon = Date.parse(`${plan.iso}T12:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => dayPlan(new Date(noon + (i + 1 - plan.weekday) * 86400000), closed));
}

const ICONS = { kita: drawKita, home: drawHome, swim: drawSwim, toy: drawToy };

// ---------------------------------------------------------------- Wochenleiste
const HEADER = 94; // Höhe der Wochenleiste

/** Mini-Rutsche (Kita-Tag) */
function miniKita(ctx, x, y) {
  line(ctx, 2);
  ctx.beginPath(); ctx.moveTo(x - 14, y + 13); ctx.lineTo(x - 10, y - 13); ctx.moveTo(x - 6, y + 13); ctx.lineTo(x - 2, y - 13);
  for (let i = 0; i < 3; i++) { const yy = y + 6 - i * 8; ctx.moveTo(x - 13 + i, yy); ctx.lineTo(x - 5 + i, yy); }
  ctx.stroke();
  ctx.fillStyle = R;
  ctx.beginPath(); ctx.moveTo(x - 2, y - 14); ctx.bezierCurveTo(x + 6, y - 14, x + 8, y + 8, x + 16, y + 9); ctx.lineTo(x + 16, y + 14);
  ctx.bezierCurveTo(x + 4, y + 12, x + 4, y - 6, x - 2, y - 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = K; ctx.fillRect(x - 17, y + 13, 35, 2);
}

/** Mini-Haus (zu Hause) */
function miniHome(ctx, x, y) {
  line(ctx, 2);
  ctx.fillStyle = Y; ctx.fillRect(x - 12, y - 2, 24, 16); ctx.strokeRect(x - 12, y - 2, 24, 16);
  ctx.fillStyle = R; ctx.beginPath(); ctx.moveTo(x - 16, y - 1); ctx.lineTo(x, y - 15); ctx.lineTo(x + 16, y - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = K; ctx.fillRect(x + 1, y + 4, 6, 10);
}

/**
 * 7 Spalten Mo–So: oben der Tag (heute groß und rot, Wochenende gelb), darunter Rutsche (Kita) oder Haus (zu Hause).
 * Vergangene Tage sind durchgestrichen, damit man sieht, wie viele Kita-Tage bis zum Wochenende noch übrig sind.
 */
function drawWeek(ctx, week, today) {
  const y = 22;
  const gap = WIDTH / 7;
  for (let i = 0; i < 7; i++) {
    const x = gap * i + gap / 2;
    const day = week[i];
    const isToday = i + 1 === today;
    const past = i + 1 < today;
    const free = day.main === 'home';
    if (isToday) { // Spalte von heute umrahmen
      line(ctx, 3);
      ctx.beginPath(); ctx.roundRect(x - gap / 2 + 3, 2, gap - 6, HEADER - 8, 10); ctx.stroke();
    }
    line(ctx, isToday ? 3 : 2);
    circle(ctx, x, y, isToday ? 17 : 13, isToday ? R : free ? Y : W);
    text(ctx, WEEKDAYS[i], x, y + (isToday ? 5 : 5), { size: isToday ? 14 : 12, bold: true, color: isToday ? W : K, align: 'center' });
    const iy = 64;
    (free ? miniHome : miniKita)(ctx, x, iy);
    if (past) { // vorbei: dickes schwarzes Kreuz
      line(ctx, 4);
      ctx.beginPath();
      ctx.moveTo(x - 17, iy - 17); ctx.lineTo(x + 17, iy + 17);
      ctx.moveTo(x + 17, iy - 17); ctx.lineTo(x - 17, iy + 17);
      ctx.stroke();
    }
  }
}

/**
 * @param {object} plan Ergebnis von dayPlan()
 * @param {{percent:number}|null} battery
 */
export function renderPlan(plan, battery = null, closed = undefined) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = W;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawWeek(ctx, weekPlans(plan, closed), plan.weekday);
  ctx.fillStyle = K;
  ctx.fillRect(0, HEADER, WIDTH, 2);

  const items = [plan.main, ...plan.extras];
  const areaTop = HEADER + 2;
  const areaH = 274 - areaTop;
  const cy = areaTop + areaH / 2 + 8;
  if (items.length === 1) {
    ICONS[items[0]](ctx, WIDTH / 2, items[0] === 'kita' ? cy + 4 : cy - 6, items[0] === 'kita' ? 1.1 : 1.2);
  } else {
    // Hauptsymbol links, Extra (Schwimmen/Spielzeug) rechts in einem gelben Rahmen
    ICONS[items[0]](ctx, 105, cy, 0.95);
    line(ctx, 3);
    ctx.fillStyle = Y;
    ctx.beginPath(); ctx.roundRect(212, areaTop + 6, 178, areaH - 10, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = W;
    ctx.beginPath(); ctx.roundRect(220, areaTop + 14, 162, areaH - 26, 12); ctx.fill();
    ICONS[items[1]](ctx, 301, cy - 4, 0.95);
    // großes Plus dazwischen
    ctx.fillStyle = K;
    ctx.fillRect(193, cy - 3, 14, 6); ctx.fillRect(197, cy - 7, 6, 14);
  }

  // kleine Zeile für Erwachsene
  ctx.fillStyle = K;
  ctx.fillRect(0, 276, WIDTH, 1);
  const date = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${plan.iso}T12:00:00Z`));
  text(ctx, `${date} · ${plan.label}`, 8, 294, { size: 13 });
  if (battery && battery.percent >= 0) {
    const shown = Math.round(battery.percent / 10) * 10;
    text(ctx, `${shown}%`, WIDTH - 8, 294, { size: 12, bold: shown < 20, color: shown < 20 ? R : K, align: 'right' });
  }

  const img = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const frame = quantize(img.data);
  return { png: frameToPng(frame), frame };
}
