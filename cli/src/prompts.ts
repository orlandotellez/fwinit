import inquirer from "inquirer";
import chalk from "chalk";
import {
  getTemplatesByLayer,
  type Template,
  type TemplateLayer,
} from "./templates.js";
import type { PackageManager } from "./utils.js";
import type { GlobalTarget } from "./global-skills.js";
import {
  FLUTTER_ORG_DEFAULT,
  checkOrg,
  normalizeOrg,
} from "./flutter-naming.js";
import {
  brandTheme,
  describeChoice,
  selectionTheme,
  shortenHomePath,
} from "./menu.js";

export type ProjectScope =
  | "fullstack"
  | "backend"
  | "frontend"
  | "skills"
  | "studio";

// Menú principal: qué tipo de proyecto crear. En fullstack el CLI
// combina un template de backend con uno de frontend. Las dos últimas
// opciones no crean nada: delegan en el flujo de skills globales
// (instalar/eliminar) y en el studio local del proyecto actual.
//
// La descripción de cada opción dice la consecuencia, no el nombre: el
// label ya nombra la opción, la descripción aclara qué se crea.
export async function selectScope(): Promise<ProjectScope> {
  const { scope } = await inquirer.prompt([
    {
      type: "list",
      name: "scope",
      message: "¿Qué querés crear?",
      theme: selectionTheme,
      choices: [
        {
          ...describeChoice("Full stack", "backend + frontend"),
          value: "fullstack",
        },
        {
          ...describeChoice("Solo backend", "solo la API"),
          value: "backend",
        },
        {
          ...describeChoice("Solo frontend", "solo la app"),
          value: "frontend",
        },
        {
          ...describeChoice(
            "Skills globales",
            "instalar o eliminar el bundle global"
          ),
          value: "skills",
        },
        {
          ...describeChoice(
            "Abrir studio",
            "skills instaladas y specs en el navegador"
          ),
          value: "studio",
        },
      ],
    },
  ]);
  return scope;
}

// Lista los templates de una capa (backend/frontend). La capa es
// metadata (Template.layer), no estructura de carpetas: sumar un
// template nuevo = un folder + "layer" y aparece solo en su menú.
// El nombre va como label y la descripción del template va en su propia
// columna (inquirer), así el menú queda alineado.
export async function selectTemplateFromLayer(
  layer: TemplateLayer
): Promise<Template> {
  const { template } = await inquirer.prompt([
    {
      type: "list",
      name: "template",
      message:
        layer === "backend"
          ? "¿Qué backend querés usar?"
          : "¿Qué frontend querés usar?",
      theme: selectionTheme,
      choices: getTemplatesByLayer(layer).map((t) => ({
        ...describeChoice(t.name, t.description),
        value: t,
      })),
    },
  ]);
  return template;
}

// Al crear el proyecto, ¿inicializar un repositorio git? El git init
// corre en la raíz del proyecto (cubre backend/ + .opencode/ + .agents/ + specs/).
export async function askGitInit(): Promise<boolean> {
  const { initGit } = await inquirer.prompt([
    {
      type: "confirm",
      name: "initGit",
      message: "¿Inicializar un repositorio git?",
      default: true,
      theme: brandTheme,
    },
  ]);
  return initGit;
}

export async function selectPackageManager(): Promise<PackageManager> {
  const { pm } = await inquirer.prompt([
    {
      type: "list",
      name: "pm",
      message: "¿Qué package manager querés usar?",
      theme: selectionTheme,
      choices: [
        {
          ...describeChoice("pnpm", "más rápido, lockfile determinista"),
          value: "pnpm",
        },
        {
          ...describeChoice("npm", "el que viene con Node"),
          value: "npm",
        },
        {
          ...describeChoice("bun", "instalación veloz y runner integrado"),
          value: "bun",
        },
      ],
      default: "pnpm",
    },
  ]);
  return pm;
}

export async function askProjectName(): Promise<string> {
  const { name } = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: "Nombre del proyecto:",
      theme: brandTheme,
      validate: (input) => {
        if (!input.trim()) return "El nombre no puede estar vacío";
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
          return "Solo letras, números, guiones y guiones bajos";
        }
        return true;
      },
    },
  ]);
  return name.trim();
}

// Estructura de monorepo liviano: el código del template va dentro de
// backend/ (o frontend/), y .opencode/, .agents/ (skills) + specs/ (creadas por
// create-specs) quedan al mismo nivel, en la raíz del proyecto.
export async function askLayerLayout(layer: TemplateLayer): Promise<boolean> {
  const { layout } = await inquirer.prompt([
    {
      type: "confirm",
      name: "layout",
      message:
        layer === "backend"
          ? "¿Empaquetar el código del template en una carpeta backend/?"
          : "¿Empaquetar el código del template en una carpeta frontend/?",
      default: true,
      theme: brandTheme,
    },
  ]);
  return layout;
}

// Los destinos llegan como label ya armado por global-skills.ts
// ("OpenCode global (/home/x/.config/opencode)"): el menú muestra el nombre
// como label y la ruta corta (~/…) como descripción. Sin paréntesis, el
// label se muestra tal cual.
function destinationChoice(choice: { name: string; value: GlobalTarget }): {
  name: string;
  description?: string;
  value: GlobalTarget;
} {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(choice.name);
  const base = match
    ? describeChoice(match[1], shortenHomePath(match[2]))
    : describeChoice(choice.name);
  return { ...base, value: choice.value };
}

// Checkboxes de destinos globales para fwinit skills. Devuelve vacío si el
// usuario no marca ninguno (el comando solo informa, no falla).
export async function selectGlobalTargets(
  choices: Array<{ name: string; value: GlobalTarget }>
): Promise<GlobalTarget[]> {
  const { targets } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "targets",
      message: "¿Dónde querés instalar las skills?",
      theme: selectionTheme,
      choices: choices.map(destinationChoice),
    },
  ]);
  return targets;
}

// Checkboxes de destinos para eliminar (misma lista, otro mensaje).
export async function selectGlobalTargetsToRemove(
  choices: Array<{ name: string; value: GlobalTarget }>
): Promise<GlobalTarget[]> {
  const { targets } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "targets",
      message: "¿De dónde querés eliminar las skills?",
      theme: selectionTheme,
      choices: choices.map(destinationChoice),
    },
  ]);
  return targets;
}

// Acción de fwinit skills en modo interactivo: instalar o eliminar.
export type SkillsAction = "install" | "remove";
export async function selectSkillsAction(): Promise<SkillsAction> {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "¿Qué querés hacer con las skills globales?",
      theme: selectionTheme,
      choices: [
        {
          ...describeChoice(
            "Instalar / actualizar",
            "copia el bundle del repo en los destinos elegidos"
          ),
          value: "install",
        },
        {
          ...describeChoice(
            "Eliminar",
            "borra las skills globales instaladas"
          ),
          value: "remove",
        },
      ],
    },
  ]);
  return action;
}

// Control del studio abierto desde el menú: el servidor ya está escuchando y
// la URL va en el mensaje, así el prompt no repite el contexto. Cerrar es una
// acción explícita (no un Ctrl+C a ciegas) porque de eso depende liberar el
// puerto.
export type StudioMenuAction = "reopen" | "close";
export async function selectStudioAction(
  url: string
): Promise<StudioMenuAction> {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: `Studio en ${chalk.dim(url)}`,
      theme: selectionTheme,
      choices: [
        {
          ...describeChoice(
            "Abrir de nuevo en el navegador",
            "vuelve a lanzar el navegador"
          ),
          value: "reopen",
        },
        {
          ...describeChoice("Cerrar el studio", "libera el puerto y sale"),
          value: "close",
        },
      ],
    },
  ]);
  return action;
}

// Organización reverse-domain para el bundle id. Es el ÚNICO template que
// pregunta esto: Flutter/Dart deriva el bundle id y el package path de una
// identidad reverse-domain real (ej. ar.miempresa), mientras que el resto de
// los templates siguen convenciones de npm/dotnet que no llevan identidad de
// dominio propia. Normaliza antes de devolver: el caller siempre recibe un
// valor en minúsculas y sin espacios.
export async function askFlutterOrg(): Promise<string> {
  const { org } = await inquirer.prompt([
    {
      type: "input",
      name: "org",
      message:
        "Organización para el bundle id (reverse-domain, ej. com.example):",
      default: FLUTTER_ORG_DEFAULT,
      validate: checkOrg,
      theme: brandTheme,
    },
  ]);
  return normalizeOrg(org);
}

// Post-creación: instalar el bundle también en los destinos globales.
// Default en "no": el bundle de proyecto ya viaja versionado con el repo,
// así que instalar en global es una decisión consciente, no el default.
export async function askGlobalSkillsToo(): Promise<boolean> {
  const { global } = await inquirer.prompt([
    {
      type: "confirm",
      name: "global",
      message:
        "¿Instalar las skills también globalmente (OpenCode/Pi/Gentle Shell/Agent Skills)?",
      default: false,
      theme: brandTheme,
    },
  ]);
  return global;
}
