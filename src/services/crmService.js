import { AppError } from '../utils/AppError.js'
import { enTransaccion } from '../config/db.js'
import * as model from '../models/oportunidadModel.js'

const ETAPAS = ['contacto','diagnostico','propuesta','negociacion','cierre','posventa']
function alcance(u) {
  if (u.rol === 'direccion') return {}
  if (!u.partner?.id || (u.rol === 'lider_regional' && !u.partner.territorio_id)) throw new AppError(403,'No tienes una cartera asignada.')
  if (u.rol === 'partner') return { partnerId:u.partner.id }
  if (u.rol === 'lider_regional') return { territorioId:u.partner.territorio_id }
  throw new AppError(403,'Sin permiso para acceder al CRM.')
}
function validar(b, nuevo = false) {
  const result = {}
  for (const [k,max] of Object.entries({empresa:160,contacto:120,sector:80,ciudad:80,necesidad:160,proximoPaso:160})) {
    if (b[k] === undefined && !nuevo) continue
    if (b[k] != null && typeof b[k] !== 'string') throw new AppError(400,`Revisa el campo ${k}.`)
    const v = (b[k] || '').trim()
    if (v.length > max || (k === 'empresa' && v.length < 2)) throw new AppError(400,`Revisa el campo ${k} (máximo ${max} caracteres).`)
    result[k] = v || null
  }
  if (b.monto !== undefined || nuevo) {
    const n = b.monto === '' || b.monto == null ? null : Number(b.monto)
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 9999999999.99 || Math.abs(n*100-Math.round(n*100)) > 0.0001)) throw new AppError(400,'Importe inválido: usa hasta dos decimales.')
    result.monto = n
  }
  if (b.moneda !== undefined || nuevo) {
    if (!['USD','PEN'].includes(b.moneda || 'USD')) throw new AppError(400,'Moneda inválida.')
    result.moneda = b.moneda || 'USD'
  }
  if (b.etapa !== undefined) {
    if (!ETAPAS.includes(b.etapa)) throw new AppError(400,'Etapa inválida.')
    result.etapa = b.etapa
  }
  return result
}
export async function listar(u) { return model.listar(alcance(u)) }
export async function obtener(u,id) {
  const scope = alcance(u), o = await model.buscarPorId(id)
  if (!o) throw new AppError(404,'La oportunidad no existe.')
  if ((scope.partnerId && scope.partnerId !== o.partner_id) || (scope.territorioId && scope.territorioId !== o.territorio_id)) throw new AppError(403,'Esta oportunidad no pertenece a tu alcance.')
  return o
}
export async function crear(u,b) {
  if (u.rol !== 'partner' || !u.partner?.id) throw new AppError(403,'Solo un Partner puede registrar oportunidades.')
  return model.crear({ ...validar(b,true), partnerId:u.partner.id })
}
export async function actualizar(u,id,b) {
  await obtener(u,id)
  const cambios = validar(b)
  const columnas = {empresa:'empresa',contacto:'contacto',sector:'sector',ciudad:'ciudad',necesidad:'necesidad',proximoPaso:'proximo_paso',monto:'monto',moneda:'moneda',etapa:'etapa'}
  const keys = Object.keys(cambios)
  if (!keys.length) return obtener(u,id)
  await enTransaccion(async db => {
    await db.query('SELECT id FROM oportunidades WHERE id=? FOR UPDATE',[id])
    const [[c]] = await db.query('SELECT id FROM comisiones_manual WHERE oportunidad_id=? LIMIT 1',[id])
    if (c && ('moneda' in cambios || 'monto' in cambios)) {
      const [[o]] = await db.query('SELECT moneda,monto FROM oportunidades WHERE id=?',[id])
      if (('moneda' in cambios && cambios.moneda !== o.moneda) || ('monto' in cambios && Number(cambios.monto) !== Number(o.monto))) throw new AppError(409,'La oportunidad tiene una comisión. Conserva el importe y la moneda registrados.')
    }
    await db.query(`UPDATE oportunidades SET ${keys.map(k=>`${columnas[k]}=?`).join(',')} WHERE id=?`,[...keys.map(k=>cambios[k]),id])
    await db.query("INSERT INTO historial_cambios (entidad,entidad_id,accion,valor_nuevo,usuario_id) VALUES ('oportunidad',?,'actualizada',?,?)",[id,keys.join(', '),u.id])
  })
  return obtener(u,id)
}
