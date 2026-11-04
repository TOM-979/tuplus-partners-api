import { pool } from '../config/db.js'

export async function listar() {
  const [filas] = await pool.query('SELECT id, nombre, region, pais, estado, capacidad FROM territorios ORDER BY id')
  return filas
}

export async function buscarPorId(id) {
  const [filas] = await pool.query('SELECT id, nombre, estado FROM territorios WHERE id = ?', [id])
  return filas[0] || null
}
