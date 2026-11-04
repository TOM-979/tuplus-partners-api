import { pool } from '../config/db.js'

export async function listar() {
  const [filas] = await pool.query('SELECT codigo, nombre, tipo, descripcion FROM niveles ORDER BY orden')
  return filas
}
