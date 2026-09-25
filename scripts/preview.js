// Rendert alle 7 Wochentage nach out/ (2× vergrößert) – zum Anschauen ohne Gerät.
import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { dayPlan } from '../lib/plan.js';
import { renderPlan } from '../lib/render.js';

await mkdir('out', { recursive: true });
const monday = new Date('2026-09-21T08:00:00+02:00');
const sheet = createCanvas(800 * 2 + 20, 600 * 4 + 60);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#888'; sctx.fillRect(0, 0, sheet.width, sheet.height);
sctx.imageSmoothingEnabled = false;
for (let i = 0; i < 7; i++) {
  const plan = dayPlan(new Date(monday.getTime() + i * 86400000), new Set());
  const { png } = renderPlan(plan, { percent: 80 }, new Set());
  await writeFile(`out/day-${i + 1}.png`, png);
  const img = await loadImage(png);
  sctx.drawImage(img, (i % 2) * 820, Math.floor(i / 2) * 620, 800, 600);
}
await writeFile('out/week.png', sheet.toBuffer('image/png'));
console.log('out/week.png');
