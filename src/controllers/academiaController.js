import * as academiaService from '../services/academiaService.js'

export async function listarCursos(req, res) {
  res.json({ datos: await academiaService.listarCursos(req.usuario) })
}

export async function verCurso(req, res) {
  res.json({ dato: await academiaService.verCurso(req.usuario, Number(req.params.id)) })
}

export async function completarLeccion(req, res) {
  res.json(await academiaService.completarLeccion(req.usuario, Number(req.params.id)))
}
