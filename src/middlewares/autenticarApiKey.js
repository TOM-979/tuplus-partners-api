import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'

// Protege rutas de SOLO LECTURA para sistemas externos (el AdminPanel legado),
// usando una clave fija en el header X-Api-Key en vez de login + 2FA. Pensado
// para llamadas servidor-a-servidor, no para un usuario con sesión en el navegador.
export function autenticarApiKey(req, _res, next) {
  if (!env.adminPanelApiKey) {
    throw new AppError(503, 'La integración con el AdminPanel no está configurada todavía.')
  }
  const clave = req.get('X-Api-Key')
  if (!clave || clave !== env.adminPanelApiKey) {
    throw new AppError(401, 'Clave de acceso inválida.')
  }
  // Reutiliza los mismos controladores de Dirección, pero en modo lectura:
  // este "usuario" sintético tiene alcance completo (igual que Dirección real).
  req.usuario = { rol: 'direccion' }
  next()
}