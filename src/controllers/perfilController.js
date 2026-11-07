import * as perfilService from '../services/perfilService.js'

export async function miPerfil(req, res) {
  res.json({ dato: await perfilService.miPerfil(req.usuario) })
}

export async function miHistorial(req, res) {
  res.json({ datos: await perfilService.miHistorial(req.usuario) })
}
