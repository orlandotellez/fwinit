/**
 * Deterministic skill installation for `fwinit studio` (spec S5/S6).
 *
 * The studio copies the fwinit bundle into the three agent homes with plain
 * filesystem work: no model, no agent process, no network. The same bundle
 * registry (`AGENT_BUNDLE`) and the same plan (`planAgentBundle`) that
 * `fwinit skills --global` uses drive it, so both paths install the same bytes
 * and cannot drift apart.
 *
 * Where the bytes come from matters: the source is always the fwinit package
 * bundle, never the project the studio was opened in. The root is resolved from
 * an explicit override, then `FWINIT_BUNDLE_ROOT`, then by walking up from this
 * module and from the CLI entry point looking for the bundle sentinel.
 *
 * Writes are confined to `<agent home>/skills/<name>` for the three targets
 * that `resolveSkillTargets` publishes. A path that escapes that directory
 * aborts the copy instead of touching an unexpected location, and the sibling
 * skills living next to the target are never visited.
 */
import { cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_BUNDLE, planAgentBundle, type AgentBundleEntry } from "../agent-bundle.js";
import { resolveSkillTargets } from "./skills.js";
import type {
  InstallDestination,
  InstallPlan,
  InstallResult,
  InstallTargetResult,
  StudioInstallInfo,
} from "./types.js";

/** Environment override for the bundle root, mirroring the CLI's own resolution. */
export const BUNDLE_ROOT_ENV = "FWINIT_BUNDLE_ROOT";

/** A file every complete bundle carries: `skills/create-specs/SKILL.md`. */
const BUNDLE_SENTINEL = join("skills", "create-specs", "SKILL.md");

/** How far up from a module or entry point the repo root can be. */
const WALK_UP_LEVELS = 5;

/** Where the skill content is read from and where it is written to. */
export interface InstallContext {
  projectRoot: string;
  /** Home directory override; defaults to `os.homedir()`. */
  home?: string;
  /** Bundle root override; defaults to the detected package bundle. */
  bundleRoot?: string;
}

/** `unknown` is a name outside the bundle; `unavailable` is missing content. */
export class InstallError extends Error {
  readonly code: "unknown" | "unavailable";

  constructor(code: "unknown" | "unavailable", message: string) {
    super(message);
    this.name = "InstallError";
    this.code = code;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/** `start` plus its ancestors, nearest first, never past the filesystem root. */
export function walkUp(start: string, levels: number = WALK_UP_LEVELS): string[] {
  const out: string[] = [];
  let current = resolve(start);
  for (let index = 0; index < levels; index++) {
    out.push(current);
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return out;
}

/**
 * Candidate roots in priority order. An explicit override or
 * `FWINIT_BUNDLE_ROOT` is authoritative: when one is given it is the only
 * candidate, so a test or a custom install never silently picks another bundle.
 */
function candidateRoots(explicit?: string): string[] {
  const fromEnv = process.env[BUNDLE_ROOT_ENV]?.trim();
  const forced = explicit?.trim() || fromEnv;
  if (forced) return [resolve(forced)];

  const candidates: string[] = [];
  // tsup bundles the CLI into `dist/`, so the module directory sits two levels
  // below the repo root that holds `skills/`.
  try {
    candidates.push(...walkUp(dirname(fileURLToPath(import.meta.url))));
  } catch {
    // `import.meta.url` is unavailable outside ESM; the entry point still is.
  }
  const entry = process.argv[1];
  if (entry) candidates.push(...walkUp(dirname(resolve(entry))));

  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate)) return false;
    seen.add(candidate);
    return true;
  });
}

/** First candidate that carries the bundle sentinel, or null. */
export async function findBundleRoot(explicit?: string): Promise<string | null> {
  for (const candidate of candidateRoots(explicit)) {
    if (await isFile(join(candidate, BUNDLE_SENTINEL))) return candidate;
  }
  return null;
}

/** The fallback the studio names when it cannot find the bundle locally. */
export const INSTALL_FALLBACK_COMMAND = "fwinit skills --global opencode,pi,gentle-shell";

/**
 * What the studio can offer, resolved once per server start.
 *
 * A `library` entry (`design`) carries no own `SKILL.md`; it is a folder of
 * skills, so its presence is checked as a directory.
 */
export async function resolveInstallInfo(explicitRoot?: string): Promise<StudioInstallInfo> {
  const root = await findBundleRoot(explicitRoot);
  if (!root) {
    return {
      available: false,
      reason: `No se encontró el bundle de skills junto al CLI. Instalalas con: ${INSTALL_FALLBACK_COMMAND}`,
      source: null,
      skills: [],
    };
  }

  const skills: string[] = [];
  for (const entry of AGENT_BUNDLE) {
    const dir = join(root, "skills", entry.dir);
    const present =
      entry.kind === "library" ? await isDirectory(dir) : await isFile(join(dir, "SKILL.md"));
    if (present) skills.push(entry.dir);
  }

  if (skills.length === 0) {
    return {
      available: false,
      reason: `El bundle en ${root} no trae ninguna skill conocida. Reinstalá con: ${INSTALL_FALLBACK_COMMAND}`,
      source: root,
      skills: [],
    };
  }

  return { available: true, source: root, skills };
}

function bundleEntry(name: string): AgentBundleEntry | undefined {
  return AGENT_BUNDLE.find((entry) => entry.dir === name);
}

// El plan de `planAgentBundle` escribe rutas POSIX (`skills/<dir>/...`), no
// rutas del sistema: el prefijo tiene que ser el mismo literal.
const SKILL_PREFIX = "skills/";

/** True for `skills/<name>` and anything below it, never for a longer name. */
function isInsideSkill(to: string, name: string): boolean {
  const base = SKILL_PREFIX + name;
  return to === base || to.startsWith(base + "/");
}

/**
 * Everything the confirmation dialog shows, derived without writing anything.
 *
 * Throws `InstallError` for a name outside the bundle (`unknown`) or a bundle
 * that does not carry it (`unavailable`): the studio must not offer an install
 * it cannot perform.
 */
export async function buildInstallPlan(
  context: InstallContext,
  name: string
): Promise<InstallPlan> {
  if (!bundleEntry(name)) {
    throw new InstallError("unknown", `"${name}" no es una skill del bundle de fwinit.`);
  }

  const info = await resolveInstallInfo(context.bundleRoot);
  if (!info.available || info.source === null || !info.skills.includes(name)) {
    throw new InstallError("unavailable", info.reason ?? `El bundle no trae la skill ${name}.`);
  }

  const destinations: InstallDestination[] = [];
  for (const target of resolveSkillTargets(context)) {
    const dir = join(target.globalDir, name);
    destinations.push({
      target: target.id,
      label: target.label,
      dir,
      replaces: await isDirectory(dir),
    });
  }

  return {
    name,
    source: info.source,
    destinations,
    // Los commands slash no viajan acá: el studio copia la carpeta de la skill.
    // Decirlo antes de escribir evita que el usuario descubra el faltante después.
    warnings: [
      `Los comandos slash (/${name}) se instalan con ${INSTALL_FALLBACK_COMMAND}; el studio copia la skill.`,
    ],
  };
}

/** `<globalDir>/<relative>` only when it stays inside `<globalDir>`. */
function confinedPath(globalDir: string, relative: string): string {
  const root = resolve(globalDir);
  const target = resolve(join(globalDir, relative));
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Ruta fuera del destino permitido: ${target}`);
  }
  return target;
}

/**
 * Copies one bundle skill into the three agent homes and reports each one.
 *
 * Each destination is independent: a failure in one never aborts the others,
 * and the caller sees exactly which home received the skill. Recursive entries
 * are removed first, so a file the bundle no longer ships does not survive as
 * drift — the same rule `installGlobalSkills` follows.
 */
export async function applyInstall(
  context: InstallContext,
  name: string
): Promise<InstallResult> {
  const entry = bundleEntry(name);
  if (!entry) {
    throw new InstallError("unknown", `"${name}" no es una skill del bundle de fwinit.`);
  }

  // Se replanifica acá, no se confía en el plan que mandó el cliente: el
  // fuente del bundle y la lista de destinos se derivan de nuevo antes de escribir.
  const plan = await buildInstallPlan(context, name);
  const bundlePlan = await planAgentBundle(plan.source, [entry]);
  const copies = bundlePlan.installs.filter((item) => isInsideSkill(item.to, name));

  const results: InstallTargetResult[] = [];
  for (const target of resolveSkillTargets(context)) {
    const dir = join(target.globalDir, name);
    try {
      let copied = 0;
      for (const item of copies) {
        const relative = item.to.slice(SKILL_PREFIX.length);
        const to = confinedPath(target.globalDir, relative);
        if (item.recursive === true) {
          await rm(to, { recursive: true, force: true });
          await mkdir(to, { recursive: true });
          await cp(item.from, to, { recursive: true });
        } else {
          await mkdir(dirname(to), { recursive: true });
          await cp(item.from, to);
        }
        copied++;
      }
      if (copied === 0) throw new Error(`El bundle no trae archivos para ${name}.`);
      results.push({ target: target.id, label: target.label, dir, copied });
    } catch (error) {
      results.push({
        target: target.id,
        label: target.label,
        dir,
        copied: 0,
        error: (error as Error).message,
      });
    }
  }

  return { name, ok: results.every((result) => !result.error), results };
}
