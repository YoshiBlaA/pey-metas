# PLAN de pey_backend

Documento de referencia para los 5 bots del equipo. Si algo de aquí no te alcanza, propón el cambio en [PETICIONES.md](PETICIONES.md).

## Contexto común

- Usuario: Maruchan (Jairo). Ingeniero en Computación, sabe Java/Spring Boot/MySQL.
- Proyecto: backend de una web app de donaciones/pagos hacia metas de dinero, cobrando con QR de CoDi vía la API de Pey (docs: https://docs.pey.mx). El front-end NO lo hace ningún bot.
- Datos que se piden antes del QR: nombre o apodo, mensaje opcional, opción de pagar como anónimo.

### Flujo

1. Hay metas con barra de progreso.
2. La persona elige un monto predeterminado (configurado por el admin para cada meta) o escribe uno propio.
3. Al aceptar, el backend crea un QR de CoDi en Pey.
4. Cuando paga, Pey manda un webhook y el backend registra quién pagó y cuánto; el front consulta cada pocos segundos (polling) el progreso.
   El webhook NO trae el nombre del pagador: la persona se guarda al crear el QR y se amarra por `numRef`.

### API de Pey (según https://docs.pey.mx; no inventar campos)

Crear QR:

```
POST https://api.pey.mx/codi/qr
Authorization: Bearer <api-key>

{ "amount": 150, "concept": "Pedido #12345", "expiration": 600, "numRef": "12345" }
```

Webhook de pago recibido (ejemplo de la documentación):

```
POST <nuestro-servidor>/api/webhooks/pey
webhook-signature: v1,...

{
  "amount": 150,
  "apiKeyId": "...",
  "codiQrId": "...",
  "concept": "Pedido #12345",
  "datePaid": 1790724818,
  "numRef": "12345",
  "transactionId": "...",
  "type": "codi.qr.payment_received"
}
```

El payload documentado en https://docs.pey.mx/docs/webhooks/codi/qr además incluye `bankAccountId` (solo si se mandó al crear el QR) y `metadata` (objeto); el backend los ignora. Notas de la documentación: `datePaid` viene como timestamp Unix (segundos); Pey firma las entregas con Standard Webhooks (header `webhook-signature`). Pey recomienda probar en producción con montos pequeños como $0.01 MXN. Para la respuesta exacta de "Crear QR" y la verificación de firma, revisar la página específica en docs.pey.mx antes de programarla.

## Decisiones fijas

- Java 21, Maven (con Maven Wrapper), Spring Boot 3.x (base: **3.5.16**), MySQL, Spring Data JPA (`ddl-auto: update`).
- Spring Security con JWT para el admin (jjwt **0.12.7**).
- Arquitectura en capas: controller, service, repository, más dto/entity.
- Swagger/OpenAPI con springdoc (**2.10.0**). Esquema de seguridad `bearerAuth` definido en `OpenApiConfig.BEARER_AUTH`.
- Configuración por variables de entorno (`.env` + `.env.example`, nunca subir secretos). README.
- QR vigente 20 minutos (`expiration=1200`).
- Varias metas con panel de admin. Al alcanzar la meta se cierra y no acepta más pagos.
- Los QR expirados o no pagados se marcan como expirados.
- Montos en MXN con `BigDecimal`.
- `@EnableScheduling` ya está en `PeyBackendApplication`.

## Paquetes

Paquete base: `com.pey.meta`. Módulos: `config`, `common`, `auth`, `goal`, `contribution`, `webhook` (cada uno ya tiene `package-info.java`).

## Variables de entorno y propiedades (nombres exactos)

Usa las **propiedades** en tu código (`@Value("${pey.api-key}")` o `@ConfigurationProperties`), no `System.getenv`.

| Variable de entorno | Propiedad Spring | Default | Uso |
|---|---|---|---|
| `DB_URL` | `spring.datasource.url` | MySQL local `pey_backend` | BD |
| `DB_USER` | `spring.datasource.username` | `root` | BD |
| `DB_PASSWORD` | `spring.datasource.password` | (vacío) | BD |
| `PEY_API_KEY` | `pey.api-key` | (vacío) | CobroBot (PeyClient) |
| `PEY_API_URL` | `pey.api-url` | `https://api.pey.mx` | CobroBot (PeyClient) |
| `QR_EXPIRATION_SECONDS` | `pey.qr-expiration-seconds` | `1200` | CobroBot / WebhookBot |
| `JWT_SECRET` | `app.jwt.secret` | (vacío) | GuardiaBot |
| `JWT_EXPIRATION` | `app.jwt.expiration` | `3600000` (ms) | GuardiaBot |
| `ADMIN_USERNAME` | `app.admin.username` | `admin` | GuardiaBot (admin inicial) |
| `ADMIN_PASSWORD` | `app.admin.password` | (vacío) | GuardiaBot (admin inicial) |
| `CORS_ORIGINS` | `app.cors.origins` | `http://localhost:3000,http://localhost:5173` | `CorsConfig` |
| `PEY_GENERATE_IMAGE` | `pey.generate-image` | `false` | CobroBot (pide `qrImage` a Pey) |
| `PEY_CONNECT_TIMEOUT_MS` | `pey.connect-timeout-ms` | `5000` | CobroBot (PeyClient) |
| `PEY_READ_TIMEOUT_MS` | `pey.read-timeout-ms` | `30000` | CobroBot (PeyClient) |
| `WEBHOOK_EXPIRATION_JOB_DELAY_MS` | `webhook.expiration-job.delay-ms` | `60000` | WebhookBot (job de expiración) |
| `WEBHOOK_EXPIRATION_JOB_INITIAL_DELAY_MS` | `webhook.expiration-job.initial-delay-ms` | `60000` | WebhookBot (job de expiración) |

Notas: `JWT_SECRET` es obligatorio (mínimo 32 bytes) o la app no arranca; `QR_EXPIRATION_SECONDS` debe ser >= 360 (mínimo de Pey).

En pruebas, `src/test/resources/application.yml` usa H2 en memoria y valores falsos para todo lo anterior.

## Lo que ya existe en main (CimientoBot)

- `config/CorsConfig`: bean `corsConfigurationSource` (lee `app.cors.origins`). **GuardiaBot:** en `SecurityConfig` usa `http.cors(Customizer.withDefaults())` para tomarlo.
- `config/OpenApiConfig`: info de la API y esquema `bearerAuth` (JWT). En controladores de admin: `@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)`.
- `common/ErrorResponse` (record: `timestamp`, `status`, `error`, `message`, `path`, `errors` con `FieldError(field, message)`).
- `common/NotFoundException` → 404.
- `common/BusinessException` → 422 por defecto; `BusinessException.conflict(msg)` o `new BusinessException(msg, HttpStatus.CONFLICT)` → 409.
- `common/GlobalExceptionHandler` (`@RestControllerAdvice`): 404, 409/422 de negocio, 400 de validación y cuerpo mal formado, 500 genérico. Las excepciones de Spring Security se relanzan para que respondan 401/403.
- `config/SecurityConfig` (GuardiaBot): stateless con JWT, CSRF desactivado, CORS con `corsConfigurationSource`, `/api/admin/**` con rol ADMIN y públicos `/api/public/**`, `/api/webhooks/**`, `/api/auth/login`, Swagger y `/error`.

## Contratos entre módulos (nombres exactos)

- **goal**: entidad `Goal` (`id` Long, `title`, `description`, `targetAmount` BigDecimal, `raisedAmount` BigDecimal, `presetAmounts` lista de BigDecimal, `status` enum `GoalStatus {OPEN, CLOSED}`, `createdAt`, `updatedAt`). `GoalService` expone:
  - `Goal getOpenGoalOrThrow(Long goalId)` (lanza excepción si no existe o está cerrada).
  - `Goal registerPayment(Long goalId, BigDecimal amount)` (suma a `raisedAmount` y si llega o pasa `targetAmount` pone `CLOSED`; transaccional).
- **contribution**: entidad `Contribution` (`id` Long, `goal` ManyToOne, `displayName` String nullable, `anonymous` boolean, `message` String nullable, `amount` BigDecimal, `numRef` String único, `codiQrId` String, datos del QR que regrese Pey, `status` enum `ContributionStatus {PENDING, PAID, EXPIRED}`, `expiresAt`, `paidAt`, `transactionId`, `createdAt`). `ContributionRepository` con:
  - `Optional<Contribution> findByNumRef(String numRef)`
  - `List<Contribution> findByStatusAndExpiresAtBefore(ContributionStatus status, Instant time)`
- **auth**: protege `/api/admin/**`; deja públicos `/api/public/**`, `/api/webhooks/**`, `/api/auth/login`, `/swagger-ui/**`, `/v3/api-docs/**` (agregar también `/swagger-ui.html`).

## Rutas

| Ruta | Acceso | Módulo |
|---|---|---|
| `POST /api/auth/login` | público | auth |
| `/api/admin/goals` | admin (JWT) | goal |
| `/api/public/goals` (lista y detalle con progreso) | público | goal |
| `POST /api/public/goals/{id}/contributions` (crear QR) | público | contribution |
| `GET /api/public/contributions/{numRef}` (estado de un cobro) | público | contribution |
| `POST /api/webhooks/pey` | público (Pey) | webhook |

## Equipo y zonas

1. **CimientoBot** (rama `main`): proyecto base, `pom.xml`, `application.yml`, `.env.example`, `.gitignore`, README, `docs/`, config general (CORS, OpenAPI), paquete `common`. Al final integra todas las ramas a `main`.
2. **GuardiaBot** (rama `feature/auth`): paquete `auth` y `config/SecurityConfig`: entidad `AdminUser`, login con JWT, filtro JWT, admin inicial desde variables de entorno.
3. **MetaBot** (rama `feature/goals`): paquete `goal`: CRUD admin de metas y montos predeterminados, endpoints públicos con progreso.
4. **CobroBot** (rama `feature/contributions`): paquete `contribution`: entidad, repositorio, PeyClient, endpoint para crear aportación y QR, endpoint de estado por `numRef`.
5. **WebhookBot** (rama `feature/webhooks`): paquete `webhook`: endpoint del webhook de Pey idempotente y tarea programada que marca expirados.

## Orden de trabajo

CimientoBot primero → GuardiaBot → MetaBot → CobroBot → WebhookBot (uno a la vez, en ese orden) → al final CimientoBot integra (merge a `main` de `feature/auth`, `feature/goals`, `feature/contributions`, `feature/webhooks`, en ese orden).

## Reglas para no romper el proyecto

- Git con una rama por bot. Todos comparten la misma carpeta, así que SOLO trabaja un bot a la vez: antes de empezar revisa `git status` (debe estar limpio) y cámbiate a tu rama (créala desde `main` si no existe; si `main` avanzó, haz merge de `main` a tu rama). Al terminar, haz commit de todo en tu rama y regresa a `main` (`git switch main`) para dejar la carpeta lista para el siguiente bot. Nunca hagas merge a `main`: eso lo hace CimientoBot.
- Toca solo tus archivos (tu zona). Si necesitas cambiar algo de otra zona (por ejemplo `pom.xml` o `application.yml`, que son de CimientoBot), no lo edites: anótalo en `docs/PETICIONES.md` con tu nombre y díselo a Maruchan.
- Nunca borres ni reescribas archivos de otro bot. Nunca hagas force push, `reset --hard` ni borres ramas.
- Respeta los contratos de arriba; si uno no te alcanza, propón el cambio en `docs/PETICIONES.md`.
- Antes de hacer commit, compila con `mvnw.cmd -q -DskipTests compile` (o `mvn`) y que pase. Escribe pruebas unitarias básicas de tu parte si da tiempo.
- No pongas la API key de Pey ni contraseñas en el código; léelas de variables de entorno.
- Nunca inventes campos de la API de Pey: si dudas, revisa https://docs.pey.mx.

## Estado tras la integración final (2026-11-15)

- `main` integra `feature/auth`, `feature/goals`, `feature/contributions` y `feature/webhooks` (merges `--no-ff`, sin conflictos).
- Peticiones de `docs/PETICIONES.md` atendidas (propiedades opcionales en `application.yml` y `.env.example`).
- Endpoints reales: ver la tabla del README (incluye `GET /api/admin/me` y `POST /api/admin/goals/{id}/close|reopen`).
- **Pendiente (decisión de Maruchan):** verificar la firma Standard Webhooks del webhook de Pey. El secreto `whsec_...` lo muestra el portal de Pey (Desarrollador → engrane de la API key) al crear el webhook; cada API key tiene un solo webhook. Hoy `NoOpWebhookSignatureVerifier` acepta todo y el webhook suma el `amount` que recibe, así que sin firma cualquiera podría simular pagos. Implementarlo en `webhook.security` reemplazando el bean y leyendo `PEY_WEBHOOK_SECRET` (aún no existe en `application.yml`).
