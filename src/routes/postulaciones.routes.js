import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { normalizarPostulacionWeb } from '../middlewares/normalizarPostulacionWeb.js'
import { validarPostulacion } from '../middlewares/validarPostulacion.js'
import * as postulaciones from '../controllers/postulacionController.js'

const router = Router()
router.post('/', asyncHandler(normalizarPostulacionWeb), validarPostulacion, asyncHandler(postulaciones.crear))
export default router