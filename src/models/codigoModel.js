import { pool } from '../config/db.js'

export async function crear({ usuarioId, codigoHash, minutosValidez }) {
  const [r] = await pool.query(
    `INSERT INTO codigos_verificacion (usuario_id, codigo_hash, expira_en)
     VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`,
    [usuarioId, codigoHash, minutosValidez],
  )
  return r.insertId
}

// El código vigente más reciente de ese usuario (no usado, no vencido)
export async function buscarVigente(usuarioId) {
  const [filas] = await pool.query(
    `SELECT id, codigo_hash, intentos FROM codigos_verificacion
     WHERE usuario_id = ? AND usado = FALSE AND expira_en > UTC_TIMESTAMP()
     ORDER BY id DESC LIMIT 1`,
    [usuarioId],
  )
  return filas[0] || null
}

export async function registrarIntento(id) {
  await pool.query('UPDATE codigos_verificacion SET intentos = intentos + 1 WHERE id = ?', [id])
}

export async function marcarUsado(id) {
  await pool.query('UPDATE codigos_verificacion SET usado = TRUE WHERE id = ?', [id])
}
