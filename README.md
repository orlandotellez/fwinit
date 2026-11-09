# fwinit

![TypeScript](https://img.shields.io/badge/typescript-%233178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/node.js-%23339933.svg?style=for-the-badge&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/fastify-%23000000.svg?style=for-the-badge&logo=fastify&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1C1E24?style=for-the-badge&logo=expo&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
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

# Instalar skills globalmente (OpenCode, Pi, Gentle Shell, Agent Skills) — interactivo
fwinit skills

# Instalar skills globalmente sin preguntas (modo scripting/CI)
fwinit skills --global opencode,pi   # o: --global all
fwinit skills --global gentle-shell

# Instalar solo algunas skills
fwinit skills --global all --only create-specs,design

# Eliminar skills globales (mismos flags; interactivo pregunta qué eliminar)
fwinit skills --remove
fwinit skills --global all --remove

# Ver en el navegador las skills instaladas y las specs/ del proyecto actual
fwinit studio
```

### Menú interactivo (`fwinit`)

`fwinit` sin argumentos abre el menú con la identidad del producto: el wordmark
ASCII `FWINIT`, una línea de contexto (versión, carpeta actual, cantidad de
templates y de skills globales) y las mismas preguntas de siempre con el acento
de la landing. El wordmark degrada solo: en una terminal angosta pasa a la
versión compacta, y sin color (o sin TTY) queda una única línea
`fwinit vX.Y.Z — scaffolding full stack`. Con `j` y `k` movés la selección
arriba y abajo, igual que con las flechas. Si no hay TTY y no se pasó ningún
template, imprime la ayuda y sale en vez de esperar una entrada que nunca va a
llegar.

Dos flags controlan la presentación: `--no-banner` no imprime el wordmark, y
`--no-color` apaga el color de toda la salida (equivale a `NO_COLOR=1`).

Cada paso del flujo de creación es reversible: `Esc` vuelve al paso anterior y
conserva las respuestas ya dadas (vuelven seleccionadas en las listas y como
default en los inputs), y en el primer paso cancela la creación y sale en 0. En
el camino con flags los pasos ya respondidos no se preguntan, así que no hay a
qué volver.

```bash
fwinit --no-banner   # menú sin wordmark
fwinit --no-color    # menú sin color (también vale NO_COLOR=1)
```

### Studio local (`fwinit studio`)

Abre una vista en el navegador con dos cosas: las skills que ya tenés
instaladas para **OpenCode, Pi y Gentle Shell** (globales y del proyecto)
—con el contenido de cada `SKILL.md` y sus archivos de texto, que se lee en su
propia página con el botón **Leer skill**—, y el árbol de `specs/` del directorio
donde corrés el comando, renderizado como documentación navegable. Desde el
detalle de una skill también podés **ejecutarla** con el agente que elijas, sin
salir del navegador.

La vista de skills arranca en el **alcance del proyecto**, porque eso es lo que
estás trabajando; el control `Globales` muestra todo lo instalado a nivel
usuario, y si el proyecto todavía no tiene skills propias la lista te ofrece el
salto a las globales en un click.

```bash
fwinit studio                 # elige un puerto libre y abre el navegador
fwinit studio --port 4321     # puerto fijo
fwinit studio --no-open       # sólo imprime la URL (útil por SSH)
```

#### Ejecutar una skill desde el studio

En el detalle de cualquier skill instalada hay un bloque **Ejecutar skill**:
escribís en el input qué querés que haga (el pedido de la spec, el prompt del
proyecto, lo que sea), elegís el agente —`opencode`, `Pi` o `Gentle Shell`— y el
studio la ejecuta con esa entrada tal cual, en la raíz del proyecto y con
autonomía para escribir archivos. La salida aparece en el panel a medida que
llega, como pasos legibles y con las líneas numeradas a un click; mientras corre
hay un botón **Cancelar** en el header del panel.

- `pi` y `Gentle Shell` reciben la skill por ruta:
  `--print --mode json --skill <directorio> -a --name "fwinit studio · <skill>" "<tu pedido>"`.
  La sesión se guarda (ya no se pasa `--no-session`), así que la ejecución
  también queda visible y retomable en el agente (ver **Sesiones**, más abajo).
- `opencode` no tiene flag de skill: sólo descubre las que están en
  `~/.config/opencode/skills` o `<proyecto>/.opencode/skills`. Si la skill
  abierta no está ahí, el studio rechaza la ejecución y dice el motivo, en vez
  de fingir que la usó.
- El pedido viaja como argumento del proceso, nunca por un shell. La ruta de la
  skill la resuelve el servidor a partir de `{target, scope, name}`: el
  navegador no manda rutas.
- Un solo run a la vez (un segundo pedido responde 409). `Cancelar` manda
  SIGTERM y escala a SIGKILL a los 5 s; cerrar el studio mata el proceso en
  curso. La salida acumulada se corta a 2 MB y el panel lo avisa.
- Los eventos que el studio no entiende se muestran como línea cruda: nunca se
  descarta salida del agente.
- Al terminar, el panel dice el estado y el código de salida, y el studio vuelve
  a leer las skills y las specs, así que un `specs/` recién creado por la skill
  aparece en la otra vista sin recargar la página.

#### El panel de ejecución

El detalle de una skill se lee en tres regiones, no en una columna de texto corrida:

- **Header**: nombre de la skill, agente, estado, modelo, tiempo, pasos, líneas y las
  dos acciones —**Historial** y **Cancelar**— en una sola fila. Si no hay ninguna
  ejecución abierta el header lo dice (`sin ejecución`) y deja el tiempo, los pasos
  y las líneas en `—`, en vez de mostrar ceros o datos del último run.
- **Columna del agente**: arriba, lo que pediste; después la salida como filas
  `verbo · destino · resultado · tiempo` (los pasos de herramienta y los eventos de
  estado), con la prosa del agente como párrafo y el resto tal cual. El botón
  **Líneas crudas**, en la barra de la columna, muestra las mismas líneas numeradas
  y sin interpretar: nada de lo que dijo el agente se descarta. El composer —pedido,
  agente, modelo y **Ejecutar skill**— vive al pie de esta columna.
- **Raíl de estado (320px)**: estado completo del run —con el comando exacto
  plegado—, progreso con los pasos de herramienta, qué está haciendo ahora, consumo,
  el modelo y el estado de su catálogo, la sesión del agente con su comando para
  retomarla, las acciones de la skill (instalar, copiar) y el historial de esa skill. Sale de lo que el run ya expone (`GET /api/skills/runs` y
  `GET /api/skills/run`); el studio no inventa tokens, costo ni caché: si el agente
  no los informa, el bloque de consumo lo dice y sólo muestra líneas, pasos,
  caracteres de salida y el código de salida.

Las tres columnas piden unos 1100px de ancho del panel. Por debajo, el raíl se pliega
a una tira de estado arriba de la columna y el panel pasa a una sola columna: el
estado y **Cancelar** siguen en el header, así que no se pierden al plegar. El orden
del DOM es el orden de lectura (header, columna, raíl) y el estado se anuncia con
`aria-live`.

El panel de trabajo **ocupa el alto de la ventana y no scrollea como página**: los
únicos contenedores con scroll propio son la salida del agente y el raíl de skills
de la izquierda (con su historial). El contenido de la skill ya no se apila abajo
del panel: se lee en su propia página.

#### Leer la skill en su propia página

El header del panel tiene un botón **Leer skill**. Abre una **página** —una ruta del
mismo router por hash, no un modal— con el `SKILL.md` de la skill, sus archivos en
pestañas y sus metadatos (directorio, archivo, destino, alcance, versión, licencia,
autor, archivos, tamaño y fecha). La página ocupa todo el ancho y el alto y sólo su
contenido interno scrollea; el texto mantiene medida de lectura aunque la página sea
full width.

- **← Regresar** —primera parada del teclado— vuelve exactamente al punto de trabajo
  anterior: misma skill elegida, mismo panel de ejecución y la salida del agente
  donde estaba (no salta al fondo). El foco entra al título al abrir la lectura y
  vuelve al botón **Leer skill** al regresar.
- `Escape` hace lo mismo que **← Regresar**, y **atrás/adelante** del navegador
  funcionan porque la lectura es una ruta (`#/leer/<alcance>/<agente>/<skill>`).
- Entrar directo a esa ruta, sin historial previo, cae en el panel de esa skill.
- Si el agente está corriendo mientras leés, la ejecución **no se interrumpe**: el
  streaming sigue y al volver está la salida acumulada.
- Una skill que ya no está instalada no ofrece **Leer skill**: su salida guardada se
  sigue leyendo en el panel, pero su contenido no existe en el disco.

#### Sesiones: retomar la ejecución en el agente

Cada ejecución deja una sesión real en el agente, con el nombre
`fwinit studio · <skill>`, para que se distinga de las sesiones de trabajo
manual en el selector.

- `pi` y `Gentle Shell` reciben `--name "<ese nombre>"` y ya **no**
  `--no-session`: la sesión queda guardada y aparece en `pi -r` y en
  `gentle-shell -r`.
- El id de la sesión de `pi` —y de Gentle Shell, que envuelve a `pi`— viaja en el
  primer evento de su JSONL (`{"type":"session","id":...}`). El studio lo
  captura, lo guarda en el archivo del run y lo muestra en el panel y en el
  historial con el comando exacto para retomarla: `pi --session <id>` (o
  `gentle-shell --session <id>`), más `pi -r` para elegirla a mano. El botón de
  copiar deja el id en el portapapeles.
- `opencode` maneja su propio formato de sesión: el studio no le fuerza ni le
  inventa un id. Si su salida no lo expone, el panel lo dice y sugiere
  `opencode session list`, en vez de fingir que la sesión es visible desde acá.
- Un run guardado antes de que existiera la captura se abre igual: el panel
  avisa que no tiene sesión guardada y el historial lo rotula `sin sesión`.

#### Elegir el modelo

Debajo del selector de agente hay un **select de Modelo**: muestra qué modelo
está usando cada agente y deja elegir otro del catálogo real. El catálogo sale
de los CLI, no de una lista escrita a mano: `pi --list-models` (tabla
`provider model context max-out thinking images`) y `opencode models` (una
`provider/model` por línea), y Gentle Shell reusa el catálogo de `pi` porque lo
envuelve. Se lee una vez por arranque del studio y se sirve en
`GET /api/skills/models?agent=pi|opencode|gentle-shell`, junto con el modelo
activo del agente.

- El **modelo activo** de cada agente se lee de su propio archivo de settings,
  en cada consulta al catálogo, así un cambio hecho por fuera se ve sin
  reiniciar el studio. `pi` lo guarda en `defaultModel` de
  `~/.pi/agent/settings.json`; Gentle Shell en el suyo
  (`$GENTLE_SHELL_HOME/settings.json` o
  `~/.gentle-shell/agent/settings.json`), que puede ser distinto del de `pi` y
  por eso se lee aparte. `opencode` no declara un modelo por defecto en su
  configuración: ahí el panel dice que no lo conoce.
- De esos archivos se lee **sólo la clave del modelo**: nunca credenciales ni el
  resto del contenido. Un archivo ausente, sin la clave o con JSON roto es
  "desconocido" y el panel lo dice; nunca es un error ni un modelo inventado.
- La primera opción del select es el **default del agente** (valor vacío): con
  esa opción no se pasa ningún flag. La opción del modelo activo se rotula
  `(actual)` y viene seleccionada. Si el activo no está en el catálogo, se
  agrega igual como opción, para no mentir sobre lo que el agente está usando.
  Si el activo es desconocido, el select arranca en el default y el panel lo
  avisa.
- Elegir un modelo aplica **sólo a esa ejecución**, con `--model <modelo>` en
  `pi`, Gentle Shell y `opencode run`. El studio **no escribe** en la
  configuración de ningún agente: cambiar el default global es otra escritura,
  fuera del proyecto, y no la hace el studio.
- Si el comando del catálogo falla, el panel lo dice con el motivo y el select
  sólo ofrece el default del agente y el modelo activo: nunca se inventan ids.
- El modelo es entrada del usuario: se valida no vacío, hasta 128 caracteres y
  sin caracteres de control, y viaja siempre como argumento del proceso.

#### Historial de ejecuciones

Cada ejecución se guarda en el proyecto, un archivo JSONL por run:

```
<proyecto>/.fwinit/studio/runs/<id>.jsonl
```

El formato es una línea `meta` (id, agente, skill, modelo, `sessionId`, pedido,
comando, `startedAt`), una línea `line` por cada línea de salida (`n`, `kind`,
`text`, `at`), una línea `session` con el id de sesión del agente si lo informó,
y un cierre `end` (`state`, `exitCode`, `endedAt`, `truncated`). La carpeta se
auto-ignora con un `.fwinit/.gitignore` que contiene `*`: tu `.gitignore` no se
toca y el repo no se ensucia.

- Al recargar la página, el raíl **Ejecuciones** se llena con el historial
  (el más nuevo primero) y, si había un run corriendo, el studio se reengancha
  solo: abre esa skill y sigue el streaming desde `since=0` sin duplicar líneas.
- Recargar no pierde el resultado: el panel restaura el último run de la skill
  que estás mirando **aunque ya haya terminado**, con su salida y su estado
  final. También lo restaura cuando elegís esa skill más tarde en la sesión.
  Restaurar es sólo lectura: no arranca el agente, no escribe en `.fwinit` y no
  cambia la URL. Si ya cerraste ese historial a mano, no se vuelve a abrir solo.
- El panel muestra las ejecuciones **de esa skill** ahí mismo, con estado, modelo
  y fecha, y abre cualquiera al tocarla. El raíl sigue siendo el historial global.
- Elegir un run del historial muestra su salida completa y su estado final,
  aunque el studio se haya reiniciado. Leerlo no arranca nada.
- Un run cuya skill ya no está instalada se abre igual, con el aviso de que la
  skill no está: los archivos guardados no dependen del reporte de skills.
- Un archivo con `meta` y sin `end` se reporta como **interrumpida**: el proceso
  murió con el server anterior y no sigue corriendo.
- Se conservan los últimos 50 runs y 20 MB en total; al pasarse, se borran los
  más viejos. El historial no permite lanzar un segundo run.
- `GET /api/skills/runs` devuelve la ejecución en curso y el resumen de cada run;
  `GET /api/skills/run?id=&since=` sirve tanto el run vivo como el del disco.
  Son rutas de lectura: no piden token y no tocan ningún proceso.

#### Instalar una skill en los agentes (acción secundaria)

En el mismo panel, **Instalar en los agentes** copia la skill del bundle
(`create-specs`, `create-specs-from-code`, `create-prompt`, `design`) en los tres
destinos. Pide confirmación mostrando las rutas exactas, avisa cuál se va a
reemplazar y recién entonces copia en `~/.config/opencode/skills`,
`~/.pi/agent/skills` y `~/.gentle-shell/agent/skills` (o
`$GENTLE_SHELL_HOME/skills`). Es una copia determinista: no invoca ningún agente
ni modelo.

- Sólo copia lo que trae el bundle del repo, y sólo la carpeta de la skill.
  Los comandos slash (`/create-specs`) siguen instalándose con
  `fwinit skills --global opencode,pi,gentle-shell`.
- El resultado se reporta por destino: si uno falla, el studio lo dice y no
  presenta el resto como una instalación completa.
- Ese `POST` de instalación es la única escritura que hace el studio por su
  cuenta. Exige el token que viaja en el documento y un pedido del mismo origen,
  así que una página de otro sitio no puede dispararlo contra tu `127.0.0.1`.
  Ejecutar usa las mismas guardas: sin token y sin mismo origen, no arranca.
- Si el bundle no está junto al CLI, el botón de instalar no aparece y el studio
  te dice el comando que hace el trabajo.

El servidor escucha **sólo en 127.0.0.1** y se cierra con `Ctrl+C`. El studio
sólo escribe cuando se lo pedís: instalar copia archivos del bundle, ejecutar
lanza el agente que elegiste —que hace lo que la skill diga— y deja una sesión
retomable en ese agente, y cada ejecución deja su registro en
`.fwinit/studio/runs/` para que el historial sobreviva a una recarga o a un
reinicio. Si el proyecto todavía no tiene `specs/`, la vista de
specs lo dice y el resto del studio sigue funcionando; para crearlas, ejecutá la
skill `create-specs` desde el panel (o usá `/create-specs`).

La interfaz usa los mismos tokens de diseño que la landing page (`--accent`
#8aa2ff, esquinas rectas, separadores hairline) con tema claro y oscuro
sincronizados por `localStorage`.

### Modo interactivo

`fwinit` sin argumentos abre el menú principal:

```
? ¿Qué querés crear?
> Full stack (backend + frontend)
  Solo backend (API)
  Solo frontend (app)
  Skills globales (instalar / eliminar)
  Abrir studio (skills instaladas y specs en el navegador)
```

- **Full stack**: te pregunta primero el backend y después el frontend, y arma el monorepo completo.
- **Solo backend / Solo frontend**: te pregunta el template de la capa, el nombre, el package manager y el layout.
- **Skills globales**: instala o elimina el bundle de skills en los destinos globales.
- **Abrir studio**: abre el mismo studio de `fwinit studio` en el navegador, muestra la URL y te deja volver a abrirlo o cerrarlo desde el menú (`Cerrar el studio` libera el puerto y sale; `Ctrl+C` hace lo mismo).

### Proyecto full stack

```bash
fwinit fullstack mi-proyecto
```

Pregunta qué backend querés (ASP.NET, Express, Fastify, Node.js Vanilla) y qué frontend (React Native). Genera:

```
mi-proyecto/
├── backend/          # API (template elegido — trae su DB: Prisma o EF)
├── frontend/         # App (template frontend elegido)
├── .gitignore        # .atl/ · odd  (.opencode/, .pi/ y .agents/ SÍ se versionan)
├── .opencode/        # Skills de OpenCode (create-specs, create-specs-from-code, create-prompt + biblioteca de diseño)
├── .pi/              # Mismo bundle para Pi y Gentle Shell (skills + prompt templates)
├── .agents/          # Mismo bundle para Freebuff y agentes Agent Skills
├── README.md         # Cómo correr backend y frontend
└── specs/            # La creás con /create-specs
```

Gentle Shell corre sobre Pi con un home aislado (`~/.gentle-shell/agent`), así que dentro del proyecto lee el mismo `.pi/` (skills y prompt templates) y `.agents/`. No necesita carpeta propia: el bundle de `.pi/` ya lo cubre.

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

Igual para frontend: `fwinit astro mi-landing`, `fwinit tauri mi-dashboard`, `fwinit flutter mi-app` (o `react-native`) pregunta por `frontend/`.

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
| `flutter` | frontend | App multiplataforma con Flutter, Clean Architecture y Riverpod | flutter |

La capa y el runtime son metadata de cada template (`layer` y `runtime` en `templates/<TEMPLATE>/template.json`), pero **el template se registra en `cli/src/templates.ts`**: el `template.json` documenta y aporta los comandos de `postInit`, no resuelve el alias. Para sumar un template nuevo alcanzan la carpeta, su `template.json` y su entrada en `TEMPLATES`.

El único template que pide una identidad propia es Flutter: `fwinit flutter mi-app` pregunta la **organización reverse-domain** (ej. `ar.miempresa`) para armar el bundle id `ar.miempresa.mi_app` de Android, iOS, macOS y Linux. Se saltea con `-o, --org ar.miempresa`; en modo scripting/CI el default es `com.example`. Los demás templates no llevan bundle id nativo, así que no preguntan nada.

## Skills de opencode

Todo proyecto generado incluye `.opencode/skills/create-specs`, `.opencode/skills/create-specs-from-code`, `.opencode/skills/create-prompt`, sus comandos y la biblioteca de diseño completa:

- `/create-prompt <idea>` **detalla tu idea antes de generar las specs**. Toma una descripción suelta (`una tienda de floristería`) y escribe `specs/prompt.md`: el prompt módulo por módulo que escribirías a mano, con pantallas, reglas de negocio, endpoints, modelo de datos y requisitos no funcionales. Las decisiones que tu idea no define van marcadas `[PENDIENTE]` para que las revises. Después `/create-specs` lo consume.
- `/create-specs <descripción>` genera la carpeta `specs/` con módulos `backend/`, `db/` y `frontend/`, cada uno con sus `tasks` listas para implementar.
- `/create-specs-from-code` hace lo mismo pero sobre un proyecto que **ya existe**: lee el código real y documenta lo que hay. Cada entidad, endpoint, pantalla y tabla queda con su path, y `tasks/` contiene la deuda y los huecos que encuentra (tests faltantes, validación ausente, endpoints sin auth). No inventa nada.
- `/create-specs` **rutea solo**: si el proyecto ya tiene código con historia de git, pregunta cuál de las dos querés. Si es un scaffold recién generado, va directo a modo proyecto nuevo.
- `skills/design/` — biblioteca de diseño: 6 estilos curados listos para usar — `dark-luxury`, `docs-starship`, `minimal-dashboard`, `minimal-light`, `neo-brutalist` y `glassmorphism` (cada uno con su `SKILL.md` y `DESIGN.md`) — más el catálogo search-driven `ui-ux-pro-max/`.
- `/design` y `/design-<estilo>` — comandos para aplicar un sistema de diseño: cargan la skill elegida y leen automáticamente el design system del proyecto en `specs/frontend/02-design.md`.
- `skills/design/ui-ux-pro-max/` — **catálogo de diseño search-driven** (79 estilos, 192 paletas, 74 pares tipográficos, 119 guidelines de UX, 25 tipos de gráfico y 22 stacks). Se activa sola por descripción — o con `/design-ui-ux-pro-max` — y consulta su base local offline; genera un design system completo (`MASTER.md`) o responde consultas puntuales de UX/accesibilidad. Requiere Python 3 (solo stdlib, sin pip ni red).
- La db se documenta en `specs/db/` (schemas por entidad, enums y use-cases) aunque la implementación viva en el template backend.
- Los templates y los proyectos traen `.gitignore` que excluye solo el estado local de AI (`.atl/` y `odd`). `.opencode/`, `.pi/` y `.agents/` se versionan: las skills, los commands y el design system viajan con el repo para que todo el equipo los tenga.

### Biblioteca de skills de diseño

El repo es la fuente de verdad de **skills de diseño** para opencode, una por estilo, listas para usar en cualquier proyecto:

```
skills/design/
├── dark-luxury/       # Oscuro premium: negro cálido, acentos dorados/plata, grano, glow
├── minimal-dashboard/ # UI funcional densa: paneles admin, POS, back-office (no es estilo de página)
├── minimal-light/     # Light minimal: blanco, whitespace generoso, un acento
├── neo-brutalist/     # Brutalista: sombras duras, bordes gruesos negros, colores vivos
├── glassmorphism/     # Cristal: paneles translúcidos con blur, fondos aurora
├── docs-starship/     # Docs: sitios de documentación, catálogos y landings técnicas (negro azulado, un acento eléctrico, doble tema)
├── ui-ux-pro-max/     # Catálogo search-driven + motor Python (no es un estilo fijo: se consulta)
└── commands/          # /design, /design-<estilo> y /design-ui-ux-pro-max (cargar skill + leer specs/frontend/02-design.md)
```

Cada una es una carpeta con `SKILL.md` (frontmatter + reglas y triggers de activación, inglés + español) y `DESIGN.md` (paleta, tipografía y especificación completa). Están registradas globalmente en `~/.config/opencode/opencode.json` vía `skills.paths`, así que al pedir un estilo ("hacelo dark luxury", "estilo brutalista", "efecto vidrio"...) la skill correspondiente se carga sola, en cualquier proyecto.

**Cobertura total**: cada skill declara un contrato normativo — el estilo se aplica a la **aplicación completa**: páginas públicas, landing y panel administrativo/privado, sin excepción. Si pedís un estilo y alguna vista queda sin aplicarlo, es un defecto; exígile al agente que cubra toda la app antes de dar la tarea por terminada.

Para sumar un estilo nuevo: creá la carpeta `skills/design/<estilo>/` con su `SKILL.md` (mismo nombre de carpeta en el frontmatter `name`, `description` con triggers distintivos en inglés y español), su `DESIGN.md` y un command `skills/design/commands/design-<estilo>.md`, reiniciá opencode y listo.

### Catálogo de diseño search-driven (`ui-ux-pro-max`)

Además de los 6 estilos curados de `skills/design/`, y **dentro de esa misma carpeta**, el repo vendoriza el catálogo **ui-ux-pro-max**: una base de datos consultable con 79 estilos, 192 paletas de producto, 74 pares tipográficos, 119 guidelines de UX, 105 iconos, 25 tipos de gráfico y guías de 22 stacks.

```
skills/design/ui-ux-pro-max/
├── SKILL.md      # contrato de uso, prioridades y workflow de consulta
├── scripts/      # motor de búsqueda (Python 3, solo stdlib, offline)
├── data/         # el catálogo: CSVs de estilos, colores, fuentes, UX, stacks
├── references/   # quick-reference.md (119 guidelines) y pro-rules.md (checklist de entrega)
└── NOTICE.md     # procedencia y licencia del upstream (MIT)
```

Viaja dentro de la biblioteca de diseño, así que se activa como el resto de la familia: con `/design-ui-ux-pro-max` o por su `description`. Sirve para dos cosas — **generar un design system** para una página o proyecto (`--design-system`, con diales opcionales de varianza, movimiento y densidad) y **responder consultas puntuales** (`--domain ux`, `--domain color`, `--stack nextjs`...). Cuando el proyecto ya eligió uno de los 6 estilos curados, esa skill tiene prioridad; el catálogo es para lo que no cubren.

Es la única skill del bundle con un runtime propio: **Python 3, solo librería estándar, sin red**. Si no hay `python3` en la máquina, el `SKILL.md` le indica al agente degradar a su tabla de defaults y decirlo explícitamente en vez de inventar resultados. El upstream es [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT); ver `NOTICE.md` para la revisión vendorizada.

### Comandos `/design`

Para aplicar un sistema de diseño a un estilo concreto:

- `/design` — pregunta qué estilo querés aplicar y lo carga.
- `/design-dark-luxury`, `/design-minimal-dashboard`, `/design-minimal-light`, `/design-neo-brutalist`, `/design-glassmorphism`, `/design-docs-starship` — cargan directamente la skill del estilo. `minimal-dashboard` es el único que **no** es un estilo de página: es UI funcional densa para paneles admin, POS y back-office, y su propia skill descarta landings y páginas de marketing (usá `dark-luxury` para eso).
- `/design-ui-ux-pro-max` — carga el **catálogo search-driven** en vez de un estilo fijo: busca el estilo por nombre o por tipo de producto, genera el design system completo, o responde una consulta puntual de UX/accesibilidad. Requiere Python 3.

Todos leen automáticamente el design system del proyecto (`specs/frontend/02-design.md`) y lo usan como fuente de verdad (accent, paleta, tipografía, componentes); si el archivo no existe, usan los defaults de la skill y avisan. Cualquier texto después del comando se pasa como contexto extra (ej. `/design-dark-luxury rehacé el header`).

Los commands viven en `skills/design/commands/`, viajan a `.opencode/commands/` en cada proyecto generado (la CLI los copia al hacer scaffold) y también se pueden instalar globalmente en `~/.config/opencode/command/` para que funcionen en cualquier proyecto sin re-scaffold. Reiniciá opencode después de agregar o modificar un command.

### Sistema de tokens de diseño

Cada skill de diseño distingue **invariantes del sistema** (protectores, no negociables: base, superficies, textos, bordes) de **un único token de marca**: el `accent`. Todos los valores derivados del accent (hover, glows, bordes accent, sombras) se **computan por fórmula** desde ese único input — así un proyecto puede traer su color sin romper la armonía del estilo.

Resolución del accent (en orden):

1. **Override en el prompt** — `/dark-luxury accent #42b872`.
2. **Design system del proyecto** — el token `accent` en `specs/frontend/02-design.md` (generado por `/create-specs`).
3. **Tokens del framework** — `tailwind.config` / variables CSS existentes.
4. **Default del sistema** — `#d4a03c`.

El modelo aplica guardrails (base oscura con luminancia < 15%, texto con contraste AA); si un valor entrante los viola, la skill lo ajusta al rango válido y lo avisa, en vez de romper el sistema. `dark-luxury` ya implementa esto; el resto de la biblioteca lo adopta en iteraciones siguientes.

### Uso Directo (sin CLI)

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
│   ├── create-specs/    # Skill embebida en los proyectos generados
│   ├── create-prompt/   # Detalla una idea de proyecto nuevo en specs/prompt.md
│   └── design/          # Biblioteca de skills de diseño (registrada vía skills.paths)
│       ├── dark-luxury/
│       ├── minimal-dashboard/
│       ├── minimal-light/
│       ├── neo-brutalist/
│       ├── glassmorphism/
│       ├── docs-starship/
│       └── commands/    # /design y /design-<estilo>
├── templates/           # Templates clasificados por capa (metadata "layer")
│   ├── ASPNET/          # API ASP.NET Core + Clean Architecture (backend)
│   ├── EXPRESS/         # API Express + Prisma + TypeScript (backend)
│   ├── FASTIFY/         # API Fastify + Prisma + TypeScript (backend)
│   ├── NODEJS-VANILLA/  # API Node.js puro + Prisma + TypeScript (backend)
│   ├── ASTRO/           # Landing estática Astro 7 (frontend)
│   ├── TAURI/           # Dashboard de escritorio Tauri 2 (frontend)
│   ├── REACT-NATIVE/    # App React Native + Expo (frontend)
│   └── FLUTTER/         # App Flutter + Riverpod + Clean Architecture (frontend)
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