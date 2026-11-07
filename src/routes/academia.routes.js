import { Router } from 'express'
import * as academia from '../controllers/academiaController.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { autenticar } from '../middlewares/autenticar.js'

const router = Router()
router.use(autenticar)
router.get('/cursos', asyncHandler(academia.listarCursos))
router.get('/cursos/:id', asyncHandler(academia.verCurso))
router.post('/lecciones/:id/completar', asyncHandler(academia.completarLeccion))
export default router
