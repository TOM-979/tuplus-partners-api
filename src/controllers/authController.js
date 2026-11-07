import * as authService from '../services/authService.js'

export async function login(req, res) {
  res.json(await authService.iniciarSesion(req.body || {}))
}

export async function codigo(req, res) {
  res.json(await authService.confirmarCodigo(req.body || {}))
}

export async function yo(req, res) {
  res.json({ dato: await authService.quienSoy(req.usuario) })
}

export async function cambiarContrasena(req, res) {
  res.json(await authService.cambiarMiContrasena(req.usuario, req.body || {}))
}
