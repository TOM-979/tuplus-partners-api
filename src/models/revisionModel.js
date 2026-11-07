import { pool } from '../config/db.js'

// Vista de postulaciones para Dirección / Líder Regional (revisar, decidir, activar)
const SELECT = `
  SELECT p.id, p.codigo, p.nombre, p.correo, p.telefono, p.territorio_id, p.experiencia,
         p.disponibilidad, p.sectores, p.motivo, p.puntaje, p.estado, p.creado_en,
         t.nombre AS territorio
  FROM postulaciones p
  JOIN territorios t ON t.id = p.territorio_id
`

export async function listar({ territorioId, estado } = {}) {
  const condiciones = []
  const parametros = []
  if (territorioId) { condiciones.push('p.territorio_id = ?'); parametros.push(territorioId) }
  if (estado) { condiciones.push('p.estado = ?'); parametros.push(estado) }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [filas] = await pool.query(`${SELECT} ${where} ORDER BY p.id DESC`, parametros)
  return filas
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(`${SELECT} WHERE p.id = ?`, [id])
  return filas[0] || null
}

export async function cambiarEstado(conexion, { id, estado }) {
  await (conexion || pool).query('UPDATE postulaciones SET estado = ? WHERE id = ?', [estado, id])
}
