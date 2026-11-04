import * as postulacionService from '../services/postulacionService.js'

export async function crear(req, res) {
  const resultado = await postulacionService.crear(req.postulacion)
  res.status(202).json(resultado)
}
