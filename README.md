# pey_backend

Backend de una web app de donaciones hacia **metas de dinero** con barra de progreso. Cada aportación se cobra con un **QR de CoDi** creado con la API de [Pey](https://docs.pey.mx). Cuando la persona paga, Pey avisa por webhook y el backend suma el monto a la meta. El front-end no forma parte de este repositorio: consulta el progreso por polling.

## Stack

- Java 21, Maven (incluye Maven Wrapper: `mvnw` / `mvnw.cmd`)
- Spring Boot 3.5.16 (web, data-jpa, security, validation), `@EnableScheduling`
- MySQL 8+ con Spring Data JPA (`ddl-auto: update`, crea/actualiza tablas solo)
- Spring Security stateless con JWT (jjwt 0.12.7) para el panel de admin
- Swagger / OpenAPI con springdoc 2.10.0
- Lombok; H2 en memoria solo para pruebas

Paquetes (`com.pey.meta`): `config` (CORS, OpenAPI, seguridad), `common` (errores), `auth`, `goal`, `contribution`, `webhook`. Detalles de diseño y contratos en [docs/PLAN.md](docs/PLAN.md).

## Requisitos

- **JDK 21**. Si tu `JAVA_HOME` global apunta a otra versión, cámbialo solo en la terminal:
  ```powershell
  $env:JAVA_HOME = 'C:\Users\<tu-usuario>\.jdks\ms-21.0.12.1'   # o la ruta de tu JDK 21
  ```
- **MySQL 8+** corriendo. La URL por defecto crea la base `pey_backend` si no existe.
- No necesitas Maven instalado: el wrapper lo descarga.
- Para probar pagos reales: una API key de Pey (portal https://portal.mipey.mx) y un túnel público (ngrok o cloudflared) para recibir el webhook.

## Configuración (variables de entorno)

1. Copia `.env.example` a `.env` y llena los valores. **`.env` está en `.gitignore`: nunca lo subas.**
2. Spring Boot **no lee `.env` solo**: carga las variables en tu terminal (abajo) o en la configuración de ejecución de tu IDE (IntelliJ: *Run Configuration → Environment variables*).

| Variable | Propiedad Spring | Default | Obligatoria | Para qué |
|---|---|---|---|---|
| `DB_URL` | `spring.datasource.url` | `jdbc:mysql://localhost:3306/pey_backend?createDatabaseIfNotExist=true&...` | no | Conexión a MySQL |
| `DB_USER` | `spring.datasource.username` | `root` | no | Usuario de MySQL |
| `DB_PASSWORD` | `spring.datasource.password` | (vacío) | según tu MySQL | Contraseña de MySQL |
| `PEY_API_KEY` | `pey.api-key` | (vacío) | sí, para crear QR | API key de Pey (si falta, crear aportación responde 502) |
| `PEY_API_URL` | `pey.api-url` | `https://api.pey.mx` | no | URL base de Pey |
| `QR_EXPIRATION_SECONDS` | `pey.qr-expiration-seconds` | `1200` | no | Vigencia del QR; mínimo 360 (Pey) o la app no arranca |
| `PEY_GENERATE_IMAGE` | `pey.generate-image` | `false` | no | `true` = Pey regresa `qrImage` en base64 (más lento) |
| `PEY_CONNECT_TIMEOUT_MS` | `pey.connect-timeout-ms` | `5000` | no | Timeout de conexión a Pey |
| `PEY_READ_TIMEOUT_MS` | `pey.read-timeout-ms` | `30000` | no | Timeout de lectura a Pey |
| `JWT_SECRET` | `app.jwt.secret` | (vacío) | **sí** | Secreto HS256, mínimo 32 bytes (de preferencia Base64). Sin él la app no arranca |
| `JWT_EXPIRATION` | `app.jwt.expiration` | `3600000` | no | Vigencia del JWT en milisegundos |
| `ADMIN_USERNAME` | `app.admin.username` | `admin` | no | Admin inicial |
| `ADMIN_PASSWORD` | `app.admin.password` | (vacío) | sí, la primera vez | Si está vacío no se crea el admin inicial |
| `CORS_ORIGINS` | `app.cors.origins` | `http://localhost:3000,http://localhost:5173` | no | Orígenes del front, separados por comas |
| `WEBHOOK_EXPIRATION_JOB_DELAY_MS` | `webhook.expiration-job.delay-ms` | `60000` | no | Cada cuánto se marcan expiradas las aportaciones vencidas |
| `WEBHOOK_EXPIRATION_JOB_INITIAL_DELAY_MS` | `webhook.expiration-job.initial-delay-ms` | `60000` | no | Espera antes de la primera corrida |
| `PORT` | `server.port` | `8080` | no | Puerto HTTP |

El admin inicial se crea al arrancar **solo si no existe**; cambiar `ADMIN_PASSWORD` después no modifica un admin ya creado.

Generar un `JWT_SECRET` aleatorio:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

```bash
openssl rand -base64 48
```

## Cómo correrlo

### Windows (PowerShell)

```powershell
cd C:\ruta\a\pey_backend
# Cargar .env en la sesión actual (ignora comentarios y líneas vacías)
Get-Content .env | Where-Object { $_ -match '^\s*[^#\s][^=]*=' } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    Set-Item -Path "env:$($name.Trim())" -Value $value.Trim()
}
.\mvnw.cmd spring-boot:run
```

### Linux / macOS

```bash
set -a; source .env; set +a
./mvnw spring-boot:run
```

La API queda en `http://localhost:8080`.

### Compilar y probar

```powershell
.\mvnw.cmd -q -DskipTests compile
.\mvnw.cmd test
```

Las pruebas usan H2 en memoria (`src/test/resources/application.yml`) con valores falsos: no necesitan MySQL, ni Pey, ni `.env`.

## Swagger

- UI: http://localhost:8080/swagger-ui/index.html (también `/swagger-ui.html`)
- OpenAPI JSON: http://localhost:8080/v3/api-docs

Para probar endpoints de admin en Swagger: haz login, copia el `token` y pégalo en el botón **Authorize** (esquema `bearerAuth`).

## Endpoints

| Método | Ruta | Acceso | Qué hace |
|---|---|---|---|
| POST | `/api/auth/login` | público | Login de admin; regresa `{token, tokenType, expiresIn}` |
| GET | `/api/admin/me` | admin (JWT) | Admin del token |
| POST | `/api/admin/goals` | admin (JWT) | Crear meta (nace OPEN con `raisedAmount` 0) |
| GET | `/api/admin/goals?status=OPEN\|CLOSED` | admin (JWT) | Listar metas (filtro opcional) |
| GET | `/api/admin/goals/{id}` | admin (JWT) | Ver una meta |
| PUT | `/api/admin/goals/{id}` | admin (JWT) | Editar meta (reemplaza todos los campos) |
| POST | `/api/admin/goals/{id}/close` | admin (JWT) | Cerrar meta |
| POST | `/api/admin/goals/{id}/reopen` | admin (JWT) | Reabrir meta (solo si no se ha alcanzado) |
| GET | `/api/public/goals?status=OPEN\|CLOSED` | público | Listar metas con progreso |
| GET | `/api/public/goals/{id}` | público | Detalle con progreso, montos predeterminados y últimas aportaciones (para polling) |
| POST | `/api/public/goals/{goalId}/contributions` | público | Crear aportación y QR de CoDi en Pey |
| GET | `/api/public/contributions/{numRef}` | público | Estado de una aportación (PENDING, PAID, EXPIRED) para polling |
| POST | `/api/webhooks/pey` | público (lo llama Pey) | Webhook de pago `codi.qr.payment_received` (idempotente) |

Errores: todas las respuestas de error usan el mismo formato `{timestamp, status, error, message, path, errors[]}` (404 no encontrado, 400 validación, 409/422 reglas de negocio, 502 si Pey falla, 401/403 sin token o sin permiso).

## Login y uso del JWT

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/auth/login `
  -ContentType 'application/json' -Body (@{ username = 'admin'; password = $env:ADMIN_PASSWORD } | ConvertTo-Json)
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Uri http://localhost:8080/api/admin/me -Headers $headers
```

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"admin\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r .token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/admin/me
```

El token vence según `JWT_EXPIRATION`; después hay que volver a hacer login.

## Probar un pago de punta a punta con $0.01

Pey no tiene ambiente de pruebas todavía: su documentación recomienda probar **en producción con montos pequeños como $0.01 MXN**.

### 1. Crear una meta (admin)

```powershell
$goal = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/admin/goals -Headers $headers `
  -ContentType 'application/json' -Body (@{
    title = 'Meta de prueba'; description = 'Prueba con centavos'
    targetAmount = 1.00; presetAmounts = @(0.01, 0.50)
  } | ConvertTo-Json)
$goal.id
```

### 2. Crear una aportación de $0.01 y obtener el QR (público)

```powershell
$c = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/public/goals/$($goal.id)/contributions" `
  -ContentType 'application/json' -Body (@{ amount = 0.01; displayName = 'Jairo'; anonymous = $false; message = 'Prueba' } | ConvertTo-Json)
$c   # numRef (7 dígitos), codiQrId, qrString, expiresAt, status = PENDING
```

`qrString` es el contenido del QR: el front lo dibuja (o activa `PEY_GENERATE_IMAGE=true` para recibir `qrImage` en base64). Para esto necesitas `PEY_API_KEY` real.

### 3. Exponer tu puerto local y registrar el webhook en Pey

Pey necesita una URL pública HTTPS. Con cualquiera de estos túneles:

```powershell
cloudflared tunnel --url http://localhost:8080      # te da https://<algo>.trycloudflare.com
# o
ngrok http 8080                                     # te da https://<algo>.ngrok-free.app
```

Registro en Pey (según https://docs.pey.mx/docs/tutorials/getting-started/set-up-webhooks):

1. En el portal de Pey ve a la sección **Desarrollador** y haz clic en el engrane de tu API key.
2. Agrega la URL `https://<tu-tunel>/api/webhooks/pey` y haz clic en **Crear Webhook**.
3. Guarda el **secreto del webhook** que te muestra (sirve para verificar la firma; ver Pendientes).

Notas de Pey: el webhook está ligado a la API key y **cada API key solo puede tener un webhook** (si cambia la URL del túnel, hay que actualizarla). En el mismo engrane, el botón **Webhook Logs** muestra cada intento de entrega, el payload y la respuesta de tu servidor.

### 4. Pagar

Escanea el QR con la app de tu banco (CoDi) y paga $0.01. Pey manda el webhook y la aportación pasa a `PAID`:

```powershell
Invoke-RestMethod "http://localhost:8080/api/public/contributions/$($c.numRef)"
Invoke-RestMethod "http://localhost:8080/api/public/goals/$($goal.id)"
```

### 4-bis. Simular el webhook sin pagar (solo local)

El cuerpo es el del evento `codi.qr.payment_received` documentado en https://docs.pey.mx/docs/webhooks/codi/qr. Usa el `numRef` y `codiQrId` que te regresó el paso 2; `datePaid` es Unix en segundos y `transactionId` es el identificador de la transacción en Pey. Si mandas otro aviso para un `numRef` que ya está `PAID`, el backend responde `DUPLICATE` y no suma de nuevo. Ojo: se suma el `amount` que manda el aviso (es el que reporta Pey), aunque sea distinto al de la aportación.

```powershell
$body = @{
  amount = 0.01; apiKeyId = 'prueba-local'; codiQrId = $c.codiQrId; concept = 'Prueba'
  datePaid = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds(); numRef = $c.numRef
  transactionId = 'SIMULADO-' + [guid]::NewGuid(); type = 'codi.qr.payment_received'
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/webhooks/pey -ContentType 'application/json' -Body $body
# {"received":true,"result":"PROCESSED"}  (otros valores: DUPLICATE, UNKNOWN_NUM_REF, IGNORED_EVENT)
```

```bash
curl -X POST http://localhost:8080/api/webhooks/pey -H 'Content-Type: application/json' -d '{
  "amount": 0.01, "apiKeyId": "prueba-local", "codiQrId": "<codiQrId>", "concept": "Prueba",
  "datePaid": 1790724818, "numRef": "<numRef>", "transactionId": "SIMULADO-1", "type": "codi.qr.payment_received"
}'
```

Esto funciona **solo porque la verificación de firma todavía no está activa** (ver Pendientes). Cuando se active, un POST sin headers `webhook-id`, `webhook-timestamp` y `webhook-signature` válidos responderá 401.

### Otros comportamientos

- La meta se cierra sola al llegar o pasar `targetAmount` y deja de aceptar aportaciones.
- Una tarea programada (cada `WEBHOOK_EXPIRATION_JOB_DELAY_MS`) marca `EXPIRED` las aportaciones `PENDING` vencidas. Si después llega el pago de una expirada, se marca `PAID` igual (el dinero ya se cobró).

## Pendientes conocidos

- **Firma del webhook**: Pey firma con [Standard Webhooks](https://www.standardwebhooks.com) (headers `webhook-id`, `webhook-timestamp`, `webhook-signature`) usando el secreto que da el portal. Hoy `NoOpWebhookSignatureVerifier` acepta todo. Como el `numRef` se le regresa al público y el backend suma el `amount` del aviso, cualquiera podría crear una aportación, no pagarla y mandar un aviso falso con cualquier monto (incluso cerrar la meta). **Hay que implementarla antes de publicar la app** (variable sugerida `PEY_WEBHOOK_SECRET`).
- Producción: desactivar Swagger si no se quiere público (`springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false`) y considerar `ddl-auto: validate` con migraciones.
