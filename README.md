# tuplus-partners-api

API (interfaz de programación) del **Portal TUPLUS Partners**. Va en un repositorio aparte del frontend (`tuplus-partners-portal`) y usa Node.js, Express y MySQL.

**Estado: completa y funcional.** Login con doble verificación, permisos por rol, postulaciones, activación de Partners, niveles L0–L6, CRM y Academia están implementados y probados contra una base MySQL real. Lo único que falta es lo que solo se puede hacer desde fuera de este repositorio: conectarla con la web (Astro) y con el AdminPanel — ver la sección **"Cómo conectarla con la web y el AdminPanel"** al final.

## Requisitos

- Node.js 20 o superior
- MySQL 8

## Cómo levantarla

```bash
npm install
cp .env.example .env      # completa los datos de tu MySQL y cambia JWT_SECRET
npm run db:crear           # crea la base y todas las tablas
npm run db:semilla         # carga los niveles L0–L6 y los territorios iniciales
npm run db:demo            # (opcional) cuentas y datos de prueba — ver abajo
npm run dev                # http://localhost:4000/api
```

Para crear el usuario de MySQL de desarrollo (una sola vez, como administrador):

```sql
CREATE USER 'tuplus_dev'@'localhost' IDENTIFIED BY 'cambia_esta_clave';
GRANT ALL PRIVILEGES ON `tuplus_partners%`.* TO 'tuplus_dev'@'localhost';
```

### Cuentas de prueba (después de `npm run db:demo`)

| Correo | Contraseña | Rol | Notas |
|---|---|---|---|
| `direccion@tuplus.pe` | `Direccion.2026` | `direccion` | Pide código de 2.º paso. En desarrollo, el código se imprime en la consola del servidor (no se envía correo real todavía) |
| `partner@tuplus.pe` | `Partner.2026` | `partner` | Partner P-001, nivel L2, con 3 oportunidades de ejemplo en el CRM |

También crea 3 postulaciones pendientes de revisión y 2 cursos de Academia con lecciones, para poder probar cada pantalla sin esperar datos reales.

⚠️ **Nunca ejecutes `npm run db:demo` contra la base de producción.**

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la API y la reinicia al guardar cambios |
| `npm start` | Inicia la API (para el servidor) |
| `npm run db:crear` | Aplica las migraciones pendientes. Se puede ejecutar varias veces |
| `npm run db:semilla` | Carga o actualiza los catálogos iniciales (niveles, territorios) |
| `npm run db:demo` | Carga cuentas y datos de prueba (ver tabla arriba). Solo para desarrollo |
| `npm run db:reiniciar` | Borra la base, la crea de nuevo, carga catálogos y datos de prueba. Bloqueado en producción |

## Estructura

```
src/
├── config/        variables de entorno (env.js) y conexión a MySQL (db.js)
├── routes/        qué dirección atiende cada controlador
├── controllers/   reciben la solicitud y devuelven la respuesta
├── services/      reglas de negocio (login, permisos, activación, CRM, Academia...)
├── models/        consultas SQL, una por tabla
├── middlewares/   autenticación, permisos por rol, límite de intentos, validación, errores
├── utils/         errores, tokens (JWT y código de 2.º paso), correo, códigos (POST-0001, P-001, OP-0001)
├── app.js         configuración de Express
└── server.js      arranque y cierre ordenado
database/
├── migrations/    un archivo .sql por tabla, en orden
├── seeds/         niveles L0–L6 y territorios iniciales
└── scripts/       migrar.js, sembrar.js y sembrarDemo.js
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
| `codigos_verificacion` | Códigos de un solo uso para la doble verificación (Dirección) |
| `postulaciones` | Postulaciones a la Red. Sin documento de identidad ni datos bancarios |
| `partners` | Partners activados, con código, nivel, territorio y función de Líder Regional |
| `oportunidades` | CRM B2B, desde el primer contacto hasta la posventa |
| `cursos` / `lecciones` / `progreso_academia` | Contenido de la Academia y el avance de cada Partner |
| `historial_cambios` | Quién cambió qué, cuándo y por qué. La API solo inserta y lee |
| `migraciones` | Control interno de las migraciones aplicadas |

El diagrama está en `docs/diagrama-tablas.png` (no incluye las tablas de esta entrega; sigue sirviendo para las 7 originales).

## Rutas disponibles

Todas cuelgan de `/api`. Las que llevan 🔒 exigen `Authorization: Bearer <token>`; las que además dicen un rol, solo las puede usar ese rol.

### Públicas (para la web corporativa y el formulario de postulación)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/salud` | Indica si la API y la base de datos responden |
| GET | `/niveles` | Lista los niveles L0–L6 |
| GET | `/territorios` | Lista los territorios y el estado de su convocatoria |
| POST | `/postulaciones` | Registra una postulación |

### Acceso (`/auth`)

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/auth/login` | Correo + contraseña. Si el rol necesita doble verificación, responde `{ requiereCodigo: true, usuarioId }` en vez del token |
| POST | `/auth/codigo` | Confirma el código de 6 dígitos del 2.º paso y entrega el token |
| GET | `/auth/yo` 🔒 | Datos de la sesión actual (correo, rol, su Partner si tiene) |
| PATCH | `/auth/contrasena` 🔒 | Cambia la propia contraseña (`{ actual, nueva }`) |

El token (JWT) dura `SESION_MINUTOS` (480 por defecto) y se manda en cada solicitud como `Authorization: Bearer <token>`. El frontend es responsable de cerrar sesión sola tras `INACTIVIDAD_MINUTOS` sin uso.

### Mi perfil (`/perfil`) 🔒 cualquier rol

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/perfil` | Mi rango actual y el siguiente nivel |
| GET | `/perfil/historial` | Mis cambios de nivel / activación |

### CRM (`/crm`) 🔒

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/crm` | cualquiera | Lista oportunidades según el alcance: Partner ve solo las suyas; Líder Regional, las de su territorio; Dirección, todas |
| GET | `/crm/:id` | cualquiera (con el mismo alcance) | Una oportunidad |
| POST | `/crm` | `partner` | Crea una oportunidad en su propia cartera |
| PATCH | `/crm/:id` | cualquiera (con el mismo alcance) | Actualiza datos o mueve de etapa (`contacto → diagnostico → propuesta → negociacion → cierre → posventa`) |

### Academia (`/academia`) 🔒 `partner` / `lider_regional`

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/academia/cursos` | Cursos habilitados hasta el nivel actual del Partner, con su avance |
| GET | `/academia/cursos/:id` | Lecciones del curso (403 si el nivel no lo habilita) |
| POST | `/academia/lecciones/:id/completar` | Marca una lección como completada |

### Dirección (`/direccion`) 🔒 `direccion` / `lider_regional` (lo marcado "solo Dirección" es exclusivo)

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/direccion/postulaciones` | ambos | Lista postulaciones (Líder Regional, solo su territorio) |
| PATCH | `/direccion/postulaciones/:id` | ambos | Cambia a `preseleccionado`, `aclaracion` o `no_seleccionado`, con `motivo` |
| POST | `/direccion/postulaciones/:id/activar` | ambos | Aprueba y crea el Partner (código `P-00X`), su cuenta con clave temporal, y le envía el correo de bienvenida |
| GET | `/direccion/partners` | ambos | Lista Partners |
| PATCH | `/direccion/partners/:id/nivel` | **solo Dirección** | Cambia el rango (`{ nivel: "L3", motivo }`) o asigna la función `L6` (Líder Regional) |
| DELETE | `/direccion/partners/:id/lider-regional` | **solo Dirección** | Quita la función de Líder Regional (vuelve a su rango) |
| GET | `/direccion/territorios` | ambos | Lista territorios |
| PATCH | `/direccion/territorios/:id` | **solo Dirección** | Cambia el estado de la convocatoria |
| GET | `/direccion/historial/:entidad/:id` | ambos | Historial de una postulación, Partner o territorio |
| GET | `/direccion/resumen` | ambos | Conteos para el panel (postulaciones y Partners por estado) |
| GET | `/direccion/reportes` | ambos | Oportunidades y monto por territorio, por etapa y por mes |

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

Esto responde directamente a lo que preguntó el equipo de ciberseguridad (inyección SQL, fuerza bruta, password spraying):

- **Inyección SQL**: todas las consultas usan parámetros (`?`), nunca se concatena texto del usuario dentro de un SQL. `mysql2` escapa los valores automáticamente.
- **Fuerza bruta / password spraying**: `express-rate-limit` corta a 10 intentos cada 10 minutos por IP en `/auth/login` y `/auth/codigo`; además, cada cuenta se bloquea 15 minutos tras 5 contraseñas incorrectas seguidas (columna `bloqueado_hasta` en `usuarios`).
- **Contraseñas**: se guardan solo como hash con `bcrypt` (nunca en texto plano); nunca se devuelven en ninguna respuesta.
- **Sesión**: token JWT firmado con `JWT_SECRET` (cámbialo en producción), con expiración (`SESION_MINUTOS`). El cierre por inactividad (`INACTIVIDAD_MINUTOS`) lo controla el frontend.
- **Doble verificación**: obligatoria para el rol `direccion` (configurable en `REQUIERE_2FA_ROLES`): un código de 6 dígitos de un solo uso, con hash propio, vence en 10 minutos y máximo 5 intentos.
- **Permisos por rol**: cada ruta protegida revisa el rol en el servidor (no basta con ocultar un botón en el frontend); además hay aislamiento de datos: un Partner solo ve su propia cartera del CRM, un Líder Regional solo su territorio.
- Claves y credenciales solo en `.env`, que no se sube. Se sube `.env.example` sin datos reales.
- Cabeceras seguras con Helmet; `x-powered-by` desactivado.
- CORS (intercambio de recursos entre orígenes) limitado a las direcciones de `CORS_ORIGINS`.
- Cuerpo de solicitud limitado a 20 KB.
- En producción, los errores internos no muestran detalles técnicos (mensaje genérico; el detalle solo queda en el log del servidor).
- El historial de cambios (`historial_cambios`) es de solo inserción: nadie, ni la propia API, puede editarlo o borrarlo — sirve como registro de auditoría ante cualquier reclamo.

**Pendiente, para cuando esto pase a producción de verdad** (no es código, es configuración/infraestructura que le corresponde a quien despliegue):
- Conectar `src/utils/correo.js` a un proveedor de correo real (ahora solo imprime en consola/log en desarrollo).
- Servir la API solo por HTTPS (detrás de Nginx, Vercel, etc.) y guardar `JWT_SECRET`/contraseñas de MySQL en un gestor de secretos, no en un `.env` plano en el servidor.
- Revisar con el equipo de ciberseguridad si quieren además un *Web Application Firewall* (WAF) delante, y si el límite de 10 intentos/10 min les parece suficiente para su caso.

## Cómo conectarla con la web y el AdminPanel

Esto es lo que le toca hacer a quien despliegue, desde los otros dos repositorios (no se puede hacer desde aquí):

1. **Desplegar esta API** en un servidor con Node 20 y acceso a un MySQL (por ejemplo, un droplet, Railway, Render, o el mismo servidor del AdminPanel). Definir ahí su propio `.env` con el `JWT_SECRET` real y `CORS_ORIGINS` con los dominios reales de la web y el Portal.
2. **Web corporativa (Astro)**: en el formulario de postulación, reemplazar lo que haya ahora por un `fetch` a `POST https://api.tuplus.pe/api/postulaciones` (y `GET /api/territorios` para el selector de zona). Es JSON normal, no requiere sesión.
3. **AdminPanel (ASP.NET Core)**: si el AdminPanel necesita leer o decidir postulaciones/Partners, lo más simple es que llame a estas mismas rutas de `/api/direccion/...` con un token de un usuario con rol `direccion` (puede generarlo iniciando sesión con `/api/auth/login` igual que el Portal, o se puede agregar una cuenta de servicio si se prefiere no depender de 2FA para llamadas servidor-a-servidor — eso sí es un cambio pequeño en este repo si lo deciden así).
4. **Un solo origen de verdad**: todos (web, Portal, AdminPanel) deberían leer y escribir contra esta misma base de datos a través de esta API, en vez de que cada sistema tenga su copia — así el historial y los permisos por rol siempre quedan completos.
5. Revisar que `CORS_ORIGINS` en el `.env` de producción incluya los dominios finales de la web y el Portal; si el AdminPanel llama desde el servidor (no desde el navegador del usuario), no necesita estar en CORS.

## Ramas

- `main`: versión estable
- `develop`: trabajo en curso
- `feature/nombre-corto`: una rama por tarea, por ejemplo `feature/inicio-sesion`
