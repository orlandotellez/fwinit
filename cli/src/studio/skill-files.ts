/**
 * Contenido de una skill instalada (S7).
 *
 * El studio ya sabe qué skills hay y dónde viven (`skills.ts`); este módulo deja
 * leer lo que una skill dice sin salir nunca de su directorio. Dos invariantes
 * mandan acá:
 *
 * - el directorio de la skill nunca lo elige el cliente: se resuelve desde
 *   `resolveSkillTargets()` a partir de `target` + `scope` + `name`, y su
 *   realpath tiene que caer dentro del realpath de la carpeta de skills de ese
 *   target y scope;
 * - ninguna ruta de archivo servida puede escapar de la skill: se valida de
 *   forma sintáctica (absoluta, NUL, `..`) y después física (`fs.realpath`
 *   contra el realpath de la skill), así un symlink plantado adentro tampoco
 *   sale.
 *
 * Los límites son parte del contrato: sólo se sirven extensiones de una
 * allowlist, archivos de hasta 512 KB y contenido sin bytes NUL (se revisa el
 * buffer completo: un binario con NUL al final tampoco es contenido de skill).
 * El listado
 * muestra sólo esas extensiones (por eso cada entrada tiene `kind`); el tope de
 * tamaño y la sniffa de binarios se aplican al leer, que es cuando el contenido
 * está a mano.
 *
 * El render de markdown vive en `markdown.ts` y el frontmatter en
 * `frontmatter.ts`: acá sólo se conectan con el filesystem.
 */
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import { renderMarkdown } from "./markdown.js";
import { resolveSkillTargets } from "./skills.js";
import type {
  SkillFileContent,
  SkillFileEntry,
  SkillFileKind,
  SkillFileList,
  SkillFileRef,
} from "./types.js";

export interface SkillFilesContext {
  /** Directorio del proyecto cuyas skills locales se pueden leer. */
  projectRoot: string;
  /** Home alternativo; por defecto `os.homedir()`. */
  home?: string;
}

export type SkillFileErrorCode = "invalid" | "outside" | "missing" | "unsupported";

/** Error tipado de lectura: el server lo traduce a un status sin adivinar. */
export class SkillFileError extends Error {
  readonly code: SkillFileErrorCode;
  readonly path: string;

  constructor(code: SkillFileErrorCode, path: string, message: string) {
    super(message);
    this.name = "SkillFileError";
    this.code = code;
    this.path = path;
  }
}

const TARGETS = new Set<string>(["opencode", "pi", "gentle-shell"]);
const SCOPES = new Set<string>(["global", "project"]);

const MARKDOWN_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);
const TEXT_EXTENSIONS = new Set([
  ".json",
  ".py",
  ".sh",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".js",
  ".ts",
]);

/** Tope de lectura: por encima de esto el archivo no es contenido de skill. */
const MAX_BYTES = 512 * 1024;
/** Profundidad máxima del listado, contando los archivos de la raíz como 1. */
const MAX_DEPTH = 4;
const SKIPPED_NAMES = new Set(["node_modules"]);
/** Archivos que encabezan el listado, en este orden y sin importar mayúsculas. */
const PRIORITY_FILES = ["skill.md", "command.md"];
/** Aviso que `parseFrontmatter` emite cuando el bloque nunca se cierra. */
const UNTERMINATED_FRONTMATTER = "frontmatter: block is unterminated";

function fail(code: SkillFileErrorCode, path: string, message: string): never {
  throw new SkillFileError(code, path, message);
}

function isInside(root: string, candidate: string): boolean {
  if (candidate === root) return true;
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate.startsWith(prefix);
}

async function realpathOrNull(path: string): Promise<string | null> {
  try {
    return await realpath(path);
  } catch {
    return null;
  }
}

async function statOrNull(path: string) {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}

/** Kind servible para una ruta, o `null` si la extensión no está en la allowlist. */
function kindFor(path: string): SkillFileKind | null {
  const extension = extname(path).toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown";
  if (TEXT_EXTENSIONS.has(extension)) return "text";
  return null;
}

/**
 * Valida el pedido de skill y devuelve el nombre de directorio ya normalizado.
 *
 * Un nombre es un único segmento: nada de separadores, de `.`/`..` ni de puntos
 * adelante, así que no puede nombrar otra cosa que un hijo de la carpeta de
 * skills del target.
 */
function assertRef(ref: SkillFileRef): string {
  if (!TARGETS.has(ref.target)) {
    fail("invalid", String(ref.target), `Target desconocido: ${String(ref.target)}.`);
  }
  if (!SCOPES.has(ref.scope)) {
    fail("invalid", String(ref.scope), `Scope desconocido: ${String(ref.scope)}.`);
  }

  const name = typeof ref.name === "string" ? ref.name.trim() : "";
  if (name === "") {
    fail("invalid", String(ref.name), "El nombre de la skill está vacío.");
  }
  if (name.includes("/") || name.includes("\\")) {
    fail("invalid", name, "El nombre de la skill debe ser un único directorio.");
  }
  if (name.includes("\u0000")) {
    fail("invalid", name, "El nombre de la skill contiene un NUL.");
  }
  if (name === "." || name === "..") {
    fail("invalid", name, "El nombre de la skill no puede ser '.' ni '..'.");
  }
  if (name.startsWith(".")) {
    fail("invalid", name, "El nombre de la skill no puede empezar con punto.");
  }

  return name;
}

interface ResolvedSkill {
  /** Nombre ya normalizado del directorio de la skill. */
  name: string;
  /** Directorio absoluto tal como se nombra en el reporte de skills. */
  dir: string;
  /** Realpath del directorio; contra éste se valida la contención. */
  real: string;
}

/** Resuelve el directorio de la skill desde los targets, nunca desde el cliente. */
async function resolveSkillDir(
  context: SkillFilesContext,
  ref: SkillFileRef
): Promise<ResolvedSkill> {
  const name = assertRef(ref);

  const spec = resolveSkillTargets(context).find((target) => target.id === ref.target);
  if (!spec) {
    fail("invalid", ref.target, `Target desconocido: ${ref.target}.`);
  }

  const skillsDir = ref.scope === "global" ? spec.globalDir : spec.projectDir;
  const realSkillsDir = await realpathOrNull(skillsDir);
  if (realSkillsDir === null) {
    fail("missing", skillsDir, `No existe la carpeta de skills ${skillsDir}.`);
  }

  const dir = resolve(skillsDir, name);
  const info = await statOrNull(dir);
  if (info === null || !info.isDirectory()) {
    fail("missing", dir, `No existe la skill ${name}.`);
  }

  const real = await realpathOrNull(dir);
  if (real === null) {
    fail("missing", dir, `No existe la skill ${name}.`);
  }
  if (!isInside(realSkillsDir, real)) {
    fail("outside", dir, `La skill ${name} resuelve fuera de ${skillsDir}.`);
  }

  return { name, dir, real };
}

/** Orden estable por path, sin distinguir mayúsculas (como el reporte de skills). */
function comparePaths(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  const byLower = left.localeCompare(right);
  return byLower !== 0 ? byLower : a.localeCompare(b);
}

/** `SKILL.md` primero, `command.md` después, y el resto detrás. */
function priority(path: string): number {
  const index = PRIORITY_FILES.indexOf(path.toLowerCase());
  return index === -1 ? PRIORITY_FILES.length : index;
}

function compareEntries(a: SkillFileEntry, b: SkillFileEntry): number {
  const byPriority = priority(a.path) - priority(b.path);
  if (byPriority !== 0) return byPriority;
  return comparePaths(a.path, b.path);
}

/**
 * Recorre la skill juntando archivos servibles.
 *
 * Los symlinks no se siguen (ni archivos ni directorios): podrían apuntar fuera
 * de la skill, así que se saltean en silencio. Las entradas ocultas y
 * `node_modules` tampoco se listan.
 */
async function collectEntries(
  absoluteDir: string,
  prefix: string,
  depth: number,
  out: SkillFileEntry[]
): Promise<void> {
  if (depth >= MAX_DEPTH) return;

  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    // Subdirectorio ilegible: se lista lo que sí se pudo leer.
    return;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".") || SKIPPED_NAMES.has(entry.name)) continue;

    const childPath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      await collectEntries(join(absoluteDir, entry.name), childPath, depth + 1, out);
      continue;
    }
    if (!entry.isFile()) continue;

    const kind = kindFor(entry.name);
    if (kind === null) continue;

    const info = await statOrNull(join(absoluteDir, entry.name));
    if (info === null) continue;

    out.push({ path: childPath, bytes: info.size, kind });
  }
}

/**
 * Lista los archivos servibles de una skill instalada.
 *
 * Lanza `SkillFileError` (`invalid`, `outside`, `missing`) cuando el pedido no
 * nombra un directorio de skill contenido en su carpeta de skills.
 */
export async function listSkillFiles(
  context: SkillFilesContext,
  ref: SkillFileRef
): Promise<SkillFileList> {
  const skill = await resolveSkillDir(context, ref);

  const files: SkillFileEntry[] = [];
  await collectEntries(skill.real, "", 0, files);
  files.sort(compareEntries);

  return { skill: skill.name, dir: skill.dir, files };
}

/**
 * Normaliza la ruta de archivo pedida y devuelve un path POSIX relativo.
 *
 * Rechaza lo que no puede ser un archivo de la skill: vacío, NUL, absoluto o con
 * segmentos `..`. Los segmentos `.` y los separadores repetidos se descartan.
 */
function normalizeRelativePath(requested: string): string {
  if (typeof requested !== "string" || requested.trim() === "") {
    fail("invalid", String(requested), "La ruta del archivo está vacía.");
  }
  if (requested.includes("\u0000")) {
    fail("invalid", requested, "La ruta del archivo contiene un NUL.");
  }
  if (
    requested.startsWith("/") ||
    requested.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(requested)
  ) {
    fail("invalid", requested, "La ruta del archivo debe ser relativa a la skill.");
  }

  const segments = requested.split(/[\\/]+/).filter((segment) => segment !== "" && segment !== ".");
  if (segments.includes("..")) {
    fail("invalid", requested, "La ruta del archivo no puede contener segmentos '..'.");
  }
  if (segments.length === 0) {
    fail("invalid", requested, "La ruta del archivo está vacía.");
  }

  return segments.join("/");
}

/**
 * Renderiza markdown quitando primero el frontmatter.
 *
 * `parseFrontmatter` ya devuelve el cuerpo que sigue al bloque cerrado, así que
 * no hace falta reimplementar el recorte. Un bloque sin cerrar no se toca (no
 * hay cuerpo que devolver): se renderiza el archivo tal cual y el warning de
 * `parseFrontmatter` viaja en `warnings`.
 */
function renderSkillMarkdown(text: string): { html: string; warnings: string[] } {
  const parsed = parseFrontmatter(text);
  const warnings = [...parsed.warnings];
  const source = warnings.includes(UNTERMINATED_FRONTMATTER) ? text : parsed.body;
  return { html: renderMarkdown(source).html, warnings };
}

/**
 * Lee un archivo de una skill instalada.
 *
 * Lanza `SkillFileError` con `invalid`/`outside`/`missing`/`unsupported` para
 * todo pedido que no sea un archivo regular de la allowlist, de hasta 512 KB y
 * sin bytes NUL, cuyo realpath caiga dentro del realpath de la skill.
 */
export async function readSkillFile(
  context: SkillFilesContext,
  ref: SkillFileRef,
  relativePath: string
): Promise<SkillFileContent> {
  const posixPath = normalizeRelativePath(relativePath);
  const skill = await resolveSkillDir(context, ref);

  const logical = resolve(skill.dir, posixPath);
  // Contención lógica antes de tocar el disco: `..` ya se rechazó, pero el
  // chequeo se deja explícito para que la invariante no dependa del parser.
  if (!isInside(skill.dir, logical)) {
    fail("outside", relativePath, `El archivo ${posixPath} resuelve fuera de la skill.`);
  }

  const real = await realpathOrNull(logical);
  if (real === null) {
    fail(
      "missing",
      relativePath,
      `No existe el archivo ${posixPath} en la skill ${ref.name}.`
    );
  }
  if (!isInside(skill.real, real)) {
    fail("outside", relativePath, `El archivo ${posixPath} resuelve fuera de la skill.`);
  }

  const info = await statOrNull(real);
  if (info === null || !info.isFile()) {
    fail("missing", relativePath, `No es un archivo regular: ${posixPath}.`);
  }

  const kind = kindFor(posixPath);
  if (kind === null) {
    fail(
      "unsupported",
      relativePath,
      `Extensión no soportada (${extname(posixPath) || "sin extensión"}).`
    );
  }

  if (info.size > MAX_BYTES) {
    fail(
      "unsupported",
      relativePath,
      `El archivo ${posixPath} pesa ${info.size} bytes y supera el límite de 512 KB.`
    );
  }

  const buffer = await readFile(real).catch(() => null);
  if (buffer === null) {
    fail("missing", relativePath, `No se pudo leer ${posixPath}.`);
  }
  if (buffer.includes(0)) {
    fail(
      "unsupported",
      relativePath,
      `El archivo ${posixPath} parece binario: contiene bytes NUL.`
    );
  }

  const text = buffer.toString("utf8");
  const file: SkillFileContent = {
    path: posixPath,
    bytes: info.size,
    kind,
    text,
    modified: info.mtime.toISOString(),
    warnings: [],
  };

  // Sólo markdown lleva HTML: el texto plano se sirve sin la propiedad.
  if (kind === "markdown") {
    const rendered = renderSkillMarkdown(text);
    file.html = rendered.html;
    file.warnings = rendered.warnings;
  }

  return file;
}
