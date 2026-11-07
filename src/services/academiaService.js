import { AppError } from '../utils/AppError.js'
import * as cursoModel from '../models/cursoModel.js'
import * as nivelModel from '../models/nivelModel.js'

async function ordenDelNivel(codigo) {
  const nivel = await nivelModel.buscarPorCodigo(codigo)
  return nivel?.orden ?? 0
}

export async function listarCursos(usuario) {
  if (!usuario.partner) throw new AppError(403, 'La Academia es solo para Partners.')
  const orden = await ordenDelNivel(usuario.partner.nivel)
  return cursoModel.listarParaPartner({ partnerId: usuario.partner.id, nivelOrden: orden })
}

export async function verCurso(usuario, cursoId) {
  if (!usuario.partner) throw new AppError(403, 'La Academia es solo para Partners.')
  const curso = await cursoModel.buscarPorId(cursoId)
  if (!curso) throw new AppError(404, 'El curso no existe.')
  const ordenPartner = await ordenDelNivel(usuario.partner.nivel)
  if (curso.nivel_orden > ordenPartner) throw new AppError(403, `Este curso se habilita en el nivel ${curso.nivel}.`)
  const lecciones = await cursoModel.listarLecciones({ cursoId, partnerId: usuario.partner.id })
  return { ...curso, lecciones }
}

export async function completarLeccion(usuario, leccionId) {
  if (!usuario.partner) throw new AppError(403, 'La Academia es solo para Partners.')
  const leccion = await cursoModel.buscarLeccion(leccionId)
  if (!leccion) throw new AppError(404, 'La lección no existe.')
  await cursoModel.marcarCompletada({ partnerId: usuario.partner.id, leccionId })
  return { mensaje: 'Lección marcada como completada.' }
}
