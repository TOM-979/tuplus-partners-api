import { pool } from '../config/db.js'

// Solo inserta y lee: el historial nunca se edita ni se borra
export async function registrar(conexion, { entidad, entidadId, accion, valorAnterior = null, valorNuevo = null, motivo = null, usuarioId = null }) {
  await (conexion || pool).query(
    `INSERT INTO historial_cambios (entidad, entidad_id, accion, valor_anterior, valor_nuevo, motivo, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entidad, entidadId, accion, valorAnterior, valorNuevo, motivo, usuarioId],
  )
}

export async function listarPorEntidad(entidad, entidadId) {
  const [filas] = await pool.query(
    `SELECT accion, valor_anterior, valor_nuevo, motivo, usuario_id, creado_en
     FROM historial_cambios WHERE entidad = ? AND entidad_id = ? ORDER BY id DESC`,
    [entidad, entidadId],
  )
  return filas
}
