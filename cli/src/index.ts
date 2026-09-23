#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { readFileSync } from "node:fs";
import { mkdir, cp, access, readFile } from "fs/promises";
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
import {
  selectScope,
  selectTemplateFromLayer,
  askProjectName,
  selectPackageManager,
  askLayerLayout,
  askGitInit,
} from "./prompts.js";
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

// Instala el bundle de skills de opencode (skills/ de la raíz del repo)
// dentro del proyecto nuevo, en .opencode/. Sin esto, el proyecto
// generado no traería la skill create-specs ni la biblioteca de diseño
// y habría que copiarlas a mano.
async function installOpenCodeFiles(
  repoRoot: string,
  projectPath: string
): Promise<void> {
  const skill = join(repoRoot, "skills", "create-specs", "SKILL.md");
  const command = join(repoRoot, "skills", "create-specs", "command.md");
  const designDir = join(repoRoot, "skills", "design");

  // Si el repo no trae el bundle de skills, no bloquear el scaffold
  try {
    await access(skill);
    await access(command);
  } catch {
    return;
  }

  await mkdir(join(projectPath, ".opencode", "skills", "create-specs"), {
    recursive: true,
  });
  await mkdir(join(projectPath, ".opencode", "commands"), {
    recursive: true,
  });
  await cp(
    skill,
    join(projectPath, ".opencode", "skills", "create-specs", "SKILL.md")
  );
  await cp(
    command,
    join(projectPath, ".opencode", "commands", "create-specs.md")
  );

  // Los ejemplos de prompts de create-specs son opcionales: viajan a
  // .opencode/skills/create-specs/examples/ para que la skill pueda
  // mostrarlos dentro del proyecto generado.
  try {
    const examplesDir = join(repoRoot, "skills", "create-specs", "examples");
    await access(examplesDir);
    await cp(
      examplesDir,
      join(projectPath, ".opencode", "skills", "create-specs", "examples"),
      { recursive: true }
    );
  } catch {
    // sin ejemplos, no bloquear el scaffold
  }

  // La biblioteca de diseño es opcional: si el repo no la trae, el
  // scaffold sigue sin ella (mismo criterio que el bundle de skills).
  try {
    await access(designDir);
    await cp(designDir, join(projectPath, ".opencode", "skills", "design"), {
      recursive: true,
    });
  } catch {
    // sin biblioteca de diseño, no bloquear el scaffold
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
  await installOpenCodeFiles(repoRoot, projectPath);

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

  console.log(
    chalk.dim(
      "  Estructura: backend/ (API) · frontend/ (app) · .opencode/ y specs/ (al mismo nivel)\n"
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
          await installOpenCodeFiles(repoRoot, projectPath);

          // Con layout de capa, .opencode/ y specs/ viven fuera de la
          // carpeta del template → .gitignore raíz que los protege
          // (.atl/, odd y .opencode/).
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
                `  Estructura: ${layer}/ (código) · .opencode/ y specs/ (al mismo nivel)\n`
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
