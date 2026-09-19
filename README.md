# fwinit

![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-%23339933.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![.NET 10](https://img.shields.io/badge/.NET_10-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)

Repositorio de templates para scaffoldear proyectos con [fwinit CLI](https://github.com/orlandotellez/fwinit).

## Instalación de la CLI

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

# Crear un proyecto completo: backend + frontend (+ db incluida en el backend)
fwinit fullstack mi-proyecto

# Elegir los templates sin preguntas (modo scripting/CI)
fwinit fullstack mi-proyecto -b fastify -f react-native -p pnpm

# Ver templates disponibles (agrupados por capa)
fwinit list
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

Para scripting o CI, elegí los templates con flags (saltean las preguntas):

```bash
fwinit fullstack mi-proyecto --backend-template fastify --frontend-template react-native --pm pnpm
# ó con atajos
fwinit fullstack mi-proyecto -b fastify -f react-native -p pnpm
```

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

Igual para frontend: `fwinit astro mi-landing` (o `react-native`) pregunta por `frontend/`.

## Templates disponibles

| Template | Capa | Descripción | Runtime |
|----------|------|-------------|---------|
| `aspnet` | backend | API REST con ASP.NET Core, Clean Architecture y C# | dotnet |
| `express` | backend | API REST con Express, Prisma, TypeScript y Bun | bun |
| `fastify` | backend | API REST con Fastify, Prisma, TypeScript y Bun | bun |
| `nodejs` | backend | API con Node.js puro, Prisma, TypeScript y tsx | node |
| `astro` | frontend | Landing estática con Astro 7 y TypeScript | node |
| `react-native` | frontend | App móvil con React Native, Expo y TypeScript | node |

La capa es metadata de cada template (`layer` en `templates/<TEMPLATE>/template.json`): para sumar un frontend nuevo (Astro, Next.js...), alcanza con agregar la carpeta del template y su `layer`. Los templates se clasifican por capa en la metadata, no por estructura de carpetas.

## Skills de opencode

Todo proyecto generado incluye `.opencode/skills/create-specs` y el comando `/create-specs`:

- `/create-specs <descripción>` genera la carpeta `specs/` con módulos `backend/`, `db/` y `frontend/`, cada uno con sus `tasks` listas para implementar.
- La db se documenta en `specs/db/` (schemas por entidad, enums y use-cases) aunque la implementación viva en el template backend.
- Los templates y los proyectos traen `.gitignore` con el estado de AI de desarrollo (`.atl/`, `odd` y `.opencode/`) ya excluido.

## Uso Directo (sin CLI)

Si preferís clonar directamente:

```bash
git clone https://github.com/orlandotellez/fwinit.git
cd fwinit/templates/FASTIFY
# Copiar los archivos a tu proyecto
```

## Estructura

```
fwinit/
├── cli/                 # Fuente de la fwinit CLI
│   ├── src/
│   └── package.json
├── skills/
│   └── create-specs/    # Skill embebida en los proyectos generados
├── templates/           # Templates clasificados por capa (metadata "layer")
│   ├── ASPNET/          # API ASP.NET Core + Clean Architecture (backend)
│   ├── EXPRESS/         # API Express + Prisma + TypeScript (backend)
│   ├── FASTIFY/         # API Fastify + Prisma + TypeScript (backend)
│   ├── NODEJS-VANILLA/  # API Node.js puro + Prisma + TypeScript (backend)
│   ├── ASTRO/           # Landing estática Astro 7 (frontend)
│   └── REACT-NATIVE/    # App React Native + Expo (frontend)
└── README.md
```

## Cada template incluye

- `template.json` — Metadatos para la CLI (nombre, `layer`, runtime, postInit)
- `.env.example` — Variables de entorno de ejemplo
- `.gitignore` — Archivos excluidos del tracking (incluye el estado de AI de desarrollo)
- Código fuente listo para usar

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