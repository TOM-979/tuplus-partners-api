import { app } from './app.js'
import { env } from './config/env.js'
import { pool } from './config/db.js'

const servidor = app.listen(env.port, () => {
  console.log(`API del Portal TUPLUS Partners en http://localhost:${env.port}/api (${env.nodeEnv})`)
})

// Cierre ordenado: termina las solicitudes en curso y libera las conexiones
function cerrar() {
  servidor.close(async () => {
    await pool.end()
    process.exit(0)
  })
}
process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)
