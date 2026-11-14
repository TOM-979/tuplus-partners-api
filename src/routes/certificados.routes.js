import { Router } from 'express'
import { pool } from '../config/db.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { limitarVerificacion } from '../middlewares/limitarIntentos.js'

const router = Router()

// Público: confirma si un certificado existe. Devuelve solo nombre, título y fecha de emisión.
router.get('/verificar/:codigo', limitarVerificacion, asyncHandler(async (req, res) => {
  const codigo = String(req.params.codigo).trim().slice(0, 50)
  const [[c]] = await pool.query('SELECT nombre, titulo, emitido_en FROM certificados WHERE codigo = ?', [codigo])
  if (!c) return res.json({ valido: false })
  res.json({ valido: true, nombre: c.nombre, titulo: c.titulo, emitido_en: c.emitido_en })
}))
export default router
