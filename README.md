# pey_backend

Backend de una web app de donaciones hacia **metas de dinero** con barra de progreso. Los pagos se cobran con **QR de CoDi** a través de la API de [Pey](https://docs.pey.mx). El front-end no forma parte de este repositorio.

> Estado: proyecto base (CimientoBot). Los módulos `auth`, `goal`, `contribution` y `webhook` se construyen en sus ramas `feature/*` y se integran a `main` al final. Ver [docs/PLAN.md](docs/PLAN.md).

## Stack

- Java 21, Maven (incluye Maven Wrapper)
- Spring Boot 3.5.16 (web, data-jpa, security, validation)
- MySQL (`mysql-connector-j`), Spring Data JPA (`ddl-auto: update`)
- JWT con jjwt 0.12.7
- Swagger / OpenAPI con springdoc 2.10.0
- Lombok (opcional), H2 solo para pruebas

## Requisitos

- JDK 21 (`JAVA_HOME` apuntando a él)
- MySQL 8+ corriendo (la URL por defecto crea la base `pey_backend` si no existe)
- No necesitas Maven instalado: usa `mvnw` / `mvnw.cmd`

## Configuración

Copia `.env.example` a `.env` y llena los valores. **Nunca subas `.env`.**
Spring Boot lee variables de entorno, no el archivo `.env` directamente: cárgalas en tu terminal o en la configuración de ejecución de tu IDE.

| Variable | Propiedad | Default |
|---|---|---|
| `DB_URL` | `spring.datasource.url` | `jdbc:mysql://localhost:3306/pey_backend?...` |
| `DB_USER` | `spring.datasource.username` | `root` |
| `DB_PASSWORD` | `spring.datasource.password` | (vacío) |
| `PEY_API_KEY` | `pey.api-key` | (vacío) |
| `PEY_API_URL` | `pey.api-url` | `https://api.pey.mx` |
| `QR_EXPIRATION_SECONDS` | `pey.qr-expiration-seconds` | `1200` |
| `JWT_SECRET` | `app.jwt.secret` | (vacío) |
| `JWT_EXPIRATION` | `app.jwt.expiration` (ms) | `3600000` |
| `ADMIN_USERNAME` | `app.admin.username` | `admin` |
| `ADMIN_PASSWORD` | `app.admin.password` | (vacío) |
| `CORS_ORIGINS` | `app.cors.origins` | `http://localhost:3000,http://localhost:5173` |

## Cómo correrlo

```powershell
# Windows (PowerShell)
.\mvnw.cmd spring-boot:run
```

```bash
# Linux / macOS
./mvnw spring-boot:run
```

Compilar y probar:

```powershell
.\mvnw.cmd -q -DskipTests compile
.\mvnw.cmd test
```

Las pruebas usan H2 en memoria (`src/test/resources/application.yml`), así que no requieren MySQL.

## Swagger

- UI: http://localhost:8080/swagger-ui.html
- JSON: http://localhost:8080/v3/api-docs

## Endpoints (planeados)

| Ruta | Acceso | Módulo |
|---|---|---|
| `POST /api/auth/login` | público | auth |
| `/api/admin/goals` | admin (JWT) | goal |
| `GET /api/public/goals`, `GET /api/public/goals/{id}` | público | goal |
| `POST /api/public/goals/{id}/contributions` | público | contribution |
| `GET /api/public/contributions/{numRef}` | público | contribution |
| `POST /api/webhooks/pey` | público (Pey) | webhook |

Se completará al integrar las ramas (incluyendo cómo probar el webhook con montos de $0.01).
