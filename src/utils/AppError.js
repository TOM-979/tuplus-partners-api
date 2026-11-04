// Error con código HTTP y mensaje pensado para mostrarse al usuario
export class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje)
    this.status = status
    this.detalles = detalles
  }
}
