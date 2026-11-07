import * as territorioModel from '../models/territorioModel.js'

// El formulario de postulación del sitio Astro (tuplus.pe) usa su propio
// esquema de campos, pensado originalmente para otro backend. Este
// middleware detecta ese formato y lo traduce al esquema interno que
// espera validarPostulacion, sin tocar el formulario del sitio ni perder
// la información que el postulante ya escribió.
//
// Si el body ya viene en el formato interno (nombre/correo/telefono), no
// se toca.

const MAPA_EXPERIENCIA = {
  0: 'sin_experiencia', '0': 'sin_experiencia',
  under1: 'menos_1',
  '1-3': '1_3',
  '4-7': 'mas_3',
  '7+': 'mas_3',
}

const MAPA_SOLUCIONES = {
  'web-commerce': 'Web y comercio digital',
  'automation-systems': 'Automatización y sistemas',
  'security-data': 'Seguridad y datos',
}

const MAPA_PERFIL = { independent: 'Profesional independiente', company: 'Empresa o agencia' }
const MAPA_NIVEL = { basic: 'Básico', advanced: 'Avanzado', master: 'Master' }
const MAPA_INICIO = { 30: 'En 30 días', 60: 'En 60 días', 90: 'En 90 días', unknown: 'Aún por definir' }

function disponibilidadDesdeHoras(horas) {
  const h = Number(horas)
  if (!Number.isFinite(h)) return undefined
  if (h <= 5) return 'hasta_5'
  if (h <= 10) return '5_10'
  if (h <= 20) return '10_20'
  return 'mas_20'
}

async function territorioIdParaUbicacion(pais, ciudad, region) {
  const territorios = await territorioModel.listar()
  const delPais = territorios.filter((t) => t.pais === pais)
  if (!delPais.length) return null

  const normal = (s) => String(s || '').trim().toLowerCase()
  const ciudadN = normal(ciudad)
  const regionN = normal(region)

  const porNombreOCiudad = delPais.find(
    (t) => normal(t.nombre) === ciudadN || normal(t.nombre) === regionN
      || normal(t.region) === ciudadN || normal(t.region) === regionN,
  )
  if (porNombreOCiudad) return porNombreOCiudad.id

  // Sin coincidencia exacta: prioriza un territorio abierto del mismo país
  const abierto = delPais.find((t) => t.estado === 'abierta')
  return (abierto || delPais[0]).id
}

function construirMotivo(b) {
  const partes = []
  if (b.profile) partes.push(`Perfil: ${MAPA_PERFIL[b.profile] || b.profile}`)
  if (b.company) partes.push(`Empresa: ${b.company}`)
  if (b.role) partes.push(`Cargo: ${b.role}`)
  if (b.website) partes.push(`Web/LinkedIn: ${b.website}`)
  if (Array.isArray(b.solutions) && b.solutions.length) {
    partes.push(`Soluciones: ${b.solutions.map((s) => MAPA_SOLUCIONES[s] || s).join(', ')}`)
  }
  if (b.level) partes.push(`Nivel de interés: ${MAPA_NIVEL[b.level] || b.level}`)
  if (b.start) partes.push(`Inicio: ${MAPA_INICIO[b.start] || b.start}`)
  if (b.strategy) partes.push(`Primeros clientes: ${b.strategy}`)
  if (b.goal) partes.push(`Objetivo 90 días: ${b.goal}`)
  const texto = partes.join(' · ')
  return texto.length > 500 ? `${texto.slice(0, 497)}...` : texto
}

export async function normalizarPostulacionWeb(req, _res, next) {
  const b = req.body || {}
  const esFormatoAstro = typeof b.fullName === 'string' && !b.nombre
  if (!esFormatoAstro) return next()

  const territorioId = await territorioIdParaUbicacion(b.country, b.city, b.region)

  req.body = {
    nombre: b.fullName,
    correo: b.email,
    telefono: b.phone,
    territorioId,
    experiencia: MAPA_EXPERIENCIA[b.experience] ?? b.experience,
    disponibilidad: disponibilidadDesdeHoras(b.hours),
    sectores: b.sector,
    motivo: construirMotivo(b),
    consentimiento: {
      privacidad: b.confirmed === true,
      terminos: b.confirmed === true,
      version: 'astro-partner-v1',
    },
    origen: 'web',
  }
  next()
}