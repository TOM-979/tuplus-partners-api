import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { conectar } from './conexion.js'

// Carga los catálogos iniciales (niveles y territorios). Se puede ejecutar varias veces.
const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seeds')

async function main() {
  const db = await conectar()
  for (const archivo of (await readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort()) {
    await db.query(await readFile(path.join(carpeta, archivo), 'utf8'))
    console.log(`  cargada ${archivo}`)
  }
  console.log('Catálogos cargados.')
  await db.end()
}

main().catch((e) => {
  console.error(`Error al cargar datos iniciales: ${e.message}`)
  process.exit(1)
})
