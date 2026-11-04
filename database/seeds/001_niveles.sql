-- Rangos según WEB-02. L6 (Líder Regional) es una función, por confirmar en la reunión técnica.
INSERT INTO niveles (codigo, nombre, tipo, descripcion, orden) VALUES
  ('L0', 'Postulante', 'rango', 'Envió su postulación. Todavía no pertenece a TUPLUS.', 0),
  ('L1', 'Candidato en formación', 'rango', 'Pasó el filtro y está en formación inicial. No representa ni cotiza.', 1),
  ('L2', 'Socio Comercial TUPLUS', 'rango', 'Aprobado y activado para originar y registrar oportunidades.', 2),
  ('L3', 'Consultor B2B TUPLUS', 'rango', 'Hace el diagnóstico inicial con la metodología TUPLUS.', 3),
  ('L4', 'Senior Partner TUPLUS', 'rango', 'Resultados cobrados, documentación, calidad y conducta sostenidas.', 4),
  ('L5', 'MASTER PARTNER TUPLUS', 'rango', 'Rango avanzado por mérito: experiencia, liderazgo y formación continua.', 5),
  ('L6', 'Líder Regional TUPLUS', 'funcion', 'Función territorial por nombramiento. Coexiste con un rango, no lo reemplaza.', 6)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = VALUES(tipo), descripcion = VALUES(descripcion), orden = VALUES(orden);
