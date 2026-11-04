import { pool } from '../config/db.js'

export async function revisar(_req, res) {
  try {
    await pool.query('SELECT 1')
    res.json({ estado: 'ok', baseDeDatos: 'conectada' })
  } catch {
    res.status(503).json({ estado: 'error', baseDeDatos: 'sin conexión' })
  }
}
