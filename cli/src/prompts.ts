import inquirer from "inquirer";
import {
  getTemplatesByLayer,
  type Template,
  type TemplateLayer,
} from "./templates.js";
import type { PackageManager } from "./utils.js";
import type { GlobalTarget } from "./global-skills.js";

export type ProjectScope = "fullstack" | "backend" | "frontend" | "skills";

// Menú principal: qué tipo de proyecto crear. En fullstack el CLI
// combina un template de backend con uno de frontend. La última opción
// delega en el flujo de skills globales (instalar/eliminar).
export async function selectScope(): Promise<ProjectScope> {
  const { scope } = await inquirer.prompt([
    {
      type: "list",
      name: "scope",
      message: "¿Qué querés crear?",
      choices: [
        { name: "Full stack (backend + frontend)", value: "fullstack" },
        { name: "Solo backend (API)", value: "backend" },
        { name: "Solo frontend (app)", value: "frontend" },
        { name: "Skills globales (instalar / eliminar)", value: "skills" },
      ],
    },
  ]);
  return scope;
}

// Lista los templates de una capa (backend/frontend). La capa es
// metadata (Template.layer), no estructura de carpetas: sumar un
// template nuevo = un folder + "layer" y aparece solo en su menú.
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
      choices: getTemplatesByLayer(layer).map((t) => ({
        name: `${t.name} — ${t.description}`,
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
      choices: [
        { name: "pnpm (recomendado)", value: "pnpm" },
        { name: "npm", value: "npm" },
        { name: "bun", value: "bun" },
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
    },
  ]);
  return layout;
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
      choices,
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
      choices,
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
      choices: [
        { name: "Instalar / actualizar", value: "install" },
        { name: "Eliminar", value: "remove" },
      ],
    },
  ]);
  return action;
}

// Post-creación: instalar el bundle también en los destinos globales.
// Default en "no": el bundle de proyecto ya viaja versionado con el repo,
// así que instalar en global es una decisión consciente, no el default.
export async function askGlobalSkillsToo(): Promise<boolean> {
  const { global } = await inquirer.prompt([
    {
      type: "confirm",
      name: "global",
      message: "¿Instalar las skills también globalmente (OpenCode/Pi/Agent Skills)?",
      default: false,
    },
  ]);
  return global;
}