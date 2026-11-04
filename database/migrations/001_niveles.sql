-- Catálogo de rangos L0–L5 y la función de Líder Regional (L6), según WEB-02 sección 5.2
CREATE TABLE niveles (
  id           TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo       CHAR(2)          NOT NULL,
  nombre       VARCHAR(60)      NOT NULL,
  tipo         ENUM('rango', 'funcion') NOT NULL DEFAULT 'rango',
  descripcion  VARCHAR(255)     NOT NULL,
  orden        TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_niveles_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
