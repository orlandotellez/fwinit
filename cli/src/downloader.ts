import AdmZip from "adm-zip";
import { mkdir, rm, cp, readdir, readFile, writeFile, rename } from "fs/promises";
import { join, extname } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const GITHUB_REPO = "orlandotellez/fwinit";
const GITHUB_BRANCH = "main";

export interface DownloadResult {
  tempDir: string;
  templatePath: string;
  repoRoot: string;
}

// Descarga y extrae el repo completo una sola vez. Devuelve el repoRoot
// para que el caller arme los paths de los templates que necesite
// (1 template para el modo single, 2 para fullstack, mismo zip).
export async function downloadAndExtractRepo(): Promise<{
  tempDir: string;
  repoRoot: string;
}> {
  const url = `https://github.com/${GITHUB_REPO}/archive/refs/heads/${GITHUB_BRANCH}.zip`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download template: ${response.statusText}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = new AdmZip(buffer);

  const tempId = randomBytes(8).toString("hex");
  const tempDir = join(tmpdir(), `fwinit-${tempId}`);
  await mkdir(tempDir, { recursive: true });

  zip.extractAllTo(tempDir, true);

  // El ZIP de GitHub se extrae como: fwinit-main/templates/FOLDER/
  const repoRoot = join(tempDir, `fwinit-${GITHUB_BRANCH}`);
  return { tempDir, repoRoot };
}

export async function downloadAndExtract(
  templateFolder: string
): Promise<DownloadResult> {
  const { tempDir, repoRoot } = await downloadAndExtractRepo();
  const templatePath = join(repoRoot, "templates", templateFolder);

  // Verifica que el template exista
  try {
    await readdir(templatePath);
  } catch {
    await rm(tempDir, { recursive: true, force: true });
    throw new Error(
      `Template "${templateFolder}" not found in repository`
    );
  }

  return { tempDir, templatePath, repoRoot };
}

export async function copyTemplate(
  source: string,
  destination: string
): Promise<void> {
  await cp(source, destination, { recursive: true });
  await cleanTemplate(destination);
}

async function cleanTemplate(dir: string): Promise<void> {
  const lockFiles = [
    "bun.lock",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
  ];

  for (const file of lockFiles) {
    const path = join(dir, file);
    try {
      await rm(path, { force: true });
    } catch {
      // El archivo no existe, ignorar
    }
  }
}

export async function cleanup(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}

export async function substituteTemplate(
  dir: string,
  projectName: string,
  templateFolder: string
): Promise<void> {
  if (templateFolder === "ASPNET") {
    await substituteAspNet(dir, projectName);
  } else {
    await substituteNodejs(dir, projectName);
  }
}

async function substituteNodejs(
  dir: string,
  projectName: string
): Promise<void> {
  // package.json: reemplazar el nombre del paquete
  const packageJsonPath = join(dir, "package.json");
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    pkg.name = projectName;
    await writeFile(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    // package.json no encontrado o inválido, saltar
  }

  // app.json (Expo/React Native): reemplazar name, slug y scheme
  const appJsonPath = join(dir, "app.json");
  try {
    const content = await readFile(appJsonPath, "utf-8");
    const app = JSON.parse(content);
    if (app.expo) {
      app.expo.name = projectName;
      app.expo.slug = projectName;
      if (app.expo.scheme) {
        // Expo requiere scheme alfanumérico (sin guiones)
        app.expo.scheme = toScheme(projectName);
      }
      await writeFile(appJsonPath, JSON.stringify(app, null, 2) + "\n");
    }
  } catch {
    // app.json no encontrado o inválido, saltar
  }
}

function toScheme(str: string): string {
  return str.replace(/[-_\s]+/g, "").toLowerCase();
}

async function substituteAspNet(
  dir: string,
  projectName: string
): Promise<void> {
  const pascalName = toPascalCase(projectName);
  const textExtensions = new Set([".cs", ".csproj", ".slnx", ".json", ".http"]);

  // 1. Obtener todos los archivos recursivamente
  const allFiles = await getAllFiles(dir);

  // 2. Reemplazar contenido en archivos de texto
  for (const filePath of allFiles) {
    const ext = extname(filePath).toLowerCase();
    if (textExtensions.has(ext)) {
      try {
        const content = await readFile(filePath, "utf-8");
        const replaced = content.replace(/Example/g, pascalName);
        if (replaced !== content) {
          await writeFile(filePath, replaced);
        }
      } catch {
        // Saltar archivos que no se pueden leer
      }
    }
  }

  // 3. Renombrar archivos y carpetas (bottom-up para evitar conflictos de rutas)
  await renameAll(dir, pascalName);
}

async function getAllFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await getAllFiles(fullPath)));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

async function renameAll(dir: string, pascalName: string): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  // Procesar hijos primero (bottom-up)
  for (const entry of entries) {
    const oldPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await renameAll(oldPath, pascalName);
    }
  }

  // Luego renombrar los elementos de este directorio
  const entriesAfter = await readdir(dir, { withFileTypes: true });
  for (const entry of entriesAfter) {
    if (entry.name.includes("Example")) {
      const oldPath = join(dir, entry.name);
      const newName = entry.name.replace(/Example/g, pascalName);
      const newPath = join(dir, newName);
      try {
        await rename(oldPath, newPath);
      } catch {
        // Saltar si el renombrado falla
      }
    }
  }
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}
