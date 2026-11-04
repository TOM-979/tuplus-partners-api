import { enTransaccion } from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as territorioModel from '../models/territorioModel.js'
import * as postulacionModel from '../models/postulacionModel.js'
import * as historialModel from '../models/historialModel.js'

const MENSAJE_RECIBIDA = 'Recibimos tu postulación. Un responsable del territorio la revisará y te escribirá al correo que dejaste.'

// Reglas de negocio de la postulación (WEB-02: RF-03, RF-04, RF-05 y RF-07)
export async function crear(datos) {
  const territorio = await territorioModel.buscarPorId(datos.territorioId)
  if (!territorio) throw new AppError(400, 'El territorio elegido no existe.', { campo: 'territorioId' })
  if (territorio.estado !== 'abierta') {
    throw new AppError(409, `La convocatoria de ${territorio.nombre} no está abierta. Puedes postular cuando se abra.`, { campo: 'territorioId' })
  }

  // Posible duplicado: no se crea otro expediente ni se revela si el correo ya existe
  const existente = await postulacionModel.buscarActivaPorCorreo(datos.correo)
  if (existente) {
    await historialModel.registrar(null, { entidad: 'postulacion', entidadId: existente.id, accion: 'posible_duplicado', motivo: 'Nuevo intento con el mismo correo' })
    return { mensaje: MENSAJE_RECIBIDA }
  }

  await enTransaccion(async (conexion) => {
    const nueva = await postulacionModel.crear(conexion, datos)
    await historialModel.registrar(conexion, { entidad: 'postulacion', entidadId: nueva.id, accion: 'creado', valorNuevo: 'recibida' })
  })

  // Misma respuesta que en el caso de duplicado, para no revelar qué correos existen
  return { mensaje: MENSAJE_RECIBIDA }
}
