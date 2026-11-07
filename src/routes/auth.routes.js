import { Router } from 'express'
import * as auth from '../controllers/authController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar } from '../middlewares/autenticar.js'
import { limitarLogin } from '../middlewares/limitarIntentos.js'

const router = Router()
router.post('/login', limitarLogin, asyncHandler(auth.login))
router.post('/codigo', limitarLogin, asyncHandler(auth.codigo))
router.get('/yo', autenticar, asyncHandler(auth.yo))
router.patch('/contrasena', autenticar, asyncHandler(auth.cambiarContrasena))
export default router
