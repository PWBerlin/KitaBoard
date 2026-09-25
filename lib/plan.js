// Was ist heute? Kita oder frei, Schwimmen, Spielzeugtag.
export const TZ = 'Europe/Berlin';

// Wochentage: 1 = Montag … 7 = Sonntag
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const SWIM_DAY = 4; // Donnerstag
const TOY_DAY = 5; // Freitag

/** Datum in Berlin: { y, m, d, weekday (1–7), iso } */
export function berlinDate(date = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })
      .formatToParts(date).map((x) => [x.type, x.value]),
  );
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), weekday, iso: `${p.year}-${p.month}-${p.day}` };
}

/** Ostersonntag (Gauß/Meeus) als "YYYY-MM-DD" */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

const iso = (t) => new Date(t).toISOString().slice(0, 10);

/** Gesetzliche Feiertage in Berlin */
export function berlinHolidays(y) {
  const e = easter(y);
  const day = 86400000;
  return {
    [`${y}-01-01`]: 'Neujahr',
    [`${y}-03-08`]: 'Frauentag',
    [iso(e - 2 * day)]: 'Karfreitag',
    [iso(e + day)]: 'Ostermontag',
    [`${y}-05-01`]: 'Tag der Arbeit',
    [iso(e + 39 * day)]: 'Himmelfahrt',
    [iso(e + 50 * day)]: 'Pfingstmontag',
    [`${y}-10-03`]: 'Tag der Einheit',
    [`${y}-12-25`]: '1. Weihnachtstag',
    [`${y}-12-26`]: '2. Weihnachtstag',
  };
}

/** Schließtage der Kita aus der Umgebungsvariable KITA_CLOSED, z.B. "2026-12-22..2027-01-02,2026-10-30" */
export function parseClosedDays(value = process.env.KITA_CLOSED ?? '') {
  const days = new Set();
  for (const part of value.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [from, to] = part.split('..').map((s) => s.trim());
    const start = Date.parse(`${from}T00:00:00Z`);
    const end = Date.parse(`${to ?? from}T00:00:00Z`);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    for (let t = start; t <= end && days.size < 1000; t += 86400000) days.add(iso(t));
  }
  return days;
}

/**
 * Plan für einen Tag.
 * main: 'kita' | 'home'; extras: ['swim'] (Do) / ['toy'] (Fr); reason: Text für Erwachsene
 */
export function dayPlan(date = new Date(), closed = parseClosedDays()) {
  const t = berlinDate(date);
  const holiday = berlinHolidays(t.y)[t.iso];
  const weekend = t.weekday >= 6;
  if (weekend) return { ...t, main: 'home', extras: [], label: 'Wochenende – keine Kita' };
  if (holiday) return { ...t, main: 'home', extras: [], label: `${holiday} – keine Kita` };
  if (closed.has(t.iso)) return { ...t, main: 'home', extras: [], label: 'Kita geschlossen' };
  const extras = [];
  if (t.weekday === SWIM_DAY) extras.push('swim');
  if (t.weekday === TOY_DAY) extras.push('toy');
  const label = ['Kita', ...extras.map((x) => (x === 'swim' ? 'Schwimmen' : 'Spielzeugtag'))].join(' · ');
  return { ...t, main: 'kita', extras, label };
}

/** Sekunden bis zum nächsten Morgen um 05:00 Berliner Zeit (dann zeigt das Gerät den neuen Tag) */
export function secondsUntilMorning(now = new Date(), hour = 5) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map((x) => [x.type, Number(x.value)]),
  );
  const nowS = parts.hour * 3600 + parts.minute * 60 + parts.second;
  let diff = hour * 3600 - nowS;
  if (diff <= 60) diff += 86400;
  return diff + 60;
}
