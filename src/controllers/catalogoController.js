import * as catalogoService from '../services/catalogoService.js'

export async function niveles(_req, res) {
  res.json({ datos: await catalogoService.listarNiveles() })
}

export async function territorios(_req, res) {
  res.json({ datos: await catalogoService.listarTerritorios() })
}
