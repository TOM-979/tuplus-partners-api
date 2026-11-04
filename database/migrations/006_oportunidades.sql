-- Oportunidades del CRM B2B, desde el primer contacto hasta la posventa
CREATE TABLE oportunidades (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo          VARCHAR(12)  NULL COMMENT 'OP-0001, se genera al guardar',
  partner_id      INT UNSIGNED NOT NULL COMMENT 'Partner que originó la oportunidad',
  empresa         VARCHAR(160) NOT NULL,
  contacto        VARCHAR(120) NULL,
  sector          VARCHAR(80)  NULL,
  ciudad          VARCHAR(80)  NULL,
  necesidad       VARCHAR(160) NULL,
  etapa           ENUM('contacto', 'diagnostico', 'propuesta', 'negociacion', 'cierre', 'posventa') NOT NULL DEFAULT 'contacto',
  monto           DECIMAL(12, 2) NULL,
  moneda          CHAR(3) NOT NULL DEFAULT 'USD',
  proximo_paso    VARCHAR(160) NULL,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_oportunidades_codigo (codigo),
  KEY ix_oportunidades_partner (partner_id),
  KEY ix_oportunidades_etapa (etapa),
  CONSTRAINT fk_oportunidades_partner FOREIGN KEY (partner_id) REFERENCES partners (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
