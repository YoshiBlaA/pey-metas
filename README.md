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
| `PEY_WEBHOOK_SECRET` | `pey.webhook-secret` | (vacío) | **sí, para recibir pagos** | Secreto `whsec_...` del webhook (portal de Pey). Vacío o mal formado = el webhook responde 401 a todo |
| `PEY_WEBHOOK_ALLOW_UNSIGNED` | `pey.webhook-allow-unsigned` | `false` | no | **Solo desarrollo**: `true` acepta webhooks sin firma, únicamente si `PEY_WEBHOOK_SECRET` está vacío |
| `PEY_WEBHOOK_TOLERANCE_SECONDS` | `pey.webhook-tolerance-seconds` | `300` | no | Diferencia máxima entre `webhook-timestamp` y la hora del servidor |
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
| POST | `/api/webhooks/pey` | público, con firma Standard Webhooks (lo llama Pey) | Webhook de pago `codi.qr.payment_received` (idempotente; 401 si la firma falta o no coincide) |

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
3. Guarda el **secreto del webhook** (`whsec_...`) que te muestra, ponlo en `PEY_WEBHOOK_SECRET` y reinicia la app. **Sin ese secreto el endpoint responde 401 a todos los avisos de Pey y no se registra ningún pago.** Si rotas el secreto en el portal, actualiza la variable.

Notas de Pey: el webhook está ligado a la API key y **cada API key solo puede tener un webhook** (si cambia la URL del túnel, hay que actualizarla). En el mismo engrane, el botón **Webhook Logs** muestra cada intento de entrega, el payload y la respuesta de tu servidor.

### 4. Pagar

Escanea el QR con la app de tu banco (CoDi) y paga $0.01. Pey manda el webhook y la aportación pasa a `PAID`:

```powershell
Invoke-RestMethod "http://localhost:8080/api/public/contributions/$($c.numRef)"
Invoke-RestMethod "http://localhost:8080/api/public/goals/$($goal.id)"
```

### 4-bis. Simular el webhook con un curl firmado (sin pagar)

El endpoint `POST /api/webhooks/pey` verifica la firma [Standard Webhooks](https://www.standardwebhooks.com) que usa Pey: `webhook-signature: v1,<base64(HMAC-SHA256(clave, "{webhook-id}.{webhook-timestamp}.{cuerpo}"))>`, donde la clave son los bytes en base64 que siguen a `whsec_`. Si la firma falta, no coincide, el secreto está vacío o mal formado, o el timestamp tiene más de `PEY_WEBHOOK_TOLERANCE_SECONDS` (5 minutos) de diferencia, responde **401** (`INVALID_SIGNATURE`) y no registra nada.

Para probar en local:

1. Pon en `.env` un secreto propio y reinicia la app (o usa el de Pey si ya lo tienes):
   ```powershell
   'whsec_' + [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
   ```
2. Crea antes una aportación (paso 2) para tener un `numRef` real, y cambia en el cuerpo `numRef`, `codiQrId` y `amount` (por ejemplo `0.01`) por los de tu aportación.
3. Firma el cuerpo **exactamente** como lo mandas (sin acentos, para evitar problemas de codificación). El cuerpo sigue el evento `codi.qr.payment_received` de https://docs.pey.mx/docs/webhooks/codi/qr; `datePaid` es Unix en segundos.

PowerShell:

```powershell
$secret = $env:PEY_WEBHOOK_SECRET   # whsec_...
$id = "msg_prueba_$(Get-Random)"
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$body = '{"amount":150,"codiQrId":"QR-PRUEBA","concept":"Prueba","datePaid":' + $ts + ',"numRef":"1234567","transactionId":"TX-PRUEBA-1","type":"codi.qr.payment_received"}'
$hmac = [Security.Cryptography.HMACSHA256]::new([Convert]::FromBase64String($secret.Substring(6)))
$sig = [Convert]::ToBase64String($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$id.$ts.$body")))
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/webhooks/pey -ContentType 'application/json' `
  -Headers @{ 'webhook-id' = $id; 'webhook-timestamp' = "$ts"; 'webhook-signature' = "v1,$sig" } -Body $body
```

bash (Git Bash, Linux o macOS, con openssl):

```bash
SECRET="$PEY_WEBHOOK_SECRET"   # whsec_...
ID="msg_prueba_$RANDOM"; TS=$(date +%s)
BODY='{"amount":150,"codiQrId":"QR-PRUEBA","concept":"Prueba","datePaid":'"$TS"',"numRef":"1234567","transactionId":"TX-PRUEBA-1","type":"codi.qr.payment_received"}'
KEY_HEX=$(printf '%s' "${SECRET#whsec_}" | base64 -d | od -An -tx1 | tr -d ' \n')
SIG=$(printf '%s' "$ID.$TS.$BODY" | openssl dgst -sha256 -mac HMAC -macopt hexkey:$KEY_HEX -binary | base64)
curl -i -X POST http://localhost:8080/api/webhooks/pey -H 'Content-Type: application/json' \
  -H "webhook-id: $ID" -H "webhook-timestamp: $TS" -H "webhook-signature: v1,$SIG" -d "$BODY"
```

Respuesta esperada: `200 {"received":true,"result":"PROCESSED"}`. Otros resultados: `DUPLICATE` (ese `numRef` ya estaba `PAID`; si repites el mismo cuerpo con nueva firma no se suma de nuevo), `UNKNOWN_NUM_REF`, `IGNORED_EVENT`. Sin firma válida: `401 {"received":false,"result":"INVALID_SIGNATURE"}` (en PowerShell, `Invoke-RestMethod` lo muestra como excepción). Ojo: se suma el `amount` del aviso (el que reporta Pey), aunque sea distinto al de la aportación.

Solo en desarrollo, si quieres mandar avisos sin firmar, deja `PEY_WEBHOOK_SECRET` vacío y pon `PEY_WEBHOOK_ALLOW_UNSIGNED=true`. **Nunca en producción.**

### Otros comportamientos

- La meta se cierra sola al llegar o pasar `targetAmount` y deja de aceptar aportaciones.
- Una tarea programada (cada `WEBHOOK_EXPIRATION_JOB_DELAY_MS`) marca `EXPIRED` las aportaciones `PENDING` vencidas. Si después llega el pago de una expirada, se marca `PAID` igual (el dinero ya se cobró).

## Pendientes conocidos

- En producción, `PEY_WEBHOOK_SECRET` debe ser el secreto real del portal de Pey y `PEY_WEBHOOK_ALLOW_UNSIGNED` debe quedar en `false`.
- Producción: desactivar Swagger si no se quiere público (`springdoc.api-docs.enabled=false`, `springdoc.swagger-ui.enabled=false`) y considerar `ddl-auto: validate` con migraciones.
