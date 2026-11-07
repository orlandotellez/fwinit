/**
 * Shared contract for `fwinit studio`.
 *
 * The studio is a loopback HTTP server that renders two read-only views over the
 * local filesystem: the agent skills installed for opencode / pi / gentle-shell,
 * and the `specs/` tree of the project the command was run in.
 *
 * Everything here is data only: the modules that produce it (`skills.ts`,
 * `specs.ts`) and the modules that serve it (`server.ts`, `ui/*`) agree on these
 * shapes so the browser client has one stable API.
 */

/** Agent tools whose installed skills the studio reports. */
export type SkillTargetId = "opencode" | "pi" | "gentle-shell";

/** Where a skill directory lives: user-wide install or the current project. */
export type SkillScope = "global" | "project";

export interface SkillEntry {
  /** Directory name on disk, e.g. `create-specs`. */
  name: string;
  /** Frontmatter `description`, or the first prose line when it is missing. */
  description: string;
  /** Frontmatter `metadata.version` when present. */
  version?: string;
  /** Frontmatter `license` when present. */
  license?: string;
  /** Frontmatter `metadata.author` when present. */
  author?: string;
  /** Absolute path of the skill directory. */
  dir: string;
  /** Absolute path of the skill's entry file (`SKILL.md`). */
  path: string;
  target: SkillTargetId;
  scope: SkillScope;
  /** Number of regular files inside the skill directory, recursively. */
  files: number;
  /** Total bytes of those files. */
  bytes: number;
  /** ISO timestamp of the entry file's last modification. */
  modified: string;
  /** Whether a sibling `command.md` prompt exists. */
  hasCommand: boolean;
  /** Non-fatal parse problems, e.g. unreadable frontmatter. */
  warnings: string[];
}

export interface SkillTargetReport {
  id: SkillTargetId;
  label: string;
  /** Absolute directory that would hold this target's skills for the scope. */
  globalDir: string;
  /** Absolute project-local skills directory for this target. */
  projectDir: string;
  globalExists: boolean;
  projectExists: boolean;
  skills: SkillEntry[];
}

export interface SkillsReport {
  generatedAt: string;
  projectRoot: string;
  targets: SkillTargetReport[];
  totals: { global: number; project: number };
  warnings: string[];
}

/** Cómo se sirve un archivo de una skill: markdown renderizado o texto plano. */
export type SkillFileKind = "markdown" | "text";

/** Identifica una skill instalada por target, scope y nombre de directorio. */
export interface SkillFileRef {
  target: SkillTargetId;
  scope: SkillScope;
  name: string;
}

export interface SkillFileEntry {
  /** POSIX path relative to the skill directory. */
  path: string;
  bytes: number;
  kind: SkillFileKind;
}

export interface SkillFileList {
  skill: string;
  /** Absolute skill directory. */
  dir: string;
  files: SkillFileEntry[];
}

export interface SkillFileContent extends SkillFileEntry {
  /** Raw file text, exactly as on disk. */
  text: string;
  /** Rendered HTML; present only for markdown kinds. */
  html?: string;
  modified: string;
  warnings: string[];
}

export type SpecNodeType = "dir" | "file";

export interface SpecNode {
  name: string;
  /** POSIX path relative to the specs root; `""` for the root itself. */
  path: string;
  type: SpecNodeType;
  children?: SpecNode[];
  bytes?: number;
  /** ISO timestamp; files only. */
  modified?: string;
}

export interface SpecsTotals {
  files: number;
  dirs: number;
  bytes: number;
}

export interface SpecsTree {
  /** False when the project has no `specs/` directory, which is not an error. */
  found: boolean;
  /** Absolute specs directory, or null when `found` is false. */
  root: string | null;
  projectRoot: string;
  /** Top-level groups in reading order, e.g. `docs`, `modules`, `tasks`. */
  sections: string[];
  tree: SpecNode[];
  totals: SpecsTotals;
  generatedAt: string;
}

export interface SpecHeading {
  level: number;
  text: string;
  /** Slug used by the document's own table of contents. */
  id: string;
}

export interface SpecFile {
  /** POSIX path relative to the specs root. */
  path: string;
  /** Absolute path on disk. */
  absolutePath: string;
  /** First `#` heading, falling back to the file name. */
  title: string;
  markdown: string;
  /** Rendered HTML; the renderer escapes all source text before markup. */
  html: string;
  headings: SpecHeading[];
  bytes: number;
  modified: string;
  warnings: string[];
}

/** A directory that `specs.ts` may serve a file from. */
export interface SpecsRoots {
  specsRoot: string;
  projectRoot: string;
}

export interface StudioOpenOptions {
  /** 0 (default) lets the OS pick a free port. */
  port?: number;
  /** CLI version reported by the studio badge; defaults to "0.0.0". */
  version?: string;
  /** Directory reported as the project root; defaults to `process.cwd()`. */
  projectRoot?: string;
  /** Home directory override, used by tests to isolate discovery. */
  home?: string;
  /** Whether to launch the default browser once listening. */
  open?: boolean;
}

export interface StudioAddress {
  url: string;
  host: string;
  port: number;
}

export interface StudioServer {
  address: StudioAddress;
  close: () => Promise<void>;
}
