import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as catalogo from '../controllers/catalogoController.js'

// Datos públicos: los usa la web corporativa (selector territorial) y el Portal
const router = Router()
router.get('/niveles', asyncHandler(catalogo.niveles))
router.get('/territorios', asyncHandler(catalogo.territorios))
export default router
