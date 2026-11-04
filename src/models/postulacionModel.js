import { pool } from '../config/db.js'
import { codigoPostulacion } from '../utils/codigos.js'

// Inserta la postulación y le asigna su código, dentro de la transacción recibida
export async function crear(conexion, p) {
  const [r] = await conexion.query(
    `INSERT INTO postulaciones
      (nombre, correo, telefono, territorio_id, experiencia, disponibilidad, sectores, motivo,
       consentimiento_version, consentimiento_fecha, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), ?)`,
    [p.nombre, p.correo, p.telefono, p.territorioId, p.experiencia, p.disponibilidad,
      p.sectores, p.motivo, p.consentimientoVersion, p.origen],
  )
  const codigo = codigoPostulacion(r.insertId)
  await conexion.query('UPDATE postulaciones SET codigo = ? WHERE id = ?', [codigo, r.insertId])
  return { id: r.insertId, codigo }
}

// Postulación activa (no rechazada) con el mismo correo: posible duplicado
export async function buscarActivaPorCorreo(correo) {
  const [filas] = await pool.query(
    "SELECT id, codigo FROM postulaciones WHERE correo = ? AND estado <> 'no_seleccionado' LIMIT 1",
    [correo],
  )
  return filas[0] || null
}
