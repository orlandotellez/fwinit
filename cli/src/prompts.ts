import inquirer from "inquirer";
import chalk from "chalk";
import {
  getTemplatesByLayer,
  type Template,
  type TemplateLayer,
} from "./templates.js";
import type { PackageManager } from "./utils.js";
import type { GlobalTarget } from "./global-skills.js";
import type { StepResult } from "./flow.js";
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

// ---------------------------------------------------------------------------
// Volver con Esc (S9)
//
// Cada paso del flujo interactivo es reversible: Esc no es una respuesta para
// inquirer, así que la tecla es nuestra. Escuchamos `keypress` en stdin y
// abortamos el AbortSignal que `createPromptModule` acepta (opción documentada
// de inquirer 12, no un interno): el prompt se rechaza con AbortPromptError y
// corre la misma limpieza que una respuesta normal (cursor restaurado, raw
// mode apagado), sin stack trace. No se importa `@inquirer/core` en src/: es un
// transitivo que ninguna dependencia declarada garantiza, así que el error se
// reconoce por nombre (igual que ExitPromptError en index.ts).
// ---------------------------------------------------------------------------

/** Opciones que comparten los prompts del flujo de creación. */
export interface PromptOptions<T> {
  /**
   * Respuesta dada antes: vuelve seleccionada (list) o como default
   * (input/confirm) cuando el runner re-entra al paso.
   */
  defaultValue?: T;
  /** False en el primer paso, donde Esc cancela en vez de volver. */
  canGoBack?: boolean;
}

/** Pista dim que cierra el mensaje de cada prompt del flujo. */
export function backHint(canGoBack: boolean | undefined): string {
  return chalk.dim(
    canGoBack === true ? "Esc para volver" : "Esc para cancelar"
  );
}

function withHint(message: string, canGoBack: boolean | undefined): string {
  return `${message} ${backHint(canGoBack)}`;
}

/** inquirer 12 rechaza un prompt abortado con este error (se mira el nombre). */
function isAbortPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortPromptError";
}

type RawPromptModule = (
  questions: unknown
) => Promise<Record<string, unknown>>;

/**
 * Corre un prompt y traduce Esc a `{ kind: "back" }`. Funciona igual para
 * list, confirm e input: los tres comparten el `createPrompt` de inquirer, así
 * que ninguno necesita un fallback de último choice.
 */
async function promptWithBack<T>(
  config: Record<string, unknown> & { name: string }
): Promise<StepResult<T>> {
  const controller = new AbortController();
  const promptModule = inquirer.createPromptModule({
    signal: controller.signal,
  }) as unknown as RawPromptModule;
  const onKeypress = (_input: string, key: { name?: string }): void => {
    if (key?.name === "escape") controller.abort();
  };
  process.stdin.on("keypress", onKeypress);
  try {
    const answers = await promptModule([config]);
    return { kind: "value", value: answers[config.name] as T };
  } catch (error) {
    if (isAbortPromptError(error)) return { kind: "back" };
    throw error;
  } finally {
    process.stdin.removeListener("keypress", onKeypress);
  }
}

// Menú principal: qué tipo de proyecto crear. En fullstack el CLI
// combina un template de backend con uno de frontend. Las dos últimas
// opciones no crean nada: delegan en el flujo de skills globales
// (instalar/eliminar) y en el studio local del proyecto actual.
//
// La descripción de cada opción dice la consecuencia, no el nombre: el
// label ya nombra la opción, la descripción aclara qué se crea.
export async function selectScope(
  options: PromptOptions<ProjectScope> = {}
): Promise<StepResult<ProjectScope>> {
  return promptWithBack<ProjectScope>({
    type: "list",
    name: "scope",
    message: withHint("¿Qué querés crear?", options.canGoBack),
    theme: selectionTheme,
    default: options.defaultValue,
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
  });
}

// Lista los templates de una capa (backend/frontend). La capa es
// metadata (Template.layer), no estructura de carpetas: sumar un
// template nuevo = un folder + "layer" y aparece solo en su menú.
// El nombre va como label y la descripción del template va en su propia
// columna (inquirer), así el menú queda alineado.
export async function selectTemplateFromLayer(
  layer: TemplateLayer,
  options: PromptOptions<Template> = {}
): Promise<StepResult<Template>> {
  return promptWithBack<Template>({
    type: "list",
    name: "template",
    message: withHint(
      layer === "backend"
        ? "¿Qué backend querés usar?"
        : "¿Qué frontend querés usar?",
      options.canGoBack
    ),
    theme: selectionTheme,
    default: options.defaultValue,
    choices: getTemplatesByLayer(layer).map((t) => ({
      ...describeChoice(t.name, t.description),
      value: t,
    })),
  });
}

// Al crear el proyecto, ¿inicializar un repositorio git? El git init
// corre en la raíz del proyecto (cubre backend/ + .opencode/ + .agents/ + specs/).
export async function askGitInit(
  options: PromptOptions<boolean> = {}
): Promise<StepResult<boolean>> {
  return promptWithBack<boolean>({
    type: "confirm",
    name: "initGit",
    message: withHint(
      "¿Inicializar un repositorio git?",
      options.canGoBack
    ),
    default: options.defaultValue ?? true,
    theme: brandTheme,
  });
}

export async function selectPackageManager(
  options: PromptOptions<PackageManager> = {}
): Promise<StepResult<PackageManager>> {
  return promptWithBack<PackageManager>({
    type: "list",
    name: "pm",
    message: withHint(
      "¿Qué package manager querés usar?",
      options.canGoBack
    ),
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
    default: options.defaultValue ?? "pnpm",
  });
}

export async function askProjectName(
  options: PromptOptions<string> = {}
): Promise<StepResult<string>> {
  const result = await promptWithBack<string>({
    type: "input",
    name: "name",
    message: withHint("Nombre del proyecto:", options.canGoBack),
    theme: brandTheme,
    default: options.defaultValue,
    validate: (input: string) => {
      if (!input.trim()) return "El nombre no puede estar vacío";
      if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
        return "Solo letras, números, guiones y guiones bajos";
      }
      return true;
    },
  });
  return result.kind === "back"
    ? result
    : { kind: "value", value: result.value.trim() };
}

// Estructura de monorepo liviano: el código del template va dentro de
// backend/ (o frontend/), y .opencode/, .agents/ (skills) + specs/ (creadas por
// create-specs) quedan al mismo nivel, en la raíz del proyecto.
export async function askLayerLayout(
  layer: TemplateLayer,
  options: PromptOptions<boolean> = {}
): Promise<StepResult<boolean>> {
  return promptWithBack<boolean>({
    type: "confirm",
    name: "layout",
    message: withHint(
      layer === "backend"
        ? "¿Empaquetar el código del template en una carpeta backend/?"
        : "¿Empaquetar el código del template en una carpeta frontend/?",
      options.canGoBack
    ),
    default: options.defaultValue ?? true,
    theme: brandTheme,
  });
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
export async function askFlutterOrg(
  options: PromptOptions<string> = {}
): Promise<StepResult<string>> {
  const result = await promptWithBack<string>({
    type: "input",
    name: "org",
    message: withHint(
      "Organización para el bundle id (reverse-domain, ej. com.example):",
      options.canGoBack
    ),
    default: options.defaultValue ?? FLUTTER_ORG_DEFAULT,
    validate: checkOrg,
    theme: brandTheme,
  });
  return result.kind === "back"
    ? result
    : { kind: "value", value: normalizeOrg(result.value) };
}

// Post-creación: instalar el bundle también en los destinos globales.
// Default en "no": el bundle de proyecto ya viaja versionado con el repo,
// así que instalar en global es una decisión consciente, no el default.
export async function askGlobalSkillsToo(
  options: PromptOptions<boolean> = {}
): Promise<StepResult<boolean>> {
  return promptWithBack<boolean>({
    type: "confirm",
    name: "global",
    message: withHint(
      "¿Instalar las skills también globalmente (OpenCode/Pi/Gentle Shell/Agent Skills)?",
      options.canGoBack
    ),
    default: options.defaultValue ?? false,
    theme: brandTheme,
  });
}
