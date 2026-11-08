import { Router } from 'express'
import salud from './salud.routes.js'
import catalogo from './catalogo.routes.js'
import postulaciones from './postulaciones.routes.js'
import auth from './auth.routes.js'
import direccion from './direccion.routes.js'
import perfil from './perfil.routes.js'
import crm from './crm.routes.js'
import academia from './academia.routes.js'
import integracion from './integracion.routes.js'

// Todas las rutas de la API cuelgan de /api
const router = Router()
router.use('/salud', salud)
router.use('/', catalogo)
router.use('/postulaciones', postulaciones)
router.use('/auth', auth)
router.use('/direccion', direccion)
router.use('/perfil', perfil)
router.use('/crm', crm)
router.use('/academia', academia)
router.use('/integracion', integracion)
export default router