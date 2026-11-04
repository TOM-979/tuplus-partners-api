import 'dotenv/config'

// Lee y valida las variables de entorno una sola vez al arrancar.
const requeridas = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
const faltantes = requeridas.filter((n) => !process.env[n])
if (faltantes.length) {
  console.error(`Faltan variables en el archivo .env: ${faltantes.join(', ')}. Copia .env.example como .env y complétalo.`)
  process.exit(1)
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  esProduccion: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
}
