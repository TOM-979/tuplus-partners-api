# tuplus-partners-api

API (interfaz de programación) del **Portal TUPLUS Partners**. Va en un repositorio aparte del frontend (`tuplus-partners-portal`) y usa Node.js, Express y MySQL.

## Requisitos

- Node.js 20 o superior
- MySQL 8

## Cómo levantarla

```bash
npm install
cp .env.example .env      # completa los datos de tu MySQL
npm run db:crear          # crea la base y todas las tablas
npm run db:semilla        # carga los niveles L0–L6 y los territorios iniciales
npm run dev               # http://localhost:4000/api
```

Para crear el usuario de MySQL de desarrollo (una sola vez, como administrador):

```sql
CREATE USER 'tuplus_dev'@'localhost' IDENTIFIED BY 'cambia_esta_clave';
GRANT ALL PRIVILEGES ON `tuplus_partners%`.* TO 'tuplus_dev'@'localhost';
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la API y la reinicia al guardar cambios |
| `npm start` | Inicia la API (para el servidor) |
| `npm run db:crear` | Aplica las migraciones pendientes. Se puede ejecutar varias veces |
| `npm run db:semilla` | Carga o actualiza los catálogos iniciales |
| `npm run db:reiniciar` | Borra la base, la vuelve a crear y carga los catálogos. Bloqueado en producción |

## Estructura

```
src/
├── config/        variables de entorno (env.js) y conexión a MySQL (db.js)
├── routes/        qué dirección atiende cada controlador
├── controllers/   reciben la solicitud y devuelven la respuesta
├── services/      reglas de negocio (convocatoria abierta, duplicados, historial)
├── models/        consultas SQL, una por tabla
├── middlewares/   validación de datos y manejo central de errores
├── utils/         errores, códigos (POST-0001, P-001, OP-0001)
├── app.js         configuración de Express
└── server.js      arranque y cierre ordenado
database/
├── migrations/    un archivo .sql por tabla, en orden
├── seeds/         niveles L0–L6 y territorios iniciales
└── scripts/       migrar.js y sembrar.js
docs/
└── diagrama-tablas.png   diagrama de las tablas (fuente: diagrama-tablas.mmd)
```

Cada capa solo llama a la de abajo: **ruta → controlador → servicio → modelo**.

## Tablas

| Tabla | Para qué |
|---|---|
| `niveles` | Rangos L0 a L5 y la función de Líder Regional (L6) |
| `territorios` | Zonas y estado de su convocatoria (próximamente, abierta, revisión, cerrada, activa) |
| `usuarios` | Cuentas del Portal: correo, contraseña cifrada, rol y bloqueo por intentos |
| `postulaciones` | Postulaciones a la Red. Sin documento de identidad ni datos bancarios |
| `partners` | Partners activados, con código, nivel, territorio y función de Líder Regional |
| `oportunidades` | CRM B2B, desde el primer contacto hasta la posventa |
| `historial_cambios` | Quién cambió qué, cuándo y por qué. La API solo inserta y lee |
| `migraciones` | Control interno de las migraciones aplicadas |

El diagrama está en `docs/diagrama-tablas.png`.

## Rutas disponibles

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/salud` | Indica si la API y la base de datos responden |
| GET | `/api/niveles` | Lista los niveles L0–L6 |
| GET | `/api/territorios` | Lista los territorios y el estado de su convocatoria (para el selector de la web) |
| POST | `/api/postulaciones` | Registra una postulación |

Ejemplo de postulación:

```json
{
  "nombre": "Nombre Apellido",
  "correo": "usuario@dominio.com",
  "telefono": "+51 987 654 321",
  "territorioId": 1,
  "experiencia": "1_3",
  "disponibilidad": "5_10",
  "sectores": "salud, educación",
  "motivo": "Texto opcional",
  "consentimiento": { "privacidad": true, "terminos": true, "version": "Privacidad v1.0 · Términos v1.0" }
}
```

Reglas que aplica:
- Valida todo en el servidor y descarta cualquier campo que no esté en la lista, como un DNI (documento de identidad).
- Solo acepta postulaciones si la convocatoria del territorio está **abierta**.
- Si el correo ya tiene una postulación activa, no crea otra y responde igual que si fuera nueva, para no revelar qué correos existen. El intento queda en el historial como posible duplicado.
- Guarda la versión de los textos aceptados y la fecha.

## Seguridad incluida

- Claves solo en `.env`, que no se sube. Se sube `.env.example` sin datos reales.
- Cabeceras seguras con Helmet; `x-powered-by` desactivado.
- CORS (intercambio de recursos entre orígenes) limitado a las direcciones de `CORS_ORIGINS`.
- Cuerpo de solicitud limitado a 20 KB.
- Consultas con parámetros (`?`) para evitar inyección SQL.
- En producción, los errores internos no muestran detalles técnicos.

## Lo que viene en las siguientes tareas

| Tarea | Qué se agrega aquí |
|---|---|
| 2. Inicio de sesión | Rutas de acceso, contraseñas cifradas, sesión, límite de intentos y doble verificación |
| 3. Permisos por rol | Protección de rutas según Partner, Líder Regional y Dirección |
| 4. Conectar la web | La web usa `/api/territorios` y `/api/postulaciones` |
| 7. Códigos y niveles | Activación de Partners (P-001) y cambio de nivel con historial |
| 9. CRM | Rutas de oportunidades |

## Ramas

- `main`: versión estable
- `develop`: trabajo en curso
- `feature/nombre-corto`: una rama por tarea, por ejemplo `feature/inicio-sesion`
