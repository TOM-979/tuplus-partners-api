import rateLimit from 'express-rate-limit'

// Frena fuerza bruta y password spraying contra el login: máx. 10 intentos cada 10 minutos por IP
export const limitarLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión desde esta red. Espera unos minutos.' },
})
