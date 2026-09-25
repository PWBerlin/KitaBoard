import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { berlinHolidays, dayPlan, parseClosedDays, secondsUntilMorning } from '../lib/plan.js';
import { renderPlan } from '../lib/render.js';
import { displayResponse, setupResponse } from '../lib/trmnl.js';

const day = (iso) => dayPlan(new Date(`${iso}T09:00:00+02:00`), new Set());

test('Wochenplan', () => {
  assert.deepEqual([day('2026-09-21').main, day('2026-09-21').extras], ['kita', []]); // Mo
  assert.deepEqual(day('2026-09-24').extras, ['swim']); // Do
  assert.deepEqual(day('2026-09-25').extras, ['toy']); // Fr
  assert.equal(day('2026-09-26').main, 'home'); // Sa
  assert.equal(day('2026-09-27').main, 'home'); // So
});

test('Feiertage und Schließtage = keine Kita', () => {
  assert.equal(berlinHolidays(2026)['2026-04-03'], 'Karfreitag');
  assert.equal(berlinHolidays(2026)['2026-05-14'], 'Himmelfahrt');
  assert.equal(day('2026-10-03').main, 'home'); // Sa + Feiertag
  const holiday = dayPlan(new Date('2026-12-25T09:00:00+01:00'), new Set()); // Freitag
  assert.equal(holiday.main, 'home');
  assert.deepEqual(holiday.extras, []);
  const closed = parseClosedDays('2026-12-21..2026-12-23');
  assert.equal(closed.size, 3);
  assert.equal(dayPlan(new Date('2026-12-22T09:00:00+01:00'), closed).main, 'home');
});

test('Aufwachen um 5 Uhr', () => {
  assert.equal(secondsUntilMorning(new Date('2026-09-25T04:00:00+02:00')), 3600 + 60);
  assert.equal(secondsUntilMorning(new Date('2026-09-25T20:00:00+02:00')), 9 * 3600 + 60);
});

test('Bild und TRMNL-Antworten', () => {
  const { png, frame } = renderPlan(day('2026-09-24'), { percent: 77 });
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(frame.length, 30000);
  const req = { headers: { host: 'kita.vercel.app', id: 'AA:BB', 'battery-voltage': '3.9' } };
  assert.equal(setupResponse(req).status, 200);
  const hash = createHash('sha1').update(frame).digest('hex').slice(0, 12);
  const r = displayResponse(req, { frameHash: hash, refreshSeconds: 3600 });
  assert.equal(r.filename, `kita-${hash}`);
  assert.match(r.image_url, /^https:\/\/kita\.vercel\.app\/api\/screen\?v=/);
  // gleicher Tag zu anderer Uhrzeit = gleiches Bild (kein Neuzeichnen)
  const later = renderPlan(dayPlan(new Date('2026-09-24T17:00:00+02:00'), new Set()), { percent: 79 }).frame;
  assert.ok(frame.equals(later));
});
