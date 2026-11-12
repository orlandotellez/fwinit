/**
 * Persistencia de las ejecuciones del studio (spec S13).
 *
 * Un archivo JSONL por ejecución en `<raíz del proyecto>/.fwinit/studio/runs/`:
 * una línea `meta` al arrancar, una línea por cada línea de salida, una línea
 * `session` cuando el agente informa el id de su sesión (S17) y una línea `end`
 * al cerrar. El disco es la copia durable: la memoria del server sigue siendo
 * la que transmite en vivo, pero recargar la página o reiniciar el studio ya no
 * pierde la ejecución — ni la sesión con la que se puede retomar.
 *
 * Decisiones que este módulo sostiene:
 *
 * - La carpeta se auto-ignora con `.fwinit/.gitignore` = `*`: el studio nunca
 *   escribe el `.gitignore` del usuario.
 * - El nombre del archivo se deriva del id, y un id sólo admite caracteres
 *   `[A-Za-z0-9]`: separadores y puntos se rechazan antes de tocar el disco.
 * - Un archivo con `meta` y sin `end` se lee como `interrupted` — el proceso
 *   murió con el server anterior—, jamás como `running`.
 * - Las escrituras son sincrónicas a propósito: cada registro son unos pocos
 *   bytes y así el orden del archivo es exactamente el orden en que el agente
 *   emitió cada línea, sin colas que puedan intercalarse.
 * - La retención borra primero lo más viejo: últimos 50 runs y 20 MB en total.
 */
import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type {
  SkillFileRef,
  SkillTargetId,
  StudioRunCommand,
  StudioRunLine,
  StudioRunLineKind,
  StudioRunState,
  StudioRunSummary,
} from "./types.js";

/** Extensión de cada archivo de ejecución. */
const RUN_FILE_EXTENSION = ".jsonl";

/** Un id de ejecución es un único segmento: sin `/`, `\\`, `.` ni `..`. */
const RUN_ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

/** `true` cuando el id es un único segmento seguro para nombrar un archivo. */
export function isRunId(value: unknown): value is string {
  return typeof value === "string" && RUN_ID_PATTERN.test(value);
}

/** Contenido del `.gitignore` que hace que la carpeta se ignore a sí misma. */
const SELF_IGNORE = "*\n";

/** Retención por defecto (S13): últimos 50 runs y 20 MB en total. */
export const RUN_STORE_LIMITS = { maxRuns: 50, maxBytes: 20 * 1024 * 1024 } as const;

/** Un run terminado puede leerse `interrupted` si el server anterior murió. */
export type StudioRunSummaryState = StudioRunState | "interrupted";

export interface RunMetaRecord {
  type: "meta";
  id: string;
  agent: SkillTargetId;
  skill: SkillFileRef;
  /** Modelo elegido por el usuario, o null cuando se usa el default del agente. */
  model: string | null;
  /**
   * Id de sesión del agente, capturado de su salida (S17). Se escribe null al
   * arrancar y un registro `session` lo completa cuando el agente lo informa.
   */
  sessionId: string | null;
  /** El pedido tal cual: el historial sirve para recuperar qué se había pedido. */
  prompt: string;
  command: StudioRunCommand;
  startedAt: string;
}

/**
 * La sesión que informó el agente, agregada cuando aparece en su salida (S17).
 *
 * Va como registro propio en vez de reescribir el `meta`: el archivo es
 * append-only a propósito, y así un run interrumpido a mitad de camino no
 * pierde el id de la sesión justo cuando más se quiere retomar.
 */
export interface RunSessionRecord {
  type: "session";
  sessionId: string;
  /** Momento en que se capturó, en ISO. */
  at: string;
}

export interface RunLineRecord extends StudioRunLine {
  type: "line";
  /** Momento en que la línea se publicó, en ISO. */
  at: string;
}

export interface RunEndRecord {
  type: "end";
  state: StudioRunState;
  exitCode: number | null;
  endedAt: string;
  truncated: boolean;
}

export type RunRecord = RunMetaRecord | RunLineRecord | RunEndRecord | RunSessionRecord;

/** Un archivo de ejecución ya leído. */
export interface StoredRun {
  meta: RunMetaRecord;
  lines: StudioRunLine[];
  end: RunEndRecord | null;
  state: StudioRunSummaryState;
  truncated: boolean;
  /** Tamaño del archivo en bytes. */
  bytes: number;
}

export interface RunStoreOptions {
  /** Raíz del proyecto: la carpeta del studio vive dentro de ella. */
  projectRoot: string;
  /** Tope de archivos conservados; por defecto 50. */
  maxRuns?: number;
  /** Tope de bytes conservados; por defecto 20 MB. */
  maxBytes?: number;
}

/** `<projectRoot>/.fwinit/studio/runs`, donde vive cada ejecución. */
export function runsDir(projectRoot: string): string {
  return join(resolve(projectRoot), ".fwinit", "studio", "runs");
}

/**
 * Ruta del archivo de una ejecución, o null cuando el id no es seguro.
 *
 * El id viaja en la URL: si trajera un separador o un punto podría salirse de
 * `.fwinit/studio/runs/`, así que se rechaza antes de armar la ruta.
 */
export function runFilePath(projectRoot: string, id: string): string | null {
  const clean = typeof id === "string" ? id.trim() : "";
  if (!isRunId(clean)) return null;
  return join(runsDir(projectRoot), clean + RUN_FILE_EXTENSION);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Un id de sesión es una etiqueta, nunca una ruta ni un comando (S17).
 *
 * Se muestra y se copia tal cual para `--session <id>`: un separador, un
 * espacio o un salto de línea lo convertirían en otra cosa.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Tope del id de sesión aceptado; un uuid entra de sobra. */
export const MAX_SESSION_ID_LENGTH = 128;

/**
 * Normaliza un id de sesión informado por el agente, o null si no es una
 * etiqueta aceptable. Lo usan el capturador (`run.ts`) y el lector del disco.
 */
export function normaliseSessionId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (id === "" || id.length > MAX_SESSION_ID_LENGTH) return null;
  if (!SESSION_ID_PATTERN.test(id)) return null;
  return id;
}

function isTarget(value: unknown): value is SkillTargetId {
  return value === "opencode" || value === "pi" || value === "gentle-shell";
}

function isScope(value: unknown): value is SkillFileRef["scope"] {
  return value === "global" || value === "project";
}

const LINE_KINDS: readonly StudioRunLineKind[] = ["text", "tool", "status", "raw"];

function asSkill(value: unknown): SkillFileRef | null {
  if (!isRecord(value)) return null;
  if (!isTarget(value.target) || !isScope(value.scope)) return null;
  if (typeof value.name !== "string" || value.name === "") return null;
  return { target: value.target, scope: value.scope, name: value.name };
}

function asCommand(value: unknown): StudioRunCommand | null {
  if (!isRecord(value)) return null;
  if (typeof value.binary !== "string") return null;
  const args = Array.isArray(value.args)
    ? value.args.filter((arg): arg is string => typeof arg === "string")
    : [];
  return { binary: value.binary, args };
}

/** Convierte el primer registro de un archivo en `meta`, o null si no lo es. */
function asMeta(value: unknown): RunMetaRecord | null {
  if (!isRecord(value) || value.type !== "meta") return null;
  if (typeof value.id !== "string" || !isTarget(value.agent)) return null;
  const skill = asSkill(value.skill);
  const command = asCommand(value.command);
  if (!skill || !command || typeof value.startedAt !== "string") return null;
  return {
    type: "meta",
    id: value.id,
    agent: value.agent,
    skill,
    model: typeof value.model === "string" && value.model !== "" ? value.model : null,
    // Un archivo anterior a S17 no trae la clave: se lee sin sesión, no roto.
    sessionId: normaliseSessionId(value.sessionId),
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    command,
    startedAt: value.startedAt,
  };
}

function asLine(value: unknown): StudioRunLine | null {
  if (!isRecord(value) || value.type !== "line") return null;
  if (typeof value.n !== "number" || !Number.isFinite(value.n)) return null;
  if (typeof value.text !== "string") return null;
  const kind = LINE_KINDS.includes(value.kind as StudioRunLineKind)
    ? (value.kind as StudioRunLineKind)
    : "raw";
  return { n: Math.floor(value.n), kind, text: value.text };
}

function asEnd(value: unknown): RunEndRecord | null {
  if (!isRecord(value) || value.type !== "end") return null;
  const states: StudioRunState[] = ["running", "done", "failed", "cancelled"];
  if (!states.includes(value.state as StudioRunState)) return null;
  if (typeof value.endedAt !== "string") return null;
  return {
    type: "end",
    state: value.state as StudioRunState,
    exitCode: typeof value.exitCode === "number" ? value.exitCode : null,
    endedAt: value.endedAt,
    truncated: value.truncated === true,
  };
}

/** El registro que completa el id de sesión capturado del agente (S17). */
function asSession(value: unknown): RunSessionRecord | null {
  if (!isRecord(value) || value.type !== "session") return null;
  const sessionId = normaliseSessionId(value.sessionId);
  if (!sessionId) return null;
  return { type: "session", sessionId, at: typeof value.at === "string" ? value.at : "" };
}

/**
 * Lee el texto de un archivo de ejecución.
 *
 * Una línea rota se saltea: lo que sí se pudo leer se conserva, porque perder
 * una ejecución entera por un byte corrupto es peor que mostrar el resto.
 */
export function parseRunFile(text: string, bytes = Buffer.byteLength(text, "utf8")): StoredRun | null {
  let meta: RunMetaRecord | null = null;
  let end: RunEndRecord | null = null;
  const lines: StudioRunLine[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line === "") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const candidateMeta = asMeta(parsed);
    if (candidateMeta) {
      // El primer `meta` gana: un archivo tiene una sola ejecución.
      if (!meta) meta = candidateMeta;
      continue;
    }
    const candidateLine = asLine(parsed);
    if (candidateLine) {
      lines.push(candidateLine);
      continue;
    }
    const candidateSession = asSession(parsed);
    if (candidateSession) {
      // El primer id capturado gana: un run es una sola sesión del agente.
      if (meta && meta.sessionId === null) meta.sessionId = candidateSession.sessionId;
      continue;
    }
    const candidateEnd = asEnd(parsed);
    if (candidateEnd) end = candidateEnd;
  }

  if (!meta) return null;
  return {
    meta,
    lines,
    end,
    // Sin cierre el proceso murió con el server anterior (S13).
    state: end ? end.state : "interrupted",
    truncated: end ? end.truncated : false,
    bytes,
  };
}

/** Resumen que consume el historial de la página. */
export function summarise(run: StoredRun, fromDisk: boolean): StudioRunSummary {
  return {
    id: run.meta.id,
    agent: run.meta.agent,
    skill: run.meta.skill,
    model: run.meta.model,
    sessionId: run.meta.sessionId,
    prompt: run.meta.prompt,
    state: run.state,
    exitCode: run.end ? run.end.exitCode : null,
    startedAt: run.meta.startedAt,
    endedAt: run.end ? run.end.endedAt : null,
    lineCount: run.lines.length,
    truncated: run.truncated,
    fromDisk,
  };
}

/** Un archivo del directorio de ejecuciones, con lo mínimo para ordenarlo. */
interface RunFileEntry {
  id: string;
  path: string;
  bytes: number;
  startedAt: string;
  mtimeMs: number;
}

export class RunStore {
  /** Raíz del proyecto dueña de los runs. */
  readonly projectRoot: string;
  /** `<projectRoot>/.fwinit`: el studio escribe acá su `.gitignore`. */
  readonly root: string;
  readonly dir: string;
  private readonly maxRuns: number;
  private readonly maxBytes: number;
  private prepared = false;

  constructor(options: RunStoreOptions) {
    this.projectRoot = resolve(options.projectRoot);
    this.root = join(this.projectRoot, ".fwinit");
    this.dir = runsDir(this.projectRoot);
    this.maxRuns = options.maxRuns ?? RUN_STORE_LIMITS.maxRuns;
    this.maxBytes = options.maxBytes ?? RUN_STORE_LIMITS.maxBytes;
  }

  /** Crea la carpeta del studio y su `.gitignore`; se puede llamar de nuevo. */
  prepare(): void {
    if (this.prepared) return;
    mkdirSync(this.dir, { recursive: true });
    const ignore = join(this.root, ".gitignore");
    let existing: string | null = null;
    try {
      existing = readFileSync(ignore, "utf8");
    } catch {
      existing = null;
    }
    if (existing !== SELF_IGNORE) writeFileSync(ignore, SELF_IGNORE, "utf8");
    this.prepared = true;
  }

  /** Arranca el archivo de una ejecución y aplica la retención. */
  begin(meta: RunMetaRecord): void {
    this.write(meta.id, meta);
    this.enforceRetention();
  }

  /** Agrega una línea de salida con su marca de tiempo. */
  appendLine(id: string, line: StudioRunLine): void {
    const record: RunLineRecord = {
      type: "line",
      n: line.n,
      kind: line.kind,
      text: line.text,
      at: new Date().toISOString(),
    };
    this.write(id, record);
  }

  /**
   * Guarda la sesión que informó el agente (S17).
   *
   * Un id que no es una etiqueta se descarta: viaja a la vista y al comando que
   * el usuario copia, así que no puede traer separadores ni saltos de línea.
   */
  session(id: string, sessionId: string): void {
    const clean = normaliseSessionId(sessionId);
    if (!clean) return;
    this.write(id, { type: "session", sessionId: clean, at: new Date().toISOString() });
  }

  /** Cierra la ejecución: sin este registro el run se lee `interrupted`. */
  end(id: string, end: Omit<RunEndRecord, "type">): void {
    this.write(id, { type: "end", ...end });
  }

  /** Una ejecución leída del disco, o null si el id no es seguro o no existe. */
  read(id: string): StoredRun | null {
    const path = runFilePath(this.projectRoot, id);
    if (!path) return null;
    return this.readPath(path, id);
  }

  /** Todas las ejecuciones en disco, de la más nueva a la más vieja. */
  list(): StoredRun[] {
    const runs: StoredRun[] = [];
    for (const entry of this.entries()) {
      const run = this.readPath(entry.path, entry.id);
      if (run) runs.push(run);
    }
    return runs.sort((a, b) => {
      if (a.meta.startedAt !== b.meta.startedAt) {
        return a.meta.startedAt > b.meta.startedAt ? -1 : 1;
      }
      return a.meta.id > b.meta.id ? -1 : a.meta.id < b.meta.id ? 1 : 0;
    });
  }

  /**
   * Borra los archivos más viejos hasta cumplir los topes.
   *
   * Devuelve los ids borrados. Nunca deja la carpeta vacía: la ejecución que
   * acaba de arrancar es la más nueva y siempre sobrevive.
   */
  enforceRetention(): string[] {
    const entries = this.entries();
    if (entries.length === 0) return [];
    let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
    const deleted: string[] = [];
    // Más viejo primero: se borra desde el principio de la lista ordenada.
    const oldestFirst = [...entries].sort((a, b) => {
      if (a.startedAt !== b.startedAt) return a.startedAt < b.startedAt ? -1 : 1;
      return a.mtimeMs - b.mtimeMs;
    });
    while (
      oldestFirst.length > 1 &&
      (oldestFirst.length > this.maxRuns || total > this.maxBytes)
    ) {
      const victim = oldestFirst.shift();
      if (!victim) break;
      try {
        unlinkSync(victim.path);
        total -= victim.bytes;
        deleted.push(victim.id);
      } catch {
        // Ya no está: la retención no es un motivo para romper el studio.
      }
    }
    return deleted;
  }

  private write(id: string, record: RunRecord): void {
    const path = runFilePath(this.projectRoot, id);
    if (!path) return;
    this.prepare();
    try {
      appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
    } catch {
      // Persistir es durabilidad, no la ejecución: un disco lleno no puede
      // cortar el streaming que el usuario está mirando.
    }
  }

  private readPath(path: string, id: string): StoredRun | null {
    if (!isRunId(id)) return null;
    let text: string;
    let bytes: number;
    try {
      text = readFileSync(path, "utf8");
      bytes = statSync(path).size;
    } catch {
      return null;
    }
    return parseRunFile(text, bytes);
  }

  /** Archivos `*.jsonl` válidos del directorio, con su tamaño y su inicio. */
  private entries(): RunFileEntry[] {
    let names: string[];
    try {
      names = readdirSync(this.dir);
    } catch {
      return [];
    }
    const out: RunFileEntry[] = [];
    for (const name of names) {
      if (!name.endsWith(RUN_FILE_EXTENSION)) continue;
      const id = name.slice(0, -RUN_FILE_EXTENSION.length);
      if (!isRunId(id)) continue;
      const path = join(this.dir, name);
      try {
        const stats = statSync(path);
        if (!stats.isFile()) continue;
        // El `startedAt` del meta ordena la retención; si el archivo está roto
        // se usa la fecha de modificación, que es lo único que queda.
        const run = parseRunFile(readFileSync(path, "utf8"), stats.size);
        out.push({
          id,
          path,
          bytes: stats.size,
          startedAt: run?.meta.startedAt ?? new Date(stats.mtimeMs).toISOString(),
          mtimeMs: stats.mtimeMs,
        });
      } catch {
        // Un archivo que desapareció entre el listado y la lectura se saltea.
      }
    }
    return out;
  }
}
