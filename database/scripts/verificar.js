import { conectar } from './conexion.js'
import { env } from '../../src/config/env.js'

// Solo lectura: comprueba que la base tenga todo lo que la API necesita. Sale con error si falta algo.
const TABLAS = ['niveles', 'territorios', 'usuarios', 'postulaciones', 'partners', 'oportunidades', 'historial_cambios',
  'codigos_verificacion', 'cursos', 'lecciones', 'progreso_academia', 'evaluaciones_curso', 'intentos_evaluacion',
  'certificados', 'empresas_crm', 'contactos_crm', 'seguimientos_crm', 'comisiones_manual', 'auditoria_etapas']
const COLUMNAS = [['oportunidades', 'moneda'], ['oportunidades', 'proximo_paso']]

async function main() {
  const db = await conectar()
  const problemas = []
  try {
    console.log(`Base: ${env.db.name} en ${env.db.host}`)
    const [t] = await db.query('SELECT table_name AS n FROM information_schema.tables WHERE table_schema = ?', [env.db.name])
    const tablas = new Set(t.map((x) => x.n.toLowerCase()))
    for (const n of TABLAS) if (!tablas.has(n)) problemas.push(`Falta la tabla ${n}`)
    const [c] = await db.query('SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = ?', [env.db.name])
    const cols = new Set(c.map((x) => `${x.t.toLowerCase()}.${x.c.toLowerCase()}`))
    for (const [tb, col] of COLUMNAS) if (!cols.has(`${tb}.${col}`)) problemas.push(`Falta la columna ${tb}.${col}`)
    if (!problemas.length) {
      const [[n]] = await db.query('SELECT COUNT(*) AS total FROM niveles')
      const [[te]] = await db.query('SELECT COUNT(*) AS total FROM territorios')
      if (n.total < 7) problemas.push(`Faltan niveles: hay ${n.total} de 7. Ejecuta npm run db:semilla`)
      if (te.total < 1) problemas.push('No hay territorios. Ejecuta npm run db:semilla')
      const [mig] = await db.query('SELECT nombre FROM migraciones ORDER BY nombre')
      console.log(`Migraciones aplicadas: ${mig.length} (última: ${mig.at(-1)?.nombre})`)
      console.log(`Niveles: ${n.total} · Territorios: ${te.total}`)
    }
  } finally {
    await db.end()
  }
  if (problemas.length) {
    problemas.forEach((p) => console.error(`  ✗ ${p}`))
    console.error('Corrige con: npm run db:crear (migraciones) y npm run db:semilla (catálogos).')
    process.exit(1)
  }
  console.log('La base está lista para la API.')
}
main().catch((e) => { console.error(`No se pudo verificar: ${e.message}`); process.exit(1) })
