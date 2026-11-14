import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

// CORS, salud, verificación pública de certificados y límite de intentos del login.
const { env } = await import('../src/config/env.js')
if (env.nodeEnv !== 'development') throw Error('Solo en desarrollo.')
const { pool } = await import('../src/config/db.js')
const { app } = await import('../src/app.js')
const server = app.listen(0, '127.0.0.1')
await new Promise((r) => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}/api`
let n = 0
const ok = (cond, msg) => { assert(cond, msg); n++ }
try {
  const pre = await fetch(`${base}/auth/login`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } })
  assert.equal(pre.headers.get('access-control-allow-origin'), 'http://localhost:5173'); n++
  const mal = await fetch(`${base}/auth/login`, { method: 'OPTIONS', headers: { Origin: 'http://sitio-malo.example', 'Access-Control-Request-Method': 'POST' } })
  ok(!mal.headers.get('access-control-allow-origin'), 'No debe autorizar orígenes ajenos')

  const salud = await fetch(`${base}/salud`)
  assert.equal(salud.status, 200); assert.deepEqual(await salud.json(), { ok: true }); n++

  const inv = await fetch(`${base}/certificados/verificar/TP-no-existe`)
  assert.equal(inv.status, 200); assert.deepEqual(await inv.json(), { valido: false }); n++

  // Certificado real de prueba: solo debe exponer nombre, título y fecha
  const codigo = `TP-QA-${randomUUID()}`
  const [[niv]] = await pool.query("SELECT id FROM niveles WHERE codigo='L1'")
  const [[ter]] = await pool.query('SELECT id FROM territorios LIMIT 1')
  const [u] = await pool.query("INSERT INTO usuarios(correo,contrasena_hash,rol) VALUES (?,?,'partner')", [`${codigo}@example.invalid`, 'x'])
  const [p] = await pool.query('INSERT INTO partners(codigo,usuario_id,nombre,nivel_id,territorio_id) VALUES (?,?,?,?,?)', [`Q${u.insertId}`, u.insertId, 'Persona QA', niv.id, ter.id])
  const [c] = await pool.query('INSERT INTO cursos(titulo,nivel_id) VALUES (?,?)', ['Curso QA', niv.id])
  try {
    await pool.query('INSERT INTO certificados(codigo,partner_id,curso_id,nombre,titulo,nota) VALUES (?,?,?,?,?,90)', [codigo, p.insertId, c.insertId, 'Persona QA', 'Curso QA'])
    const v = await (await fetch(`${base}/certificados/verificar/${codigo}`)).json()
    assert.deepEqual(Object.keys(v).sort(), ['emitido_en', 'nombre', 'titulo', 'valido']); assert.equal(v.valido, true); n++
  } finally {
    await pool.query('DELETE FROM certificados WHERE partner_id=?', [p.insertId])
    await pool.query('DELETE FROM cursos WHERE id=?', [c.insertId])
    await pool.query('DELETE FROM partners WHERE id=?', [p.insertId])
    await pool.query('DELETE FROM usuarios WHERE id=?', [u.insertId])
  }

  // Límite de intentos: el 11.º intento fallido con el mismo correo recibe 429 en español
  let ultimo
  for (let i = 0; i < 11; i++) {
    ultimo = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo: 'nadie@example.invalid', contrasena: 'x' }) })
  }
  assert.equal(ultimo.status, 429); ok(/intentos/i.test((await ultimo.json()).error), 'mensaje en español')
  console.log(`OK: ${n} comprobaciones de CORS, salud, verificación pública y límite de intentos.`)
} finally {
  await new Promise((r) => server.close(r))
  await pool.end()
}
