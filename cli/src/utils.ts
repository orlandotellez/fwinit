import { existsSync } from "fs";
import { resolve } from "path";

export type PackageManager = "npm" | "pnpm" | "bun";

const PM_RUNNER: Record<PackageManager, string> = {
  npm: "npm",
  pnpm: "pnpm",
  bun: "bun",
};

// npx y bunx ejecutan binarios desde node_modules (o descargan si faltan)
const PM_EXEC: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm exec",
  bun: "bunx",
};

// Subcomandos de bun que NO llevan "run" ("bun install", "bun add"...)
const BUN_SUBCOMMANDS = new Set([
  "install",
  "add",
  "remove",
  "update",
  "upgrade",
  "run",
  "x",
  "link",
  "unlink",
  "init",
  "create",
  "pm",
  "outdated",
  "why",
  "publish",
  "prune",
  "rebuild",
]);

export function getProjectPath(name: string): string {
  return resolve(process.cwd(), name);
}

export function projectExists(name: string): boolean {
  return existsSync(getProjectPath(name));
}

// Convierte el runner del comando al package manager elegido.
// Ej: "bun run dev" + pnpm → "pnpm run dev"; "npx expo start" + bun → "bunx expo start"
export function resolveCommand(
  cmd: string,
  pm: PackageManager
): string {
  const tokens = cmd.trim().split(/\s+/);
  const [runner, ...rest] = tokens;

  switch (runner) {
    case "pnpm":
      return [PM_RUNNER[pm], ...rest].join(" ");
    case "npm":
      // "npm install" → "pnpm install"; "npm run dev" → "bun run dev"
      return [PM_RUNNER[pm], ...rest].join(" ");
    case "bun": {
      if (pm === "bun") return cmd;
      // "bun dev" (shorthand) → "npm run dev" / "pnpm run dev"
      const sub = rest[0];
      if (sub && !BUN_SUBCOMMANDS.has(sub)) {
        return [PM_RUNNER[pm], "run", ...rest].join(" ");
      }
      // "bun install" → "npm install"; "bun run dev" → "npm run dev"
      return [PM_RUNNER[pm], ...rest].join(" ");
    }
    case "npx":
    case "bunx":
      // "npx expo start" + bun → "bunx expo start"; + pnpm → "pnpm exec expo start"
      return [PM_EXEC[pm], ...rest].join(" ");
    default:
      return cmd;
  }
}

export function printSuccess(
  projectName: string,
  templateName: string,
  pm: PackageManager,
  postInit?: { install?: string; dev?: string },
  codeDir?: string
): void {
  const installCmd = postInit?.install
    ? resolveCommand(postInit.install, pm)
    : `${pm} install`;
  const devCmd = postInit?.dev
    ? resolveCommand(postInit.dev, pm)
    : `${pm} run dev`;
  const target = codeDir ? `${projectName}/${codeDir}` : projectName;

  console.log(`
\u001b[32m\u2714\u001b[0m Template descargado
\u001b[32m\u2714\u001b[0m Proyecto creado en ./${target}

\u001b[1mPróximos pasos:\u001b[0m

  \u001b[36mcd ${target}\u001b[0m
  \u001b[36m${installCmd}\u001b[0m
  \u001b[36m${devCmd}\u001b[0m
`);
}

// Adapta un script de package.json de bun a su equivalente de node
// ("bun --hot src/server.ts" → "tsx watch src/server.ts", "bunx prisma ..." → "prisma ...")
function adaptScriptToNode(script: string): string {
  let s = script.trim();
  if (/^bun test\b/.test(s)) {
    s = s.replace(/^bun test\b/, "vitest run");
  }
  s = s
    .replace(/^bun --hot /, "tsx watch ")
    .replace(/^bunx /, "") // bunx ejecuta binarios locales: "bunx prisma" → "prisma"
    .replace(/^bun /, "tsx "); // "bun src/server.ts" → "tsx src/server.ts"
  return s;
}

// Porta un proyecto generado de runtime bun a runtime node (npm/pnpm):
// reescribe scripts, agrega tsx/vitest, migra tests de bun:test a vitest
// y limpia bun-types del tsconfig.
export async function adaptToNodeRuntime(projectPath: string): Promise<void> {
  const { readFile, writeFile, readdir } = await import("fs/promises");
  const { join } = await import("path");

  const pkgPath = join(projectPath, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  for (const key of Object.keys(pkg.scripts ?? {})) {
    pkg.scripts[key] = adaptScriptToNode(pkg.scripts[key]);
  }
  pkg.devDependencies ??= {};
  pkg.devDependencies.tsx = "^4.0.0";
  pkg.devDependencies.vitest = "^3.0.0";
  delete pkg.devDependencies["bun-types"];
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") await walk(full);
      } else if (entry.name.endsWith(".test.ts")) {
        const content = await readFile(full, "utf-8");
        if (content.includes("bun:test")) {
          await writeFile(full, content.replaceAll('from "bun:test"', 'from "vitest"'));
        }
      }
    }
  }
  const srcDir = join(projectPath, "src");
  try {
    await walk(srcDir);
  } catch { }

  const tsconfigPath = join(projectPath, "tsconfig.json");
  try {
    const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf-8"));
    if (tsconfig.compilerOptions?.types?.includes("bun-types")) {
      delete tsconfig.compilerOptions.types;
      await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n");
    }
  } catch { }
}
