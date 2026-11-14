import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

// Ejecuta las pruebas contra una base APARTE (<DB_NAME>_test). Nunca toca la base del portal.
const raiz = fileURLToPath(new URL('../', import.meta.url))
const base = process.env.DB_NAME
if (!base) { console.error('Falta DB_NAME en .env'); process.exit(1) }
const entorno = { ...process.env, NODE_ENV: 'development', DB_NAME: `${base.replace(/_test$/, '')}_test` }
console.log(`Base de pruebas: ${entorno.DB_NAME}`)

for (const archivo of ['database/scripts/migrar.js', 'database/scripts/sembrar.js', 'tests/etapas.mjs', 'tests/endurecimiento.mjs', 'tests/limpiarDemo.mjs']) {
  const r = spawnSync(process.execPath, [archivo], { cwd: raiz, env: entorno, stdio: 'inherit' })
  if (r.status !== 0) { console.error(`FALLÓ: ${archivo}`); process.exit(r.status || 1) }
}
console.log('Todas las pruebas pasaron.')
