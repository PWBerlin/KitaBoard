// TRMNL-kompatible Schnittstelle (BYOS) für die TRMNL-Firmware auf dem ZecTrix NOTE4C.
import { createHash } from 'node:crypto';

function header(req, name) {
  const v = req.headers[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

export function baseUrl(req) {
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null;
  return `${/^(localhost|127\.)/.test(host) ? 'http' : 'https'}://${host}`;
}

export function deviceIdentity(mac) {
  const hash = createHash('sha256').update(`kita-board:${process.env.TRMNL_SECRET ?? ''}:${String(mac ?? '').trim().toUpperCase()}`).digest('hex');
  return { apiKey: hash.slice(0, 32), friendlyId: hash.slice(32, 38).toUpperCase() };
}

/** Akkuspannung (Volt) → Prozent (Kurve der ZecTrix-Referenzfirmware) */
export function batteryPercent(volts) {
  const v = Number.parseFloat(volts);
  if (!Number.isFinite(v) || v < 2.8 || v > 4.35) return null;
  const mv = v * 1000;
  return Math.max(0, Math.min(100, Math.round((-mv * mv + 9016 * mv - 19189000) / 10000)));
}

export function batteryFromHeaders(req) {
  const percent = batteryPercent(header(req, 'Battery-Voltage'));
  return percent == null ? null : { percent };
}

export function setupResponse(req) {
  const mac = header(req, 'ID');
  const base = baseUrl(req);
  if (!mac || !base) return { status: 404, message: 'Header ID fehlt' };
  const id = deviceIdentity(mac);
  return { status: 200, api_key: id.apiKey, friendly_id: id.friendlyId, image_url: `${base}/api/screen`, message: 'Kita-Board verbunden' };
}

/** frameHash = Fingerabdruck des Bildes: gleicher Name → Gerät zeichnet nicht neu */
export function displayResponse(req, { frameHash, refreshSeconds }) {
  const base = baseUrl(req);
  if (!base) return { status: 500, message: 'Unbekannter Host' };
  const params = new URLSearchParams({ v: frameHash });
  const bat = batteryFromHeaders(req);
  if (bat) params.set('bat', String(bat.percent));
  return {
    status: 0,
    image_url: `${base}/api/screen?${params}`,
    image_url_timeout: 30,
    filename: `kita-${frameHash}`,
    refresh_rate: refreshSeconds,
    reset_firmware: false,
    update_firmware: false,
    firmware_url: '',
    special_function: 'none',
    temperature_profile: 'default',
  };
}
