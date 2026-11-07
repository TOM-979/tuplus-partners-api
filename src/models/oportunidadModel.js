import { pool } from '../config/db.js'
import { codigoOportunidad } from '../utils/codigos.js'

const SELECT = `
  SELECT o.id, o.codigo, o.partner_id, o.empresa, o.contacto, o.sector, o.ciudad, o.necesidad,
         o.etapa, o.monto, o.moneda, o.proximo_paso, o.creado_en, o.actualizado_en,
         p.codigo AS partner_codigo, p.nombre AS partner_nombre, p.territorio_id
  FROM oportunidades o
  JOIN partners p ON p.id = o.partner_id
`

// partnerId: si se da, solo esa cartera (aislamiento); territorioId: para Líder Regional
export async function listar({ partnerId, territorioId } = {}) {
  const condiciones = []
  const parametros = []
  if (partnerId) { condiciones.push('o.partner_id = ?'); parametros.push(partnerId) }
  if (territorioId) { condiciones.push('p.territorio_id = ?'); parametros.push(territorioId) }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''
  const [filas] = await pool.query(`${SELECT} ${where} ORDER BY o.id DESC`, parametros)
  return filas
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(`${SELECT} WHERE o.id = ?`, [id])
  return filas[0] || null
}

export async function crear({ partnerId, empresa, contacto, sector, ciudad, necesidad, monto, moneda, proximoPaso }) {
  const [r] = await pool.query(
    `INSERT INTO oportunidades (partner_id, empresa, contacto, sector, ciudad, necesidad, monto, moneda, proximo_paso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [partnerId, empresa, contacto, sector, ciudad, necesidad, monto, moneda || 'USD', proximoPaso],
  )
  const codigo = codigoOportunidad(r.insertId)
  await pool.query('UPDATE oportunidades SET codigo = ? WHERE id = ?', [codigo, r.insertId])
  return buscarPorId(r.insertId)
}

export async function actualizar(id, cambios) {
  const columnas = { empresa: 'empresa', contacto: 'contacto', sector: 'sector', ciudad: 'ciudad', necesidad: 'necesidad', etapa: 'etapa', monto: 'monto', moneda: 'moneda', proximoPaso: 'proximo_paso' }
  const asignaciones = []
  const valores = []
  for (const [clave, columna] of Object.entries(columnas)) {
    if (cambios[clave] !== undefined) { asignaciones.push(`${columna} = ?`); valores.push(cambios[clave]) }
  }
  if (!asignaciones.length) return buscarPorId(id)
  await pool.query(`UPDATE oportunidades SET ${asignaciones.join(', ')} WHERE id = ?`, [...valores, id])
  return buscarPorId(id)
}
