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
- Al aportar se genera un QR **de demostración** con la forma de un QR de CoDi (`TYP:20`) pero marcado `DEMO-NO-PAGABLE`: la app de tu banco no lo va a aceptar, y la pantalla lo avisa. **A los ~15 s pasa a PAID** y la barra de la meta se actualiza.
- Para ver la pantalla "QR expirado" en demo: en la consola del navegador `localStorage.setItem('pey.mock.sinPago','1')` (las aportaciones ya no se pagan y vencen a los 20 min). Quítalo con `localStorage.removeItem('pey.mock.sinPago')`.
- Admin: usuario **`admin`**, contraseña **`admin123`**.
- Las validaciones y errores imitan al backend (400 con errores por campo, 404, 409 meta cerrada, 422 al reabrir una meta que ya alcanzó su objetivo, 401).
- Los datos viven en memoria: al recargar la página se reinician.

## Conectar al backend real

1. Levanta el backend (raíz del repo) en `http://localhost:8080`.
2. En `frontend/.env`: `VITE_API_URL=http://localhost:8080` y `VITE_USE_MOCKS=false`.
3. `npm run dev` → http://localhost:5173 (el CORS del backend ya permite ese origen).
4. Para el panel usa un usuario admin configurado en el backend.

### Probar un pago de verdad (CoDi de prueba)

- Con llaves de **prueba** de Pey, el backend debe apuntar a `PEY_API_URL=https://api.dev.pey.mx` (por defecto apunta a producción, `https://api.pey.mx`).
- En pruebas el QR se paga con la app simuladora **"Banco W Go B"** (no con tu banco real). En producción, con la app de cualquier banco que tenga CoDi.

## El QR de CoDi (cómo se dibuja)

- El front **no arma** el QR: dibuja `qrString` **tal cual** lo manda el backend (que a su vez lo recibe de Pey). Si el backend manda `qrImage` (PNG en base64), se muestra esa imagen.
- Parámetros (según la guía "Display CoDi QR" de Pey): corrección de errores **M**, margen (zona blanca) de **4 módulos**, negro puro sobre blanco puro, **sin logo encima**, mínimo **260 px** en pantalla.
- Archivos: `src/components/CodiQr.tsx` (QR en pantalla y canvas de 1024 px para el PNG) y `src/lib/qrFile.ts` (descargar / compartir).

## Pantalla de pago según el dispositivo

`src/hooks/useIsMobile.ts` decide si estás en un celular (`navigator.userAgentData.mobile`, o pantalla < 768 px, o pantalla táctil ≤ 1024 px):

- **Computadora:** QR grande + pasos "Abre la app de tu banco en tu celular › CoDi › Escanear QR".
- **Celular:** igual que el diseño, el QR se ve directo (para que otra persona lo escanee) con la cuenta regresiva y los 3 pasos de "Cómo pagar". Como extra, debajo:
  - **Descargar QR**: guarda un PNG para pagar desde el mismo celular con "Leer QR desde imagen" en la app del banco.
  - **Compartir** (si el navegador soporta `navigator.share` con archivos).
- Ambas vistas siguen consultando el estado cada 4 s y muestran Pagado / Expirado.
- Para forzar una vista al probar: `?vista=movil` o `?vista=escritorio` en la URL de pago.

## Diseño y tamaños de pantalla

- Basado en el Figma de FigmaBot (tokens en `src/index.css`, fuente Plus Jakarta Sans).
- Público: móvil < 768 px (columna de 480 px máx.); escritorio con barra superior de 72 px y columna de 1200 px.
- Admin: barra lateral de 248 px desde 1024 px; abajo de 1024 px, barra de pestañas inferior (Metas, Nueva meta, Cuenta).
- **Omitido a propósito** porque el backend no lo tiene: pestañas "Aportaciones" y "Ajustes/Configuración", enlaces "¿Cómo funciona?" y "Preguntas frecuentes", "Recordarme" / "¿Olvidaste tu contraseña?", "Organiza: …", conteos de aportaciones pendientes/expiradas, referencias "PEY-XXXX" (se usa `numRef`), variaciones semanales de los KPI. El logo "CoDi" encima del QR también se omitió para no afectar la lectura.

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
