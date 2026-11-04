import mysql from 'mysql2/promise'
import { env } from './env.js'

// Grupo de conexiones compartido por toda la API
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z', // fechas en UTC; el frontend las muestra en hora de Lima
})

// Ejecuta varias consultas como una sola: si una falla, se deshacen todas
export async function enTransaccion(trabajo) {
  const conexion = await pool.getConnection()
  try {
    await conexion.beginTransaction()
    const resultado = await trabajo(conexion)
    await conexion.commit()
    return resultado
  } catch (error) {
    await conexion.rollback()
    throw error
  } finally {
    conexion.release()
  }
}
