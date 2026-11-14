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
npm run db:crear           # crea la base y aplica las migraciones (sin borrar datos)
npm run db:semilla         # carga los niveles L0–L6 y los territorios de TUPLUS
npm run admin:crear -- correo@tuplus.pe "ClaveSegura123"   # crea la cuenta real de Dirección
npm run dev                # http://localhost:4000/api
```

Para crear el usuario de MySQL de desarrollo (una sola vez, como administrador):

```sql
CREATE USER 'tuplus_dev'@'localhost' IDENTIFIED BY 'cambia_esta_clave';
GRANT ALL PRIVILEGES ON `tuplus_partners%`.* TO 'tuplus_dev'@'localhost';
```

**No hay datos de demostración.** La base solo trae lo estructural (niveles y territorios) y la cuenta de Dirección que tú crees. Los cursos, evaluaciones, Partners, empresas, oportunidades y comisiones los crean personas reales desde el portal o el AdminPanel.

`admin:crear` recibe el correo y la contraseña como argumentos o con las variables `ADMIN_CORREO` y `ADMIN_CONTRASENA` (mínimo 12 caracteres con mayúsculas, minúsculas y números). Si la cuenta ya existe, actualiza su contraseña. Dirección pide código de 2.º paso al iniciar sesión.

## Desplegar a producción (migraciones)

Cada vez que se publique una versión con migraciones nuevas, **antes** de usarla corre contra la base de producción:

```bash
# Con las variables de producción (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD) en el entorno o en un .env apuntando a producción
NODE_ENV=production npm run db:desplegar
```

`db:desplegar` aplica solo las migraciones pendientes (nunca borra datos; las migraciones son idempotentes) y luego `db:verificar` comprueba, solo con lectura, que existan todas las tablas, `oportunidades.moneda`, `oportunidades.proximo_paso` y los niveles y territorios. Si falta algo, termina con error.

Para que sea automático, en Vercel (Project Settings → Build Command) usa `npm run db:desplegar`: si una migración falla, el despliegue se detiene en vez de publicar una API rota. Requiere que la base acepte conexiones desde el build de Vercel.

Primera vez en una base vacía: además `npm run db:semilla` y `npm run admin:crear -- correo clave`. Nunca uses `db:reiniciar` en producción (está bloqueado).

## Variables de .env

| Variable | Obligatoria | Qué es |
|---|---|---|
| `PORT` | no | Puerto de la API (4000) |
| `NODE_ENV` | no | `development` o `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | sí | Conexión a MySQL |
| `JWT_SECRET` | sí | Clave de los tokens. En producción debe tener **al menos 32 caracteres** o la API no arranca |
| `CORS_ORIGINS` | en producción | Orígenes del navegador permitidos, separados por coma. En desarrollo, si falta, usa `http://localhost:5173,http://127.0.0.1:5173`. En producción, si falta, la API no arranca. Producción: `https://partners.tuplus.pe,<URL de Vercel del portal>` |
| `TRUST_PROXY` | no | Cantidad de proxys delante de la API (1 en Vercel/Nginx/Railway) para que el límite de intentos vea la IP real |
| `SESION_MINUTOS` / `INACTIVIDAD_MINUTOS` | no | Duración de la sesión (480) y cierre por inactividad (30) |
| `REQUIERE_2FA_ROLES` | no | Roles con código por correo (`direccion`) |

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia la API y la reinicia al guardar cambios |
| `npm start` | Inicia la API (para el servidor) |
| `npm run db:crear` | Aplica las migraciones pendientes. Se puede ejecutar varias veces |
| `npm run db:semilla` | Carga o actualiza los catálogos iniciales (niveles, territorios) |
| `npm run db:reiniciar` | Borra la base, la crea de nuevo y carga niveles y territorios. Bloqueado en producción |
| `npm run db:verificar` | Solo lectura: revisa que la base tenga tablas, columnas y catálogos necesarios |
| `npm run db:desplegar` | Migraciones pendientes + verificación (para producción) |
| `npm run admin:crear -- <correo> <clave>` | Crea la cuenta de Dirección (o cambia su clave) |
| `npm test` | Pruebas de integración sobre una base aparte (`<DB_NAME>_test`); no toca la base del portal |

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
└── scripts/       migrar.js, sembrar.js y crearAdmin.js
tests/             pruebas de integración (npm test)
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
| `evaluaciones_curso` / `intentos_evaluacion` / `certificados` | Evaluación de cada curso, intentos de los Partners y constancias emitidas |
| `empresas_crm` / `contactos_crm` / `seguimientos_crm` | Cartera de empresas, contactos y tareas de seguimiento |
| `comisiones_manual` / `auditoria_etapas` | Comisiones aprobadas manualmente por Dirección y su registro de auditoría |
| `historial_cambios` | Quién cambió qué, cuándo y por qué. La API solo inserta y lee |
| `migraciones` | Control interno de las migraciones aplicadas |

El diagrama está en `docs/diagrama-tablas.png` (no incluye las tablas de esta entrega; sigue sirviendo para las 7 originales).

## Rutas disponibles

Todas cuelgan de `/api`. Las que llevan 🔒 exigen `Authorization: Bearer <token>`; las que además dicen un rol, solo las puede usar ese rol.

### Públicas (para la web corporativa y el formulario de postulación)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/salud` | `{ ok: true }` si la API y MySQL responden; si no, 503 |
| GET | `/certificados/verificar/:codigo` | `{ valido, nombre, titulo, emitido_en }` (solo `{ valido: false }` si no existe) |
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

### Etapas 2, 3 y 4 (`/etapas`) 🔒

Las respuestas llevan `{ dato: ... }`. Las listas vacías devuelven `[]`.

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| GET | `/etapas/cursos` | Partner / Dirección | Cursos con `total_lecciones`, `lecciones_completadas`, `tiene_evaluacion` (Partner: publicados y hasta su nivel) |
| GET | `/etapas/cursos/:id` | idem | Curso + `lecciones` + `intentos` + `evaluacion` (sin respuestas correctas) |
| POST | `/etapas/cursos` | solo Dirección | Crea un curso en borrador con lecciones y preguntas → `{ id }` |
| PATCH | `/etapas/cursos/:id` | solo Dirección | `{ publicado: boolean }` |
| POST | `/etapas/lecciones/:id/completar` | Partner | Marca la lección como completada |
| POST | `/etapas/cursos/:id/evaluar` | Partner | `{ respuestas: [índices] }` → `{ nota, aprobado, minimo }`. Máx. 5 intentos por hora; si aprueba, emite el certificado |
| GET | `/etapas/certificados` | según alcance | Certificados emitidos |
| GET | `/etapas/empresas` | según alcance | Empresas con sus `contactos` |
| POST | `/etapas/empresas` | Partner | `{ nombre, sector, ciudad }` |
| POST | `/etapas/empresas/:id/contactos` | Partner dueño | `{ nombre, cargo, correo, telefono }` |
| GET / POST | `/etapas/oportunidades/:id/seguimientos` | según alcance | Lista o crea seguimientos |
| PATCH | `/etapas/seguimientos/:id/completar` | según alcance | Cierra un seguimiento |
| GET | `/etapas/gestion` | Dirección, Líder Regional | `{ oportunidades, partners, comisiones, pendientes }` |
| POST | `/etapas/comisiones` | solo Dirección | `{ oportunidadId, monto, sustento }` (oportunidad en cierre o posventa) |
| PATCH | `/etapas/comisiones/:id` | solo Dirección | `{ estado, referencia }`: pendiente → aprobada/rechazada → pagada |

Los errores siempre son `{ error: "mensaje en español", detalles? }`.

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
- **Fuerza bruta / password spraying**: `express-rate-limit` corta a 10 intentos fallidos cada 10 minutos por IP y también por cuenta (correo en `/auth/login`, usuario en `/auth/codigo`); además, cada cuenta se bloquea 15 minutos tras 5 contraseñas incorrectas seguidas (columna `bloqueado_hasta` en `usuarios`).
- **Contraseñas**: se guardan solo como hash con `bcrypt` (nunca en texto plano); nunca se devuelven en ninguna respuesta.
- **Sesión**: token JWT firmado con `JWT_SECRET` (en producción, mínimo 32 caracteres), con expiración (`SESION_MINUTOS`). El cierre por inactividad (`INACTIVIDAD_MINUTOS`) lo controla el frontend.
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
