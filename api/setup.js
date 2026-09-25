// GET /api/setup – Registrierung der TRMNL-Firmware (Header "ID" = MAC-Adresse)
import { setupResponse } from '../lib/trmnl.js';

export default function handler(req, res) {
  const body = setupResponse(req);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(body.status === 200 ? 200 : 404).json(body);
}
