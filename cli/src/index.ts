#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { readFileSync } from "node:fs";
import { mkdir, cp, access } from "fs/promises";
import { join } from "path";
import { TEMPLATES, findTemplate, getTemplatesByLayer } from "./templates.js";
import {
  downloadAndExtract,
  copyTemplate,
  cleanup,
  substituteTemplate,
} from "./downloader.js";
import { selectTemplate, askProjectName, selectPackageManager, askBackendLayout } from "./prompts.js";
import {
  getProjectPath,
  projectExists,
  printSuccess,
  adaptToNodeRuntime,
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
// generado no traería la skill create-specs y habría que copiarla a mano.
async function installOpenCodeFiles(
  repoRoot: string,
  projectPath: string
): Promise<void> {
  const skill = join(repoRoot, "skills", "create-specs", "SKILL.md");
  const command = join(repoRoot, "skills", "create-specs", "command.md");

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
  .argument("[template]", "Template a usar")
  .argument("[project-name]", "Nombre del proyecto")
  .option("-p, --pm <package-manager>", "Package manager a usar: npm, pnpm o bun")
  .option("--backend", "Empaquetar el código en backend/ (saltea la pregunta)")
  .option("--no-backend", "Dejar el código en la raíz del proyecto (saltea la pregunta)")
  .action(
    async (templateArg?: string, projectNameArg?: string) => {
      try {
        const { pm: pmArg, backend } = program.opts<{ pm?: string; backend?: boolean }>();

        // Validar el flag --pm si se proporcionó
        if (pmArg && !PACKAGE_MANAGERS.includes(pmArg as PackageManager)) {
          console.error(
            chalk.red(
              `\n\u2716 Package manager "${pmArg}" inválido. Usá: npm, pnpm o bun.\n`
            )
          );
          process.exit(1);
        }

        let template = templateArg
          ? findTemplate(templateArg)
          : undefined;
        let projectName = projectNameArg;
        let pm: PackageManager | undefined = pmArg as PackageManager | undefined;

        // El argumento del template no se encontró: error directo
        // (no caer en el modo interactivo)
        if (templateArg && !template) {
          console.error(
            chalk.red(
              `\n\u2716 Template "${templateArg}" no encontrado.\n`
            )
          );
          console.log("Templates disponibles:");
          TEMPLATES.forEach((t) =>
            console.log(`  - ${t.folder.toLowerCase()}`)
          );
          process.exit(1);
        }

        // Modo interactivo si no se pasó ningún template
        if (!template) {
          template = await selectTemplate();
        }

        // Preguntar el nombre si no se proporcionó
        if (!projectName) {
          projectName = await askProjectName();
        }

        // Preguntar si empaquetar el template en backend/ (default: sí).
        // El flag --backend/--no-backend saltea la pregunta (modo scripting).
        // En el layout backend, .opencode/ y specs/ quedan al mismo nivel, en la raíz.
        const useBackendLayout =
          backend === undefined
            ? await askBackendLayout()
            : backend;

        // Preguntar el package manager en todos los templates JS/TS
        // (ASP.NET usa dotnet, no aplica)
        if (!pm && template.runtime !== "dotnet") {
          pm = await selectPackageManager();
        }

        // Verificar si el directorio ya existe
        if (projectExists(projectName)) {
          console.error(
            chalk.red(
              `\n\u2716 El directorio "${projectName}" ya existe.`
            )
          );
          process.exit(1);
        }

        // Descargar y crear el proyecto
        const spinner = ora(
          `Descargando template ${template.name}...`
        ).start();

        const { tempDir, templatePath, repoRoot } =
          await downloadAndExtract(template.folder);

        const projectPath = getProjectPath(projectName);
        // Con layout backend, el código del template vive en backend/ y
        // .opencode/ + specs/ quedan en la raíz, al mismo nivel.
        const codePath = useBackendLayout
          ? join(projectPath, "backend")
          : projectPath;

        spinner.text = "Creando proyecto...";

        await copyTemplate(
          templatePath,
          codePath
        );
        await substituteTemplate(
          codePath,
          projectName,
          template.folder
        );
        await installOpenCodeFiles(
          repoRoot,
          projectPath
        );

        // Template nativo de bun + npm/pnpm → portar a runtime node
        // (scripts con tsx, tests con vitest, sin bun-types)
        if (template.runtime === "bun" && pm && pm !== "bun") {
          await adaptToNodeRuntime(codePath);
        }

        await cleanup(tempDir);

        spinner.succeed("Template descargado");

        // Leer postInit de template.json si existe
        let postInit:
          | { install?: string; dev?: string }
          | undefined;
        try {
          const { readFile } = await import("fs/promises");
          const { join } = await import("path");
          const tj = JSON.parse(
            await readFile(
              join(codePath, "template.json"),
              "utf-8"
            )
          );
          postInit = tj.postInit;
        } catch {
          // template.json no encontrado o inválido, usar valores por defecto
        }

        // ASP.NET no pregunta: usa "npm" que no afecta los comandos dotnet
        printSuccess(
          projectName,
          template.name,
          pm ?? "npm",
          postInit,
          useBackendLayout ? "backend" : undefined
        );

        if (useBackendLayout) {
          console.log(
            chalk.dim(
              "  Estructura: backend/ (código) · .opencode/ y specs/ (al mismo nivel)\n"
            )
          );
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
