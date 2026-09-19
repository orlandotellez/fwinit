import inquirer from "inquirer";
import { TEMPLATES, type Template } from "./templates.js";
import type { PackageManager } from "./utils.js";

export async function selectTemplate(): Promise<Template> {
  const { template } = await inquirer.prompt([
    {
      type: "list",
      name: "template",
      message: "¿Qué proyecto querés crear?",
      choices: TEMPLATES.map((t) => ({
        name: `${t.name} — ${t.description}`,
        value: t,
      })),
    },
  ]);
  return template;
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
// backend/, y .opencode/ (skills) + specs/ (creadas por create-specs)
// quedan al mismo nivel, en la raíz del proyecto.
export async function askBackendLayout(): Promise<boolean> {
  const { layout } = await inquirer.prompt([
    {
      type: "confirm",
      name: "layout",
      message: "¿Empaquetar el código del template en una carpeta backend/?",
      default: true,
    },
  ]);
  return layout;
}
