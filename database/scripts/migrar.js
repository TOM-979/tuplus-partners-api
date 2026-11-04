import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { env } from '../../src/config/env.js'
import { conectar } from './conexion.js'

// Aplica en orden los archivos de database/migrations que aún no se aplicaron.
// Uso: npm run db:crear   ·   --reiniciar borra la base primero (nunca en producción)
const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
const reiniciar = process.argv.includes('--reiniciar')

async function main() {
  const servidor = await conectar({ conBase: false })
  if (reiniciar) {
    if (env.esProduccion) throw new Error('No se puede reiniciar la base en producción.')
    await servidor.query(`DROP DATABASE IF EXISTS \`${env.db.name}\``)
    console.log(`Base ${env.db.name} borrada.`)
  }
  await servidor.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await servidor.end()

  const db = await conectar()
  await db.query(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre VARCHAR(120) NOT NULL PRIMARY KEY,
    aplicada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)
  const [hechas] = await db.query('SELECT nombre FROM migraciones')
  const aplicadas = new Set(hechas.map((m) => m.nombre))
  const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort()

  let nuevas = 0
  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue
    await db.query(await readFile(path.join(carpeta, archivo), 'utf8'))
    await db.query('INSERT INTO migraciones (nombre) VALUES (?)', [archivo])
    console.log(`  aplicada ${archivo}`)
    nuevas++
  }
  console.log(nuevas ? `Listo: ${nuevas} migraciones aplicadas en ${env.db.name}.` : 'La base ya estaba al día.')
  await db.end()
}

main().catch((e) => {
  console.error(`Error al migrar: ${e.message}`)
  process.exit(1)
})
