/**
 * Skills discovery for `fwinit studio` (spec S2).
 *
 * The studio lists the skills actually installed for opencode, pi and
 * gentle-shell, in both scopes: the user-wide install and the project-local
 * one. The target table mirrors the layout published by `global-skills.ts`
 * (decision L4), but the paths are resolved at call time so tests can point
 * `home` at a throwaway directory.
 *
 * The discovery is read-only and never throws: a missing skills directory is
 * reported as `exists: false` (not an error), and anything unreadable becomes a
 * warning so the rest of the studio keeps working.
 *
 * Symlinks are never followed: a symlinked skill directory is skipped with a
 * warning, and symlinks found while walking a skill are ignored, so a loop
 * cannot hang the server.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";
import type {
  SkillEntry,
  SkillScope,
  SkillTargetId,
  SkillTargetReport,
  SkillsReport,
} from "./types.js";

export interface DiscoverSkillsOptions {
  /** Directory reported as the project root; its local skill dirs are scanned. */
  projectRoot: string;
  /** Home directory override; defaults to `os.homedir()`. */
  home?: string;
}

/** One agent tool, with the two directories its skills live in. */
export interface SkillTargetSpec {
  id: SkillTargetId;
  label: string;
  globalDir: string;
  projectDir: string;
}

const ENTRY_FILE = "skill.md";
const COMMAND_FILE = "command.md";

function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "ENOENT" || code === "ENOTDIR";
}

/**
 * Resolves the three targets for the current call.
 *
 * `home` wins over `os.homedir()`; `GENTLE_SHELL_HOME` only redirects
 * gentle-shell, exactly like `resolveGlobalTargets()` does for installation.
 */
export function resolveSkillTargets(options: DiscoverSkillsOptions): SkillTargetSpec[] {
  const home = resolve(options.home ?? homedir());
  const projectRoot = resolve(options.projectRoot);
  const gentleShellRoot =
    process.env.GENTLE_SHELL_HOME?.trim() || join(home, ".gentle-shell", "agent");

  return [
    {
      id: "opencode",
      label: "opencode",
      globalDir: join(home, ".config", "opencode", "skills"),
      projectDir: join(projectRoot, ".opencode", "skills"),
    },
    {
      id: "pi",
      label: "pi",
      globalDir: join(home, ".pi", "agent", "skills"),
      projectDir: join(projectRoot, ".pi", "skills"),
    },
    {
      id: "gentle-shell",
      label: "Gentle Shell",
      globalDir: join(gentleShellRoot, "skills"),
      projectDir: join(projectRoot, ".gentle-shell", "skills"),
    },
  ];
}

/** Case-insensitive ascending order so `Zeta` sorts next to `alpha`. */
function compareNames(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** First prose line of the body: skips headings, fences and delimiters. */
function firstProseLine(body: string): string {
  let inFence = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (line.startsWith("#")) continue;
    if (line === "---") continue;
    return line;
  }
  return "";
}

/** Counts regular files and sums their bytes, never following symlinks. */
async function measureDirectory(dir: string): Promise<{ files: number; bytes: number }> {
  let files = 0;
  let bytes = 0;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    // Unreadable subdirectory: report what we could read instead of failing.
    return { files, bytes };
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await measureDirectory(path);
      files += nested.files;
      bytes += nested.bytes;
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const info = await stat(path);
      files += 1;
      bytes += info.size;
    } catch {
      // File vanished between readdir and stat: not worth a warning.
    }
  }

  return { files, bytes };
}

/**
 * Reads one skill directory, or returns null when it is not a skill (no entry
 * file) or cannot be read (after recording a target-level warning).
 */
async function readSkill(
  dir: string,
  name: string,
  target: SkillTargetId,
  scope: SkillScope,
  warnings: string[]
): Promise<SkillEntry | null> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    warnings.push(`cannot read skill directory: ${dir}`);
    return null;
  }

  const entryFile = entries.find(
    (entry) => entry.isFile() && entry.name.toLowerCase() === ENTRY_FILE
  );
  if (!entryFile) return null;

  const entryPath = join(dir, entryFile.name);
  let source: string;
  let entryInfo;
  try {
    source = await readFile(entryPath, "utf-8");
    entryInfo = await stat(entryPath);
  } catch {
    warnings.push(`cannot read skill entry file: ${entryPath}`);
    return null;
  }

  const parsed = parseFrontmatter(source);
  const { files, bytes } = await measureDirectory(dir);
  const version = parsed.data["metadata.version"]?.trim();
  const author = parsed.data["metadata.author"]?.trim();
  const license = parsed.data["license"]?.trim();
  const description = parsed.data["description"]?.trim() || firstProseLine(parsed.body);

  return {
    name,
    description,
    version: version || undefined,
    license: license || undefined,
    author: author || undefined,
    dir,
    path: entryPath,
    target,
    scope,
    files,
    bytes,
    modified: entryInfo.mtime.toISOString(),
    hasCommand: entries.some(
      (entry) => entry.isFile() && entry.name.toLowerCase() === COMMAND_FILE
    ),
    warnings: parsed.warnings,
  };
}

/** Scans one skills directory for direct child skill directories. */
async function scanSkillsDir(
  dir: string,
  target: SkillTargetId,
  scope: SkillScope,
  warnings: string[]
): Promise<{ exists: boolean; skills: SkillEntry[] }> {
  let info;
  try {
    info = await stat(dir);
  } catch (error) {
    if (isMissing(error)) return { exists: false, skills: [] };
    warnings.push(`cannot read skills directory: ${dir}`);
    return { exists: false, skills: [] };
  }
  if (!info.isDirectory()) return { exists: false, skills: [] };

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    warnings.push(`cannot list skills directory: ${dir}`);
    return { exists: true, skills: [] };
  }

  const skills: SkillEntry[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      warnings.push(`skipped symlinked skill directory: ${join(dir, entry.name)}`);
      continue;
    }
    if (!entry.isDirectory()) continue;
    const skill = await readSkill(
      join(dir, entry.name),
      entry.name,
      target,
      scope,
      warnings
    );
    if (skill) skills.push(skill);
  }

  skills.sort((a, b) => compareNames(a.name, b.name));
  return { exists: true, skills };
}

/**
 * Discovers every installed skill for the three supported targets.
 *
 * Both scopes are scanned per target; a missing directory is not an error, and
 * target-level problems are collected in `warnings` instead of throwing.
 */
export async function discoverSkills(
  options: DiscoverSkillsOptions
): Promise<SkillsReport> {
  const projectRoot = resolve(options.projectRoot);
  const warnings: string[] = [];
  const targets: SkillTargetReport[] = [];
  const totals = { global: 0, project: 0 };

  for (const spec of resolveSkillTargets(options)) {
    const globalScan = await scanSkillsDir(
      spec.globalDir,
      spec.id,
      "global",
      warnings
    );
    const projectScan = await scanSkillsDir(
      spec.projectDir,
      spec.id,
      "project",
      warnings
    );

    totals.global += globalScan.skills.length;
    totals.project += projectScan.skills.length;

    const skills = [...globalScan.skills, ...projectScan.skills].sort((a, b) =>
      compareNames(a.name, b.name)
    );

    targets.push({
      id: spec.id,
      label: spec.label,
      globalDir: spec.globalDir,
      projectDir: spec.projectDir,
      globalExists: globalScan.exists,
      projectExists: projectScan.exists,
      skills,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    projectRoot,
    targets,
    totals,
    warnings,
  };
}
