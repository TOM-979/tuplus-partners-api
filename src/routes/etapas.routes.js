import { Router } from 'express'
import { autenticar } from '../middlewares/autenticar.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import * as s from '../services/etapasService.js'

const router = Router()
router.use(autenticar)
const get = (path,fn) => router.get(path,asyncHandler(async(req,res) => res.json({ dato:await fn(req) })))
const post = (path,fn) => router.post(path,asyncHandler(async(req,res) => res.status(201).json({ dato:await fn(req) })))
const patch = (path,fn) => router.patch(path,asyncHandler(async(req,res) => res.json({ dato:await fn(req) })))
get('/cursos',r => s.cursos(r.usuario))
get('/cursos/:id',r => s.detalleCurso(r.usuario,r.params.id))
post('/cursos',r => s.crearCurso(r.usuario,r.body || {}))
patch('/cursos/:id',r => s.publicarCurso(r.usuario,r.params.id,r.body?.publicado))
post('/lecciones/:id/completar',r => s.completar(r.usuario,r.params.id))
post('/cursos/:id/evaluar',r => s.evaluar(r.usuario,r.params.id,r.body?.respuestas))
get('/certificados',r => s.certificados(r.usuario))
get('/empresas',r => s.empresas(r.usuario))
post('/empresas',r => s.crearEmpresa(r.usuario,r.body || {}))
post('/empresas/:id/contactos',r => s.crearContacto(r.usuario,r.params.id,r.body || {}))
get('/oportunidades/:id/seguimientos',r => s.seguimientos(r.usuario,r.params.id))
post('/oportunidades/:id/seguimientos',r => s.crearSeguimiento(r.usuario,r.params.id,r.body || {}))
patch('/seguimientos/:id/completar',r => s.cerrarSeguimiento(r.usuario,r.params.id))
get('/gestion',r => s.gestion(r.usuario))
post('/comisiones',r => s.crearComision(r.usuario,r.body || {}))
patch('/comisiones/:id',r => s.decidirComision(r.usuario,r.params.id,r.body || {}))
export default router
