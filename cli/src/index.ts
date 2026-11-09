#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { readFileSync } from "node:fs";
import { mkdir, cp, readFile } from "fs/promises";
import { join, basename } from "path";
import {
  TEMPLATES,
  findTemplate,
  getTemplatesByLayer,
  type Template,
} from "./templates.js";
import {
  downloadAndExtract,
  downloadAndExtractRepo,
  copyTemplate,
  cleanup,
  substituteTemplate,
} from "./downloader.js";
import { planAgentBundle } from "./agent-bundle.js";
import { startStudio } from "./studio/server.js";
import { openBrowser } from "./studio/open-browser.js";
import { printStudioSummary } from "./studio/summary.js";
import type { StudioServer } from "./studio/types.js";
import { buildSpecsTree } from "./studio/specs.js";
import { discoverSkills } from "./studio/skills.js";
import { printBanner } from "./banner.js";
import { contextLine, separatorRow } from "./menu.js";
import {
  selectScope,
  selectTemplateFromLayer,
  askProjectName,
  selectPackageManager,
  askLayerLayout,
  askGitInit,
  selectGlobalTargets,
  selectGlobalTargetsToRemove,
  selectSkillsAction,
  askGlobalSkillsToo,
  askFlutterOrg,
  selectStudioAction,
  type ProjectScope,
  type StudioMenuAction,
} from "./prompts.js";
import {
  FLUTTER_ORG_DEFAULT,
  checkOrg,
  normalizeOrg,
} from "./flutter-naming.js";
import {
  planSteps,
  runFlow,
  type FlowAnswers,
  type FlowFlags,
  type FlowStepContext,
  type FlowStepId,
  type StepResult,
} from "./flow.js";
import {
  resolveGlobalTargets,
  installGlobalSkills,
  uninstallGlobalSkills,
  filterBundleByNames,
  ensureGlobalOpencodeConfig,
  type GlobalTargetSpec,
} from "./global-skills.js";
import {
  getProjectPath,
  projectExists,
  printSuccess,
  printSuccessFullStack,
  adaptToNodeRuntime,
  writeRootFiles,
  writeRootGitignore,
  gitInit,
  type PackageManager,
} from "./utils.js";

const program = new Command();

const PACKAGE_MANAGERS = ["npm", "pnpm", "bun"] as const;

// --no-color tiene que ganarle a la detección automática de chalk antes de que
// se imprima cualquier cosa: el nivel 0 apaga también los prompts y los
// spinners. Se aplica en el hook (cubre subcomandos y el comando raíz) y de
// nuevo al entrar a la acción, así el orden no depende del hook.
//
// chalk 5 no mira NO_COLOR por su cuenta (a diferencia de chalk 4), así que la
// convención se respeta acá: NO_COLOR no vacío equivale a --no-color.
function applyColorFlag(): void {
  const noColorEnv = process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "";
  if (program.opts().color === false || noColorEnv) {
    chalk.level = 0;
  }
}

// Conteo de skills globales para la línea de contexto. Es cortesía: si el
// home no se deja leer, la línea simplemente omite ese fragmento.
async function globalSkillsCount(): Promise<number | undefined> {
  try {
    const report = await discoverSkills({
      projectRoot: process.cwd(),
      home: process.env.HOME,
    });
    return report.totals.global;
  } catch {
    return undefined;
  }
}

// El hook corre antes de cualquier acción (comando raíz o subcomando), así
// `fwinit --no-color <cmd>` también sale sin escapes.
program.hook("preAction", () => {
  applyColorFlag();
});

// Lee la versión real del package.json adjunto al binario (dist/ y
// package.json viven juntos tanto en dev como en la instalación global).
// Evita desincronizar la version de npm con la que reporta --version.
function getCliVersion(): string {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, "utf-8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// Directorio raíz por agente donde vive el bundle de skills. Las
// convenciones de cada agente son compatibles: skills en <root>/skills/<name>/
// con SKILL.md (descubrimiento recursivo) y commands en <root>/commands/
// <name>.md → /<name>. En Pi los commands son prompt templates y también
// existe /skill:<name> como alternativa. .agents/ es la ubicación estándar
// de Agent Skills: la lee Freebuff y cualquier agente compatible.
const AGENT_DIRS = [".opencode", ".pi", ".agents"] as const;

// Instala el bundle de skills del repo (skills/) en cada agente soportado
// (.opencode/, .pi/ y .agents/), con el mismo layout en todos: skills/<name>/ con
// SKILL.md + extras, commands/<name>.md con el comando slash, y las
// bibliotecas de skills con sus commands.
//
// El bundle viene del repo remoto, así que puede no coincidir con lo que el
// CLI instalado espera (version skew). Cuando eso pasa se instala todo lo que
// haya y se avisa: silenciosamente no instalar nada dejaba al usuario sin
// /create-specs y sin /design, que es peor que un bundle parcial.
async function installAgentSkills(
  repoRoot: string,
  projectPath: string
): Promise<void> {
  const plan = await planAgentBundle(repoRoot);

  for (const agentDir of AGENT_DIRS) {
    const root = join(projectPath, agentDir);
    for (const dir of plan.skillDirs) {
      await mkdir(join(root, dir), { recursive: true });
    }
    for (const dir of plan.commandDirs) {
      await mkdir(join(root, dir), { recursive: true });
    }
    for (const item of plan.installs) {
      // `recursive: undefined` hace explotaar fs.cp (ERR_INVALID_ARG_TYPE):
      // la opción solo se pasa cuando la copia es de un directorio.
      await cp(item.from, join(root, item.to), {
        recursive: item.recursive === true,
      });
    }
  }

  // Aviso explícito: mejor saber que falta una skill que creer que el bundle
  // se instaló completo. Casi siempre es que el CLI local va más adelante que
  // el repo remoto (o al revés) y hay que pushear o actualizar.
  if (plan.missingRequired.length > 0) {
    console.log(
      chalk.yellow(
        `  Skills: el bundle remoto no trae ${plan.missingRequired.join(", ")} — omitido\n`
      )
    );
  }
}

// Descarga el bundle del repo e instala las skills en los destinos globales
// elegidos. Compartido por `fwinit skills` y la pregunta post-creación.
// `bundle` permite instalar un subconjunto (--only).
async function installGlobalSkillsWithSpinner(
  targets: GlobalTargetSpec[],
  bundle?: Parameters<typeof installGlobalSkills>[2]
): Promise<void> {
  const spinner = ora("Descargando bundle de skills...").start();
  const { tempDir, repoRoot } = await downloadAndExtractRepo();
  try {
    spinner.text = "Instalando skills...";
    const results = await installGlobalSkills(repoRoot, targets, bundle);
    spinner.succeed("Skills globales instaladas");
    for (const r of results) {
      if (r.error) {
        console.log(chalk.red(`  ✖ ${r.target.label}: ${r.error}`));
      } else {
        console.log(chalk.dim(`  ✔ ${r.target.label} — ${r.copied} archivos`));
      }
    }
    // Asegura que la config global de opencode tenga parallel_tool_calls habilitado
    await ensureGlobalOpencodeConfig();
    console.log();
  } finally {
    await cleanup(tempDir);
  }
}

// Lee postInit de template.json copiado al proyecto (si existe)
async function readTemplatePostInit(
  dir: string
): Promise<{ install?: string; dev?: string } | undefined> {
  try {
    const tj = JSON.parse(
      await readFile(join(dir, "template.json"), "utf-8")
    );
    return tj.postInit;
  } catch {
    // template.json no encontrado o inválido
    return undefined;
  }
}

// Modo fullstack: un solo fetch del repo, dos templates copiados como
// backend/ y frontend/, y archivos raíz (.gitignore + README). La DB
// viene incluida en el template backend (Prisma o EF).
async function createFullStackProject(
  projectPath: string,
  backendTpl: Template,
  frontendTpl: Template,
  pm: PackageManager,
  org: string | undefined
): Promise<void> {
  const { tempDir, repoRoot } = await downloadAndExtractRepo();
  const projectName = basename(projectPath);

  const backendPath = join(projectPath, "backend");
  const frontendPath = join(projectPath, "frontend");

  await copyTemplate(
    join(repoRoot, "templates", backendTpl.folder),
    backendPath
  );
  await copyTemplate(
    join(repoRoot, "templates", frontendTpl.folder),
    frontendPath
  );
  await substituteTemplate(backendPath, projectName, backendTpl.folder, {
    org,
  });
  await substituteTemplate(frontendPath, projectName, frontendTpl.folder, {
    org,
  });
  await installAgentSkills(repoRoot, projectPath);

  // Template nativo de bun + npm/pnpm → portar a runtime node
  if (backendTpl.runtime === "bun" && pm !== "bun") {
    await adaptToNodeRuntime(backendPath);
  }

  const backendPost = await readTemplatePostInit(backendPath);
  const frontendPost = await readTemplatePostInit(frontendPath);

  await writeRootFiles({
    projectName,
    backend: {
      label: "backend",
      description: backendTpl.description,
      postInit: backendPost,
    },
    frontend: {
      label: "frontend",
      description: frontendTpl.description,
      postInit: frontendPost,
    },
    pm,
  });

  await cleanup(tempDir);

  printSuccessFullStack(
    projectName,
    [
      { label: "backend", postInit: backendPost },
      { label: "frontend", postInit: frontendPost },
    ],
    pm
  );

  console.log(      chalk.dim(
          "  Estructura: backend/ (API) · frontend/ (app) · .opencode/, .pi/, .agents/ y specs/ (al mismo nivel)\n"
        )
  );
}

/**
 * Selección final del flujo interactivo: lo que ya traían los flags/argumentos
 * más lo que preguntó el runner. Es el único lugar donde se mezclan las dos
 * fuentes, así el camino con flags y el interactivo terminan en el mismo objeto.
 */
interface Creation {
  fullStack: boolean;
  template?: Template;
  backendTpl?: Template;
  frontendTpl?: Template;
  projectName: string;
  pm?: PackageManager;
  org?: string;
  useLayerLayout: boolean;
  wantsGit: boolean;
}

// Crea el proyecto con la selección ya resuelta. Vive fuera de la acción porque
// el flujo la invoca desde el paso de skills globales: la creación es el punto
// de no retorno y tiene que pasar antes de esa pregunta (y de su "volver", que
// ya no puede deshacerla).
async function createFromSelection(sel: Creation): Promise<void> {
  const projectName = sel.projectName;
  const layer = sel.template?.layer;

  // Verificar si el directorio ya existe
  if (projectExists(projectName)) {
    console.error(
      chalk.red(`\n\u2716 El directorio "${projectName}" ya existe.`)
    );
    process.exit(1);
  }

  const projectPath = getProjectPath(projectName);

  const spinner = ora(
    sel.fullStack
      ? "Descargando templates..."
      : `Descargando template ${sel.template!.name}...`
  ).start();

  if (sel.fullStack) {
    spinner.text = "Creando proyecto...";
    await createFullStackProject(
      projectPath,
      sel.backendTpl!,
      sel.frontendTpl!,
      sel.pm ?? "npm",
      sel.org
    );
    spinner.succeed("Template descargado");
  } else {
    const { tempDir, templatePath, repoRoot } = await downloadAndExtract(
      sel.template!.folder
    );

    // Con layout de capa, el código del template vive en backend/
    // (o frontend/) y .opencode/ + specs/ quedan en la raíz.
    const codePath = sel.useLayerLayout
      ? join(projectPath, layer!)
      : projectPath;

    spinner.text = "Creando proyecto...";

    await copyTemplate(templatePath, codePath);
    await substituteTemplate(codePath, projectName, sel.template!.folder, {
      org: sel.org,
    });
    await installAgentSkills(repoRoot, projectPath);

    // Con layout de capa, .opencode/, .pi/, .agents/ y specs/ viven fuera de
    // la carpeta del template → .gitignore raíz que solo ignora el estado
    // local de AI (.atl/, odd). Los bundles de skills se versionan con el
    // proyecto.
    if (sel.useLayerLayout) {
      await writeRootGitignore(projectPath);
    }

    // Template nativo de bun + npm/pnpm → portar a runtime node
    // (scripts con tsx, tests con vitest, sin bun-types)
    if (sel.template!.runtime === "bun" && sel.pm && sel.pm !== "bun") {
      await adaptToNodeRuntime(codePath);
    }

    await cleanup(tempDir);

    spinner.succeed("Template descargado");

    printSuccess(
      projectName,
      sel.template!.name,
      sel.pm ?? "npm",
      await readTemplatePostInit(codePath),
      sel.useLayerLayout ? layer : undefined
    );

    if (sel.useLayerLayout) {
      console.log(
        chalk.dim(
          `  Estructura: ${layer}/ (código) · .opencode/, .pi/, .agents/ y specs/ (al mismo nivel)\n`
        )
      );
    }
  }

  // Inicializar el repositorio git en la raíz del proyecto
  // (cubre backend/ + .opencode/ + specs/ según el layout)
  if (sel.wantsGit) {
    const ok = await gitInit(projectPath);
    if (ok) {
      console.log(chalk.dim("  Git: repositorio inicializado\n"));
    } else {
      console.log(
        chalk.yellow(
          "  \u26a0 No se pudo inicializar git (¿está instalado?)\n"
        )
      );
    }
  }
}

program
  .name("fwinit")
  .description("CLI para crear proyectos desde templates")
  .version(getCliVersion());

program
  .command("list")
  .description("Mostrar templates disponibles")
  .action(() => {
    console.log(
      chalk.bold("\nTemplates disponibles:\n")
    );
    for (const [label, layer] of [
      ["Backend", "backend"],
      ["Frontend", "frontend"],
    ] as const) {
      console.log(chalk.bold(`${label}:\n`));
      getTemplatesByLayer(layer).forEach((t) => {
        console.log(
          `  ${chalk.cyan(t.folder.toLowerCase())} — ${t.description}`
        );
      });
      console.log();
    }
  });

// Flujo completo de skills globales, con o sin flags. Usado por el comando
// `fwinit skills` y por la opción "Skills globales" del menú principal.
// Devuelve true si ejecutó una acción; false si el usuario canceló.
async function runSkillsFlow(
  opts: { global?: string; only?: string; remove?: boolean } = {}
): Promise<boolean> {
  const all = resolveGlobalTargets();
  if (all.length === 0) {
    console.error(chalk.red("\n✖ No se pudo resolver el HOME del usuario\n"));
    process.exit(1);
  }

  console.log(chalk.bold("\nSkills disponibles:\n"));
  console.log(chalk.dim("  create-specs — specs para proyecto nuevo (/create-specs)"));
  console.log(chalk.dim("  create-specs-from-code — specs desde código existente (/create-specs-from-code)"));
  console.log(chalk.dim("  create-prompt — detalla una idea en specs/prompt.md (/create-prompt)"));
  console.log(chalk.dim("  design/ — dark-luxury, glassmorphism, minimal-dashboard, minimal-light, neo-brutalist, docs-starship + catálogo ui-ux-pro-max (/design-<estilo>; el catálogo requiere Python 3)\n"));

  // --only: subconjunto del bundle. Nombres desconocidos se avisan y
  // se ignoran (no abortan): el resto viaja igual.
  let bundle: Parameters<typeof installGlobalSkills>[2] | undefined;
  if (opts.only) {
    const names = opts.only.split(",").map((s) => s.trim()).filter(Boolean);
    const { bundle: filtered, unknown } = filterBundleByNames(names);
    if (unknown.length > 0) {
      console.log(chalk.yellow(`  ⚠ Skills desconocidas (ignoradas): ${unknown.join(", ")}\n`));
    }
    if (filtered.length === 0) {
      console.log(chalk.dim("\n  Ninguna skill válida en --only — no se hizo nada.\n"));
      return false;
    }
    bundle = filtered;
  }

  const remove = opts.remove === true;
  const interactive = !opts.global;

  // Interactivo: preguntar instalar/eliminar (salvo que --remove lo diga).
  let action: "install" | "remove" = remove ? "remove" : "install";
  if (interactive && !remove) {
    action = await selectSkillsAction();
  }

  // Elegir destinos: por flag, o checkboxes según la acción.
  let targets: GlobalTargetSpec[];
  if (opts.global) {
    const ids = opts.global.split(",").map((s) => s.trim().toLowerCase());
    if (ids.includes("all")) {
      targets = all;
    } else {
      const valid = new Map(all.map((t) => [t.id, t] as const));
      targets = [];
      for (const id of ids) {
        const t = valid.get(id as never);
        if (!t) {
          console.error(
            chalk.red(`\n✖ Destino "${id}" inválido. Usá: ${all.map((x) => x.id).join(", ")} o all\n`)
          );
          process.exit(1);
        }
        targets.push(t);
      }
    }
  } else {
    const pick = action === "remove" ? selectGlobalTargetsToRemove : selectGlobalTargets;
    const selected = await pick(all.map((t) => ({ name: t.label, value: t.id })));
    if (selected.length === 0) {
      console.log(
        chalk.dim(`\n  Nada seleccionado — no se ${action === "remove" ? "eliminó" : "instaló"} nada.\n`)
      );
      return false;
    }
    targets = all.filter((t) => selected.includes(t.id));
  }

  if (action === "remove") {
    const results = await uninstallGlobalSkills(targets, bundle);
    for (const r of results) {
      console.log(chalk.dim(`  ✔ ${r.target.label} — ${r.removed.length} eliminados`));
    }
    console.log();
    return true;
  }

  await installGlobalSkillsWithSpinner(targets, bundle);
  return true;
}

program
  .command("skills")
  .description(
    "Instalar o eliminar las skills del repo en ubicaciones globales (OpenCode, Pi, Gentle Shell, Agent Skills)"
  )
  .option(
    "-g, --global <targets>",
    "Destinos separados por coma: opencode, pi, gentle-shell, agents (o 'all'). Saltea la pregunta"
  )
  .option(
    "-o, --only <skills>",
    "Solo estas skills, separadas por coma: create-specs, create-specs-from-code, create-prompt, design"
  )
  .option(
    "-r, --remove",
    "Eliminar en vez de instalar (combinar con --global y opcionalmente --only)"
  )
  .action(async (opts: { global?: string; only?: string; remove?: boolean }) => {
    try {
      await runSkillsFlow(opts);
    } catch (error) {
      console.error(chalk.red(`\n✖ Error: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

// `fwinit studio` abre una vista local en el navegador: las skills que ya están
// instaladas para cada agente y las specs/ del proyecto actual. Escucha en
// 127.0.0.1; lo único que escribe es la instalación explícita de una skill del
// bundle en los tres agentes (POST con token y mismo origen).
program
  .command("studio")
  .description(
    "Abrir en el navegador las skills instaladas (OpenCode, Pi, Gentle Shell) y las specs/ del proyecto; permite implementar una skill del bundle en los tres agentes"
  )
  .option(
    "--port <puerto>",
    "Puerto fijo para el servidor local (por defecto lo elige el sistema)"
  )
  .option("--no-open", "No abrir el navegador automáticamente")
  .action(async (opts: { port?: string; open: boolean }) => {
    // `--port=""` no es "puerto aleatorio": es un valor ilegible y se rechaza.
    const rawPort = opts.port?.trim();
    const port = rawPort === undefined ? 0 : rawPort === "" ? NaN : Number(rawPort);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      console.error(chalk.red(`\n✖ Error: puerto inválido: ${opts.port}\n`));
      process.exit(1);
      return;
    }

    const projectRoot = process.cwd();
    const home = process.env.HOME;

    // Los números del resumen son cortesía: si el disco no se deja leer, el
    // studio igual arranca y la UI muestra el error que corresponda.
    let skillsLine = "no disponible";
    let specsLine = "no disponible";
    try {
      const report = await discoverSkills({ projectRoot, home });
      skillsLine = `${report.totals.global + report.totals.project} (${report.totals.global} globales · ${report.totals.project} del proyecto)`;
    } catch {
      // se mantiene el valor por defecto
    }
    try {
      const specs = await buildSpecsTree(projectRoot);
      specsLine = specs.found
        ? `${specs.totals.files} archivos en specs/`
        : "sin carpeta specs/ (creala con la skill create-specs)";
    } catch {
      // se mantiene el valor por defecto
    }

    try {
      const studio = await startStudio({
        port,
        projectRoot,
        version: getCliVersion(),
        open: opts.open !== false,
      });

      printStudioSummary({
        version: getCliVersion(),
        projectRoot,
        skillsLine,
        specsLine,
        url: studio.address.url,
      });

      const shutdown = (): void => {
        void studio.close().finally(() => process.exit(0));
      };
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    } catch (error) {
      console.error(
        chalk.red(`\n✖ Error: no se pudo abrir el studio: ${(error as Error).message}\n`)
      );
      process.exit(1);
    }
  });

// Ctrl+C dentro de un prompt no llega como SIGINT al proceso: el readline de
// inquirer lo intercepta y rechaza la promesa con un ExitPromptError, que sin
// manejar imprime un stack trace. Se detecta por nombre en vez de importar
// @inquirer/core, un transitivo que ninguna dependencia declarada garantiza.
function isExitPromptError(error: unknown): boolean {
  return error instanceof Error && error.name === "ExitPromptError";
}

// "Abrir studio" del menú principal: el mismo servidor que `fwinit studio`
// (mismo resumen y misma UI), en un puerto libre, con un prompt para volver a
// abrir el navegador o cerrarlo. El puerto nunca queda tomado: cerrar desde el
// menú, Ctrl+C en el prompt y SIGINT/SIGTERM pasan todos por studio.close().
async function runStudioFromMenu(): Promise<void> {
  const projectRoot = process.cwd();
  const home = process.env.HOME;

  let studio: StudioServer;
  try {
    studio = await startStudio({
      port: 0,
      projectRoot,
      version: getCliVersion(),
      open: true,
    });
  } catch (error) {
    console.error(
      chalk.red(
        `\n\u2716 Error: no se pudo abrir el studio: ${(error as Error).message}\n`
      )
    );
    process.exit(1);
    return;
  }

  // Una sola salida: la señal y el cierre del prompt no pueden correr dos
  // veces ni dejar el puerto colgado.
  let closing = false;
  const shutdown = (code: number): void => {
    if (closing) return;
    closing = true;
    void studio.close().finally(() => process.exit(code));
  };
  process.once("SIGINT", () => shutdown(0));
  process.once("SIGTERM", () => shutdown(0));

  // Los números del resumen son cortesía: si el disco no se deja leer, el
  // studio igual arranca y la UI muestra el error que corresponda.
  let skillsLine = "no disponible";
  let specsLine = "no disponible";
  try {
    const report = await discoverSkills({ projectRoot, home });
    skillsLine = `${report.totals.global + report.totals.project} (${report.totals.global} globales · ${report.totals.project} del proyecto)`;
  } catch {
    // se mantiene el valor por defecto
  }
  try {
    const specs = await buildSpecsTree(projectRoot);
    specsLine = specs.found
      ? `${specs.totals.files} archivos en specs/`
      : "sin carpeta specs/ (creala con la skill create-specs)";
  } catch {
    // se mantiene el valor por defecto
  }

  const url = studio.address.url;
  printStudioSummary({
    version: getCliVersion(),
    projectRoot,
    skillsLine,
    specsLine,
    url,
  });
  // El resumen ya avisa que Ctrl+C cierra: no repetir el mismo aviso acá.

  let action: StudioMenuAction = "close";
  for (;;) {
    try {
      action = await selectStudioAction(url);
    } catch (error) {
      if (!isExitPromptError(error)) throw error;
      // Ctrl+C en el prompt: inquirer ya soltó el readline, así que se apaga
      // el studio y se sale en 0 en vez de mostrar un stack trace.
      action = "close";
    }
    if (action !== "reopen") break;
    openBrowser(url);
  }

  if (!closing) {
    closing = true;
    await studio.close();
    console.log(chalk.green("  \u2714 Studio cerrado."));
  }
  process.exit(0);
}

program
  .argument("[template]", "Template a usar (o 'fullstack' para backend + frontend)")
  .argument("[project-name]", "Nombre del proyecto")
  .option("--no-banner", "No mostrar el banner ASCII en el menú interactivo")
  .option(
    "--no-color",
    "Desactivar el color de toda la salida (equivale a NO_COLOR)"
  )
  .option("-p, --pm <package-manager>", "Package manager a usar: npm, pnpm o bun")
  .option(
    "-o, --org <domain>",
    "Organización reverse-domain para el bundle id de Flutter (ej: ar.miempresa)"
  )
  .option("--backend", "Empaquetar el código en backend/ (saltea la pregunta)")
  .option("--no-backend", "Dejar el código en la raíz del proyecto (saltea la pregunta)")
  .option("-b, --backend-template <tpl>", "Backend a usar en fullstack (saltea la pregunta)")
  .option("-f, --frontend-template <tpl>", "Frontend a usar en fullstack (saltea la pregunta)")
  .option("--git", "Inicializar un repositorio git (saltea la pregunta)")
  .option("--no-git", "No inicializar git (saltea la pregunta)")
  .action(
    async (templateArg?: string, projectNameArg?: string) => {
      try {
        applyColorFlag();

        // Sin TTY y sin argumentos no hay menú que se pueda responder:
        // imprimir la ayuda y salir en vez de esperar para siempre una tecla
        // que nunca va a llegar. Un TTY conserva el flujo interactivo.
        if (templateArg === undefined && process.stdout.isTTY !== true) {
          program.outputHelp();
          process.exit(0);
        }

        // Banner sólo en el camino interactivo (sin template/fullstack) y en
        // un TTY: los runs scripteados no ensucian stdout.
        if (
          templateArg === undefined &&
          process.stdout.isTTY === true &&
          program.opts().banner !== false
        ) {
          const version = getCliVersion();
          printBanner({ version });
          console.log(
            contextLine({
              version,
              cwd: process.cwd(),
              templates: TEMPLATES.length,
              globalSkills: await globalSkillsCount(),
            })
          );
          console.log(separatorRow());
          console.log();
        }

        const {
          pm: pmArg,
          org: orgArg,
          backend,
          backendTemplate,
          frontendTemplate,
          git,
        } = program.opts<{
          pm?: string;
          org?: string;
          backend?: boolean;
          backendTemplate?: string;
          frontendTemplate?: string;
          git?: boolean;
        }>();

        // Validar el flag --pm si se proporcionó
        if (pmArg && !PACKAGE_MANAGERS.includes(pmArg as PackageManager)) {
          console.error(
            chalk.red(
              `\n\u2716 Package manager "${pmArg}" inválido. Usá: npm, pnpm o bun.\n`
            )
          );
          process.exit(1);
        }

        // ---- Flujo interactivo (S9) ----
        // El alcance y los templates que ya vinieron por argumento no se
        // preguntan: el plan de pasos solo lista lo que falta. Los flags -b/-f
        // del modo fullstack se validan al resolver la selección, con el mismo
        // mensaje y la misma salida que antes.
        const rawArg = templateArg?.toLowerCase();
        let forcedScope: ProjectScope | undefined;
        let forcedTemplate: Template | undefined;
        if (rawArg === "fullstack") {
          forcedScope = "fullstack";
        } else if (rawArg !== undefined) {
          forcedTemplate = findTemplate(rawArg);
          // El argumento del template no se encontró: error directo
          // (no caer en el modo interactivo)
          if (!forcedTemplate) {
            console.error(
              chalk.red(
                `\n\u2716 Template "${templateArg}" no encontrado.\n`
              )
            );
            console.log("Templates disponibles:");
            for (const [label, layer] of [
              ["Backend", "backend"],
              ["Frontend", "frontend"],
            ] as const) {
              console.log(chalk.bold(`${label}:`));
              getTemplatesByLayer(layer).forEach((t) =>
                console.log(`  - ${t.folder.toLowerCase()}`)
              );
            }
            process.exit(1);
            return;
          }
          forcedScope = forcedTemplate.layer;
        }

        const flagBackendTpl = backendTemplate
          ? findTemplate(backendTemplate)
          : undefined;
        const flagFrontendTpl = frontendTemplate
          ? findTemplate(frontendTemplate)
          : undefined;

        // Flags que ya respondieron un paso: su pregunta no se hace.
        const cliFlags: FlowFlags = {
          pm: pmArg as PackageManager | undefined,
          git,
          layerLayout: backend,
          backendTemplate,
          frontendTemplate,
          org: orgArg,
        };

        const plannedSteps = (answers: FlowAnswers): FlowStepId[] =>
          planSteps({
            scope: answers.scope ?? forcedScope,
            isFullStack: (answers.scope ?? forcedScope) === "fullstack",
            template: answers.template ?? forcedTemplate,
            projectName: answers.projectName ?? projectNameArg,
            flags: {
              ...cliFlags,
              // El template ya respondido entra al plan: los pasos que dependen
              // de él (flutter-org, package-manager) no se deciden antes.
              backendTemplate:
                cliFlags.backendTemplate ?? answers.backendTemplate?.name,
              frontendTemplate:
                cliFlags.frontendTemplate ?? answers.frontendTemplate?.name,
            },
          });

        // Mezcla de flags + respuestas del flujo: lo que crea el proyecto es
        // siempre esto, venga de un flag o de un prompt.
        const selection = (answers: Readonly<FlowAnswers>): Creation => {
          const scope = answers.scope ?? forcedScope;
          const fullStack = scope === "fullstack";
          const template = fullStack
            ? undefined
            : answers.template ?? forcedTemplate;
          const backendTpl = fullStack
            ? answers.backendTemplate ?? flagBackendTpl
            : undefined;
          const frontendTpl = fullStack
            ? answers.frontendTemplate ?? flagFrontendTpl
            : undefined;

          if (fullStack && backendTemplate && !backendTpl) {
            console.error(
              chalk.red(
                `\n\u2716 Backend "${backendTemplate}" no encontrado.\n`
              )
            );
            process.exit(1);
          }
          if (fullStack && frontendTemplate && !frontendTpl) {
            console.error(
              chalk.red(
                `\n\u2716 Frontend "${frontendTemplate}" no encontrado.\n`
              )
            );
            process.exit(1);
          }

          // Runtimes seleccionados: definen si aparece Flutter (y su org) y si
          // hace falta pedir un package manager (ASP.NET usa dotnet y Flutter
          // usa Dart: ninguno aplica).
          const runtimes = fullStack
            ? [backendTpl?.runtime, frontendTpl?.runtime]
            : [template?.runtime];

          // Organización reverse-domain del bundle id: solo aplica cuando la
          // selección incluye Flutter. El flag manda; en modo scripting/CI el
          // fallback es com.example porque no se puede promptear.
          let org: string | undefined;
          if (runtimes.includes("flutter")) {
            if (orgArg) {
              const check = checkOrg(orgArg);
              if (check !== true) {
                console.error(chalk.red(`\n\u2716 ${check}\n`));
                process.exit(1);
              }
              org = normalizeOrg(orgArg);
            } else {
              org = answers.org ?? FLUTTER_ORG_DEFAULT;
            }
          }

          return {
            fullStack,
            template,
            backendTpl,
            frontendTpl,
            // El paso del nombre garantiza un valor (o vino como argumento).
            projectName: answers.projectName ?? projectNameArg ?? "",
            pm: answers.packageManager ?? (pmArg as PackageManager | undefined),
            org,
            // En fullstack el layout es fijo: backend/ + frontend/.
            useLayerLayout: fullStack
              ? false
              : answers.layerLayout ?? backend ?? false,
            wantsGit: answers.git ?? git ?? true,
          };
        };

        // La creación corre una sola vez: puede dispararse desde el paso de
        // skills globales (que va después del resumen de creación) y vuelve a
        // pedirse al terminar el flujo.
        let committed = false;
        const commit = async (
          answers: Readonly<FlowAnswers>
        ): Promise<void> => {
          if (committed) return;
          committed = true;
          await createFromSelection(selection(answers));
        };

        // Cada paso del plan es un prompt; el índice y el "volver con Esc" los
        // maneja el runner.
        const askStep = async (
          step: FlowStepId,
          previous: unknown,
          context: FlowStepContext
        ): Promise<StepResult<unknown>> => {
          switch (step) {
            case "scope":
              return selectScope({
                defaultValue: previous as ProjectScope | undefined,
                canGoBack: context.canGoBack,
              });
            case "backend-template":
            case "frontend-template":
              return selectTemplateFromLayer(
                step === "backend-template" ? "backend" : "frontend",
                {
                  defaultValue: previous as Template | undefined,
                  canGoBack: context.canGoBack,
                }
              );
            case "project-name":
              return askProjectName({
                defaultValue:
                  typeof previous === "string" ? previous : undefined,
                canGoBack: context.canGoBack,
              });
            case "package-manager":
              return selectPackageManager({
                defaultValue: previous as PackageManager | undefined,
                canGoBack: context.canGoBack,
              });
            case "layer-layout":
              return askLayerLayout(
                context.answers.template?.layer ??
                  (context.answers.scope === "frontend"
                    ? "frontend"
                    : "backend"),
                {
                  defaultValue: previous as boolean | undefined,
                  canGoBack: context.canGoBack,
                }
              );
            case "flutter-org":
              return askFlutterOrg({
                defaultValue:
                  typeof previous === "string" ? previous : undefined,
                canGoBack: context.canGoBack,
              });
            case "git":
              return askGitInit({
                defaultValue: previous as boolean | undefined,
                canGoBack: context.canGoBack,
              });
            case "global-skills":
              // La creación es el punto de no retorno: se hace acá para que la
              // pregunta post-creación siga saliendo después del resumen.
              await commit(context.answers);
              return askGlobalSkillsToo({
                defaultValue: previous as boolean | undefined,
                canGoBack: context.canGoBack,
              });
          }
        };

        const outcome = await runFlow({
          plan: plannedSteps,
          ask: askStep,
          answers: { scope: forcedScope },
        });

        // Volver en el primer paso no tiene nada que deshacer: se sale en 0.
        if (outcome.kind === "cancelled") {
          console.log(chalk.dim("\n  Cancelado.\n"));
          process.exit(0);
          return;
        }

        const answers = outcome.answers;
        const scope = answers.scope ?? forcedScope;

        if (scope === "skills") {
          // Opción del menú principal: mismo flujo que `fwinit skills`,
          // completamente interactivo (instalar/eliminar → destinos).
          await runSkillsFlow();
          return;
        }
        if (scope === "studio") {
          // Opción del menú principal: mismo servidor que `fwinit studio`,
          // en esta misma pantalla, con cierre explícito.
          await runStudioFromMenu();
          return;
        }

        await commit(answers);

        // Skills globales (solo modo interactivo): después de crear el
        // proyecto, ofrecer instalar el bundle también en los destinos
        // globales. Con flags (--git/--no-git) el paso ni siquiera existe.
        if (answers.globalSkills === true) {
          const all = resolveGlobalTargets();
          if (all.length === 0) {
            console.log(
              chalk.yellow(
                "  \u26a0 No se pudo resolver el HOME — skills globales omitidas\n"
              )
            );
          } else {
            const selected = await selectGlobalTargets(
              all.map((t) => ({ name: t.label, value: t.id }))
            );
            if (selected.length > 0) {
              await installGlobalSkillsWithSpinner(
                all.filter((t) => selected.includes(t.id))
              );
            }
          }
        }
      } catch (error) {
        console.error(
          chalk.red(
            `\n\u2716 Error: ${(error as Error).message}`
          )
        );
        process.exit(1);
      }
    }
  );

program.parse();
