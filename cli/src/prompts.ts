import inquirer from "inquirer";
import {
  getTemplatesByLayer,
  type Template,
  type TemplateLayer,
} from "./templates.js";
import type { PackageManager } from "./utils.js";

export type ProjectScope = "fullstack" | "backend" | "frontend";

// Menú principal: qué tipo de proyecto crear. En fullstack el CLI
// combina un template de backend con uno de frontend.
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
// corre en la raíz del proyecto (cubre backend/ + .opencode/ + specs/).
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
// backend/ (o frontend/), y .opencode/ (skills) + specs/ (creadas por
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