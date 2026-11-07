import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

// Token de sesión (JWT): quién es, su rol y si ya pasó la doble verificación
export function firmarSesion(usuario) {
  return jwt.sign(
    { usuarioId: usuario.id, rol: usuario.rol },
    env.jwtSecret,
    { expiresIn: `${env.sesionMinutos}m` },
  )
}

export function verificarSesion(token) {
  return jwt.verify(token, env.jwtSecret)
}

// Código numérico de un solo uso (doble verificación). No usar para contraseñas.
export function generarCodigo(digitos = 6) {
  const max = 10 ** digitos
  const valor = String(crypto.randomInt(0, max)).padStart(digitos, '0')
  return valor
}

// Contraseña temporal legible, para la cuenta que se crea al activar un Partner
export function generarClaveTemporal() {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10) + 'A1'
}
