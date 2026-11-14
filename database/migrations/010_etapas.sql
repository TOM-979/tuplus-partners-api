CREATE TABLE evaluaciones_curso (
  curso_id INT UNSIGNED PRIMARY KEY,
  minimo TINYINT UNSIGNED NOT NULL DEFAULT 70,
  preguntas JSON NOT NULL,
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE intentos_evaluacion (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id INT UNSIGNED NOT NULL,
  curso_id INT UNSIGNED NOT NULL,
  nota TINYINT UNSIGNED NOT NULL,
  aprobado BOOLEAN NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE certificados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE,
  partner_id INT UNSIGNED NOT NULL,
  curso_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  titulo VARCHAR(160) NOT NULL,
  nota TINYINT UNSIGNED NOT NULL,
  emitido_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_certificado(partner_id, curso_id),
  FOREIGN KEY (partner_id) REFERENCES partners(id),
  FOREIGN KEY (curso_id) REFERENCES cursos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE empresas_crm (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(160) NOT NULL,
  sector VARCHAR(80) NULL,
  ciudad VARCHAR(80) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_empresa_partner(partner_id, nombre),
  FOREIGN KEY (partner_id) REFERENCES partners(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE contactos_crm (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  empresa_id INT UNSIGNED NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  cargo VARCHAR(100) NULL,
  correo VARCHAR(160) NULL,
  telefono VARCHAR(30) NULL,
  FOREIGN KEY (empresa_id) REFERENCES empresas_crm(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE seguimientos_crm (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oportunidad_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('llamada','reunion','nota','posventa') NOT NULL,
  detalle VARCHAR(1000) NOT NULL,
  fecha DATE NULL,
  estado ENUM('pendiente','completado') NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE comisiones_manual (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  oportunidad_id INT UNSIGNED NOT NULL UNIQUE,
  monto DECIMAL(12,2) NOT NULL,
  moneda CHAR(3) NOT NULL,
  sustento VARCHAR(1000) NOT NULL,
  estado ENUM('pendiente','aprobada','rechazada','pagada') NOT NULL DEFAULT 'pendiente',
  creado_por INT UNSIGNED NOT NULL,
  aprobado_por INT UNSIGNED NULL,
  referencia VARCHAR(255) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (oportunidad_id) REFERENCES oportunidades(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE auditoria_etapas (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  entidad VARCHAR(40) NOT NULL,
  entidad_id INT UNSIGNED NOT NULL,
  accion VARCHAR(80) NOT NULL,
  detalle VARCHAR(1000) NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
