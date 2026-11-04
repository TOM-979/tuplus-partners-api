import { Router } from 'express'
import salud from './salud.routes.js'
import catalogo from './catalogo.routes.js'
import postulaciones from './postulaciones.routes.js'

// Todas las rutas de la API cuelgan de /api
const router = Router()
router.use('/salud', salud)
router.use('/', catalogo)
router.use('/postulaciones', postulaciones)
export default router
