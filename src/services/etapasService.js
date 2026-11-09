import { randomUUID } from 'node:crypto'
import { pool, enTransaccion } from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as crm from './crmService.js'

const fail = (message, status = 400) => { throw new AppError(status, message) }
export const id = (v) => { const n = Number(v); if (!Number.isSafeInteger(n) || n < 1) fail('Identificador inválido.'); return n }
export function texto(v, max, requerido = false) {
  if (v !== undefined && v !== null && typeof v !== 'string') fail('El texto no es válido.')
  const s = (v || '').trim()
  if ((requerido && !s) || s.length > max) fail(`Completa el texto requerido (máximo ${max} caracteres).`)
  return s || null
}
const json = (v) => typeof v === 'string' ? JSON.parse(v) : v
export function direccion(u) { if (u.rol !== 'direccion') fail('Solo Dirección puede realizar esta acción.', 403) }
export function alcance(u, alias = 'p') {
  if (u.rol === 'direccion') return ['1=1', []]
  if (!u.partner?.id || (u.rol === 'lider_regional' && !u.partner.territorio_id)) fail('No tienes una cartera asignada.', 403)
  if (u.rol === 'lider_regional') return [`${alias}.territorio_id = ?`, [u.partner.territorio_id]]
  if (u.rol !== 'partner') fail('Sin permiso.', 403)
  return [`${alias}.id = ?`, [u.partner.id]]
}
async function audit(db, u, entidad, entidadId, accion, detalle = null) {
  await db.query('INSERT INTO auditoria_etapas (usuario_id, entidad, entidad_id, accion, detalle) VALUES (?, ?, ?, ?, ?)', [u.id, entidad, entidadId, accion, detalle])
}
async function curso(u, cursoId, db = pool) {
  const [[c]] = await db.query('SELECT c.*, n.codigo AS nivel, n.orden AS nivel_orden FROM cursos c JOIN niveles n ON n.id=c.nivel_id WHERE c.id=?', [id(cursoId)])
  if (!c) fail('Curso no encontrado.', 404)
  if (u.rol !== 'direccion') {
    if (!u.partner?.id) fail('Necesitas un perfil de Partner.', 403)
    const [[n]] = await db.query('SELECT orden FROM niveles WHERE codigo=?', [u.partner.nivel])
    if (!c.publicado || !n || c.nivel_orden > n.orden) fail('Este curso no está disponible para tu nivel.', 403)
  }
  return c
}
export async function cursos(u) {
  let where = '1=1', params = []
  if (u.rol !== 'direccion') {
    if (!u.partner?.id) fail('Necesitas un perfil de Partner.', 403)
    where = 'c.publicado=1 AND n.orden <= (SELECT orden FROM niveles WHERE codigo=?)'
    params = [u.partner.nivel]
  }
  const [rows] = await pool.query(`SELECT c.*, n.codigo AS nivel,
    (SELECT COUNT(*) FROM lecciones l WHERE l.curso_id=c.id) AS total_lecciones,
    (SELECT COUNT(*) FROM progreso_academia pr JOIN lecciones l ON l.id=pr.leccion_id WHERE l.curso_id=c.id AND pr.partner_id=?) AS lecciones_completadas,
    EXISTS(SELECT 1 FROM evaluaciones_curso e WHERE e.curso_id=c.id) AS tiene_evaluacion
    FROM cursos c JOIN niveles n ON n.id=c.nivel_id WHERE ${where} ORDER BY n.orden,c.orden,c.id`, [u.partner?.id || 0, ...params])
  return rows
}
export async function detalleCurso(u, cursoId) {
  const c = await curso(u, cursoId)
  const [lecciones] = await pool.query(`SELECT l.*, EXISTS(SELECT 1 FROM progreso_academia pr WHERE pr.leccion_id=l.id AND pr.partner_id=?) AS completada FROM lecciones l WHERE l.curso_id=? ORDER BY l.orden,l.id`, [u.partner?.id || 0, c.id])
  const [[e]] = await pool.query('SELECT * FROM evaluaciones_curso WHERE curso_id=?', [c.id])
  const [intentos] = await pool.query('SELECT nota, aprobado, creado_en FROM intentos_evaluacion WHERE curso_id=? AND partner_id=? ORDER BY id DESC LIMIT 5', [c.id, u.partner?.id || 0])
  return { ...c, lecciones, intentos, evaluacion: e ? { minimo: e.minimo, preguntas: json(e.preguntas).map(({ correcta, ...q }) => q) } : null }
}
export async function crearCurso(u, body) {
  direccion(u)
  const titulo = texto(body.titulo, 160, true), descripcion = texto(body.descripcion, 500)
  const nivelCodigo = texto(body.nivelId, 2, true)
  if (!Array.isArray(body.lecciones) || body.lecciones.length < 1 || body.lecciones.length > 30) fail('Agrega entre 1 y 30 lecciones.')
  const lecciones = body.lecciones.map((l) => {
    if (!['lectura','video'].includes(l.tipo)) fail('Tipo de lección inválido.')
    const contenido = texto(l.contenido, 10000, true)
    if (l.tipo === 'video') { try { if (new URL(contenido).protocol !== 'https:') fail('Usa un enlace HTTPS para el video.') } catch { fail('Usa un enlace HTTPS válido para el video.') } }
    const duracion = Number(l.duracion_min || 0)
    if (!Number.isInteger(duracion) || duracion < 0 || duracion > 600) fail('Duración inválida.')
    return { titulo: texto(l.titulo, 160, true), tipo: l.tipo, contenido, duracion }
  })
  const preguntas = body.preguntas
  if (!Array.isArray(preguntas) || preguntas.length < 1 || preguntas.length > 20) fail('Agrega entre 1 y 20 preguntas.')
  const qs = preguntas.map((q, i) => {
    if (!Array.isArray(q.opciones) || q.opciones.length < 2 || q.opciones.length > 5 || !Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta >= q.opciones.length) fail('Revisa las opciones y la respuesta correcta.')
    return { id: i + 1, texto: texto(q.texto, 500, true), opciones: q.opciones.map((o) => texto(o, 300, true)), correcta: q.correcta }
  })
  const minimo = Number(body.minimo)
  if (!Number.isInteger(minimo) || minimo < 1 || minimo > 100) fail('La nota mínima debe estar entre 1 y 100.')
  return enTransaccion(async (db) => {
    const [[nivel]] = await db.query("SELECT id FROM niveles WHERE codigo=? AND tipo='rango'", [nivelCodigo])
    if (!nivel) fail('Selecciona un nivel de rango válido.')
    const [r] = await db.query('INSERT INTO cursos (titulo,descripcion,nivel_id,publicado) VALUES (?,?,?,FALSE)', [titulo, descripcion, nivel.id])
    for (const [i,l] of lecciones.entries()) await db.query('INSERT INTO lecciones (curso_id,titulo,tipo,contenido,duracion_min,orden) VALUES (?,?,?,?,?,?)', [r.insertId,l.titulo,l.tipo,l.contenido,l.duracion,i+1])
    await db.query('INSERT INTO evaluaciones_curso (curso_id,minimo,preguntas) VALUES (?,?,?)', [r.insertId,minimo,JSON.stringify(qs)])
    await audit(db,u,'curso',r.insertId,'creado',titulo)
    return { id: r.insertId }
  })
}
export async function publicarCurso(u, cursoId, publicado) {
  direccion(u)
  if (typeof publicado !== 'boolean') fail('Estado inválido.')
  const c = await curso(u,cursoId)
  await enTransaccion(async db => {
    await db.query('UPDATE cursos SET publicado=? WHERE id=?', [publicado,c.id])
    await audit(db,u,'curso',c.id,publicado ? 'publicado' : 'retirado')
  })
  return { mensaje: publicado ? 'Curso publicado.' : 'Curso retirado del catálogo.' }
}
export async function completar(u, leccionId) {
  if (!u.partner?.id) fail('Solo un Partner puede registrar avance.',403)
  const [[l]] = await pool.query('SELECT * FROM lecciones WHERE id=?',[id(leccionId)])
  if (!l) fail('Lección no encontrada.',404)
  await curso(u,l.curso_id)
  if (l.tipo === 'evaluacion') fail('Resuelve la evaluación del curso para registrar tu resultado.')
  await pool.query('INSERT IGNORE INTO progreso_academia (partner_id,leccion_id) VALUES (?,?)',[u.partner.id,l.id])
  return { mensaje: 'Avance guardado.' }
}
export async function evaluar(u, cursoId, respuestas) {
  if (!u.partner?.id) fail('Solo un Partner puede rendir evaluaciones.',403)
  return enTransaccion(async db => {
    // Serializa intentos del mismo Partner y evita constancias duplicadas.
    await db.query('SELECT id FROM partners WHERE id=? FOR UPDATE',[u.partner.id])
    const c = await curso(u,cursoId,db)
    const [[e]] = await db.query('SELECT * FROM evaluaciones_curso WHERE curso_id=?',[c.id])
    if (!e) fail('Este curso todavía no tiene evaluación.',404)
    const [[faltantes]] = await db.query(`SELECT COUNT(*) AS total FROM lecciones l WHERE l.curso_id=? AND l.tipo <> 'evaluacion' AND NOT EXISTS (SELECT 1 FROM progreso_academia p WHERE p.leccion_id=l.id AND p.partner_id=?)`,[c.id,u.partner.id])
    if (faltantes.total) fail('Completa todas las lecciones antes de rendir la evaluación.',409)
    const qs = json(e.preguntas)
    if (!Array.isArray(respuestas) || respuestas.length !== qs.length || respuestas.some((r,i) => !Number.isInteger(r) || r<0 || r>=qs[i].opciones.length)) fail('Responde todas las preguntas.')
    const [[recientes]] = await db.query('SELECT COUNT(*) AS total FROM intentos_evaluacion WHERE partner_id=? AND curso_id=? AND creado_en > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)',[u.partner.id,c.id])
    if (recientes.total >= 5) fail('Alcanzaste los 5 intentos por hora. Repasa el contenido y vuelve más tarde.',429)
    const nota = Math.round(qs.filter((q,i) => q.correcta === respuestas[i]).length * 100 / qs.length)
    const aprobado = nota >= e.minimo
    await db.query('INSERT INTO intentos_evaluacion (partner_id,curso_id,nota,aprobado) VALUES (?,?,?,?)',[u.partner.id,c.id,nota,aprobado])
    if (aprobado) {
      await db.query('INSERT IGNORE INTO certificados (codigo,partner_id,curso_id,nombre,titulo,nota) VALUES (?,?,?,?,?,?)',[`TP-${randomUUID()}`,u.partner.id,c.id,u.partner.nombre,c.titulo,nota])
      await db.query("INSERT IGNORE INTO progreso_academia (partner_id,leccion_id) SELECT ?,id FROM lecciones WHERE curso_id=? AND tipo='evaluacion'",[u.partner.id,c.id])
    }
    return { nota, aprobado, minimo: e.minimo }
  })
}
export async function certificados(u) {
  const [where,params] = alcance(u)
  const [rows] = await pool.query(`SELECT c.* FROM certificados c JOIN partners p ON p.id=c.partner_id WHERE ${where} ORDER BY c.id DESC`,params)
  return rows
}
export async function empresas(u) {
  const [where,params] = alcance(u)
  const [rows] = await pool.query(`SELECT e.*,p.codigo AS partner_codigo FROM empresas_crm e JOIN partners p ON p.id=e.partner_id WHERE ${where} ORDER BY e.nombre`,params)
  const [contacts] = await pool.query(`SELECT c.* FROM contactos_crm c JOIN empresas_crm e ON e.id=c.empresa_id JOIN partners p ON p.id=e.partner_id WHERE ${where} ORDER BY c.nombre`,params)
  return rows.map(e => ({ ...e, contactos: contacts.filter(c => c.empresa_id === e.id) }))
}
async function empresa(u, empresaId) {
  const [where,params] = alcance(u)
  const [[e]] = await pool.query(`SELECT e.* FROM empresas_crm e JOIN partners p ON p.id=e.partner_id WHERE e.id=? AND ${where}`,[id(empresaId),...params])
  if (!e) fail('Empresa no encontrada en tu cartera.',404)
  return e
}
export async function crearEmpresa(u,b) {
  if (!u.partner?.id || u.rol !== 'partner') fail('Solo un Partner puede registrar empresas.',403)
  try {
    const [r] = await pool.query('INSERT INTO empresas_crm (partner_id,nombre,sector,ciudad) VALUES (?,?,?,?)',[u.partner.id,texto(b.nombre,160,true),texto(b.sector,80),texto(b.ciudad,80)])
    return { id:r.insertId }
  } catch(e) { if (e.code === 'ER_DUP_ENTRY') fail('Esta empresa ya está en tu cartera.',409); throw e }
}
export async function crearContacto(u,empresaId,b) {
  const e = await empresa(u,empresaId)
  const correo = texto(b.correo,160)
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) fail('Correo de contacto inválido.')
  const [r] = await pool.query('INSERT INTO contactos_crm (empresa_id,nombre,cargo,correo,telefono) VALUES (?,?,?,?,?)',[e.id,texto(b.nombre,120,true),texto(b.cargo,100),correo,texto(b.telefono,30)])
  return { id:r.insertId }
}
export async function seguimientos(u, oportunidadId) {
  await crm.obtener(u,id(oportunidadId))
  const [rows] = await pool.query('SELECT s.*,u.correo AS autor FROM seguimientos_crm s JOIN usuarios u ON u.id=s.usuario_id WHERE oportunidad_id=? ORDER BY s.id DESC',[id(oportunidadId)])
  return rows
}
export async function crearSeguimiento(u,oportunidadId,b) {
  await crm.obtener(u,id(oportunidadId))
  if (!['llamada','reunion','nota','posventa'].includes(b.tipo)) fail('Tipo de seguimiento inválido.')
  const fecha = b.fecha || null
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)) || new Date(fecha).toISOString().slice(0,10) !== fecha)) fail('Fecha inválida.')
  const detalle = texto(b.detalle,1000,true)
  const [r] = await pool.query('INSERT INTO seguimientos_crm (oportunidad_id,usuario_id,tipo,detalle,fecha,estado) VALUES (?,?,?,?,?,?)',[id(oportunidadId),u.id,b.tipo,detalle,fecha,b.tipo==='nota' ? 'completado' : 'pendiente'])
  return { id:r.insertId }
}
export async function cerrarSeguimiento(u,seguimientoId) {
  const [[s]] = await pool.query('SELECT * FROM seguimientos_crm WHERE id=?',[id(seguimientoId)])
  if (!s) fail('Seguimiento no encontrado.',404)
  await crm.obtener(u,s.oportunidad_id)
  await enTransaccion(async db => {
    await db.query("UPDATE seguimientos_crm SET estado='completado' WHERE id=?",[s.id])
    await audit(db,u,'seguimiento',s.id,'completado')
  })
  return { mensaje:'Seguimiento completado.' }
}
export async function gestion(u) {
  if (!['direccion','lider_regional'].includes(u.rol)) fail('Solo Dirección y líderes regionales pueden ver este reporte.',403)
  const [where,params] = alcance(u)
  const [oportunidades] = await pool.query(`SELECT o.*,p.codigo AS partner_codigo,p.nombre AS partner_nombre,t.nombre AS territorio FROM oportunidades o JOIN partners p ON p.id=o.partner_id JOIN territorios t ON t.id=p.territorio_id WHERE ${where} ORDER BY o.id DESC`,params)
  const [partners] = await pool.query(`SELECT p.id,p.codigo,p.nombre,p.estado,p.es_lider_regional,n.codigo AS nivel,t.nombre AS territorio FROM partners p JOIN niveles n ON n.id=p.nivel_id JOIN territorios t ON t.id=p.territorio_id WHERE ${where} ORDER BY t.nombre,p.nombre`,params)
  const [comisiones] = await pool.query(`SELECT c.*,o.empresa,o.codigo AS oportunidad_codigo,p.codigo AS partner_codigo FROM comisiones_manual c JOIN oportunidades o ON o.id=c.oportunidad_id JOIN partners p ON p.id=o.partner_id WHERE ${where} ORDER BY c.id DESC`,params)
  const [pendientes] = await pool.query(`SELECT s.*,o.empresa,p.codigo AS partner_codigo FROM seguimientos_crm s JOIN oportunidades o ON o.id=s.oportunidad_id JOIN partners p ON p.id=o.partner_id WHERE ${where} AND s.estado='pendiente' ORDER BY s.fecha IS NULL,s.fecha,s.id`,params)
  return { oportunidades,partners,comisiones,pendientes }
}
export async function crearComision(u,b) {
  direccion(u)
  const o = await crm.obtener(u,id(b.oportunidadId))
  if (!['cierre','posventa'].includes(o.etapa)) fail('La oportunidad debe estar en cierre o posventa.')
  const monto = Number(b.monto)
  if (!Number.isFinite(monto) || monto <= 0 || monto > 9999999999.99 || Math.abs(monto*100-Math.round(monto*100))>0.0001) fail('Escribe un importe positivo con hasta dos decimales.')
  if (!['PEN','USD'].includes(o.moneda)) fail('La moneda de la oportunidad debe ser PEN o USD.')
  const sustento = texto(b.sustento,1000,true)
  try { return await enTransaccion(async db => {
    const [[actual]] = await db.query('SELECT etapa, moneda FROM oportunidades WHERE id=? FOR UPDATE',[o.id])
    if (!['cierre','posventa'].includes(actual.etapa) || actual.moneda !== o.moneda) fail('La oportunidad cambió. Recarga antes de registrar la comisión.',409)
    const [r] = await db.query('INSERT INTO comisiones_manual (oportunidad_id,monto,moneda,sustento,creado_por) VALUES (?,?,?,?,?)',[o.id,monto,o.moneda,sustento,u.id])
    await audit(db,u,'comision',r.insertId,'propuesta',sustento)
    return { id:r.insertId }
  }) } catch(e) { if (e.code === 'ER_DUP_ENTRY') fail('Esta oportunidad ya tiene una comisión registrada.',409); throw e }
}
export async function decidirComision(u,comisionId,b) {
  direccion(u)
  return enTransaccion(async db => {
    const [[c]] = await db.query('SELECT * FROM comisiones_manual WHERE id=? FOR UPDATE',[id(comisionId)])
    if (!c) fail('Comisión no encontrada.',404)
    const siguientes = { pendiente:['aprobada','rechazada'], aprobada:['pagada'], rechazada:[], pagada:[] }
    if (!siguientes[c.estado].includes(b.estado)) fail('Transición no permitida. Recarga el registro.',409)
    const referencia = texto(b.referencia,255,true)
    await db.query('UPDATE comisiones_manual SET estado=?,referencia=?,aprobado_por=IF(?="aprobada",?,aprobado_por) WHERE id=?',[b.estado,referencia,b.estado,u.id,c.id])
    await audit(db,u,'comision',c.id,b.estado,referencia)
    return { mensaje:'Decisión registrada.' }
  })
}
