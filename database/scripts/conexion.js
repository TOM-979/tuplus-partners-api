import mysql from 'mysql2/promise'
import { env } from '../../src/config/env.js'

// Conexión para scripts: permite varias sentencias por archivo .sql
export function conectar({ conBase = true } = {}) {
  return mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: conBase ? env.db.name : undefined,
    multipleStatements: true,
    charset: 'utf8mb4',
  })
}
