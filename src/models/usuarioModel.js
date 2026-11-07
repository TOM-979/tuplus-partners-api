import { pool } from '../config/db.js'

const CAMPOS = 'id, correo, contrasena_hash, rol, estado, intentos_fallidos, bloqueado_hasta, ultimo_acceso'

export async function buscarPorCorreo(correo) {
  const [filas] = await pool.query(`SELECT ${CAMPOS} FROM usuarios WHERE correo = ?`, [correo])
  return filas[0] || null
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(
    `SELECT u.${CAMPOS.split(', ').join(', u.')}, p.id AS partner_id, p.codigo AS partner_codigo,
            p.nombre AS partner_nombre, p.territorio_id, t.nombre AS territorio_nombre, p.es_lider_regional, n.codigo AS partner_nivel
     FROM usuarios u
     LEFT JOIN partners p ON p.usuario_id = u.id
     LEFT JOIN niveles n ON n.id = p.nivel_id
     LEFT JOIN territorios t ON t.id = p.territorio_id
     WHERE u.id = ?`,
    [id],
  )
  const fila = filas[0]
  if (!fila) return null
  return {
    id: fila.id, correo: fila.correo, contrasena_hash: fila.contrasena_hash, rol: fila.rol,
    estado: fila.estado, intentos_fallidos: fila.intentos_fallidos, bloqueado_hasta: fila.bloqueado_hasta,
    ultimo_acceso: fila.ultimo_acceso,
    partner: fila.partner_id
      ? { id: fila.partner_id, codigo: fila.partner_codigo, nombre: fila.partner_nombre, territorio_id: fila.territorio_id, territorio: fila.territorio_nombre, esLiderRegional: !!fila.es_lider_regional, nivel: fila.partner_nivel }
      : null,
  }
}

// Crea una cuenta nueva (se usa al activar un Partner). Devuelve su id.
export async function crear(conexion, { correo, contrasenaHash, rol }) {
  const [r] = await (conexion || pool).query(
    'INSERT INTO usuarios (correo, contrasena_hash, rol) VALUES (?, ?, ?)',
    [correo, contrasenaHash, rol])
  return r.insertId
}

export async function registrarIntentoFallido(id) {
  // A partir del 5.º intento seguido se bloquea la cuenta 15 minutos (fuerza bruta)
  await pool.query(
    `UPDATE usuarios SET
       intentos_fallidos = intentos_fallidos + 1,
       bloqueado_hasta = IF(intentos_fallidos + 1 >= 5, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), bloqueado_hasta)
     WHERE id = ?`,
    [id],
  )
}

export async function registrarAccesoCorrecto(id) {
  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = UTC_TIMESTAMP() WHERE id = ?',
    [id],
  )
}

export async function cambiarContrasena(id, contrasenaHash) {
  await pool.query('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', [contrasenaHash, id])
}

export async function cambiarRol(conexion, id, rol) {
  await (conexion || pool).query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id])
}
