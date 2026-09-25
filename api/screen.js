// GET /api/screen[?date=YYYY-MM-DD][&bat=80] – das Tagesbild als PNG (400×300, 4 Farben)
import { dayPlan } from '../lib/plan.js';
import { renderPlan } from '../lib/render.js';

export default function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const date = params.get('date');
  const when = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00+02:00`) : new Date();
  const bat = Number.parseInt(params.get('bat') ?? '', 10);
  const { png } = renderPlan(dayPlan(when), Number.isFinite(bat) ? { percent: bat } : null);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, s-maxage=60');
  return res.status(200).send(png);
}
