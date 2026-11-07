import { enTransaccion, pool } from '../config/db.js'
import { AppError } from '../utils/AppError.js'
import * as revisionModel from '../models/revisionModel.js'
import * as territorioModel from '../models/territorioModel.js'
import * as historialModel from '../models/historialModel.js'
import * as partnerModel from '../models/partnerModel.js'
import * as usuarioModel from '../models/usuarioModel.js'
import * as nivelModel from '../models/nivelModel.js'
import { hashContrasena } from './authService.js'
import { generarClaveTemporal } from '../utils/token.js'
import { enviarCorreo } from '../utils/correo.js'

// Las postulaciones que puede ver/decidir este usuario: Dirección ve todo, Líder Regional solo su territorio
function alcance(usuario) {
  return usuario.rol === 'lider_regional' ? { territorioId: usuario.partner?.territorio_id } : {}
}

export async function listarPostulaciones(usuario, filtros = {}) {
  const alcanceUsuario = alcance(usuario)
  if (alcanceUsuario.territorioId && filtros.territorioId && Number(filtros.territorioId) !== alcanceUsuario.territorioId) {
    throw new AppError(403, 'Solo puedes ver postulaciones de tu territorio.')
  }
  return revisionModel.listar({ ...filtros, ...alcanceUsuario })
}

function verificarAccesoPostulacion(usuario, postulacion) {
  if (usuario.rol === 'lider_regional' && postulacion.territorio_id !== usuario.partner?.territorio_id) {
    throw new AppError(403, 'Solo puedes gestionar postulaciones de tu territorio.')
  }
}

// Preselecciona, pide aclaración o descarta una postulación (no la activa todavía; eso es activarPartner)
export async function decidirPostulacion(usuario, postulacionId, { estado, motivo }) {
  const PERMITIDOS = ['preseleccionado', 'aclaracion', 'no_seleccionado']
  if (!PERMITIDOS.includes(estado)) throw new AppError(400, 'Ese estado no es válido aquí.', { campo: 'estado' })

  const post = await revisionModel.buscarPorId(postulacionId)
  if (!post) throw new AppError(404, 'La postulación no existe.')
  verificarAccesoPostulacion(usuario, post)
  if (post.estado === 'aprobado') throw new AppError(409, 'Esta postulación ya fue activada como Partner.')

  await enTransaccion(async (conexion) => {
    await revisionModel.cambiarEstado(conexion, { id: post.id, estado })
    await historialModel.registrar(conexion, { entidad: 'postulacion', entidadId: post.id, accion: 'cambio_estado', valorAnterior: post.estado, valorNuevo: estado, motivo: motivo || null, usuarioId: usuario.id })
  })
  return revisionModel.buscarPorId(postulacionId)
}

// Aprueba una postulación y la convierte en Partner activo con código P-00X (Tarea 7).
// Crea su cuenta con una contraseña temporal que se envía por correo.
export async function activarPartner(usuario, postulacionId) {
  const post = await revisionModel.buscarPorId(postulacionId)
  if (!post) throw new AppError(404, 'La postulación no existe.')
  verificarAccesoPostulacion(usuario, post)
  if (post.estado === 'aprobado') throw new AppError(409, 'Esta postulación ya fue activada como Partner.')

  const yaUsado = await usuarioModel.buscarPorCorreo(post.correo)
  if (yaUsado) throw new AppError(409, 'Ya existe una cuenta con ese correo.')

  // Se activa como Socio Comercial (L2), según WEB-02 sección 5.2
  const nivel = await nivelModel.buscarPorCodigo('L2')
  const claveTemporal = generarClaveTemporal()
  const claveHash = await hashContrasena(claveTemporal)

  const creado = await enTransaccion(async (conexion) => {
    const usuarioId = await usuarioModel.crear(conexion, { correo: post.correo, contrasenaHash: claveHash, rol: 'partner' })
    const partner = await partnerModel.activar(conexion, {
      usuarioId, postulacionId: post.id, nombre: post.nombre, telefono: post.telefono,
      nivelId: nivel.id, territorioId: post.territorio_id,
    })
    await revisionModel.cambiarEstado(conexion, { id: post.id, estado: 'aprobado' })
    await historialModel.registrar(conexion, { entidad: 'postulacion', entidadId: post.id, accion: 'cambio_estado', valorAnterior: post.estado, valorNuevo: 'aprobado', usuarioId: usuario.id })
    await historialModel.registrar(conexion, { entidad: 'partner', entidadId: partner.id, accion: 'activado', valorNuevo: `${partner.codigo} · L2`, motivo: `Desde la postulación ${post.codigo}`, usuarioId: usuario.id })
    return partner
  })

  await enviarCorreo({
    para: post.correo,
    asunto: 'Bienvenido a la Red de Socios TUPLUS',
    texto: `Tu postulación fue aprobada. Tu código de Partner es ${creado.codigo}.\nEntra al portal con este correo y la contraseña temporal: ${claveTemporal}\nTe pediremos cambiarla la primera vez que entres.`,
  })
  return partnerModel.buscarPorId(creado.id)
}

export async function listarPartners(usuario, filtros = {}) {
  const alcanceUsuario = alcance(usuario)
  return partnerModel.listar({ ...filtros, ...alcanceUsuario })
}

// Cambia el rango de un Partner (L0–L5) o le asigna/quita la función de Líder Regional (L6).
// Cada cambio queda en el historial con quién, cuándo y por qué (Tarea 7).
export async function cambiarNivelPartner(usuario, partnerId, nivelCodigo, motivo) {
  const partner = await partnerModel.buscarPorId(partnerId)
  if (!partner) throw new AppError(404, 'El Partner no existe.')
  const nivel = await nivelModel.buscarPorCodigo(nivelCodigo)
  if (!nivel) throw new AppError(400, 'El nivel no es válido.', { campo: 'nivel' })

  await enTransaccion(async (conexion) => {
    if (nivel.tipo === 'funcion') {
      // L6 Líder Regional es una función que convive con el rango, no lo reemplaza
      if (partner.es_lider_regional) throw new AppError(409, 'Este Partner ya es Líder Regional.')
      await partnerModel.cambiarLiderRegional(conexion, { partnerId, esLider: true })
      await usuarioModel.cambiarRol(conexion, partner.usuario_id, 'lider_regional')
      await historialModel.registrar(conexion, { entidad: 'partner', entidadId: partnerId, accion: 'asignar_lider_regional', valorNuevo: 'Líder Regional', motivo: motivo || null, usuarioId: usuario.id })
    } else {
      if (partner.nivel === nivelCodigo) throw new AppError(409, `El Partner ya está en ${nivelCodigo}.`)
      await partnerModel.cambiarNivel(conexion, { partnerId, nivelId: nivel.id })
      await historialModel.registrar(conexion, { entidad: 'partner', entidadId: partnerId, accion: 'cambio_nivel', valorAnterior: partner.nivel, valorNuevo: nivelCodigo, motivo: motivo || null, usuarioId: usuario.id })
    }
  })
  return partnerModel.buscarPorId(partnerId)
}

// Quita la función de Líder Regional (vuelve a su rango normal), sin perder el historial
export async function quitarLiderRegional(usuario, partnerId, motivo) {
  const partner = await partnerModel.buscarPorId(partnerId)
  if (!partner) throw new AppError(404, 'El Partner no existe.')
  if (!partner.es_lider_regional) throw new AppError(409, 'Este Partner no es Líder Regional.')
  await enTransaccion(async (conexion) => {
    await partnerModel.cambiarLiderRegional(conexion, { partnerId, esLider: false })
    await usuarioModel.cambiarRol(conexion, partner.usuario_id, 'partner')
    await historialModel.registrar(conexion, { entidad: 'partner', entidadId: partnerId, accion: 'quitar_lider_regional', valorAnterior: 'Líder Regional', motivo: motivo || null, usuarioId: usuario.id })
  })
  return partnerModel.buscarPorId(partnerId)
}

export async function listarTerritorios() {
  return territorioModel.listar()
}

export async function cambiarEstadoTerritorio(usuario, territorioId, estado, motivo) {
  const PERMITIDOS = ['proximamente', 'abierta', 'revision', 'cerrada', 'activa']
  if (!PERMITIDOS.includes(estado)) throw new AppError(400, 'Ese estado no es válido.', { campo: 'estado' })
  const territorio = await territorioModel.buscarPorId(territorioId)
  if (!territorio) throw new AppError(404, 'El territorio no existe.')
  await enTransaccion(async (conexion) => {
    await conexion.query('UPDATE territorios SET estado = ? WHERE id = ?', [estado, territorioId])
    await historialModel.registrar(conexion, { entidad: 'territorio', entidadId: territorioId, accion: 'cambio_estado', valorAnterior: territorio.estado, valorNuevo: estado, motivo: motivo || null, usuarioId: usuario.id })
  })
  return territorioModel.buscarPorId(territorioId)
}

export async function historialDe(entidad, entidadId) {
  return historialModel.listarPorEntidad(entidad, entidadId)
}

// Resumen para el panel de Dirección: conteos rápidos
export async function resumen(usuario) {
  const alcanceUsuario = alcance(usuario)
  const condicionTerritorio = alcanceUsuario.territorioId ? 'WHERE territorio_id = ?' : ''
  const parametros = alcanceUsuario.territorioId ? [alcanceUsuario.territorioId] : []

  const [[postulaciones]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(estado='recibida') AS recibidas, SUM(estado='preseleccionado') AS preseleccionadas,
            SUM(estado='aclaracion') AS en_aclaracion, SUM(estado='aprobado') AS aprobadas, SUM(estado='no_seleccionado') AS descartadas
     FROM postulaciones ${condicionTerritorio}`,
    parametros,
  )
  const [[partners]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(estado='activo') AS activos FROM partners ${condicionTerritorio}`,
    parametros,
  )
  return { postulaciones, partners }
}

// Reportes: cuántas oportunidades y cuánto monto hay por territorio y por etapa
export async function reportes(usuario) {
  const alcanceUsuario = alcance(usuario)
  const condicion = alcanceUsuario.territorioId ? 'WHERE p.territorio_id = ?' : ''
  const parametros = alcanceUsuario.territorioId ? [alcanceUsuario.territorioId] : []

  const [porTerritorio] = await pool.query(
    `SELECT t.nombre AS territorio, COUNT(DISTINCT p.id) AS partners, COUNT(o.id) AS oportunidades,
            COALESCE(SUM(o.monto), 0) AS monto_total
     FROM territorios t
     LEFT JOIN partners p ON p.territorio_id = t.id
     LEFT JOIN oportunidades o ON o.partner_id = p.id
     ${condicion}
     GROUP BY t.id, t.nombre ORDER BY t.nombre`,
    parametros,
  )
  const [porEtapa] = await pool.query(
    `SELECT o.etapa, COUNT(*) AS total, COALESCE(SUM(o.monto), 0) AS monto_total
     FROM oportunidades o JOIN partners p ON p.id = o.partner_id
     ${condicion}
     GROUP BY o.etapa`,
    parametros,
  )
  const [porMes] = await pool.query(
    `SELECT DATE_FORMAT(o.creado_en, '%Y-%m') AS mes, COUNT(*) AS total, COALESCE(SUM(o.monto), 0) AS monto_total
     FROM oportunidades o JOIN partners p ON p.id = o.partner_id
     ${condicion}
     GROUP BY mes ORDER BY mes`,
    parametros,
  )
  return { porTerritorio, porEtapa, porMes }
}
