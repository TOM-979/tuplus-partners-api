import { env } from '../config/env.js'
import { AppError } from '../utils/AppError.js'

export function noEncontrado(req, _res, next) {
  next(new AppError(404, `No existe la ruta ${req.method} ${req.originalUrl}.`))
}

// Manejador central: respuestas de error siempre con el mismo formato
export function manejarErrores(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') err = new AppError(400, 'El cuerpo de la solicitud no es un JSON válido.')
  if (err.type === 'entity.too.large') err = new AppError(413, 'La solicitud es demasiado grande.')

  const status = err.status || 500
  if (status >= 500) console.error(err) // el detalle técnico queda solo en el servidor

  res.status(status).json({
    error: status >= 500 && env.esProduccion ? 'Ocurrió un error en el servidor. Intenta de nuevo en unos minutos.' : err.message,
    ...(err.detalles && { detalles: err.detalles }),
  })
}
