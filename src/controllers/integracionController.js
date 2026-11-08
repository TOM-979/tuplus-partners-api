import * as direccionService from '../services/direccionService.js'

// Controladores propios de la integración de solo lectura (AdminPanel): reutilizan
// los mismos servicios de Dirección, pero normalizan el JSON de salida para que
// coincida con lo que espera un cliente tipado afuera (ej. C#), ya que MySQL
// devuelve los booleanos como 0/1 y no como true/false.

export async function listarPostulaciones(req, res) {
  res.json({ datos: await direccionService.listarPostulaciones(req.usuario, req.query) })
}

export async function listarPartners(req, res) {
  const datos = await direccionService.listarPartners(req.usuario, req.query)
  res.json({ datos: datos.map((p) => ({ ...p, es_lider_regional: Boolean(p.es_lider_regional) })) })
}