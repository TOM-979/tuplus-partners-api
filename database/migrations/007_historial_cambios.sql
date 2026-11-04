-- Registro de cada cambio importante: quién, cuándo, qué cambió y por qué.
-- La API solo inserta y lee en esta tabla; nunca actualiza ni borra.
CREATE TABLE historial_cambios (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  entidad         ENUM('postulacion', 'partner', 'territorio', 'oportunidad', 'usuario') NOT NULL,
  entidad_id      INT UNSIGNED NOT NULL,
  accion          VARCHAR(40)  NOT NULL COMMENT 'creado, cambio_estado, cambio_nivel, etc.',
  valor_anterior  VARCHAR(255) NULL,
  valor_nuevo     VARCHAR(255) NULL,
  motivo          VARCHAR(255) NULL,
  usuario_id      INT UNSIGNED NULL COMMENT 'Quién hizo el cambio; NULL si fue el sistema o un postulante',
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_historial_entidad (entidad, entidad_id),
  CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
