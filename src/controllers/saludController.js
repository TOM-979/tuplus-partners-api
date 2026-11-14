import { pool } from '../config/db.js'

export async function revisar(_req, res) {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch {
    res.status(503).json({ ok: false, error: 'No hay conexión con la base de datos.' })
  }
}
