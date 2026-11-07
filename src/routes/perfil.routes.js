import { Router } from 'express'
import * as perfil from '../controllers/perfilController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar } from '../middlewares/autenticar.js'

const router = Router()
router.use(autenticar)
router.get('/', asyncHandler(perfil.miPerfil))
router.get('/historial', asyncHandler(perfil.miHistorial))
export default router
