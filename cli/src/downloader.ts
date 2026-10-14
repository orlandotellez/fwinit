import AdmZip from "adm-zip";
import { mkdir, rm, cp, readdir, readFile, writeFile, rename, stat } from "fs/promises";
import { join, extname, basename, dirname, relative, sep } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import {
  FLUTTER_ORG_DEFAULT,
  normalizeOrg,
  toDartPackageName,
} from "./flutter-naming.js";

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

// Directorios de salida local que nunca deben llegar a un proyecto generado:
// artefactos de build, estado de IDE, cachés de dependencias y estado local
// de AI. El ZIP de GitHub solo trae archivos versionados, así que en
// producción el filtro es un no-op; al copiar desde un checkout local evita
// arrastrar cientos de MB de artefactos.
const COPY_EXCLUDED_DIRS = new Set([
  ".git",
  ".dart_tool",
  ".idea",
  ".atl",
  "node_modules",
  "build",
]);

export async function copyTemplate(
  source: string,
  destination: string
): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    // Solo se descartan directorios con esos nombres: un archivo homónimo
    // (p. ej. un script llamado `build`) se copia igual.
    filter: async (src) => {
      if (!COPY_EXCLUDED_DIRS.has(basename(src))) return true;
      const stats = await stat(src).catch(() => undefined);
      return stats === undefined || !stats.isDirectory();
    },
  });
  await cleanTemplate(destination);
}

async function cleanTemplate(dir: string): Promise<void> {
  const lockFiles = [
    "bun.lock",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    // Cada proyecto Flutter instala su propio árbol de dependencias, igual
    // que con los lock files de npm.
    "pubspec.lock",
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

export interface SubstituteOptions {
  /** Native org for Flutter templates (reverse-domain). Defaults to FLUTTER_ORG_DEFAULT. */
  org?: string;
}

export async function substituteTemplate(
  dir: string,
  projectName: string,
  templateFolder: string,
  options: SubstituteOptions = {}
): Promise<void> {
  if (templateFolder === "ASPNET") {
    await substituteAspNet(dir, projectName);
  } else if (templateFolder === "FLUTTER") {
    await substituteFlutter(
      dir,
      projectName,
      options.org ?? FLUTTER_ORG_DEFAULT
    );
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

// Solo estos archivos pueden leerse/reescribirse al renombrar un template
// Flutter. Todo lo demás (PNG/ICO binarios, artefactos con otras extensiones)
// debe quedar byte-idéntico.
const FLUTTER_TEXT_EXTENSIONS = new Set([
  ".dart",
  ".arb",
  ".yaml",
  ".yml",
  ".json",
  ".kt",
  ".kts",
  ".gradle",
  ".xml",
  ".plist",
  ".pbxproj",
  ".xcconfig",
  ".xcscheme",
  ".xcsettings",
  ".xcworkspacedata",
  ".storyboard",
  ".xib",
  ".swift",
  ".h",
  ".cpp",
  ".cc",
  ".cmake",
  ".txt",
  ".rc",
  ".properties",
  ".manifest",
  ".md",
  ".html",
  ".gitignore",
  ".metadata",
  ".iml",
  ".sh",
]);

// Archivos sin extensión que también son texto.
const FLUTTER_TEXT_BASENAMES = new Set([
  "makefile",
  "license",
  "podfile",
  ".gitignore",
  ".metadata",
]);

// Archivos donde `fwiflu` es el nombre que UN HUMANO lee (título de la app,
// label de Android, display name del plist, títulos de ventana, título web).
// En el resto `fwiflu` es el paquete Dart y el sufijo del bundle id.
const FLUTTER_DISPLAY_FILES = new Set([
  "lib/l10n/arb/app_en.arb",
  "lib/l10n/arb/app_es.arb",
  "lib/l10n/gen/app_localizations.dart",
  "lib/l10n/gen/app_localizations_en.dart",
  "lib/l10n/gen/app_localizations_es.dart",
  "lib/core/config/app_config.dart",
  "android/app/src/main/AndroidManifest.xml",
  "ios/Runner/Info.plist",
  "web/index.html",
  "web/manifest.json",
  "linux/runner/my_application.cc",
  "windows/runner/main.cpp",
]);

// Archivo mixto: los campos de identidad interna del ejecutable usan el
// dartName, el resto de los campos usan el displayName.
const FLUTTER_RUNNER_RC = "windows/runner/Runner.rc";

const FLUTTER_NATIVE_ROOTS = ["kotlin", "java"] as const;

function isFlutterTextFile(filePath: string): boolean {
  if (FLUTTER_TEXT_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return true;
  }

  return FLUTTER_TEXT_BASENAMES.has(basename(filePath).toLowerCase());
}

function replaceToken(content: string, token: string, value: string): string {
  return content.split(token).join(value);
}

function matchPackageDeclaration(content: string): string | undefined {
  // El `;` es opcional: Kotlin (`package a.b.c`) no lo usa, Java sí.
  const match = content.match(
    /^[ \t]*package[ \t]+([A-Za-z_][\w.]*)[ \t]*;?[ \t]*$/m
  );
  return match?.[1];
}

function substituteRunnerRc(
  content: string,
  dartName: string,
  displayName: string,
  org: string
): string {
  return content
    .split("\n")
    .map((line) => {
      const isInternalName =
        line.includes("InternalName") || line.includes("OriginalFilename");
      let replaced = replaceToken(
        line,
        "fwiflu",
        isInternalName ? dartName : displayName
      );
      replaced = replaceToken(replaced, "mx.apto", org);
      return replaced;
    })
    .join("\n");
}

async function getAllFilesOrEmpty(dir: string): Promise<string[]> {
  try {
    return await getAllFiles(dir);
  } catch {
    return [];
  }
}

/** Borra los subdirectorios vacíos de `dir` (bottom-up), sin borrar `dir`. */
async function removeEmptySubdirectories(dir: string): Promise<boolean> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  let isEmpty = true;
  for (const entry of entries) {
    const childPath = join(dir, entry.name);
    if (!entry.isDirectory()) {
      isEmpty = false;
      continue;
    }

    if (await removeEmptySubdirectories(childPath)) {
      await rm(childPath, { recursive: true, force: true });
    } else {
      isEmpty = false;
    }
  }

  return isEmpty;
}

async function substituteFlutter(
  dir: string,
  projectName: string,
  orgInput: string
): Promise<void> {
  const dartName = toDartPackageName(projectName);
  const displayName = projectName.trim();
  const org = normalizeOrg(orgInput);

  // `dartName` es el paquete Dart, el binario nativo / PRODUCT_NAME y el
  // sufijo del bundle id. `displayName` es lo que un humano lee en la app
  // corriendo (título, label de Android, display name del plist, títulos de
  // ventana, título web).
  const androidMainDir = join(dir, "android", "app", "src", "main");

  // 1. Snapshot de los `package X.Y.Z;` nativos ANTES de sustituir: después de
  // la sustitución el nombre viejo ya no existe y no habría forma de saber en
  // qué raíz (kotlin/java) vivía cada archivo.
  const nativeFiles: { path: string; root: "kotlin" | "java" }[] = [];
  for (const root of FLUTTER_NATIVE_ROOTS) {
    const files = await getAllFilesOrEmpty(join(androidMainDir, root));
    for (const filePath of files) {
      const ext = extname(filePath).toLowerCase();
      if (ext !== ".kt" && ext !== ".java") continue;

      try {
        const content = await readFile(filePath, "utf-8");
        if (matchPackageDeclaration(content) !== undefined) {
          nativeFiles.push({ path: filePath, root });
        }
      } catch {
        // El archivo no se puede leer, saltar
      }
    }
  }

  // 2. Sustitución de texto, solo sobre archivos de texto de la whitelist.
  const allFiles = await getAllFiles(dir);
  for (const filePath of allFiles) {
    if (!isFlutterTextFile(filePath)) continue;

    let content: string;
    try {
      content = await readFile(filePath, "utf-8");
    } catch {
      // El archivo no se puede leer, saltar
      continue;
    }

    const relPath = relative(dir, filePath).split(sep).join("/");
    let replaced: string;
    if (relPath === FLUTTER_RUNNER_RC) {
      replaced = substituteRunnerRc(content, dartName, displayName, org);
    } else if (FLUTTER_DISPLAY_FILES.has(relPath)) {
      replaced = replaceToken(content, "fwiflu", displayName);
      replaced = replaceToken(replaced, "mx.apto", org);
    } else {
      replaced = replaceToken(content, "fwiflu", dartName);
      replaced = replaceToken(replaced, "mx.apto", org);
    }

    if (replaced !== content) {
      await writeFile(filePath, replaced);
    }
  }

  // 3. Mover los archivos nativos a la carpeta de su nuevo package. Los que
  // ya viven en la carpeta correcta (p. ej. GeneratedPluginRegistrant.java con
  // `package io.flutter.plugins;`) no se tocan.
  for (const nativeFile of nativeFiles) {
    let content: string;
    try {
      content = await readFile(nativeFile.path, "utf-8");
    } catch {
      continue;
    }

    const newPackage = matchPackageDeclaration(content);
    if (newPackage === undefined) continue;

    const expectedDir = join(
      androidMainDir,
      nativeFile.root,
      ...newPackage.split(".")
    );
    if (dirname(nativeFile.path) === expectedDir) continue;

    await mkdir(expectedDir, { recursive: true });
    await rename(nativeFile.path, join(expectedDir, basename(nativeFile.path)));
  }

  // Limpiar las carpetas viejas que quedaron vacías. Las raíces kotlin/java
  // nunca se borran.
  for (const root of FLUTTER_NATIVE_ROOTS) {
    await removeEmptySubdirectories(join(androidMainDir, root));
  }
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
