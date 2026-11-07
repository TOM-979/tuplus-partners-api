import { pool } from '../config/db.js'

// Cursos publicados hasta el nivel actual del Partner (inclusive), con su avance
export async function listarParaPartner({ partnerId, nivelOrden }) {
  const [cursos] = await pool.query(
    `SELECT c.id, c.titulo, c.descripcion, n.codigo AS nivel, n.orden AS nivel_orden,
            (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id = c.id) AS total_lecciones,
            (SELECT COUNT(*) FROM lecciones l JOIN progreso_academia pr ON pr.leccion_id = l.id
               WHERE l.curso_id = c.id AND pr.partner_id = ?) AS lecciones_completadas
     FROM cursos c
     JOIN niveles n ON n.id = c.nivel_id
     WHERE c.publicado = TRUE AND n.orden <= ?
     ORDER BY n.orden, c.orden`,
    [partnerId, nivelOrden],
  )
  return cursos
}

export async function buscarPorId(id) {
  const [filas] = await pool.query(
    `SELECT c.id, c.titulo, c.descripcion, n.codigo AS nivel, n.orden AS nivel_orden
     FROM cursos c JOIN niveles n ON n.id = c.nivel_id WHERE c.id = ?`,
    [id],
  )
  return filas[0] || null
}

export async function listarLecciones({ cursoId, partnerId }) {
  const [filas] = await pool.query(
    `SELECT l.id, l.titulo, l.tipo, l.contenido, l.duracion_min, l.orden,
            pr.completado_en IS NOT NULL AS completada
     FROM lecciones l
     LEFT JOIN progreso_academia pr ON pr.leccion_id = l.id AND pr.partner_id = ?
     WHERE l.curso_id = ?
     ORDER BY l.orden`,
    [partnerId, cursoId],
  )
  return filas.map((f) => ({ ...f, completada: !!f.completada }))
}

export async function buscarLeccion(id) {
  const [filas] = await pool.query('SELECT id, curso_id FROM lecciones WHERE id = ?', [id])
  return filas[0] || null
}

export async function marcarCompletada({ partnerId, leccionId }) {
  await pool.query(
    'INSERT IGNORE INTO progreso_academia (partner_id, leccion_id) VALUES (?, ?)',
    [partnerId, leccionId],
  )
}
