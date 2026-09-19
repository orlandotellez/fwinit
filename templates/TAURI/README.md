# Template TAURI — dashboard administrativo

Dashboard administrativo de escritorio creado con **React 19 + Vite 7 +
Tauri 2 + TypeScript**, scaffoldado por **fwinit**. Es una plantilla inicial
que administra fwinit (stats + tabla de templates + configuración del API) y
sirve de base para tu propio dashboard.

## Requisitos

- Node.js >= 22.12.0
- Rust (toolchain estable) para el runtime de escritorio: https://rustup.rs

## Arrancar

```bash
npm install
npm run tauri dev        # abre la ventana nativa (requiere Rust)
```

Para probar solo el frontend en el navegador (sin Tauri):

```bash
npm run dev              # http://localhost:1420
```

## Arquitectura heredada (el trío que no se toca)

| Archivo | Rol |
|---|---|
| `src/lib/api-config.ts` | Resolución de la URL del API (dev / localStorage / manual) + `fetchBootstrap` |
| `src/lib/fetch.ts` | `crossFetch`: en Tauri va a Rust (`invoke("http_request")`, sin CORS); en web usa `fetch` nativo |
| `src/context/AppBootstrap.tsx` | Splash → resuelve bootstrap → pantalla manual de URL si no hay conexión |

El comando Rust detrás de `crossFetch` vive en `src-tauri/src/http_client.rs`
(reqwest con pooling y timeouts), expuesto en `lib.rs`.

## Estructura

```
src/
├── context/AppBootstrap.tsx   # Bootstrap de configuración (splash + manual)
├── lib/
│   ├── api-config.ts          # URL del API + bootstrap + health check
│   └── fetch.ts               # crossFetch (Tauri nativo / web)
├── components/
│   ├── common/StatCard.tsx    # Card de métrica del dashboard
│   └── layout/                # Sidebar + Topbar
├── pages/
│   ├── Dashboard.tsx          # Stats + tabla de templates de fwinit
│   └── Settings.tsx           # Editar URL del API + probar conexión
├── data/templates.ts          # Catálogo de templates (ejemplo estático)
├── App.tsx                    # Layout + navegación por vistas (sin router)
├── main.tsx                   # monta AppBootstrap → App
└── styles.css                 # Design tokens (dark admin)
src-tauri/
├── src/
│   ├── lib.rs                 # Comando http_request + entry point
│   ├── http_client.rs         # Cliente reqwest (pooling, timeout)
│   └── main.rs
├── capabilities/default.json
├── tauri.conf.json            # Ventana + build (devUrl 1420)
└── Cargo.toml                 # tauri 2 + reqwest (rustls)
```

## Conectar a tu API

1. En dev la app usa `http://localhost:3000/api/v1` (o `VITE_API_URL` en `.env`).
2. En producción la URL se guarda en `localStorage` y se pide manualmente la
   primera vez (`AppBootstrap`).
3. El endpoint `/health` de tu backend habilita la card "API health" del
   dashboard y el botón "Probar conexión" de Configuración.

## Empaquetar (instaladores)

El `bundle` viene desactivado a propósito: `tauri dev` y el build del
frontend no necesitan iconos, pero los instaladores sí. Cuando quieras:

```bash
# 1. Generá src-tauri/icons/ desde una imagen (ej. public/icon.png)
npx tauri icon public/icon.png

# 2. Activá el bundle en src-tauri/tauri.conf.json (bundle.active = true)

# 3. Armá los instaladores
npm run tauri build
```

Salida: instaladores nativos (deb/rpm/msi/dmg según la plataforma).

## Personalizar

- **Marca**: colores en `:root` de `src/styles.css`.
- **Vistas**: agregá una página en `src/pages/` y un ítem en
  `src/components/layout/Sidebar.tsx` + el switch de `src/App.tsx`.
- **Datos**: `src/data/templates.ts` es estático — conectá tu API cuando
  quieras (tenés `crossFetch` y la URL ya resuelta en `api-config.ts`).