# Notas de integración con el backend

> Las peticiones formales al backend van en `docs/PETICIONES.md` (raíz del repo, archivo del equipo).
> Este archivo solo son notas del front.

## Estado actual

- **Sin peticiones pendientes.** Los contratos de la rama `main` cubren todo lo que usa el front.
- **CORS:** el backend ya permite `http://localhost:5173` (puerto de `npm run dev`), así que no hace falta pedir cambios.
  Ojo: `npm run preview` usa el puerto `4173`, que *no* está en la lista de CORS; para probar contra el backend real usa `npm run dev`.

## Detalles del contrato que el front asume

| Tema | Comportamiento |
| --- | --- |
| Montos | `BigDecimal` llegan como `number` en JSON. |
| Fechas | `Instant` en ISO UTC; el front las muestra en hora local. |
| `percentage` | Entero 0-100 calculado por el backend (no se recalcula en el front). |
| Nombre anónimo | `recentContributions[].name` ya llega como `"Anónimo"`. |
| QR | Se dibuja con `qrString` (qrcode.react). Si llega `qrImage` (PNG base64) se usa como `<img>`. |
| Vigencia QR | 1200 s; la cuenta regresiva usa `expiresAt`. |
| Errores | `ErrorResponse { message, errors[{field,message}] }`; los errores por campo se pintan junto a cada input. |
| 401 en admin | El front borra la sesión y manda a `/admin/login`. |

## Ideas para el futuro (no urgentes)

- En `GET /api/admin/goals` sería útil `paidContributionsCount` para el panel (hoy la vista de progreso lo toma del endpoint público).
