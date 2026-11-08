import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticarApiKey } from '../middlewares/autenticarApiKey.js'
import * as direccion from '../controllers/direccionController.js'

// Acceso de SOLO LECTURA para sistemas externos (el AdminPanel legado en Render),
// protegido por una clave fija (X-Api-Key), no por login de usuario.
// Solo expone lectura: el AdminPanel puede mostrar postulaciones y partners,
// pero no decidir, activar ni modificar nada desde aquí.
const router = Router()
router.use(autenticarApiKey)

router.get('/postulaciones', asyncHandler(direccion.listarPostulaciones))
router.get('/partners', asyncHandler(direccion.listarPartners))

export default router