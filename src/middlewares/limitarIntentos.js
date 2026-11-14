import rateLimit from 'express-rate-limit'

// Frena fuerza bruta y password spraying: solo cuentan los intentos fallidos (respuesta >= 400).
const base = {
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
}

// Por IP: máx. 10 intentos fallidos cada 10 minutos desde la misma red
export const limitarLogin = rateLimit({
  ...base,
  message: { error: 'Demasiados intentos de inicio de sesión desde esta red. Espera unos minutos e intenta de nuevo.' },
})

// Por cuenta: el mismo correo (o el mismo usuarioId en el paso del código) no puede probarse sin freno desde varias IP
const porCuenta = (campo) => rateLimit({
  ...base,
  keyGenerator: (req) => `${campo}:${String(req.body?.[campo] ?? '').trim().toLowerCase().slice(0, 160)}`,
  skip: (req) => !req.body?.[campo], // sin dato, ya lo frena el límite por IP
  message: { error: 'Demasiados intentos con esta cuenta. Espera unos minutos e intenta de nuevo.' },
})
export const limitarLoginPorCorreo = porCuenta('correo')
export const limitarCodigoPorCuenta = porCuenta('usuarioId')

// Verificación pública de certificados: evita que se use para adivinar códigos
export const limitarVerificacion = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas. Espera unos minutos e intenta de nuevo.' },
})
