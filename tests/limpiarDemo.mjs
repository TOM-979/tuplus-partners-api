import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// Prueba de database/scripts/limpiarDemo.js sobre la base de pruebas, reproduciendo los datos del antiguo sembrarDemo.js.
const { env } = await import('../src/config/env.js')
if (env.nodeEnv !== 'development' || !env.db.name.endsWith('_test')) throw Error('Solo en la base de pruebas.')
const { pool } = await import('../src/config/db.js')
const q = async (s, p) => (await pool.query(s, p))[0]
const n = async (s, p) => (await q(s, p))[0].n
const tag = `QA-${randomUUID().slice(0, 8)}`
let comprobaciones = 0
const ok = (c, m) => { assert(c, m); comprobaciones++ }
const correr = (...extra) => spawnSync(process.execPath, ['database/scripts/limpiarDemo.js', '--forzar-local', ...extra], { encoding: 'utf8', env: process.env })
const lista = (a) => (a.length ? a : [0])

const creados = { usuarios: [], territorios: [] }
async function sembrar() {
  const [[l2]] = await pool.query("SELECT id FROM niveles WHERE codigo='L2'")
  const lima = creados.territorios[0]
  const [u] = await pool.query("INSERT INTO usuarios(correo,contrasena_hash,rol) VALUES ('partner@tuplus.pe','x','partner')")
  const [p] = await pool.query("INSERT INTO partners(codigo,usuario_id,nombre,nivel_id,territorio_id) VALUES ('P-001',?,'Carlos Vega',?,?)", [u.insertId, l2.id, lima])
  const opps = []
  for (const e of ['Botica Nova Salud', 'Ferretería El Tornillo', 'Estudio Legal Ríos & Asociados']) {
    const [o] = await pool.query('INSERT INTO oportunidades(partner_id,empresa) VALUES (?,?)', [p.insertId, e])
    opps.push(o.insertId)
  }
  for (const c of ['lucia.fernandez@example.com', 'jorge.salazar@example.com', 'mariana.castro@example.com']) {
    await pool.query("INSERT INTO postulaciones(nombre,correo,telefono,territorio_id,experiencia,disponibilidad,consentimiento_version,consentimiento_fecha) VALUES ('Demo',?,'900000000',?,'1_3','5_10','v1',UTC_TIMESTAMP())", [c, lima])
  }
  const [c1] = await pool.query("INSERT INTO cursos(titulo,nivel_id) VALUES ('Bienvenida a la Red TUPLUS',?)", [l2.id])
  const [c2] = await pool.query("INSERT INTO cursos(titulo,nivel_id) VALUES ('Diagnóstico B2B con la metodología TUPLUS',?)", [l2.id])
  const [le] = await pool.query("INSERT INTO lecciones(curso_id,titulo) VALUES (?,'L')", [c1.insertId])
  await pool.query("INSERT INTO lecciones(curso_id,titulo) VALUES (?,'L')", [c2.insertId])
  await pool.query('INSERT INTO progreso_academia(partner_id,leccion_id) VALUES (?,?)', [p.insertId, le.insertId])
  await pool.query("INSERT INTO empresas_crm(partner_id,nombre) VALUES (?,'Empresa demo')", [p.insertId])
  await pool.query("INSERT INTO seguimientos_crm(oportunidad_id,usuario_id,tipo,detalle) VALUES (?,?,'nota','demo')", [opps[0], u.insertId])
  await pool.query("INSERT INTO historial_cambios(entidad,entidad_id,accion,usuario_id) VALUES ('oportunidad',?,'actualizada',?)", [opps[0], u.insertId])
  creados.usuarios.push(u.insertId)
  return { u: u.insertId, p: p.insertId, opps }
}
const contar = async () => ({
  demoUsuario: await n("SELECT COUNT(*) n FROM usuarios WHERE correo='partner@tuplus.pe'"),
  demoPost: await n("SELECT COUNT(*) n FROM postulaciones WHERE correo LIKE '%@example.com'"),
  demoCursos: await n("SELECT COUNT(*) n FROM cursos WHERE titulo IN ('Bienvenida a la Red TUPLUS','Diagnóstico B2B con la metodología TUPLUS')"),
})

try {
  // Datos "reales" que NO deben tocarse
  const [t] = await pool.query('INSERT INTO territorios(nombre,region,estado) VALUES (?,?,?)', [`${tag}-t`, 'Pruebas', 'abierta'])
  creados.territorios.push(t.insertId)
  const [d] = await pool.query("INSERT INTO usuarios(correo,contrasena_hash,rol) VALUES (?,?,'direccion')", [`${tag}-dir@example.invalid`, 'x'])
  creados.usuarios.push(d.insertId)
  await pool.query("INSERT INTO postulaciones(nombre,correo,telefono,territorio_id,experiencia,disponibilidad,consentimiento_version,consentimiento_fecha) VALUES ('Real',?,'900000001',?,'1_3','5_10','v1',UTC_TIMESTAMP())", [`${tag}-real@example.invalid`, t.insertId])
  const [[niv]] = await pool.query("SELECT id FROM niveles WHERE codigo='L1'")
  const [cr] = await pool.query('INSERT INTO cursos(titulo,nivel_id) VALUES (?,?)', [`${tag} curso real`, niv.id])
  const baseNiveles = await n('SELECT COUNT(*) n FROM niveles')

  // 1) Fuera de producción y sin --forzar-local se niega
  const neg = spawnSync(process.execPath, ['database/scripts/limpiarDemo.js'], { encoding: 'utf8', env: process.env })
  ok(neg.status !== 0 && /production/.test(neg.stderr), 'Debe negarse fuera de producción')

  const s = await sembrar()
  // 2) Simulación: no cambia nada
  const antes = await contar()
  const sim = correr()
  ok(sim.status === 0 && /SIMULACIÓN/.test(sim.stdout) && /borraría/.test(sim.stdout), sim.stdout + sim.stderr)
  assert.deepEqual(await contar(), antes)
  comprobaciones++

  // 3) Borrado confirmado
  const rea = correr('--confirmar')
  ok(rea.status === 0 && /Limpieza confirmada/.test(rea.stdout), rea.stdout + rea.stderr)
  assert.deepEqual(await contar(), { demoUsuario: 0, demoPost: 0, demoCursos: 0 })
  comprobaciones++
  ok((await n('SELECT COUNT(*) n FROM partners WHERE id=?', [s.p])) === 0, 'P-001 borrado')
  ok((await n('SELECT COUNT(*) n FROM usuarios WHERE id=?', [d.insertId])) === 1, 'Dirección intacta')
  ok((await n('SELECT COUNT(*) n FROM postulaciones WHERE correo=?', [`${tag}-real@example.invalid`])) === 1, 'Postulación ajena intacta')
  ok((await n('SELECT COUNT(*) n FROM cursos WHERE id=?', [cr.insertId])) === 1, 'Curso real intacto')
  ok((await n('SELECT COUNT(*) n FROM territorios WHERE id=? AND estado=?', [t.insertId, 'abierta'])) === 1, 'Territorio intacto')
  ok((await n('SELECT COUNT(*) n FROM niveles')) === baseNiveles, 'Niveles intactos')
  ok((await n("SELECT COUNT(*) n FROM auditoria_etapas WHERE entidad='limpieza_demo'")) >= 1, 'Auditoría registrada')

  // 4) Idempotente
  const otra = correr('--confirmar')
  ok(otra.status === 0 && /No hay datos de demostración/.test(otra.stdout), otra.stdout)

  // 5) Si P-001 tiene una oportunidad real, se conserva y se avisa; lo demás de la lista sí se borra
  const s2 = await sembrar()
  const [real] = await pool.query("INSERT INTO oportunidades(partner_id,empresa) VALUES (?,'Empresa Real SAC')", [s2.p])
  const blo = correr('--confirmar')
  ok(blo.status === 0 && /BLOQUEO/.test(blo.stdout), blo.stdout + blo.stderr)
  ok((await n('SELECT COUNT(*) n FROM partners WHERE id=?', [s2.p])) === 1, 'P-001 se conserva')
  ok((await n('SELECT COUNT(*) n FROM oportunidades WHERE id=?', [real.insertId])) === 1, 'Oportunidad real intacta')
  ok((await n('SELECT COUNT(*) n FROM oportunidades WHERE id IN (?)', [s2.opps])) === 0, 'Oportunidades demo borradas')
  console.log(`OK: ${comprobaciones} comprobaciones de limpiarDemo.`)
} finally {
  const us = lista(creados.usuarios)
  await q("DELETE FROM auditoria_etapas WHERE entidad='limpieza_demo' OR usuario_id IN (?)", [us])
  await q('DELETE FROM historial_cambios WHERE usuario_id IN (?)', [us])
  await q('DELETE FROM seguimientos_crm WHERE usuario_id IN (?)', [us])
  await q("DELETE FROM progreso_academia WHERE partner_id IN (SELECT id FROM partners WHERE codigo='P-001')")
  await q("DELETE FROM empresas_crm WHERE partner_id IN (SELECT id FROM partners WHERE codigo='P-001')")
  await q("DELETE FROM oportunidades WHERE partner_id IN (SELECT id FROM partners WHERE codigo='P-001')")
  await q("DELETE FROM partners WHERE codigo='P-001'")
  await q("DELETE FROM usuarios WHERE correo='partner@tuplus.pe' OR id IN (?)", [us])
  await q("DELETE FROM postulaciones WHERE correo LIKE '%@example.com' OR correo LIKE ?", [`${tag}%`])
  await q("DELETE FROM cursos WHERE titulo LIKE ? OR titulo IN ('Bienvenida a la Red TUPLUS','Diagnóstico B2B con la metodología TUPLUS')", [`${tag}%`])
  await q('DELETE FROM territorios WHERE nombre LIKE ?', [`${tag}%`])
  await pool.end()
}
