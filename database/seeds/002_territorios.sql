-- Territorios iniciales según WEB-02. Los estados son provisionales hasta la decisión D8 de Dirección.
INSERT INTO territorios (nombre, region, pais, estado, capacidad) VALUES
  ('Barranca', 'Lima Provincias', 'PE', 'proximamente', NULL),
  ('Norte Chico', 'Lima Provincias', 'PE', 'proximamente', NULL),
  ('Lima Metropolitana', 'Lima', 'PE', 'proximamente', NULL),
  ('Tercera zona piloto', 'Por definir', 'PE', 'proximamente', NULL)
ON DUPLICATE KEY UPDATE region = VALUES(region);
