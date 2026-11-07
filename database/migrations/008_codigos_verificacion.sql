-- Código de un solo uso para la doble verificación por correo (obligatoria para Dirección, Tarea 2).
CREATE TABLE codigos_verificacion (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  codigo_hash VARCHAR(255) NOT NULL,
  expira_en   DATETIME NOT NULL,
  usado       BOOLEAN NOT NULL DEFAULT FALSE,
  intentos    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_codigos_usuario (usuario_id),
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
