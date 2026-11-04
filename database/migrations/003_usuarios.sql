-- Cuentas para iniciar sesión en el Portal. La contraseña se guarda solo como hash (Tarea 2).
CREATE TABLE usuarios (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correo             VARCHAR(160) NOT NULL,
  contrasena_hash    VARCHAR(255) NOT NULL,
  rol                ENUM('partner', 'lider_regional', 'direccion') NOT NULL DEFAULT 'partner',
  estado             ENUM('activo', 'suspendido') NOT NULL DEFAULT 'activo',
  intentos_fallidos  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  bloqueado_hasta    DATETIME NULL,
  ultimo_acceso      DATETIME NULL,
  creado_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
