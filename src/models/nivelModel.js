import { pool } from '../config/db.js'

export async function listar() {
  const [filas] = await pool.query('SELECT codigo, nombre, tipo, descripcion, orden FROM niveles ORDER BY orden')
  return filas
}

export async function buscarPorCodigo(codigo) {
  const [filas] = await pool.query('SELECT id, codigo, nombre, tipo, orden FROM niveles WHERE codigo = ?', [codigo])
  return filas[0] || null
}
