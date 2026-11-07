import { Router } from 'express'
import * as direccion from '../controllers/direccionController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar, permitirRoles } from '../middlewares/autenticar.js'

// Todo lo de aquí exige sesión; Líder Regional y Dirección pueden gestionar postulaciones/partners,
// pero solo Dirección cambia territorios y niveles (Tarea 3: permisos por rol)
const router = Router()
router.use(autenticar, permitirRoles('direccion', 'lider_regional'))

router.get('/postulaciones', asyncHandler(direccion.listarPostulaciones))
router.patch('/postulaciones/:id', asyncHandler(direccion.decidir))
router.post('/postulaciones/:id/activar', asyncHandler(direccion.activar))

router.get('/partners', asyncHandler(direccion.listarPartners))
router.patch('/partners/:id/nivel', permitirRoles('direccion'), asyncHandler(direccion.cambiarNivel))
router.delete('/partners/:id/lider-regional', permitirRoles('direccion'), asyncHandler(direccion.quitarLiderRegional))

router.get('/territorios', asyncHandler(direccion.listarTerritorios))
router.patch('/territorios/:id', permitirRoles('direccion'), asyncHandler(direccion.cambiarTerritorio))

router.get('/historial/:entidad/:id', asyncHandler(direccion.historial))
router.get('/resumen', asyncHandler(direccion.resumen))
router.get('/reportes', asyncHandler(direccion.reportes))

export default router
