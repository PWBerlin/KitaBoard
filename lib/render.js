// Zeichnet den Tagesplan für Kinder: 400×300, Schwarz/Weiß/Gelb/Rot.
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { fileURLToPath } from 'node:url';
import { WIDTH, HEIGHT, COLORS, quantize } from './epd.js';
import { frameToPng } from './png.js';
import { WEEKDAYS } from './plan.js';

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

/** Zuhause/Wochenende: Familie unter einem großen Herz, Sonne */
function drawHome(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  line(ctx, 3);
  // Herz
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(-8, -52, -48, -54, -48, -24);
  ctx.bezierCurveTo(-48, 2, -14, 14, 0, 30);
  ctx.bezierCurveTo(14, 14, 48, 2, 48, -24);
  ctx.bezierCurveTo(48, -54, 8, -52, 0, -30);
  ctx.closePath();
  ctx.fillStyle = R; ctx.fill(); ctx.stroke();
  // Sonne oben rechts
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(62 + Math.cos(ang) * 15, -56 + Math.sin(ang) * 15);
    ctx.lineTo(62 + Math.cos(ang) * 23, -56 + Math.sin(ang) * 23);
    ctx.stroke();
  }
  circle(ctx, 62, -56, 11, Y);
  // Familie: zwei Große, ein Kind
  person(ctx, -52, 22, 8, Y);
  person(ctx, 52, 22, 8, Y);
  person(ctx, 0, 44, 6, R);
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

/** Spielzeugtag: Teddybär */
function drawToy(ctx, cx, cy, k = 1) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
  line(ctx, 3);
  circle(ctx, -30, 16, 14, Y); circle(ctx, 30, 16, 14, Y); // Arme
  circle(ctx, -20, 50, 14, Y); circle(ctx, 20, 50, 14, Y); // Füße
  circle(ctx, 0, 26, 30, Y); // Bauch
  circle(ctx, 0, 30, 14, W); // Bauchfleck
  circle(ctx, -22, -40, 11, Y); circle(ctx, 22, -40, 11, Y); // Ohren
  circle(ctx, -22, -40, 5, R, false);
  circle(ctx, 22, -40, 5, R, false);
  circle(ctx, 0, -22, 26, Y); // Kopf
  circle(ctx, 0, -14, 10, W); // Schnauze
  ctx.fillStyle = K;
  circle(ctx, 0, -17, 4, K, false);
  circle(ctx, -9, -28, 3.5, K, false); circle(ctx, 9, -28, 3.5, K, false);
  ctx.beginPath(); ctx.arc(0, -13, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // Schleife
  ctx.fillStyle = R;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-14, -6); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(14, -6); ctx.lineTo(14, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

const ICONS = { kita: drawKita, home: drawHome, swim: drawSwim, toy: drawToy };

// ---------------------------------------------------------------- Wochenleiste
/** 7 Kreise Mo–So; heute groß und rot, Wochenende gelb */
function drawWeek(ctx, today) {
  const y = 26;
  const gap = WIDTH / 7;
  for (let i = 0; i < 7; i++) {
    const x = gap * i + gap / 2;
    const isToday = i + 1 === today;
    const weekend = i >= 5;
    line(ctx, isToday ? 3 : 2);
    circle(ctx, x, y, isToday ? 20 : 13, isToday ? R : weekend ? Y : W);
    text(ctx, WEEKDAYS[i], x, y + (isToday ? 6 : 5), { size: isToday ? 15 : 12, bold: true, color: isToday ? W : K, align: 'center' });
  }
}

/**
 * @param {object} plan Ergebnis von dayPlan()
 * @param {{percent:number}|null} battery
 */
export function renderPlan(plan, battery = null) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = W;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawWeek(ctx, plan.weekday);
  ctx.fillStyle = K;
  ctx.fillRect(0, 52, WIDTH, 2);

  const items = [plan.main, ...plan.extras];
  const areaTop = 58;
  const areaH = 212;
  const cy = areaTop + areaH / 2 + 8;
  if (items.length === 1) {
    ICONS[items[0]](ctx, WIDTH / 2, items[0] === 'home' ? cy - 12 : cy, 1.45);
  } else {
    // Hauptsymbol links, Extra (Schwimmen/Spielzeug) rechts in einem gelben Rahmen
    ICONS[items[0]](ctx, 110, cy, 1.1);
    line(ctx, 3);
    ctx.fillStyle = Y;
    ctx.beginPath(); ctx.roundRect(212, areaTop + 10, 178, areaH - 14, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = W;
    ctx.beginPath(); ctx.roundRect(220, areaTop + 18, 162, areaH - 30, 12); ctx.fill();
    ICONS[items[1]](ctx, 301, cy, 1.1);
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
