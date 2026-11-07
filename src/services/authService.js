import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { firmarSesion, generarCodigo } from '../utils/token.js'
import { enviarCorreo } from '../utils/correo.js'
import * as usuarioModel from '../models/usuarioModel.js'
import * as codigoModel from '../models/codigoModel.js'

export const hashContrasena = (texto) => bcrypt.hash(texto, 10)
const compararContrasena = (texto, hash) => bcrypt.compare(texto, hash)

function publico(usuario) {
  return {
    id: usuario.id, correo: usuario.correo, rol: usuario.rol,
    partner: usuario.partner || null,
  }
}

// Paso 1: correo + contraseña. Si el rol necesita doble verificación, no entrega token todavía.
export async function iniciarSesion({ correo, contrasena }) {
  const usuario = await usuarioModel.buscarPorCorreo(correo)
  // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados
  const credencialesInvalidas = () => new AppError(401, 'Correo o contraseña incorrectos.')
  if (!usuario) throw credencialesInvalidas()

  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    throw new AppError(423, 'Esta cuenta está bloqueada temporalmente por varios intentos fallidos. Intenta de nuevo en unos minutos.')
  }
  if (usuario.estado !== 'activo') throw new AppError(403, 'Esta cuenta está suspendida. Contacta a Dirección.')

  const coincide = await compararContrasena(contrasena, usuario.contrasena_hash)
  if (!coincide) {
    await usuarioModel.registrarIntentoFallido(usuario.id)
    throw credencialesInvalidas()
  }

  if (env.requiere2faRoles.includes(usuario.rol)) {
    const codigo = generarCodigo(6)
    const codigoHash = await hashContrasena(codigo)
    await codigoModel.crear({ usuarioId: usuario.id, codigoHash, minutosValidez: 10 })
    await enviarCorreo({
      para: usuario.correo,
      asunto: 'Tu código de acceso al Portal TUPLUS Partners',
      texto: `Tu código es ${codigo}. Vence en 10 minutos. Si no fuiste tú, ignora este correo.`,
    })
    return { requiereCodigo: true, usuarioId: usuario.id }
  }

  await usuarioModel.registrarAccesoCorrecto(usuario.id)
  const completo = await usuarioModel.buscarPorId(usuario.id)
  return { requiereCodigo: false, token: firmarSesion(usuario), usuario: publico(completo) }
}

// Paso 2 (solo roles con 2FA): confirma el código de un solo uso y entrega el token
export async function confirmarCodigo({ usuarioId, codigo }) {
  const pendiente = await codigoModel.buscarVigente(usuarioId)
  if (!pendiente) throw new AppError(401, 'El código venció o no existe. Vuelve a iniciar sesión.')
  if (pendiente.intentos >= 5) throw new AppError(429, 'Demasiados intentos. Vuelve a iniciar sesión para recibir un código nuevo.')

  const coincide = await compararContrasena(String(codigo), pendiente.codigo_hash)
  if (!coincide) {
    await codigoModel.registrarIntento(pendiente.id)
    throw new AppError(401, 'El código no es correcto.')
  }

  await codigoModel.marcarUsado(pendiente.id)
  const usuario = await usuarioModel.buscarPorId(usuarioId)
  await usuarioModel.registrarAccesoCorrecto(usuarioId)
  return { token: firmarSesion(usuario), usuario: publico(usuario) }
}

export async function quienSoy(usuario) {
  return publico(usuario)
}

export async function cambiarMiContrasena(usuario, { actual, nueva }) {
  const completo = await usuarioModel.buscarPorCorreo(usuario.correo)
  const coincide = await compararContrasena(actual, completo.contrasena_hash)
  if (!coincide) throw new AppError(401, 'Tu contraseña actual no es correcta.')
  if (!nueva || nueva.length < 8) throw new AppError(400, 'La nueva contraseña debe tener al menos 8 caracteres.', { campo: 'nueva' })
  await usuarioModel.cambiarContrasena(usuario.id, await hashContrasena(nueva))
  return { mensaje: 'Tu contraseña se cambió correctamente.' }
}
