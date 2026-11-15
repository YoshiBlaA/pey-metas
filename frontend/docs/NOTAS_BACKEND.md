# Notas de integración con el backend

> Las peticiones formales al backend van en `docs/PETICIONES.md` (raíz del repo, archivo del equipo).
> Este archivo solo son notas del front.

## Estado actual

- **Petición pendiente (VitrinaBot):** `paidContributionsCount` en la lista pública y en `GoalAdminResponse` (ver `docs/PETICIONES.md`). Mientras tanto `src/hooks/useGoalCounts.ts` lo obtiene con una llamada por meta al detalle público.
- **QR:** el backend pasa `qrString` sin modificarlo (columna de 2000 caracteres) — correcto. Con llaves de prueba hay que usar `PEY_API_URL=https://api.dev.pey.mx` y pagar con la app "Banco W Go B".
- **CORS:** el backend ya permite `http://localhost:5173` (puerto de `npm run dev`), así que no hace falta pedir cambios.
  Ojo: `npm run preview` usa el puerto `4173`, que *no* está en la lista de CORS; para probar contra el backend real usa `npm run dev`.

## Detalles del contrato que el front asume

| Tema | Comportamiento |
| --- | --- |
| Montos | `BigDecimal` llegan como `number` en JSON. |
| Fechas | `Instant` en ISO UTC; el front las muestra en hora local. |
| `percentage` | Entero 0-100 calculado por el backend (no se recalcula en el front). |
| Nombre anónimo | `recentContributions[].name` ya llega como `"Anónimo"`. |
| QR | Se dibuja `qrString` **tal cual** (qrcode.react, nivel M, margen 4, negro/blanco, sin logo, ≥260 px). Si llega `qrImage` (PNG base64) se usa esa imagen. |
| Vigencia QR | 1200 s; la cuenta regresiva usa `expiresAt`. |
| Errores | `ErrorResponse { message, errors[{field,message}] }`; los errores por campo se pintan junto a cada input. |
| 401 en admin | El front borra la sesión y manda a `/admin/login`. |

## Ideas para el futuro (no urgentes)

- (Ya pedido en `docs/PETICIONES.md`) `paidContributionsCount` en las listas.
