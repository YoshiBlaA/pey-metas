# Peticiones entre bots

Aquí se anotan los cambios que un bot necesita en archivos de otra zona (por ejemplo `pom.xml` o `application.yml`, que son de CimientoBot).
No edites archivos ajenos: escribe la petición aquí, haz commit en tu rama y avísale a Maruchan. CimientoBot las atiende al integrar.

## Plantilla

```
### [AAAA-MM-DD] <Bot> (rama feature/...)
- Archivo / zona afectada:
- Cambio pedido:
- Motivo:
- Estado: PENDIENTE | HECHO | RECHAZADO (motivo)
```

## Peticiones

### [2026-11-15] MetaBot (rama feature/goals)
- Archivo / zona afectada: paquete `contribution` (CobroBot); revisar al integrar (CimientoBot).
- Cambio pedido: crear en `contribution` un `@Component` que implemente `com.pey.meta.goal.service.PaidContributionsProvider` usando `ContributionRepository`. Métodos sugeridos para el repositorio: `long countByGoalIdAndStatus(Long goalId, ContributionStatus status)` y `List<Contribution> findByGoalIdAndStatusOrderByPaidAtDesc(Long goalId, ContributionStatus status, Pageable pageable)` (con `PageRequest.of(0, limit)`), mapeando cada aportación a `PaidContributionView(displayName, anonymous, amount, message, paidAt)`. El nombre "Anónimo" lo pone `GoalMapper`, no hace falta resolverlo en contribution.
- Motivo: el detalle público `GET /api/public/goals/{id}` ya devuelve `paidContributionsCount` y `recentContributions`, pero en `feature/goals` todavía no existe `ContributionRepository`. Mientras no haya implementación, esos campos salen en 0 y lista vacía (no truena). `GoalService` la toma con `ObjectProvider`, así que basta con que exista el bean.
- Estado: HECHO (CobroBot en feature/contributions: `ContributionPaidContributionsProvider` + metodos en `ContributionRepository`; integrado a main por CimientoBot)

### [2026-11-15] CobroBot (rama feature/contributions)
- Archivo / zona afectada: `src/main/resources/application.yml` y `.env.example` (CimientoBot).
- Cambio pedido: agregar propiedades opcionales que `contribution` ya lee con defaults (no truena si faltan):
  - `pey.generate-image: ${PEY_GENERATE_IMAGE:false}` (si es true se manda `generateImage: true` a Pey y la respuesta trae `qrImage` en base64; Pey avisa que eso hace mas lento el endpoint, por eso el default es false y el front dibuja el QR desde `qrString`).
  - `pey.connect-timeout-ms: ${PEY_CONNECT_TIMEOUT_MS:5000}` y `pey.read-timeout-ms: ${PEY_READ_TIMEOUT_MS:30000}` (timeouts del PeyClient).
  - Ya existentes y usadas tal cual: `pey.api-url`, `pey.api-key`, `pey.qr-expiration-seconds` (debe ser >= 360, minimo de Pey; si no, la app no arranca).
- Motivo: configuracion del cliente de Pey sin secretos en codigo.
- Estado: HECHO (CimientoBot, integracion final): agregadas a `application.yml` (`pey.generate-image`, `pey.connect-timeout-ms`, `pey.read-timeout-ms`) y a `.env.example` (`PEY_GENERATE_IMAGE=false`, `PEY_CONNECT_TIMEOUT_MS=5000`, `PEY_READ_TIMEOUT_MS=30000`), mismos defaults que `PeyClient`/`ContributionService`. Documentado el minimo de 360 s de `QR_EXPIRATION_SECONDS`.

### [2026-11-15] CobroBot (rama feature/contributions) - notas para integrar
- Merge: en `feature/contributions` hice `git merge feature/goals` (commit de merge) porque necesito `GoalService`, `Goal` y `PaidContributionsProvider` para compilar. No toque `main`. No mergee `feature/auth` (no hace falta para compilar).
- Peticion de MetaBot (PaidContributionsProvider): HECHA en esta rama con `contribution.service.ContributionPaidContributionsProvider` y los metodos `countByGoalIdAndStatus` / `findByGoalIdAndStatusOrderByPaidAtDesc` en `ContributionRepository`.
- Para GuardiaBot: `POST /api/public/goals/{id}/contributions` y `GET /api/public/contributions/{numRef}` deben quedar publicos (ya cubierto por `/api/public/**`).
- Para WebhookBot:
  - `numRef` es de 7 digitos (Pey exige `^[0-9]{1,7}$`) y es unico en BD; busca con `ContributionRepository.findByNumRef`. El `id` de la respuesta de Pey se guarda en `codiQrId` (debe coincidir con `codiQrId` del webhook).
  - Orden de creacion: primero se guarda la fila PENDING (reserva el numRef) y luego se llama a Pey; si Pey falla la fila queda EXPIRED con `expiresAt` = ahora y `codiQrId` null (al pagador nunca se le mostro QR). Si el guardado final fallara, la fila sigue PENDING con numRef pero sin `codiQrId`: el webhook igual debe amarrar por numRef.
  - `expiresAt` se calcula con la hora de ANTES de llamar a Pey (conservador). Puede llegar un pago para una aportacion ya EXPIRED: marcala PAID igual y suma con `GoalService.registerPayment` (el dinero ya se cobro).
  - `GET /api/public/contributions/{numRef}` reporta EXPIRED si esta PENDING y ya paso `expiresAt`, pero no escribe en BD (eso es de tu tarea programada con `findByStatusAndExpiresAtBefore`).
- Estado: INFORMATIVO
### [2026-11-15] WebhookBot (rama feature/webhooks)
- Archivo / zona afectada: `src/main/resources/application.yml` y `.env.example` (CimientoBot); `config/SecurityConfig` (GuardiaBot).
- Cambio pedido:
  - Opcional: `webhook.expiration-job.delay-ms: ${WEBHOOK_EXPIRATION_JOB_DELAY_MS:60000}` y `webhook.expiration-job.initial-delay-ms: ${WEBHOOK_EXPIRATION_JOB_INITIAL_DELAY_MS:60000}`. El job ya usa esos defaults si faltan.
  - Futuro (cuando se active la firma): una variable para el secreto del webhook de Pey, por ejemplo `PEY_WEBHOOK_SECRET` (confirmar en https://docs.pey.mx de donde sale).
  - Para GuardiaBot: `POST /api/webhooks/pey` debe quedar publico (ya cubierto por `/api/webhooks/**`) y sin CSRF, porque Pey no manda token.
- Motivo: webhook de Pey y tarea de expiracion.
- Estado: HECHO parcial (CimientoBot, integracion final):
  - HECHO: `webhook.expiration-job.delay-ms` e `initial-delay-ms` en `application.yml` y `WEBHOOK_EXPIRATION_JOB_DELAY_MS` / `WEBHOOK_EXPIRATION_JOB_INITIAL_DELAY_MS` en `.env.example` (60000 ms, igual que el job).
  - HECHO: `SecurityConfig` deja publico `/api/webhooks/**` y CSRF esta desactivado (API stateless con JWT).
  - PENDIENTE (decision de Maruchan): verificacion de firma. Confirmado en docs.pey.mx: el secreto (`whsec_...`) lo muestra el portal de Pey al crear el webhook de la API key. `PEY_WEBHOOK_SECRET` solo quedo comentada en `.env.example`; no hay propiedad en `application.yml` hasta que exista codigo que la lea.

### [2026-11-15] WebhookBot (rama feature/webhooks) - notas para integrar
- Merge: en `feature/webhooks` hice `git merge feature/contributions` (fast-forward; ya trae `feature/goals`) para compilar contra `Contribution`, `ContributionRepository` y `GoalService` reales. No mergee `feature/auth`.
- Firma del webhook: `webhook.security.WebhookSignatureVerifier` con `NoOpWebhookSignatureVerifier` que acepta todo y tiene el TODO para Standard Webhooks. No se implemento porque no se pidio.
- Concurrencia: el webhook y el job bloquean la fila de la aportacion con `EntityManager.refresh(..., PESSIMISTIC_WRITE)` antes de cambiarla, asi un aviso repetido al mismo tiempo no se cuenta dos veces y el job no pisa un PAID. No hizo falta cambiar `ContributionRepository`.
- Si `GoalService.registerPayment` o la BD fallan, se hace rollback y el endpoint responde 5xx para que Pey reintente.
- Estado: INFORMATIVO

### [2026-11-15] WebhookBot (rama feature/webhooks) - firma del webhook
- Archivo / zona afectada: `src/main/resources/application.yml`, `.env.example` y `README.md` (CimientoBot).
- Cambio pedido en `application.yml` (dentro de `pey:`):
  ```yaml
  pey:
    # Secreto del webhook (whsec_...) que da el portal de Pey al crear el webhook. Vacio = se rechazan todos.
    webhook-secret: ${PEY_WEBHOOK_SECRET:}
    # SOLO desarrollo: si es true y el secreto esta vacio, se aceptan webhooks sin firma. Default false.
    webhook-allow-unsigned: ${PEY_WEBHOOK_ALLOW_UNSIGNED:false}
    # Diferencia maxima permitida con webhook-timestamp, en segundos (Standard Webhooks recomienda 5 minutos).
    webhook-tolerance-seconds: ${PEY_WEBHOOK_TOLERANCE_SECONDS:300}
  ```
- Cambio pedido en `.env.example`: quitar el comentario "TODAVIA NO SE USA" y dejar:
  ```
  # Secreto del webhook (whsec_...) que muestra el portal de Pey al crear el webhook. Sin el, todo webhook responde 401.
  PEY_WEBHOOK_SECRET=whsec_tu-secreto
  # Solo desarrollo: true acepta webhooks sin firma cuando PEY_WEBHOOK_SECRET esta vacio. Nunca en produccion.
  PEY_WEBHOOK_ALLOW_UNSIGNED=false
  PEY_WEBHOOK_TOLERANCE_SECONDS=300
  ```
- Seccion sugerida para el README, "Probar el webhook con un curl firmado":
  > El endpoint `POST /api/webhooks/pey` verifica la firma Standard Webhooks: `webhook-signature: v1,<base64(HMAC-SHA256(clave, "{webhook-id}.{webhook-timestamp}.{cuerpo}"))>`, donde la clave son los bytes en base64 que siguen a `whsec_`. Si la firma falta, no coincide o el timestamp tiene mas de 5 minutos de diferencia, responde 401 y no registra nada. Para probar en local pon en `.env` un secreto propio (por ejemplo `whsec_` + 32 bytes aleatorios en base64), crea antes una aportacion para tener un `numRef` real y firma el cuerpo exactamente como lo mandas (sin acentos para evitar problemas de codificacion).
  >
  > PowerShell:
  > ```powershell
  > $secret = $env:PEY_WEBHOOK_SECRET   # whsec_...
  > $id = "msg_prueba_$(Get-Random)"
  > $ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  > $body = '{"amount":150,"codiQrId":"QR-PRUEBA","concept":"Prueba","datePaid":' + $ts + ',"numRef":"1234567","transactionId":"TX-PRUEBA-1","type":"codi.qr.payment_received"}'
  > $hmac = [Security.Cryptography.HMACSHA256]::new([Convert]::FromBase64String($secret.Substring(6)))
  > $sig = [Convert]::ToBase64String($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$id.$ts.$body")))
  > Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/webhooks/pey -ContentType 'application/json' `
  >   -Headers @{ 'webhook-id' = $id; 'webhook-timestamp' = "$ts"; 'webhook-signature' = "v1,$sig" } -Body $body
  > ```
  >
  > bash (Git Bash, Linux o macOS, con openssl):
  > ```bash
  > SECRET="$PEY_WEBHOOK_SECRET"   # whsec_...
  > ID="msg_prueba_$RANDOM"; TS=$(date +%s)
  > BODY='{"amount":150,"codiQrId":"QR-PRUEBA","concept":"Prueba","datePaid":'"$TS"',"numRef":"1234567","transactionId":"TX-PRUEBA-1","type":"codi.qr.payment_received"}'
  > KEY_HEX=$(printf '%s' "${SECRET#whsec_}" | base64 -d | od -An -tx1 | tr -d ' \n')
  > SIG=$(printf '%s' "$ID.$TS.$BODY" | openssl dgst -sha256 -mac HMAC -macopt hexkey:$KEY_HEX -binary | base64)
  > curl -i -X POST http://localhost:8080/api/webhooks/pey -H 'Content-Type: application/json' \
  >   -H "webhook-id: $ID" -H "webhook-timestamp: $TS" -H "webhook-signature: v1,$SIG" -d "$BODY"
  > ```
  > Respuesta esperada: `200 {"received":true,"result":"PROCESSED"}`; si repites el mismo cuerpo con nueva firma sale `DUPLICATE`.
- Motivo: verificacion de firma Standard Webhooks del webhook de Pey (aprobada por Maruchan).
- Estado: PENDIENTE