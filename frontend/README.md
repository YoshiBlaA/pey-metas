# Pey Metas · Front-end

Aplicación web para **apoyar metas de recaudación pagando con CoDi** (QR desde la app del banco) y un **panel de administración** para crear y gestionar esas metas. Consume la API Spring Boot que vive en la raíz de este mismo repositorio.

- **Público (móvil, 390×844):** lista de metas, detalle con progreso, aportar, pago con QR (pendiente / pagado / expirado).
- **Admin (escritorio, 1440×900):** login, panel con tabla, vista de progreso, crear/editar, cerrar/reabrir.

Stack: **Vite + React 19 + TypeScript + React Router 7 + Tailwind CSS v4**. QR con **qrcode.react**. Fuente **Plus Jakarta Sans** (@fontsource, empaquetada, no depende de Google Fonts).

## Cómo correrlo

Requisitos: Node.js 20.19+ (o 22.12+) y npm.

```bash
cd frontend
cp .env.example .env      # en PowerShell: Copy-Item .env.example .env
npm install
npm run dev               # abre http://localhost:5173
```

Otros scripts:

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente (puerto 5173). |
| `npm run build` | Revisa tipos (`tsc --noEmit`) y genera `dist/`. |
| `npm run typecheck` | Solo revisa tipos. |
| `npm run preview` | Sirve `dist/` en el puerto 4173 para probar el build. |

## Variables de entorno

Se leen de `frontend/.env` (no se sube a git; la plantilla es `.env.example`). En Vite solo se exponen al navegador las que empiezan con `VITE_`.

| Variable | Ejemplo | Para qué |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8080` | URL base del backend, sin `/` final. |
| `VITE_USE_MOCKS` | `true` / `false` | `true` usa datos de prueba en memoria; no necesitas el backend. |

Después de cambiar `.env` reinicia `npm run dev`.

## Modo mocks (sin backend)

Con `VITE_USE_MOCKS=true` verás un aviso amarillo de "Modo demo" y:

- Hay 4 metas de ejemplo en MXN (una ya lograda).
- Al aportar se genera un QR de prueba; **a los ~15 s pasa a PAID** y la barra de la meta se actualiza.
- Admin: usuario **`admin`**, contraseña **`admin123`**.
- Las validaciones y errores imitan al backend (400 con errores por campo, 404, 409 meta cerrada, 422 al reabrir una meta que ya alcanzó su objetivo, 401).
- Los datos viven en memoria: al recargar la página se reinician.

## Conectar al backend real

1. Levanta el backend (raíz del repo) en `http://localhost:8080`.
2. En `frontend/.env`: `VITE_API_URL=http://localhost:8080` y `VITE_USE_MOCKS=false`.
3. `npm run dev` → http://localhost:5173 (el CORS del backend ya permite ese origen).
4. Para el panel usa un usuario admin configurado en el backend.

## Rutas

| Ruta | Pantalla (Figma) |
| --- | --- |
| `/` | 01 Lista de metas |
| `/metas/:id` | 02 Detalle abierta / 03 Detalle lograda |
| `/metas/:id/aportar` | 04 Aportar |
| `/pago/:numRef` | 05 QR pendiente / 06 Pagado / 07 Expirado |
| `/admin/login` | 08 Login |
| `/admin` | 09 Panel |
| `/admin/metas/nueva`, `/admin/metas/:id/editar` | 10 Crear / editar |
| `/admin/metas/:id` | 11 Progreso |

## Estructura de carpetas

```
frontend/
├── index.html              # HTML base; Vite inyecta el JS aquí
├── vite.config.ts          # plugins de React y Tailwind
├── .env.example            # plantilla de variables
├── docs/NOTAS_BACKEND.md   # notas de integración (peticiones formales: docs/PETICIONES.md en la raíz)
├── public/                 # archivos estáticos (favicon)
└── src/
    ├── main.tsx            # punto de entrada: Router + AuthProvider
    ├── App.tsx             # mapa de rutas
    ├── index.css           # Tailwind + tokens de diseño (@theme)
    ├── api/
    │   ├── types.ts        # tipos = DTOs del backend
    │   ├── client.ts       # fetch tipado, ErrorResponse, Bearer, 401 → logout
    │   ├── publicApi.ts    # endpoints públicos
    │   ├── adminApi.ts     # endpoints de admin
    │   ├── mocks.ts        # implementación falsa en memoria
    │   └── index.ts        # elige real o mock según VITE_USE_MOCKS
    ├── auth/               # AuthContext (sesión) y RequireAuth (rutas protegidas)
    ├── hooks/              # useAsync (cargar datos), useCountdown (cuenta regresiva)
    ├── lib/                # formato MXN/fechas, validaciones, guardado del QR
    ├── components/         # Button, Money, ProgressBar, GoalCard, StatusBadge, PaymentChip,
    │                       # ContributionRow, Field, ErrorAlert, Spinner, Layouts, Icons
    └── pages/
        ├── public/         # GoalsListPage, GoalDetailPage, ContributePage, PaymentPage
        └── admin/          # LoginPage, AdminGoalsPage, GoalProgressPage, GoalFormPage
```

## Conceptos clave (para aprender)

- **Una sola puerta a la API:** las pantallas importan de `src/api` y no saben si hablan con el backend o con los mocks.
- **Tipos = contrato:** si el backend cambia un DTO, se actualiza `api/types.ts` y TypeScript marca todo lo que hay que ajustar.
- **Polling con limpieza:** `PaymentPage` consulta el estado cada 4 s con `setInterval` y lo limpia en el `return` del `useEffect` (si no, seguiría consultando al salir).
- **Cuenta regresiva sin desfase:** `useCountdown` recalcula contra `expiresAt` cada segundo en vez de restar 1.
- **Validación doble:** el front valida igual que el backend para avisar antes de enviar; el backend vuelve a validar y sus errores por campo se muestran junto al input.
- **Tokens de diseño:** colores y fuente del Figma están en `src/index.css` dentro de `@theme`; se usan como clases (`bg-brand-600`, `text-ink-700`, `border-line`…).
