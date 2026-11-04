-- Territorios y estado de su convocatoria (WEB-02 sección 10.1)
CREATE TABLE territorios (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(80)  NOT NULL,
  region          VARCHAR(80)  NOT NULL,
  pais            CHAR(2)      NOT NULL DEFAULT 'PE',
  estado          ENUM('proximamente', 'abierta', 'revision', 'cerrada', 'activa') NOT NULL DEFAULT 'proximamente',
  capacidad       SMALLINT UNSIGNED NULL COMMENT 'Cupos de Partners; NULL si aún no se define',
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_territorios_nombre (pais, nombre),
  KEY ix_territorios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
