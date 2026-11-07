import { AppError } from '../utils/AppError.js'
import { verificarSesion } from '../utils/token.js'
import * as usuarioModel from '../models/usuarioModel.js'

// Exige un token de sesión válido y carga al usuario (con su Partner, si tiene) en req.usuario
export async function autenticar(req, _res, next) {
  const encabezado = req.headers.authorization || ''
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null
  if (!token) return next(new AppError(401, 'Debes iniciar sesión.'))

  let datos
  try {
    datos = verificarSesion(token)
  } catch {
    return next(new AppError(401, 'Tu sesión no es válida o venció. Inicia sesión de nuevo.'))
  }

  const usuario = await usuarioModel.buscarPorId(datos.usuarioId)
  if (!usuario || usuario.estado !== 'activo') return next(new AppError(401, 'Tu cuenta no está activa.'))

  req.usuario = usuario
  next()
}

// Exige que el usuario autenticado tenga uno de los roles indicados
export function permitirRoles(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(new AppError(401, 'Debes iniciar sesión.'))
    if (!roles.includes(req.usuario.rol)) return next(new AppError(403, 'No tienes permiso para esta acción.'))
    next()
  }
}
