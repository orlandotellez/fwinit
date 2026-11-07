/**
 * Árbol de `specs/` y lectura de una spec del proyecto (S3, S5, S6).
 *
 * Dos invariantes mandan acá:
 * - un proyecto sin `specs/` no es un error (S5): el studio reporta
 *   `found=false` y el resto de la interfaz sigue usable;
 * - ninguna ruta servida puede salir de `specs/` (S6): la lectura valida el
 *   pedido de forma sintáctica (vacío, absoluto, NUL, `..`) y después física
 *   (`fs.realpath` contra el realpath del specs root), así un symlink plantado
 *   adentro tampoco escapa.
 *
 * El render de markdown vive en `markdown.ts`; acá sólo se conecta con el
 * filesystem y se derivan los metadatos que consume el cliente.
 */
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { renderMarkdown } from "./markdown.js";
import type {
  SpecFile,
  SpecNode,
  SpecsRoots,
  SpecsTotals,
  SpecsTree,
} from "./types.js";

/** Nombres que nunca se escanean (además de todo lo que empieza con punto). */
const SKIPPED_NAMES = new Set([".git", "node_modules"]);
const SUPPORTED_EXTENSIONS = new Set([".md", ".markdown", ".txt"]);

export type SpecPathErrorCode = "invalid" | "outside" | "missing" | "unsupported";

/** Error tipado de lectura: el server lo traduce a un status sin adivinar. */
export class SpecPathError extends Error {
  readonly code: SpecPathErrorCode;
  readonly path: string;

  constructor(code: SpecPathErrorCode, path: string, message: string) {
    super(message);
    this.name = "SpecPathError";
    this.code = code;
    this.path = path;
  }
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

function compareNodes(a: SpecNode, b: SpecNode): number {
  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  const byName = left.localeCompare(right);
  // Desempate estable para nombres que sólo difieren en mayúsculas.
  return byName !== 0 ? byName : a.name.localeCompare(b.name);
}

async function scanDirectory(
  absoluteDir: string,
  relativeDir: string,
  totals: SpecsTotals
): Promise<SpecNode[]> {
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const dirs: SpecNode[] = [];
  const files: SpecNode[] = [];

  for (const entry of entries) {
    // Los symlinks no se siguen: podrían apuntar fuera de specs/.
    if (entry.isSymbolicLink()) continue;
    if (entry.name.startsWith(".") || SKIPPED_NAMES.has(entry.name)) continue;

    const childPath = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      const children = await scanDirectory(join(absoluteDir, entry.name), childPath, totals);
      totals.dirs += 1;
      dirs.push({ name: entry.name, path: childPath, type: "dir", children });
      continue;
    }

    if (!entry.isFile()) continue;

    let info;
    try {
      info = await stat(join(absoluteDir, entry.name));
    } catch {
      continue;
    }

    totals.files += 1;
    totals.bytes += info.size;
    files.push({
      name: entry.name,
      path: childPath,
      type: "file",
      bytes: info.size,
      modified: info.mtime.toISOString(),
    });
  }

  dirs.sort(compareNodes);
  files.sort(compareNodes);

  // Directorios primero: las specs se leen por sección, no mezcladas con los
  // archivos sueltos de la raíz.
  return [...dirs, ...files];
}

/**
 * Arbol de `<projectRoot>/specs`. Nunca lanza: la ausencia de la carpeta es un
 * estado reportado (`found=false`), no un fallo.
 */
export async function buildSpecsTree(projectRoot: string): Promise<SpecsTree> {
  const generatedAt = new Date().toISOString();
  const specsRoot = join(projectRoot, "specs");
  const empty: SpecsTree = {
    found: false,
    root: null,
    projectRoot,
    sections: [],
    tree: [],
    totals: { files: 0, dirs: 0, bytes: 0 },
    generatedAt,
  };

  let rootInfo;
  try {
    rootInfo = await stat(specsRoot);
  } catch {
    return empty;
  }
  if (!rootInfo.isDirectory()) return empty;

  const totals: SpecsTotals = { files: 0, dirs: 0, bytes: 0 };
  const tree = await scanDirectory(specsRoot, "", totals);
  const sections = tree.filter((node) => node.type === "dir").map((node) => node.name);

  return {
    found: true,
    root: specsRoot,
    projectRoot,
    sections,
    tree,
    totals,
    generatedAt,
  };
}

/**
 * Índice de la línea que cierra el frontmatter, o `-1` si no hay bloque.
 *
 * Un archivo empieza con frontmatter sólo si la primera línea es `---`; el
 * bloque termina en la siguiente línea `---` o `...`.
 */
function frontmatterEndIndex(lines: string[]): number {
  if (lines[0]?.trim() !== "---") return -1;
  return lines.findIndex(
    (line, index) => index > 0 && (line.trim() === "---" || line.trim() === "...")
  );
}

/**
 * Quita el bloque de frontmatter antes de renderizar.
 *
 * Son metadatos, no prosa: sin esto el cuerpo arranca con un `<hr>` y un
 * párrafo `title: …`. El campo `markdown` del resultado sigue siendo el archivo
 * original completo, y un bloque sin cerrar no se toca (el warning lo reporta).
 */
function stripFrontmatter(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const end = frontmatterEndIndex(lines);
  if (end === -1) return markdown;
  return lines.slice(end + 1).join("\n");
}

/**
 * Problemas detectados que no impiden renderizar. Hoy: frontmatter abierto y
 * nunca cerrado, que suele significar un archivo a medio escribir.
 */
function collectWarnings(markdown: string): string[] {
  const warnings: string[] = [];
  const lines = markdown.split(/\r?\n/);

  if (lines[0]?.trim() === "---" && frontmatterEndIndex(lines) === -1) {
    warnings.push("El bloque de frontmatter no se cierra (falta `---`).");
  }

  return warnings;
}

function assertRelativePath(requested: string): string[] {
  if (requested.trim() === "") {
    throw new SpecPathError("invalid", requested, "La ruta de la spec está vacía.");
  }
  if (requested.includes("\u0000")) {
    throw new SpecPathError("invalid", requested, "La ruta de la spec contiene un NUL.");
  }
  if (requested.startsWith("/") || requested.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(requested)) {
    throw new SpecPathError(
      "invalid",
      requested,
      "La ruta de la spec debe ser relativa a specs/."
    );
  }

  return requested.split(/[\\/]+/).filter((segment) => segment !== "" && segment !== ".");
}

/**
 * Resuelve un target relativo contra el directorio del documento base.
 * `resolveSpecLink(["docs"], "../modules/a.md")` → `"modules/a.md"`.
 */
export function resolveSpecLink(baseDir: string[], target: string): string {
  const stack = baseDir.filter((segment) => segment !== "");
  for (const segment of target.split(/[\\/]+/)) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join("/");
}

/**
 * Reescribe cada `data-spec-link` como path desde el specs root.
 *
 * Así el HTML servido es autoconsistente: cualquier consumidor (la UI, un
export, un test) navega sin repetir la aritmética de `..`.
 */
export function normalizeSpecLinks(html: string, basePath: string): string {
  const baseDir = basePath.split("/").slice(0, -1);
  return html.replace(/data-spec-link="([^"]*)"/g, (_match, target: string) => {
    return `data-spec-link="${resolveSpecLink(baseDir, target)}"`;
  });
}

/**
 * Lee y renderiza una spec relativa al specs root.
 *
 * Rechaza con `SpecPathError` (`invalid`, `outside`, `missing`, `unsupported`)
 * todo pedido que no sea un archivo regular `.md`/`.markdown`/`.txt` dentro del
 * árbol real de `specs/`.
 */
export async function readSpecFile(
  roots: SpecsRoots,
  relativePath: string
): Promise<SpecFile> {
  const segments = assertRelativePath(relativePath);

  const logicalRoot = resolve(roots.specsRoot);
  const logical = resolve(logicalRoot, relativePath);

  // Contención lógica antes de tocar el disco: `../x` ni siquiera se intenta.
  if (!isInside(logicalRoot, logical)) {
    throw new SpecPathError("outside", relativePath, "La spec pedida está fuera de specs/.");
  }
  if (segments.includes("..")) {
    throw new SpecPathError(
      "invalid",
      relativePath,
      "La ruta de la spec no puede contener segmentos '..'."
    );
  }

  const realRoot = await realpathOrNull(logicalRoot);
  if (realRoot === null) {
    throw new SpecPathError("missing", relativePath, "El proyecto no tiene carpeta specs/.");
  }

  const real = await realpathOrNull(logical);
  if (real === null) {
    throw new SpecPathError("missing", relativePath, `No existe la spec ${relativePath}.`);
  }
  if (!isInside(realRoot, real)) {
    throw new SpecPathError("outside", relativePath, "La spec resuelve fuera de specs/.");
  }

  const info = await stat(real).catch(() => null);
  if (info === null) {
    throw new SpecPathError("missing", relativePath, `No existe la spec ${relativePath}.`);
  }
  if (!info.isFile()) {
    throw new SpecPathError("unsupported", relativePath, "La spec no es un archivo regular.");
  }

  const extension = extname(real).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new SpecPathError(
      "unsupported",
      relativePath,
      `Extensión no soportada (${extension || "sin extensión"}); usá .md, .markdown o .txt.`
    );
  }

  const markdown = await readFile(real, "utf8").catch(() => null);
  if (markdown === null) {
    throw new SpecPathError("missing", relativePath, `No se pudo leer ${relativePath}.`);
  }

  const { html: rawHtml, headings } = renderMarkdown(stripFrontmatter(markdown));
  const level1 = headings.find((heading) => heading.level === 1);
  const posixPath = relative(logicalRoot, logical).split(sep).join("/");
  const html = normalizeSpecLinks(rawHtml, posixPath);

  return {
    path: posixPath,
    absolutePath: logical,
    title: level1?.text || posixPath.split("/").pop() || posixPath,
    markdown,
    html,
    headings,
    bytes: info.size,
    modified: info.mtime.toISOString(),
    warnings: collectWarnings(markdown),
  };
}
