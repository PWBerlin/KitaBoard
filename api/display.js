// GET /api/display – die TRMNL-Firmware fragt nach dem Bild und wann sie wieder aufwachen soll.
// Das Gerät schläft höchstens 4 h am Stück (die ESP32-Uhr driftet) und spätestens bis 5 Uhr morgens.
// Gleiches Bild = gleicher Dateiname = kein Neuzeichnen. Die OK-Taste weckt es sofort.
import { createHash } from 'node:crypto';
import { dayPlan, secondsUntilMorning } from '../lib/plan.js';
import { renderPlan } from '../lib/render.js';
import { batteryFromHeaders, displayResponse } from '../lib/trmnl.js';

export default function handler(req, res) {
  const now = new Date();
  const { frame } = renderPlan(dayPlan(now), batteryFromHeaders(req));
  const frameHash = createHash('sha1').update(frame).digest('hex').slice(0, 12);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(displayResponse(req, { frameHash, refreshSeconds: Math.min(secondsUntilMorning(now), 4 * 3600) }));
}
