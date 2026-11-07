import * as direccionService from '../services/direccionService.js'

export async function listarPostulaciones(req, res) {
  res.json({ datos: await direccionService.listarPostulaciones(req.usuario, req.query) })
}

export async function decidir(req, res) {
  res.json({ dato: await direccionService.decidirPostulacion(req.usuario, Number(req.params.id), req.body || {}) })
}

export async function activar(req, res) {
  res.json({ dato: await direccionService.activarPartner(req.usuario, Number(req.params.id)) })
}

export async function listarPartners(req, res) {
  res.json({ datos: await direccionService.listarPartners(req.usuario, req.query) })
}

export async function cambiarNivel(req, res) {
  res.json({ dato: await direccionService.cambiarNivelPartner(req.usuario, Number(req.params.id), req.body?.nivel, req.body?.motivo) })
}

export async function quitarLiderRegional(req, res) {
  res.json({ dato: await direccionService.quitarLiderRegional(req.usuario, Number(req.params.id), req.body?.motivo) })
}

export async function listarTerritorios(req, res) {
  res.json({ datos: await direccionService.listarTerritorios() })
}

export async function cambiarTerritorio(req, res) {
  res.json({ dato: await direccionService.cambiarEstadoTerritorio(req.usuario, Number(req.params.id), req.body?.estado, req.body?.motivo) })
}

export async function historial(req, res) {
  res.json({ datos: await direccionService.historialDe(req.params.entidad, Number(req.params.id)) })
}

export async function resumen(req, res) {
  res.json({ dato: await direccionService.resumen(req.usuario) })
}

export async function reportes(req, res) {
  res.json({ dato: await direccionService.reportes(req.usuario) })
}
