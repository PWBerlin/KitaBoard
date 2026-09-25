// POST /api/log – Fehlerprotokolle der TRMNL-Firmware (landen in den Vercel-Logs)
export default function handler(req, res) {
  try {
    console.log(`[trmnl-log] ${req.headers.id ?? '?'} ${JSON.stringify(req.body ?? {}).slice(0, 2000)}`);
  } catch {
    // nur Diagnose
  }
  return res.status(204).end();
}
