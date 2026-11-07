import { pool } from '../config/db.js'
import { codigoPartner } from '../utils/codigos.js'

const SELECT = `
  SELECT p.id, p.codigo, p.usuario_id, p.postulacion_id, p.nombre, p.telefono, p.es_lider_regional,
         p.territorio_id, p.estado, p.activado_en,
         n.codigo AS nivel, n.nombre AS nivel_nombre,
         t.nombre AS territorio, u.correo
  FROM partners p
  JOIN niveles n ON n.id = p.nivel_id
  JOIN territorios t ON t.id = p.territorio_id
  JOIN usuarios u ON u.id = p.usuario_id
`

export async function listar({ territorioId } = {}) {
  const condiciones = []
  const parametros = []
  if (territorioId) { condiciones.push('p.territorio_id = ?'); parametros.push(territorioId) }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [filas] = await pool.query(`${SELECT} ${where} ORDER BY p.id DESC`, parametros)
  return filas
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(`${SELECT} WHERE p.id = ?`, [id])
  return filas[0] || null
}

export async function buscarPorUsuarioId(usuarioId) {
  const [filas] = await pool.query(`${SELECT} WHERE p.usuario_id = ?`, [usuarioId])
  return filas[0] || null
}

// Activa un Partner a partir de una postulación aprobada, dentro de la transacción recibida
export async function activar(conexion, { usuarioId, postulacionId, nombre, telefono, nivelId, territorioId }) {
  const [r] = await conexion.query(
    `INSERT INTO partners (usuario_id, postulacion_id, nombre, telefono, nivel_id, territorio_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [usuarioId, postulacionId, nombre, telefono, nivelId, territorioId],
  )
  const codigo = codigoPartner(r.insertId)
  await conexion.query('UPDATE partners SET codigo = ? WHERE id = ?', [codigo, r.insertId])
  return { id: r.insertId, codigo }
}

export async function cambiarNivel(conexion, { partnerId, nivelId }) {
  await (conexion || pool).query('UPDATE partners SET nivel_id = ? WHERE id = ?', [nivelId, partnerId])
}

export async function cambiarLiderRegional(conexion, { partnerId, esLider }) {
  await (conexion || pool).query('UPDATE partners SET es_lider_regional = ? WHERE id = ?', [esLider, partnerId])
}
