import { Router } from 'express'
import { revisar } from '../controllers/saludController.js'

const router = Router()
router.get('/', revisar)
export default router
