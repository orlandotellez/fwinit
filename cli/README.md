# fwinit

CLI para crear proyectos desde templates. Instalás una vez y scaffoldás proyectos con un comando: un solo template, o un proyecto full stack completo (backend + frontend + base de datos).

## Instalación

```bash
# pnpm (recomendado)
pnpm add -g fwinit

# npm
npm install -g fwinit

# bun
bun add -g fwinit
```

## Uso

```bash
# Menú interactivo: elegís entre full stack, solo backend o solo frontend
fwinit

# Crear un solo template (backend o frontend)
fwinit fastify mi-api
fwinit aspnet mi-app
fwinit react-native mi-mobile

# Crear un proyecto completo: backend + frontend (+ db incluida)
fwinit fullstack mi-proyecto

# Elegir los templates sin preguntas (modo scripting/CI)
fwinit fullstack mi-proyecto -b fastify -f react-native -p pnpm

# Ver templates disponibles (agrupados por capa)
fwinit list

# Ayuda
fwinit --help
```

### Modo interactivo

`fwinit` sin argumentos abre el menú principal:

```
? ¿Qué querés crear?
> Full stack (backend + frontend)
  Solo backend (API)
  Solo frontend (app)
```

- **Full stack**: te pregunta primero el backend y después el frontend, y arma el monorepo completo.
- **Solo backend / Solo frontend**: te pregunta el template de la capa, el nombre, el layout y el package manager.

### Proyecto full stack

```bash
fwinit fullstack mi-proyecto
```

Pregunta qué backend querés (ASP.NET, Express, Fastify, Node.js Vanilla) y qué frontend (React Native). Genera:

```
mi-proyecto/
├── backend/          # API (template elegido — trae su DB: Prisma o EF)
├── frontend/         # App (template frontend elegido)
├── .gitignore        # .atl/ · odd · .opencode/
├── .opencode/        # Skills de opencode (create-specs incluida)
├── README.md         # Cómo correr backend y frontend
└── specs/            # La creás con /create-specs
```

La base de datos no se configura aparte: viene incluida en el template backend (Prisma en los templates JS/TS, EF Core en ASP.NET).

### Layout de capa (monorepo liviano)

Al crear un solo template, el CLI pregunta si querés empaquetar el código en una carpeta de capa (default: sí):

```bash
# backend/ + .opencode/ + specs/ al mismo nivel
fwinit express mi-api
# raíz limpia (todo el código en mi-api/)
fwinit express mi-api --no-backend
# forzar el layout de capa sin preguntas
fwinit express mi-api --backend
```

Igual para frontend: `fwinit react-native mi-app` pregunta por `frontend/`.

## Flags

| Flag | Descripción |
|------|-------------|
| `-p, --pm <manager>` | Package manager: `npm`, `pnpm` o `bun` (saltea la pregunta) |
| `--backend` | Empaquetar el código en `backend/` (solo modo single, saltea la pregunta) |
| `--no-backend` | Dejar el código en la raíz del proyecto (saltea la pregunta) |
| `-b, --backend-template <tpl>` | Backend a usar en fullstack (saltea la pregunta) |
| `-f, --frontend-template <tpl>` | Frontend a usar en fullstack (saltea la pregunta) |
| `--git` | Inicializar un repositorio git (saltea la pregunta) |
| `--no-git` | No inicializar git (saltea la pregunta) |

## Templates disponibles

| Template | Capa | Descripción | Runtime |
|----------|------|-------------|---------|
| `aspnet` | backend | API REST con ASP.NET Core, Clean Architecture y C# | dotnet |
| `express` | backend | API REST con Express, Prisma, TypeScript y Bun | bun |
| `fastify` | backend | API REST con Fastify, Prisma, TypeScript y Bun | bun |
| `nodejs` | backend | API con Node.js puro, Prisma, TypeScript y tsx | node |
| `astro` | frontend | Landing estática con Astro 7 y TypeScript | node |
| `tauri` | frontend | Dashboard de escritorio con React, Vite y Tauri 2 | node |
| `react-native` | frontend | App móvil con React Native, Expo y TypeScript | node |

La capa es metadata de cada template (`layer` en `templates/<TEMPLATE>/template.json`): para sumar un frontend nuevo (Astro, Next.js...), alcanza con agregar la carpeta del template y su `layer`. Los templates se clasifican por capa en la metadata, no por estructura de carpetas.

El runtime `bun` de un template se porta automáticamente a `node` (npm/pnpm) si elegís npm o pnpm: scripts con `tsx`, tests con `vitest` y sin `bun-types`.

## Qué hace

1. Descarga el ZIP del repositorio de templates desde GitHub (una sola vez, también en fullstack)
2. Extrae y copia el template (o los dos, `backend/` + `frontend/`) al proyecto
3. Sustituye el nombre del proyecto (package.json, app.json de Expo, proyectos ASP.NET con "Example")
4. Si corresponde, porta el template de runtime bun a node (npm/pnpm)
5. Instala `.opencode/` con la skill `create-specs` y el comando `/create-specs`
6. Limpia los lock files (cada proyecto instala los suyos)
7. Si lo elegís (o pasás `--git`), inicializa un repositorio git en la raíz
8. Te muestra los próximos pasos (install y dev de cada carpeta)

En modo fullstack (y single con layout de capa) crea además `.gitignore` y `README.md` en la raíz: el `.gitignore` protege el estado de AI de desarrollo (`.atl/`, `odd` y `.opencode/`), que viven fuera de la carpeta del template.

## Desarrollo

```bash
# pnpm (recomendado)
pnpm install
pnpm run build        # build a dist/
pnpm run dev          # watch mode
pnpm run start        # ejecutar desde dist/
pnpm run typecheck    # type check

# npm
npm install
npm run build
npm run dev
npm run start
npm run typecheck

# bun
bun install
bun run build
bun run dev
bun run start
bun run typecheck
```

### Probar localmente

```bash
node dist/index.js list
node dist/index.js fastify mi-api
node dist/index.js fullstack mi-proyecto -b fastify -f react-native -p pnpm
```

### Link global para desarrollo

```bash
# pnpm (recomendado)
pnpm link --global

# npm
npm link

# bun
bun link
```

Ahora `fwinit` está disponible en todo el sistema.

## Solución a problemas comunes

### pnpm: "Unable to find the global bin directory"

pnpm no tiene configurado el directorio global. Corré esto una vez:

```bash
pnpm setup
source ~/.bashrc  # o reiniciá la terminal
```

### bun: "add the global bin folder to $PATH"

bun se instaló pero falta agregar su directorio al PATH. Agregalo a tu `.bashrc` o `.zshrc`:

```bash
export PATH="$HOME/.bun/bin:$PATH"
```

Después reiniciá la terminal o corré `source ~/.bashrc`.

## Licencia

MIT