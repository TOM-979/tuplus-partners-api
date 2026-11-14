import { conectar } from './conexion.js'
import { env } from '../../src/config/env.js'

// Elimina los datos de demostración que sembró el antiguo sembrarDemo.js.
//   npm run db:limpiar-demo                  -> SIMULACIÓN: lista lo que borraría y no cambia nada
//   npm run db:limpiar-demo -- --confirmar   -> borra, todo en una transacción
//   --forzar-local                           -> necesario si NODE_ENV no es production
// Solo toca filas identificadas exactamente como demo. Nunca toca direccion@tuplus.pe, niveles ni territorios.
const args = process.argv.slice(2)
const confirmar = args.includes('--confirmar')
const forzarLocal = args.includes('--forzar-local')

const DEMO = {
  usuario: 'partner@tuplus.pe',
  partnerCodigo: 'P-001',
  partnerNombre: 'Carlos Vega',
  empresas: ['Botica Nova Salud', 'Ferretería El Tornillo', 'Estudio Legal Ríos & Asociados'],
  correos: ['lucia.fernandez@example.com', 'jorge.salazar@example.com', 'mariana.castro@example.com'],
  cursos: ['Bienvenida a la Red TUPLUS', 'Diagnóstico B2B con la metodología TUPLUS'],
}
const lista = (a) => (a.length ? a : [0]) // evita "IN ()" cuando no hay elementos
const ids = (filas) => filas.map((f) => f.id)

async function planear(db) {
  const plan = { avisos: [], bloqueos: [], borrar: {}, detalle: {} }

  // --- Cuenta demo (usuario + partner P-001)
  let usuario = null
  let partner = null
  const [[u]] = await db.query('SELECT id, rol FROM usuarios WHERE correo = ?', [DEMO.usuario])
  if (u && u.rol !== 'partner') plan.avisos.push(`${DEMO.usuario} existe pero no tiene rol partner: no se toca.`)
  else if (u) {
    const [[p]] = await db.query('SELECT id, codigo, nombre, postulacion_id FROM partners WHERE usuario_id = ?', [u.id])
    if (p && (p.codigo !== DEMO.partnerCodigo || p.nombre !== DEMO.partnerNombre)) {
      plan.avisos.push(`${DEMO.usuario} tiene un partner que no es ${DEMO.partnerCodigo} "${DEMO.partnerNombre}" (${p.codigo} "${p.nombre}"): no se toca.`)
    } else {
      usuario = u
      partner = p || null
      if (p?.postulacion_id) plan.bloqueos.push(`El partner ${p.codigo} viene de una postulación real (id ${p.postulacion_id}).`)
    }
  }

  // --- Oportunidades demo (por nombre de empresa Y del partner demo)
  let oportunidades = []
  if (partner) {
    ;[oportunidades] = await db.query('SELECT id, codigo, empresa FROM oportunidades WHERE partner_id = ? AND empresa IN (?)', [partner.id, DEMO.empresas])
    const [otras] = await db.query('SELECT id, codigo, empresa FROM oportunidades WHERE partner_id = ? AND empresa NOT IN (?)', [partner.id, DEMO.empresas])
    for (const o of otras) plan.bloqueos.push(`${partner.codigo} tiene la oportunidad ${o.codigo} "${o.empresa}", que no es de demostración.`)
  }
  const [ajenas] = await db.query('SELECT o.codigo, o.empresa, p.codigo AS partner FROM oportunidades o JOIN partners p ON p.id = o.partner_id WHERE o.empresa IN (?) AND o.partner_id <> ?', [DEMO.empresas, partner?.id ?? 0])
  for (const o of ajenas) plan.avisos.push(`Oportunidad ${o.codigo} "${o.empresa}" es del partner ${o.partner}, no de la demo: se omite.`)
  const oppIds = ids(oportunidades)

  const [seguimientos] = await db.query('SELECT id FROM seguimientos_crm WHERE oportunidad_id IN (?)', [lista(oppIds)])
  const [comisiones] = await db.query('SELECT id FROM comisiones_manual WHERE oportunidad_id IN (?)', [lista(oppIds)])
  if (usuario) {
    const [segFuera] = await db.query('SELECT id FROM seguimientos_crm WHERE usuario_id = ? AND oportunidad_id NOT IN (?)', [usuario.id, lista(oppIds)])
    if (segFuera.length) plan.bloqueos.push(`${segFuera.length} seguimiento(s) de la cuenta demo en oportunidades que no son de demostración.`)
    const [comFuera] = await db.query('SELECT id FROM comisiones_manual WHERE (creado_por = ? OR aprobado_por = ?) AND oportunidad_id NOT IN (?)', [usuario.id, usuario.id, lista(oppIds)])
    if (comFuera.length) plan.bloqueos.push(`${comFuera.length} comisión(es) de la cuenta demo en oportunidades que no son de demostración.`)
  }

  // --- Postulaciones demo (se omiten si ya generaron un partner)
  const [posts] = await db.query('SELECT id, codigo, correo FROM postulaciones WHERE correo IN (?)', [DEMO.correos])
  const postulaciones = []
  for (const p of posts) {
    const [[ref]] = await db.query('SELECT codigo FROM partners WHERE postulacion_id = ?', [p.id])
    if (ref) plan.avisos.push(`Postulación ${p.codigo} (${p.correo}) ya originó al partner ${ref.codigo}: se omite.`)
    else postulaciones.push(p)
  }

  // --- Cursos demo (se omiten si otros partners ya tienen intentos o certificados)
  const [cursosEnc] = await db.query('SELECT id, titulo FROM cursos WHERE titulo IN (?)', [DEMO.cursos])
  const cursos = []
  for (const c of cursosEnc) {
    const [[aj]] = await db.query(
      `SELECT (SELECT COUNT(*) FROM certificados WHERE curso_id = ? AND partner_id <> ?) +
              (SELECT COUNT(*) FROM intentos_evaluacion WHERE curso_id = ? AND partner_id <> ?) AS total`,
      [c.id, partner?.id ?? 0, c.id, partner?.id ?? 0])
    if (aj.total) plan.avisos.push(`Curso "${c.titulo}" tiene intentos o certificados de otros partners: se omite.`)
    else cursos.push(c)
  }
  const cursoIds = ids(cursos)

  // --- Rastros de la cuenta demo en historial y auditoría: solo se pueden borrar si son de entidades demo
  if (usuario) {
    const potencial = new Set([
      ...oppIds.map((i) => `oportunidad:${i}`), ...ids(postulaciones).map((i) => `postulacion:${i}`),
      `usuario:${usuario.id}`, ...(partner ? [`partner:${partner.id}`] : []),
    ])
    const [hist] = await db.query('SELECT entidad, entidad_id FROM historial_cambios WHERE usuario_id = ?', [usuario.id])
    const fueraH = hist.filter((h) => !potencial.has(`${h.entidad}:${h.entidad_id}`))
    if (fueraH.length) plan.bloqueos.push(`${fueraH.length} registro(s) de historial hechos por la cuenta demo sobre datos que no son de demostración.`)
    const potA = new Set([...cursoIds.map((i) => `curso:${i}`), ...ids(seguimientos).map((i) => `seguimiento:${i}`), ...ids(comisiones).map((i) => `comision:${i}`)])
    const [aud] = await db.query('SELECT entidad, entidad_id FROM auditoria_etapas WHERE usuario_id = ?', [usuario.id])
    const fueraA = aud.filter((a) => !potA.has(`${a.entidad}:${a.entidad_id}`))
    if (fueraA.length) plan.bloqueos.push(`${fueraA.length} registro(s) de auditoría de la cuenta demo sobre datos que no son de demostración.`)
  }

  const borrarCuenta = !!usuario && plan.bloqueos.length === 0
  const pid = partner?.id ?? 0
  const count = async (sql, params) => (await db.query(sql, params))[0][0].n

  const entHist = [
    ...oppIds.map((i) => ['oportunidad', i]), ...ids(postulaciones).map((i) => ['postulacion', i]),
    ...(borrarCuenta ? [['usuario', usuario.id], ...(partner ? [['partner', partner.id]] : [])] : []),
  ]
  const entAud = [
    ...cursoIds.map((i) => ['curso', i]), ...ids(seguimientos).map((i) => ['seguimiento', i]), ...ids(comisiones).map((i) => ['comision', i]),
  ]
  plan.ctx = { usuario, partner, borrarCuenta, oppIds, segIds: ids(seguimientos), comIds: ids(comisiones), postIds: ids(postulaciones), cursoIds, entHist, entAud, pid }
  plan.borrar = {
    'oportunidades': oportunidades.length,
    'seguimientos_crm': seguimientos.length,
    'comisiones_manual': comisiones.length,
    'postulaciones': postulaciones.length,
    'cursos': cursos.length,
    'lecciones': await count('SELECT COUNT(*) AS n FROM lecciones WHERE curso_id IN (?)', [lista(cursoIds)]),
    'evaluaciones_curso': await count('SELECT COUNT(*) AS n FROM evaluaciones_curso WHERE curso_id IN (?)', [lista(cursoIds)]),
    'progreso_academia (de esas lecciones)': await count('SELECT COUNT(*) AS n FROM progreso_academia pr JOIN lecciones l ON l.id = pr.leccion_id WHERE l.curso_id IN (?)', [lista(cursoIds)]),
    'intentos_evaluacion (de esos cursos)': await count('SELECT COUNT(*) AS n FROM intentos_evaluacion WHERE curso_id IN (?)', [lista(cursoIds)]),
    'certificados (de esos cursos)': await count('SELECT COUNT(*) AS n FROM certificados WHERE curso_id IN (?)', [lista(cursoIds)]),
  }
  if (borrarCuenta) {
    Object.assign(plan.borrar, {
      'partner P-001': partner ? 1 : 0,
      'empresas_crm de P-001': await count('SELECT COUNT(*) AS n FROM empresas_crm WHERE partner_id = ?', [pid]),
      'contactos_crm de P-001': await count('SELECT COUNT(*) AS n FROM contactos_crm c JOIN empresas_crm e ON e.id = c.empresa_id WHERE e.partner_id = ?', [pid]),
      'progreso_academia de P-001 (total)': await count('SELECT COUNT(*) AS n FROM progreso_academia WHERE partner_id = ?', [pid]),
      'intentos_evaluacion de P-001 (total)': await count('SELECT COUNT(*) AS n FROM intentos_evaluacion WHERE partner_id = ?', [pid]),
      'certificados de P-001 (total)': await count('SELECT COUNT(*) AS n FROM certificados WHERE partner_id = ?', [pid]),
      'codigos_verificacion de la cuenta': await count('SELECT COUNT(*) AS n FROM codigos_verificacion WHERE usuario_id = ?', [usuario.id]),
      'usuario partner@tuplus.pe': 1,
    })
  } else if (usuario) {
    plan.avisos.push('Se CONSERVAN la cuenta partner@tuplus.pe y el partner P-001 (ver bloqueos).')
  }
  return plan
}

async function ejecutar(db, plan) {
  const { usuario, partner, borrarCuenta, oppIds, segIds, comIds, postIds, cursoIds, entHist, entAud, pid } = plan.ctx
  // Historial y auditoría de las entidades que se borran
  for (const [entidad, id] of entHist) await db.query('DELETE FROM historial_cambios WHERE entidad = ? AND entidad_id = ?', [entidad, id])
  for (const [entidad, id] of entAud) await db.query('DELETE FROM auditoria_etapas WHERE entidad = ? AND entidad_id = ?', [entidad, id])
  await db.query('DELETE FROM seguimientos_crm WHERE id IN (?)', [lista(segIds)])
  await db.query('DELETE FROM comisiones_manual WHERE id IN (?)', [lista(comIds)])
  await db.query('DELETE FROM oportunidades WHERE id IN (?)', [lista(oppIds)])
  // Cursos: primero lo que depende de ellos (lecciones y progreso caen en cascada)
  await db.query('DELETE FROM certificados WHERE curso_id IN (?)', [lista(cursoIds)])
  await db.query('DELETE FROM intentos_evaluacion WHERE curso_id IN (?)', [lista(cursoIds)])
  await db.query('DELETE FROM evaluaciones_curso WHERE curso_id IN (?)', [lista(cursoIds)])
  await db.query('DELETE FROM cursos WHERE id IN (?)', [lista(cursoIds)])
  await db.query('DELETE FROM postulaciones WHERE id IN (?)', [lista(postIds)])
  if (borrarCuenta) {
    if (partner) {
      await db.query('DELETE FROM progreso_academia WHERE partner_id = ?', [pid])
      await db.query('DELETE FROM intentos_evaluacion WHERE partner_id = ?', [pid])
      await db.query('DELETE FROM certificados WHERE partner_id = ?', [pid])
      await db.query('DELETE c FROM contactos_crm c JOIN empresas_crm e ON e.id = c.empresa_id WHERE e.partner_id = ?', [pid])
      await db.query('DELETE FROM empresas_crm WHERE partner_id = ?', [pid])
      await db.query('DELETE FROM partners WHERE id = ?', [pid])
    }
    await db.query('DELETE FROM codigos_verificacion WHERE usuario_id = ?', [usuario.id])
    await db.query('DELETE FROM usuarios WHERE id = ?', [usuario.id])
  }
}

async function main() {
  if (!env.esProduccion && !forzarLocal) {
    throw new Error('NODE_ENV no es production. Este script está pensado para producción; en local agrega --forzar-local.')
  }
  const db = await conectar()
  try {
    console.log(`Base: ${env.db.name} en ${env.db.host}  ·  modo: ${confirmar ? 'BORRADO (--confirmar)' : 'SIMULACIÓN (no cambia nada)'}`)
    await db.beginTransaction()
    const plan = await planear(db)
    const total = Object.values(plan.borrar).reduce((a, b) => a + b, 0)

    for (const [tabla, n] of Object.entries(plan.borrar)) if (n) console.log(`  ${confirmar ? 'borrar' : 'borraría'}  ${String(n).padStart(4)}  ${tabla}`)
    for (const a of plan.avisos) console.log(`  AVISO: ${a}`)
    for (const b of plan.bloqueos) console.log(`  BLOQUEO: ${b}`)
    if (plan.bloqueos.length) console.log('  → P-001 y partner@tuplus.pe NO se borran porque tienen datos que no son de demostración. Revísalos a mano.')
    if (!total) {
      await db.rollback()
      console.log('No hay datos de demostración que limpiar.')
      return
    }
    if (!confirmar) {
      await db.rollback()
      console.log('\nSimulación terminada: no se cambió nada. Para borrar, repite con --confirmar.')
      return
    }

    const [[admin]] = await db.query("SELECT id FROM usuarios WHERE rol = 'direccion' ORDER BY (correo = 'direccion@tuplus.pe') DESC, id LIMIT 1")
    if (!admin) throw new Error('No hay ninguna cuenta de Dirección para registrar la auditoría. No se borró nada.')
    await ejecutar(db, plan)
    const resumen = Object.entries(plan.borrar).filter(([, n]) => n).map(([t, n]) => `${t}: ${n}`).join('; ')
    await db.query('INSERT INTO auditoria_etapas (usuario_id, entidad, entidad_id, accion, detalle) VALUES (?, ?, 0, ?, ?)',
      [admin.id, 'limpieza_demo', 'limpieza_demo', resumen.slice(0, 990)])
    await db.commit()
    console.log('\nLimpieza confirmada y registrada en auditoria_etapas.')
  } catch (e) {
    await db.rollback().catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch((e) => {
  console.error(`No se limpió nada: ${e.message}`)
  process.exit(1)
})
