import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

// Pruebas de integración de las etapas 2, 3 y 4. Las ejecuta tests/correr.mjs contra una base aparte.
const apiRoot = new URL('../', import.meta.url)
process.chdir(fileURLToPath(apiRoot))
const {env} = await import(new URL('src/config/env.js',apiRoot))
if(env.nodeEnv!=='development'||!['localhost','127.0.0.1'].includes(env.db.host))throw Error('Las pruebas requieren una base local de desarrollo.')
const {pool} = await import(new URL('src/config/db.js',apiRoot))
const {app} = await import(new URL('src/app.js',apiRoot))
const {firmarSesion} = await import(new URL('src/utils/token.js',apiRoot))
const server = app.listen(0,'127.0.0.1')
await new Promise(resolve=>server.once('listening',resolve))
const base = `http://127.0.0.1:${server.address().port}/api`
const tag=`QA-${randomUUID().slice(0,8)}`, users=[],partners=[],territories=[],courses=[]
let assertions=0
async function request(user,path,method='GET',body,status=200){
  const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${firmarSesion(user)}`}:{})},body:body===undefined?undefined:JSON.stringify(body)})
  const data=await r.json()
  assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);assertions++
  return data.dato??data
}
try {
  const [levels]=await pool.query("SELECT id,codigo FROM niveles WHERE tipo='rango' ORDER BY orden")
  assert(levels.length>=3,'Se requieren los niveles sembrados.');assertions++
  for(let i=0;i<2;i++){const [r]=await pool.query("INSERT INTO territorios(nombre,region) VALUES (?,?)",[`${tag}-${i}`,'Pruebas']);territories.push(r.insertId)}
  async function account(rol,territorio,level=levels[2]){
    const [r]=await pool.query('INSERT INTO usuarios(correo,contrasena_hash,rol) VALUES (?,?,?)',[`${tag}-${users.length}@example.invalid`,'no-login-fixture',rol]);users.push(r.insertId)
    const u={id:r.insertId,rol}
    if(rol!=='direccion') {const [p]=await pool.query('INSERT INTO partners(codigo,usuario_id,nombre,nivel_id,territorio_id) VALUES (?,?,?,?,?)',[`Q${r.insertId}`,r.insertId,tag,level.id,territorio]);partners.push(p.insertId);u.partner={id:p.insertId,territorio_id:territorio,nivel:level.codigo,nombre:tag}}
    return u
  }
  const admin=await account('direccion'), p1=await account('partner',territories[0]), p2=await account('partner',territories[1]), low=await account('partner',territories[0],levels[0]), leader=await account('lider_regional',territories[0])
  await request(null,'/etapas/gestion','GET',undefined,401)
  const course={titulo:tag,descripcion:'Curso de verificación',nivelId:levels[2].codigo,minimo:70,lecciones:[{titulo:'Lección QA',tipo:'lectura',contenido:'Contenido de prueba.',duracion_min:5}],preguntas:[{texto:'¿Cuál es correcta?',opciones:['A','B','C'],correcta:1}]}
  await request(p1,'/etapas/cursos','POST',course,403)
  const c=await request(admin,'/etapas/cursos','POST',course,201);courses.push(c.id)
  await request(p1,`/etapas/cursos/${c.id}`,'GET',undefined,403)
  await request(admin,`/etapas/cursos/${c.id}`,'PATCH',{publicado:true})
  await request(low,`/etapas/cursos/${c.id}`,'GET',undefined,403)
  const detail=await request(p1,`/etapas/cursos/${c.id}`)
  assert(!('correcta' in detail.evaluacion.preguntas[0]),'La API no expone las respuestas.');assertions++
  await request(p1,`/etapas/cursos/${c.id}/evaluar`,'POST',{respuestas:[1]},409)
  await request(low,`/academia/lecciones/${detail.lecciones[0].id}/completar`,'POST',{},403)
  await request(p1,`/etapas/lecciones/${detail.lecciones[0].id}/completar`,'POST',{},201)
  const failed=await request(p1,`/etapas/cursos/${c.id}/evaluar`,'POST',{respuestas:[0]},201)
  assert.equal(failed.aprobado,false);assertions++
  const passed=await request(p1,`/etapas/cursos/${c.id}/evaluar`,'POST',{respuestas:[1]},201)
  assert.equal(passed.nota,100);assertions++
  await request(p1,`/etapas/cursos/${c.id}/evaluar`,'POST',{respuestas:[1]},201)
  const certs=await request(p1,'/etapas/certificados')
  assert.equal(certs.filter(x=>x.curso_id===c.id).length,1);assertions++
  assert(!(await request(p2,'/etapas/certificados')).some(x=>x.curso_id===c.id));assertions++
  const company=await request(p1,'/etapas/empresas','POST',{nombre:tag,sector:'Pruebas'},201)
  await request(p1,`/etapas/empresas/${company.id}/contactos`,'POST',{nombre:'Contacto QA',correo:'qa@example.invalid'},201)
  await request(p2,`/etapas/empresas/${company.id}/contactos`,'POST',{nombre:'Sin permiso'},404)
  assert(!(await request(p2,'/etapas/empresas')).some(x=>x.id===company.id));assertions++
  const opportunity=await request(p1,'/crm','POST',{empresa:tag,partnerId:p2.partner.id,monto:1000,moneda:'PEN'},201)
  assert.equal(opportunity.partner_id,p1.partner.id,'No se puede inyectar otro propietario.');assertions++
  await request(p2,`/crm/${opportunity.id}`,'PATCH',{etapa:'cierre'},403)
  await request(p1,`/crm/${opportunity.id}`,'PATCH',{monto:-1},400)
  const task=await request(p1,`/etapas/oportunidades/${opportunity.id}/seguimientos`,'POST',{tipo:'posventa',detalle:'Verificar entrega',fecha:'2026-12-01'},201)
  await request(p2,`/etapas/seguimientos/${task.id}/completar`,'PATCH',{},403)
  const regional=await request(leader,'/etapas/gestion')
  assert(regional.oportunidades.some(x=>x.id===opportunity.id));assertions++
  assert(regional.partners.every(x=>x.territorio===`${tag}-0`));assertions++
  await request(p1,'/etapas/gestion','GET',undefined,403)
  await request(admin,'/etapas/comisiones','POST',{oportunidadId:opportunity.id,monto:100,sustento:'Prueba'},400)
  await request(p1,`/crm/${opportunity.id}`,'PATCH',{etapa:'cierre'})
  await request(leader,'/etapas/comisiones','POST',{oportunidadId:opportunity.id,monto:100,sustento:'Prueba'},403)
  const commission=await request(admin,'/etapas/comisiones','POST',{oportunidadId:opportunity.id,monto:100,sustento:'Aprobación manual QA'},201)
  await request(admin,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'pagada',referencia:'No autorizado'},409)
  await request(admin,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'aprobada',referencia:''},400)
  await request(leader,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'aprobada',referencia:'QA'},403)
  await request(admin,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'aprobada',referencia:'Acta QA'})
  await request(admin,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'pagada',referencia:'Comprobante QA'})
  await request(admin,`/etapas/comisiones/${commission.id}`,'PATCH',{estado:'aprobada',referencia:'Reintento'},409)
  await request(p1,`/crm/${opportunity.id}`,'PATCH',{moneda:'USD'},409)
  await request(leader,`/etapas/seguimientos/${task.id}/completar`,'PATCH',{})
  console.log(`OK: ${assertions} comprobaciones de integración, permisos y reglas de negocio.`)
} finally {
  try {
    if(users.length){
      await pool.query('DELETE FROM auditoria_etapas WHERE usuario_id IN (?)',[users])
      await pool.query('DELETE FROM historial_cambios WHERE usuario_id IN (?)',[users])
      await pool.query('DELETE FROM comisiones_manual WHERE creado_por IN (?)',[users])
      await pool.query('DELETE FROM seguimientos_crm WHERE usuario_id IN (?)',[users])
    }
    if(partners.length){
      await pool.query('DELETE FROM certificados WHERE partner_id IN (?)',[partners])
      await pool.query('DELETE FROM intentos_evaluacion WHERE partner_id IN (?)',[partners])
      await pool.query('DELETE FROM progreso_academia WHERE partner_id IN (?)',[partners])
      await pool.query('DELETE c FROM contactos_crm c JOIN empresas_crm e ON e.id=c.empresa_id WHERE e.partner_id IN (?)',[partners])
      await pool.query('DELETE FROM empresas_crm WHERE partner_id IN (?)',[partners])
      await pool.query('DELETE FROM oportunidades WHERE partner_id IN (?)',[partners])
      await pool.query('DELETE FROM partners WHERE id IN (?)',[partners])
    }
    if(courses.length){await pool.query('DELETE FROM evaluaciones_curso WHERE curso_id IN (?)',[courses]);await pool.query('DELETE FROM lecciones WHERE curso_id IN (?)',[courses]);await pool.query('DELETE FROM cursos WHERE id IN (?)',[courses])}
    if(users.length)await pool.query('DELETE FROM usuarios WHERE id IN (?)',[users])
    if(territories.length)await pool.query('DELETE FROM territorios WHERE id IN (?)',[territories])
  } finally {await new Promise(resolve=>server.close(resolve));await pool.end()}
}
