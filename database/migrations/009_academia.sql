-- Academia: cursos y lecciones por nivel, con el avance de cada Partner (Tarea 8).
CREATE TABLE cursos (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  titulo        VARCHAR(160) NOT NULL,
  descripcion   VARCHAR(500) NULL,
  nivel_id      TINYINT UNSIGNED NOT NULL COMMENT 'Nivel mínimo para tomar el curso',
  orden         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  publicado     BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_cursos_nivel (nivel_id),
  CONSTRAINT fk_cursos_nivel FOREIGN KEY (nivel_id) REFERENCES niveles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lecciones (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  curso_id      INT UNSIGNED NOT NULL,
  titulo        VARCHAR(160) NOT NULL,
  tipo          ENUM('lectura', 'video', 'evaluacion') NOT NULL DEFAULT 'lectura',
  contenido     TEXT NULL COMMENT 'Texto, enlace de video o instrucciones de la evaluación',
  duracion_min  SMALLINT UNSIGNED NULL,
  orden         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_lecciones_curso (curso_id),
  CONSTRAINT fk_lecciones_curso FOREIGN KEY (curso_id) REFERENCES cursos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE progreso_academia (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id    INT UNSIGNED NOT NULL,
  leccion_id    INT UNSIGNED NOT NULL,
  completado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_progreso (partner_id, leccion_id),
  CONSTRAINT fk_progreso_partner FOREIGN KEY (partner_id) REFERENCES partners (id),
  CONSTRAINT fk_progreso_leccion FOREIGN KEY (leccion_id) REFERENCES lecciones (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
