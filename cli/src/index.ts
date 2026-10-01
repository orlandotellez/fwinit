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
} from "./prompts.js";
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
  pm: PackageManager
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
  await substituteTemplate(backendPath, projectName, backendTpl.folder);
  await substituteTemplate(frontendPath, projectName, frontendTpl.folder);
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
  console.log(chalk.dim("  design/ — dark-luxury, glassmorphism, minimal-dashboard, minimal-light, neo-brutalist (/design-<estilo>)\n"));

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
    "Instalar o eliminar las skills del repo en ubicaciones globales (OpenCode, Pi, Agent Skills)"
  )
  .option(
    "-g, --global <targets>",
    "Destinos separados por coma: opencode, pi, agents (o 'all'). Saltea la pregunta"
  )
  .option(
    "-o, --only <skills>",
    "Solo estas skills, separadas por coma: create-specs, create-specs-from-code, design"
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

program
  .argument("[template]", "Template a usar (o 'fullstack' para backend + frontend)")
  .argument("[project-name]", "Nombre del proyecto")
  .option("-p, --pm <package-manager>", "Package manager a usar: npm, pnpm o bun")
  .option("--backend", "Empaquetar el código en backend/ (saltea la pregunta)")
  .option("--no-backend", "Dejar el código en la raíz del proyecto (saltea la pregunta)")
  .option("-b, --backend-template <tpl>", "Backend a usar en fullstack (saltea la pregunta)")
  .option("-f, --frontend-template <tpl>", "Frontend a usar en fullstack (saltea la pregunta)")
  .option("--git", "Inicializar un repositorio git (saltea la pregunta)")
  .option("--no-git", "No inicializar git (saltea la pregunta)")
  .action(
    async (templateArg?: string, projectNameArg?: string) => {
      try {
        const { pm: pmArg, backend, backendTemplate, frontendTemplate, git } =
          program.opts<{
            pm?: string;
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

        let projectName = projectNameArg;
        let pm: PackageManager | undefined = pmArg as PackageManager | undefined;

        // Resolver el alcance: fullstack (backend + frontend) vs single
        // (un solo template). El argumento "fullstack" fuerza el modo
        // combinado; sin argumento, el menú interactivo pregunta.
        let isFullStack = false;
        let template: Template | undefined;
        const rawArg = templateArg?.toLowerCase();

        if (rawArg === undefined) {
          const scope = await selectScope();
          if (scope === "skills") {
            // Opción del menú principal: mismo flujo que `fwinit skills`,
            // completamente interactivo (instalar/eliminar → destinos).
            await runSkillsFlow();
            return;
          }
          if (scope === "fullstack") {
            isFullStack = true;
          } else {
            template = await selectTemplateFromLayer(scope);
          }
        } else if (rawArg === "fullstack") {
          isFullStack = true;
        } else {
          template = findTemplate(rawArg);
          // El argumento del template no se encontró: error directo
          // (no caer en el modo interactivo)
          if (!template) {
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
          }
        }

        // Fullstack: elegir los dos templates. Los flags -b/-f saltean
        // las preguntas (modo scripting); el flag boolean --backend
        // del modo single no aplica acá (el layout es backend/ + frontend/).
        let backendTpl: Template | undefined;
        let frontendTpl: Template | undefined;
        if (isFullStack) {
          backendTpl = backendTemplate
            ? findTemplate(backendTemplate)
            : undefined;
          frontendTpl = frontendTemplate
            ? findTemplate(frontendTemplate)
            : undefined;

          if (backendTemplate && !backendTpl) {
            console.error(
              chalk.red(
                `\n\u2716 Backend "${backendTemplate}" no encontrado.\n`
              )
            );
            process.exit(1);
          }
          if (frontendTemplate && !frontendTpl) {
            console.error(
              chalk.red(
                `\n\u2716 Frontend "${frontendTemplate}" no encontrado.\n`
              )
            );
            process.exit(1);
          }

          if (!backendTpl) {
            backendTpl = await selectTemplateFromLayer("backend");
          }
          if (!frontendTpl) {
            frontendTpl = await selectTemplateFromLayer("frontend");
          }
        }

        // Preguntar el nombre si no se proporcionó
        if (!projectName) {
          projectName = await askProjectName();
        }

        // Modo single: preguntar si empaquetar el template en backend/
        // (o frontend/) — default: sí. --backend/--no-backend saltean
        // la pregunta (modo scripting). En fullstack el layout es fijo:
        // backend/ + frontend/.
        const layer = template?.layer;
        const useLayerLayout =
          !template
            ? false
            : backend === undefined
              ? await askLayerLayout(layer!)
              : backend;

        // Preguntar el package manager si hay algún template JS/TS
        // (ASP.NET usa dotnet, no aplica a ese lado)
        const runtimes = template
          ? [template.runtime]
          : [backendTpl!.runtime, frontendTpl!.runtime];
        const needsPm = runtimes.some((r) => r !== "dotnet");
        if (!pm && needsPm) {
          pm = await selectPackageManager();
        }

        // Preguntar si inicializar un repositorio git (default: sí).
        // El flag --git/--no-git saltea la pregunta (modo scripting).
        const wantsGit = git === undefined ? await askGitInit() : git;

        // Verificar si el directorio ya existe
        if (projectExists(projectName)) {
          console.error(
            chalk.red(
              `\n\u2716 El directorio "${projectName}" ya existe.`
            )
          );
          process.exit(1);
        }

        const projectPath = getProjectPath(projectName);

        const spinner = ora(
          isFullStack
            ? "Descargando templates..."
            : `Descargando template ${template!.name}...`
        ).start();

        if (isFullStack) {
          spinner.text = "Creando proyecto...";
          await createFullStackProject(
            projectPath,
            backendTpl!,
            frontendTpl!,
            pm ?? "npm"
          );
          spinner.succeed("Template descargado");
        } else {
          const { tempDir, templatePath, repoRoot } =
            await downloadAndExtract(template!.folder);

          // Con layout de capa, el código del template vive en backend/
          // (o frontend/) y .opencode/ + specs/ quedan en la raíz.
          const codePath = useLayerLayout
            ? join(projectPath, layer!)
            : projectPath;

          spinner.text = "Creando proyecto...";

          await copyTemplate(templatePath, codePath);
          await substituteTemplate(codePath, projectName, template!.folder);
          await installAgentSkills(repoRoot, projectPath);

          // Con layout de capa, .opencode/, .pi/, .agents/ y specs/ viven fuera de
          // la carpeta del template → .gitignore raíz que solo ignora el
          // estado local de AI (.atl/, odd). Los bundles de skills se
          // versionan con el proyecto.
          if (useLayerLayout) {
            await writeRootGitignore(projectPath);
          }

          // Template nativo de bun + npm/pnpm → portar a runtime node
          // (scripts con tsx, tests con vitest, sin bun-types)
          if (template!.runtime === "bun" && pm && pm !== "bun") {
            await adaptToNodeRuntime(codePath);
          }

          await cleanup(tempDir);

          spinner.succeed("Template descargado");

          printSuccess(
            projectName,
            template!.name,
            pm ?? "npm",
            await readTemplatePostInit(codePath),
            useLayerLayout ? layer : undefined
          );

          if (useLayerLayout) {
            console.log(
              chalk.dim(
                `  Estructura: ${layer}/ (código) · .opencode/, .pi/, .agents/ y specs/ (al mismo nivel)\n`
              )
            );
          }
        }

        // Inicializar el repositorio git en la raíz del proyecto
        // (cubre backend/ + .opencode/ + specs/ según el layout)
        if (wantsGit) {
          const ok = await gitInit(projectPath);
          if (ok) {
            console.log(
              chalk.dim("  Git: repositorio inicializado\n")
            );
          } else {
            console.log(
              chalk.yellow(
                "  \u26a0 No se pudo inicializar git (¿está instalado?)\n"
              )
            );
          }
        }

        // Skills globales (solo modo interactivo): después de crear el
        // proyecto, ofrecer instalar el bundle también en los destinos
        // globales. Con flags (--git/--no-git) no se pregunta: scripting.
        if (git === undefined) {
          const wantsGlobalSkills = await askGlobalSkillsToo();
          if (wantsGlobalSkills) {
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
