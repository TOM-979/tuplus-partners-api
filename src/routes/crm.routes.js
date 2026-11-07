import { Router } from 'express'
import * as crm from '../controllers/crmController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar, permitirRoles } from '../middlewares/autenticar.js'

const router = Router()
router.use(autenticar)
router.get('/', asyncHandler(crm.listar))
router.get('/:id', asyncHandler(crm.obtener))
router.post('/', permitirRoles('partner'), asyncHandler(crm.crear))
router.patch('/:id', asyncHandler(crm.actualizar))
export default router
