// Envuelve un controlador async para que sus errores lleguen al manejador central
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
