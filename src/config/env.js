import 'dotenv/config'

// Lee y valida las variables de entorno una sola vez al arrancar.
const fallar = (mensaje) => {
  console.error(`Configuración inválida: ${mensaje}`)
  process.exit(1)
}

const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET']
const faltantes = requeridas.filter((n) => !process.env[n])
if (faltantes.length) fallar(`faltan variables en el archivo .env: ${faltantes.join(', ')}. Copia .env.example como .env y complétalo.`)

const nodeEnv = process.env.NODE_ENV || 'development'
const esProduccion = nodeEnv === 'production'

if (esProduccion && process.env.JWT_SECRET.length < 32) {
  fallar('JWT_SECRET debe tener al menos 32 caracteres en producción.')
}

// Orígenes del navegador autorizados. En desarrollo, si no se define, se usan los del portal local.
const ORIGENES_DESARROLLO = ['http://localhost:5173', 'http://127.0.0.1:5173']
let corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
if (!corsOrigins.length) {
  if (esProduccion) fallar('CORS_ORIGINS está vacío. Define los dominios del portal, por ejemplo https://partners.tuplus.pe.')
  if (nodeEnv === 'development') corsOrigins = ORIGENES_DESARROLLO
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  esProduccion,
  corsOrigins,
  // Cantidad de proxys delante de la API (para leer bien la IP real en el límite de intentos)
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwtSecret: process.env.JWT_SECRET,
  sesionMinutos: Number(process.env.SESION_MINUTOS) || 480,
  inactividadMinutos: Number(process.env.INACTIVIDAD_MINUTOS) || 30,
  requiere2faRoles: (process.env.REQUIERE_2FA_ROLES || 'direccion').split(',').map((r) => r.trim()).filter(Boolean),
  adminPanelApiKey: process.env.ADMIN_PANEL_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    desde: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
}