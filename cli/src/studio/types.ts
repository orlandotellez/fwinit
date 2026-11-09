/**
 * Shared contract for `fwinit studio`.
 *
 * The studio is a loopback HTTP server that renders views over the local
 * filesystem: the agent skills installed for opencode / pi / gentle-shell, and
 * the `specs/` tree of the project the command was run in.
 *
 * It reads everything it shows, and writes in exactly one place: installing a
 * bundle skill into the three agent homes (`install.ts`).
 *
 * Everything here is data only: the modules that produce it (`skills.ts`,
 * `specs.ts`, `install.ts`) and the modules that serve it (`server.ts`, `ui/*`)
 * agree on these shapes so the browser client has one stable API.
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

/**
 * What the studio can offer the `Implementar skill` action.
 *
 * `skills` holds the bundle directory names (`create-specs`, `design`, …) whose
 * source is present, so the client shows the button only where it would work.
 * When `available` is false nothing can be installed and `reason` says why, in
 * the product's language: a local tool that silently disappears is worse than
 * one that explains the one command that does the job.
 */
export interface StudioInstallInfo {
  available: boolean;
  reason?: string;
  /** Absolute root the bundle is copied from, or null when it was not found. */
  source: string | null;
  /** Bundle directory names that can be installed right now. */
  skills: string[];
}

/** One agent home that would receive the skill. */
export interface InstallDestination {
  target: SkillTargetId;
  label: string;
  /** Absolute skill directory that would be created or replaced. */
  dir: string;
  /** True when a skill of the same name is already there and would be replaced. */
  replaces: boolean;
}

/** What a confirmation dialog needs to show before anything is written. */
export interface InstallPlan {
  /** Bundle directory name, e.g. `create-specs`. */
  name: string;
  /** Absolute root the skill is copied from. */
  source: string;
  destinations: InstallDestination[];
  warnings: string[];
}

/** Outcome of writing one skill into one agent home. */
export interface InstallTargetResult {
  target: SkillTargetId;
  label: string;
  dir: string;
  /** Files and folders copied; zero when the write failed. */
  copied: number;
  error?: string;
}

/** Outcome of the whole install; `ok` is false when any destination failed. */
export interface InstallResult {
  name: string;
  ok: boolean;
  results: InstallTargetResult[];
}

/**
 * Estado de una ejecución de skill (`run.ts`).
 *
 * `running` es el único estado que admite una segunda consulta con líneas
 * nuevas; los otros son finales y el panel deja de pedir. `interrupted` sólo
 * aparece al leer un archivo del historial sin registro de cierre: el proceso
 * murió con el server anterior, así que jamás se reporta como `running`.
 */
export type StudioRunState = "running" | "done" | "failed" | "cancelled" | "interrupted";

/**
 * Cómo se presenta una línea de la salida del agente.
 *
 * `text` es prosa del modelo, `tool` es actividad de herramienta, `status` es
 * un evento del protocolo que el studio sí entiende, y `raw` es una línea que
 * no se reconoció: se muestra tal cual en vez de descartarla (spec S11).
 */
export type StudioRunLineKind = "text" | "tool" | "status" | "raw";

export interface StudioRunLine {
  /** Número de línea, desde 1; es el cursor que el panel pasa como `since`. */
  n: number;
  kind: StudioRunLineKind;
  text: string;
}

/** El comando exacto que se ejecutó: sin shell, binario y argumentos. */
export interface StudioRunCommand {
  binary: string;
  args: string[];
}

/** Lo que devuelve `GET /api/skills/run` y también el inicio y la cancelación. */
export interface StudioRunStatus {
  id: string;
  agent: SkillTargetId;
  /** La skill que el usuario tenía abierta, resuelta en el server. */
  skill: SkillFileRef;
  command: StudioRunCommand;
  /** Modelo elegido por el usuario, o null cuando el agente usa su default. */
  model: string | null;
  /** El pedido original: el historial permite recuperar qué se había pedido. */
  prompt: string;
  state: StudioRunState;
  /** Código de salida del proceso, o null mientras corre o si lo mató una señal. */
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  /** Sólo las líneas nuevas respecto del `since` pedido. */
  lines: StudioRunLine[];
  /** Número de la última línea emitida: el próximo `since`. */
  next: number;
  /** True cuando se alcanzó el tope de salida y el resto se descartó. */
  truncated: boolean;
  /** Avisos para el panel antes o después de ejecutar (p. ej. el límite de opencode). */
  notes: string[];
}

/**
 * Un run del historial (`GET /api/skills/runs`), leído de la memoria del server
 * o del disco, con lo justo para listarlo sin mandar toda la salida.
 */
export interface StudioRunSummary {
  id: string;
  agent: SkillTargetId;
  skill: SkillFileRef;
  model: string | null;
  prompt: string;
  /** `interrupted` es un archivo sin cierre: el server anterior murió. */
  state: StudioRunState;
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
  lineCount: number;
  truncated: boolean;
  /** True cuando el resumen salió del disco y no de la memoria del server. */
  fromDisk: boolean;
}

/** Respuesta de `GET /api/skills/runs`: la ejecución viva y el historial. */
export interface StudioRunsList {
  /** Id de la ejecución en curso, o null cuando no hay ninguna. */
  inFlight: string | null;
  /** Resúmenes de la más nueva a la más vieja. */
  runs: StudioRunSummary[];
}

/** Un modelo tal como lo publica el CLI del agente (spec S14). */
export interface StudioModel {
  provider: string;
  model: string;
  /** `provider/model`, el formato que aceptan `pi --model` y `opencode run --model`. */
  id: string;
  context?: string;
  maxOut?: string;
  thinking?: boolean;
  images?: boolean;
}

/**
 * Catálogo de modelos de un agente.
 *
 * `available: false` no es un error del studio: el comando del CLI falló o no
 * devolvió nada, y el panel deja el campo como texto libre con ese motivo.
 */
export interface StudioModelList {
  agent: SkillTargetId;
  /** Agente cuyo CLI se consultó: `gentle-shell` reusa el catálogo de `pi`. */
  source: SkillTargetId;
  available: boolean;
  models: StudioModel[];
  command: StudioRunCommand;
  error?: string;
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
  /** Bundle root override, used by tests and by `FWINIT_BUNDLE_ROOT`. */
  bundleRoot?: string;
  /**
   * Binario por agente, para tests: apuntan a un script fixture en un
   * directorio temporal en vez del agente real. Sin esto se usa el nombre del
   * comando (`pi`, `opencode`, `gentle-shell`) o su variable de entorno.
   */
  agentBinaries?: Partial<Record<SkillTargetId, string>>;
  /** Tope de salida acumulada por ejecución; por defecto 2 MB (spec S12). */
  runMaxOutputBytes?: number;
  /** Espera entre SIGTERM y SIGKILL al cancelar; por defecto 5 s (spec S12). */
  runCancelGraceMs?: number;
  /** Corte del comando de catálogo de modelos; por defecto 5 s (spec S14). */
  modelListTimeoutMs?: number;
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
