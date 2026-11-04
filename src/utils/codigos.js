// Códigos legibles a partir del id: POST-0001, P-001, OP-0001
export const codigoPostulacion = (id) => `POST-${String(id).padStart(4, '0')}`
export const codigoPartner = (id) => `P-${String(id).padStart(3, '0')}`
export const codigoOportunidad = (id) => `OP-${String(id).padStart(4, '0')}`
