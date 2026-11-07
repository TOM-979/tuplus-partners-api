import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { env } from './config/env.js'
import rutas from './routes/index.js'
import { noEncontrado, manejarErrores } from './middlewares/errores.js'

export const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: env.corsOrigins, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }))
app.use(express.json({ limit: '20kb' }))

app.use('/api', rutas)
app.use(noEncontrado)
app.use(manejarErrores)
