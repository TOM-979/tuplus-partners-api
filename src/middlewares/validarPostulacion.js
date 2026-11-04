import { AppError } from '../utils/AppError.js'

const EXPERIENCIA = ['sin_experiencia', 'menos_1', '1_3', 'mas_3']
const DISPONIBILIDAD = ['hasta_5', '5_10', '10_20', 'mas_20']
const texto = (v) => (typeof v === 'string' ? v.trim() : '')

// Valida en el servidor y se queda solo con los campos permitidos.
// Cualquier otro campo (por ejemplo DNI o datos bancarios) se ignora.
export function validarPostulacion(req, _res, next) {
  const b = req.body || {}
  const errores = {}

  const nombre = texto(b.nombre)
  const correo = texto(b.correo).toLowerCase()
  const telefono = texto(b.telefono)
  const territorioId = Number(b.territorioId)
  const sectores = texto(b.sectores)
  const motivo = texto(b.motivo)
  const c = b.consentimiento || {}

  if (nombre.length < 3 || nombre.length > 120) errores.nombre = 'Escribe tu nombre completo.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || correo.length > 160) errores.correo = 'Escribe un correo con el formato usuario@dominio.com.'
  if (!/^\+?[0-9\s]{9,15}$/.test(telefono)) errores.telefono = 'Escribe solo números, con 9 a 15 dígitos.'
  if (!Number.isInteger(territorioId) || territorioId < 1) errores.territorioId = 'Elige el territorio donde trabajarías.'
  if (!EXPERIENCIA.includes(b.experiencia)) errores.experiencia = 'Elige tu experiencia en ventas.'
  if (!DISPONIBILIDAD.includes(b.disponibilidad)) errores.disponibilidad = 'Elige cuántas horas puedes dedicar.'
  if (sectores.length > 255) errores.sectores = 'Usa como máximo 255 caracteres.'
  if (motivo.length > 500) errores.motivo = 'Usa como máximo 500 caracteres.'
  if (c.privacidad !== true) errores.privacidad = 'Debes aceptar el aviso de privacidad.'
  if (c.terminos !== true) errores.terminos = 'Debes aceptar los términos de la Red.'
  if (!texto(c.version) || texto(c.version).length > 80) errores.consentimiento = 'Falta la versión de los textos aceptados.'

  if (Object.keys(errores).length) return next(new AppError(400, 'Revisa los campos marcados.', errores))

  req.postulacion = {
    nombre, correo, telefono, territorioId,
    experiencia: b.experiencia, disponibilidad: b.disponibilidad,
    sectores: sectores || null, motivo: motivo || null,
    consentimientoVersion: texto(c.version),
    origen: b.origen === 'portal' ? 'portal' : 'web',
  }
  next()
}
