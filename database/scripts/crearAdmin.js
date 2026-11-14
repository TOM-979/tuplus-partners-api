import { conectar } from './conexion.js'
import { hashContrasena } from '../../src/services/authService.js'

// Crea (o actualiza la contraseña de) una cuenta real de Dirección.
// Uso:  npm run admin:crear -- correo@dominio.com "Contraseña"
//   o:  ADMIN_CORREO=... ADMIN_CONTRASENA=... npm run admin:crear
const correo = (process.argv[2] || process.env.ADMIN_CORREO || '').trim().toLowerCase()
const contrasena = process.argv[3] || process.env.ADMIN_CONTRASENA || ''

function validar() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo) || correo.length > 160) return 'Indica un correo válido (argumento 1 o ADMIN_CORREO).'
  if (contrasena.length < 12 || !/[a-z]/.test(contrasena) || !/[A-Z]/.test(contrasena) || !/\d/.test(contrasena)) {
    return 'La contraseña debe tener al menos 12 caracteres, con mayúsculas, minúsculas y números (argumento 2 o ADMIN_CONTRASENA).'
  }
  return null
}

async function main() {
  const problema = validar()
  if (problema) throw new Error(problema)
  const db = await conectar()
  try {
    const hash = await hashContrasena(contrasena)
    const [[existe]] = await db.query('SELECT id, rol FROM usuarios WHERE correo = ?', [correo])
    if (existe && existe.rol !== 'direccion') throw new Error('Ese correo ya pertenece a una cuenta que no es de Dirección.')
    if (existe) {
      await db.query('UPDATE usuarios SET contrasena_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL, estado = ? WHERE id = ?', [hash, 'activo', existe.id])
      console.log(`Contraseña actualizada para la cuenta de Dirección ${correo}.`)
    } else {
      await db.query('INSERT INTO usuarios (correo, contrasena_hash, rol) VALUES (?, ?, ?)', [correo, hash, 'direccion'])
      console.log(`Cuenta de Dirección creada: ${correo}.`)
    }
  } finally {
    await db.end()
  }
}

main().catch((e) => {
  console.error(`No se pudo crear la cuenta: ${e.message}`)
  process.exit(1)
})
