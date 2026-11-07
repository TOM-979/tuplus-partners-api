import { env } from '../config/env.js'

// En desarrollo no hay servidor de correo: el mensaje se imprime en la consola/log
// para poder probar el flujo completo. En producción, reemplaza este archivo por el
// envío real (SMTP corporativo, SES, SendGrid, etc.) sin tocar quién lo llama.
export async function enviarCorreo({ para, asunto, texto }) {
  if (!env.esProduccion) {
    console.log(`\n----- CORREO (modo desarrollo, no se envía de verdad) -----`)
    console.log(`Para: ${para}\nAsunto: ${asunto}\n\n${texto}`)
    console.log(`-------------------------------------------------------------\n`)
    return
  }
  // TODO (quien conecte el correo real en producción): integrar aquí el proveedor de envío.
  console.warn('enviarCorreo: no hay un proveedor de correo configurado en producción.')
}
