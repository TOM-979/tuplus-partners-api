import { AppError } from '../utils/AppError.js'
import * as oportunidadModel from '../models/oportunidadModel.js'

const ETAPAS = ['contacto', 'diagnostico', 'propuesta', 'negociacion', 'cierre', 'posventa']

// Alcance de datos: un Partner solo ve su propia cartera; Líder Regional, la de su territorio; Dirección, toda (WEB-02 §9)
function alcance(usuario) {
  if (usuario.rol === 'partner') return { partnerId: usuario.partner?.id }
  if (usuario.rol === 'lider_regional') return { territorioId: usuario.partner?.territorio_id }
  return {}
}

export async function listar(usuario) {
  return oportunidadModel.listar(alcance(usuario))
}

async function verificarAcceso(usuario, oportunidad) {
  if (!oportunidad) throw new AppError(404, 'La oportunidad no existe.')
  if (usuario.rol === 'partner' && oportunidad.partner_id !== usuario.partner?.id) {
    throw new AppError(403, 'Esta oportunidad no es de tu cartera.')
  }
  if (usuario.rol === 'lider_regional' && oportunidad.territorio_id !== usuario.partner?.territorio_id) {
    throw new AppError(403, 'Esta oportunidad no es de tu territorio.')
  }
}

export async function obtener(usuario, id) {
  const oportunidad = await oportunidadModel.buscarPorId(id)
  await verificarAcceso(usuario, oportunidad)
  return oportunidad
}

export async function crear(usuario, datos) {
  if (usuario.rol !== 'partner' || !usuario.partner) throw new AppError(403, 'Solo un Partner puede registrar oportunidades.')
  if (!datos.empresa || datos.empresa.trim().length < 2) throw new AppError(400, 'Escribe el nombre de la empresa.', { campo: 'empresa' })
  return oportunidadModel.crear({ partnerId: usuario.partner.id, ...datos })
}

export async function actualizar(usuario, id, cambios) {
  const oportunidad = await oportunidadModel.buscarPorId(id)
  await verificarAcceso(usuario, oportunidad)
  if (cambios.etapa && !ETAPAS.includes(cambios.etapa)) throw new AppError(400, 'Esa etapa no existe.', { campo: 'etapa' })
  return oportunidadModel.actualizar(id, cambios)
}
