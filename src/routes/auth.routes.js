import { Router } from 'express'
import * as auth from '../controllers/authController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar } from '../middlewares/autenticar.js'
import { limitarLogin, limitarLoginPorCorreo, limitarCodigoPorCuenta } from '../middlewares/limitarIntentos.js'

const router = Router()
router.post('/login', limitarLogin, limitarLoginPorCorreo, asyncHandler(auth.login))
router.post('/codigo', limitarLogin, limitarCodigoPorCuenta, asyncHandler(auth.codigo))
router.get('/yo', autenticar, asyncHandler(auth.yo))
router.patch('/contrasena', autenticar, asyncHandler(auth.cambiarContrasena))
export default router
