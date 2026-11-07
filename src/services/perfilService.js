import { AppError } from '../utils/AppError.js'
import * as nivelModel from '../models/nivelModel.js'
import * as historialModel from '../models/historialModel.js'

// Mi perfil: quién soy, mi rango y mi avance hacia el siguiente (si aplica)
export async function miPerfil(usuario) {
  if (!usuario.partner) return { correo: usuario.correo, rol: usuario.rol, partner: null }
  const niveles = await nivelModel.listar()
  const rangos = niveles.filter((n) => n.tipo === 'rango')
  const indiceActual = rangos.findIndex((n) => n.codigo === usuario.partner.nivel)
  const siguiente = rangos[indiceActual + 1] || null

  return {
    correo: usuario.correo,
    rol: usuario.rol,
    partner: {
      ...usuario.partner,
      siguienteNivel: siguiente ? { codigo: siguiente.codigo, nombre: siguiente.nombre } : null,
    },
  }
}

export async function miHistorial(usuario) {
  if (!usuario.partner) throw new AppError(404, 'No tienes un perfil de Partner.')
  return historialModel.listarPorEntidad('partner', usuario.partner.id)
}
