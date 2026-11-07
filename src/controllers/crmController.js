import * as crmService from '../services/crmService.js'

export async function listar(req, res) {
  res.json({ datos: await crmService.listar(req.usuario) })
}

export async function obtener(req, res) {
  res.json({ dato: await crmService.obtener(req.usuario, Number(req.params.id)) })
}

export async function crear(req, res) {
  res.status(201).json({ dato: await crmService.crear(req.usuario, req.body || {}) })
}

export async function actualizar(req, res) {
  res.json({ dato: await crmService.actualizar(req.usuario, Number(req.params.id), req.body || {}) })
}
