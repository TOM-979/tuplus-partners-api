import bcrypt from 'bcryptjs'
import { conectar } from './conexion.js'

// Datos de prueba para poder usar el Portal de punta a punta sin esperar postulaciones reales.
// Se puede ejecutar varias veces: si ya existen, no los duplica.
const hash = (texto) => bcrypt.hash(texto, 10)

async function main() {
  const db = await conectar()

  // Abre dos territorios para poder postular y activar en la demo
  await db.query("UPDATE territorios SET estado = 'abierta' WHERE nombre IN ('Barranca', 'Lima Metropolitana')")
  const [[barranca]] = (await db.query("SELECT id FROM territorios WHERE nombre = 'Barranca'"))
  const [[lima]] = (await db.query("SELECT id FROM territorios WHERE nombre = 'Lima Metropolitana'"))
  const [niveles] = await db.query('SELECT id, codigo FROM niveles')
  const nivelPorCodigo = Object.fromEntries(niveles.map((n) => [n.codigo, n.id]))

  // Cuenta de Dirección (con doble verificación obligatoria)
  const [[direccionExiste]] = await db.query("SELECT id FROM usuarios WHERE correo = 'direccion@tuplus.pe'")
  if (!direccionExiste) {
    await db.query('INSERT INTO usuarios (correo, contrasena_hash, rol) VALUES (?, ?, ?)',
      ['direccion@tuplus.pe', await hash('Direccion.2026'), 'direccion'])
    console.log('  creada cuenta direccion@tuplus.pe / Direccion.2026 (rol: direccion)')
  }

  // Partner de prueba ya activo, con cartera CRM y una lección completada
  const [[partnerExiste]] = await db.query("SELECT id FROM usuarios WHERE correo = 'partner@tuplus.pe'")
  let partnerId
  if (!partnerExiste) {
    const [u] = await db.query('INSERT INTO usuarios (correo, contrasena_hash, rol) VALUES (?, ?, ?)',
      ['partner@tuplus.pe', await hash('Partner.2026'), 'partner'])
    const [p] = await db.query(
      `INSERT INTO partners (codigo, usuario_id, nombre, telefono, nivel_id, territorio_id)
       VALUES ('P-001', ?, 'Carlos Vega', '+51987654321', ?, ?)`,
      [u.insertId, nivelPorCodigo.L2, lima.id],
    )
    partnerId = p.insertId
    console.log('  creado Partner P-001 (partner@tuplus.pe / Partner.2026, rol: partner)')
  } else {
    const [[p]] = await db.query('SELECT id FROM partners WHERE usuario_id = ?', [partnerExiste.id])
    partnerId = p?.id
  }

  // Oportunidades de ejemplo en distintas etapas del CRM
  if (partnerId) {
    const [[yaTiene]] = await db.query('SELECT id FROM oportunidades WHERE partner_id = ? LIMIT 1', [partnerId])
    if (!yaTiene) {
      const ejemplos = [
        ['Botica Nova Salud', 'Juan Pérez', 'Salud', 'Barranca', 'Página web y catálogo online', 'propuesta', 1200],
        ['Ferretería El Tornillo', 'Rosa Díaz', 'Retail', 'Lima', 'Tienda en línea', 'contacto', null],
        ['Estudio Legal Ríos & Asociados', 'Miguel Ríos', 'Legal', 'Lima', 'Sitio institucional', 'cierre', 2500],
      ]
      for (const [empresa, contacto, sector, ciudad, necesidad, etapa, monto] of ejemplos) {
        const [o] = await db.query(
          `INSERT INTO oportunidades (partner_id, empresa, contacto, sector, ciudad, necesidad, etapa, monto)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [partnerId, empresa, contacto, sector, ciudad, necesidad, etapa, monto],
        )
        await db.query('UPDATE oportunidades SET codigo = ? WHERE id = ?', [`OP-${String(o.insertId).padStart(4, '0')}`, o.insertId])
      }
      console.log('  creadas 3 oportunidades de ejemplo para P-001')
    }
  }

  // Postulaciones de ejemplo, pendientes de revisión
  const [[yaHayPostulaciones]] = await db.query('SELECT id FROM postulaciones LIMIT 1')
  if (!yaHayPostulaciones) {
    const ejemplos = [
      ['Lucía Fernández', 'lucia.fernandez@example.com', '+51911111111', barranca.id, '1_3', '5_10', 'Salud, Retail', 'recibida'],
      ['Jorge Salazar', 'jorge.salazar@example.com', '+51922222222', lima.id, 'mas_3', '10_20', 'Legal, Educación', 'recibida'],
      ['Mariana Castro', 'mariana.castro@example.com', '+51933333333', barranca.id, 'menos_1', 'hasta_5', 'Retail', 'aclaracion'],
    ]
    for (const [nombre, correo, telefono, territorioId, experiencia, disponibilidad, sectores, estado] of ejemplos) {
      const [r] = await db.query(
        `INSERT INTO postulaciones (nombre, correo, telefono, territorio_id, experiencia, disponibilidad, sectores,
                                     estado, consentimiento_version, consentimiento_fecha, origen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'v1.0', UTC_TIMESTAMP(), 'web')`,
        [nombre, correo, telefono, territorioId, experiencia, disponibilidad, sectores, estado],
      )
      await db.query('UPDATE postulaciones SET codigo = ? WHERE id = ?', [`POST-${String(r.insertId).padStart(4, '0')}`, r.insertId])
    }
    console.log('  creadas 3 postulaciones de ejemplo (pendientes de revisión)')
  }

  // Academia: un curso por nivel L1 y L2, con un par de lecciones cada uno
  const [[yaHayCursos]] = await db.query('SELECT id FROM cursos LIMIT 1')
  if (!yaHayCursos) {
    const [c1] = await db.query(
      "INSERT INTO cursos (titulo, descripcion, nivel_id, orden) VALUES ('Bienvenida a la Red TUPLUS', 'Qué es la Red de Socios y cómo funciona.', ?, 1)",
      [nivelPorCodigo.L1],
    )
    await db.query(
      `INSERT INTO lecciones (curso_id, titulo, tipo, contenido, duracion_min, orden) VALUES
        (?, 'Qué es TUPLUS', 'lectura', 'Introducción a la empresa y sus productos.', 10, 1),
        (?, 'Cómo trabaja un Socio Comercial', 'lectura', 'Roles, expectativas y código de conducta.', 15, 2)`,
      [c1.insertId, c1.insertId],
    )
    const [c2] = await db.query(
      "INSERT INTO cursos (titulo, descripcion, nivel_id, orden) VALUES ('Diagnóstico B2B con la metodología TUPLUS', 'Cómo levantar la necesidad real de un cliente.', ?, 2)",
      [nivelPorCodigo.L2],
    )
    await db.query(
      `INSERT INTO lecciones (curso_id, titulo, tipo, contenido, duracion_min, orden) VALUES
        (?, 'La primera reunión', 'video', 'https://ejemplo.tuplus.pe/academia/primera-reunion', 20, 1),
        (?, 'Registrar la oportunidad en el CRM', 'lectura', 'Paso a paso para no perder información del cliente.', 10, 2)`,
      [c2.insertId, c2.insertId],
    )
    console.log('  creados 2 cursos de Academia con sus lecciones')
  }

  console.log('Datos de demostración listos.')
  await db.end()
}

main().catch((e) => {
  console.error(`Error al cargar los datos de demostración: ${e.message}`)
  process.exit(1)
})
