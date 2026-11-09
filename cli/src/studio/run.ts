/**
 * Ejecución de skills para `fwinit studio` (spec S8–S12).
 *
 * El studio no habla con un modelo: lanza el agente que el usuario eligió con
 * el prompt tal cual, le pasa la skill resuelta en el server y transmite su
 * salida por líneas numeradas. Cada pieza es chica y testeable por separado:
 *
 * - `buildAgentInvocation` fija el contrato de S10/S14 por agente.
 * - `normaliseOutputLine` traduce una línea cruda a `text` / `tool` / `status`
 *   y deja lo que no entiende como `raw`, nunca lo descarta.
 * - `RunManager` es el único dueño del proceso hijo: arranque, cursor `since`,
 *   cancelación con SIGTERM→SIGKILL, tope de salida y limpieza al cerrar.
 * - `RunStore` es la copia durable (S13): cada run queda en `.fwinit/studio/runs`
 *   y un manager nuevo lo puede leer después de un reinicio.
 *
 * Nada se concatena en un shell: siempre `spawn(binary, args, { cwd })`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { RunStore, normaliseSessionId, summarise } from "./run-store.js";
import { resolveSkillTargets } from "./skills.js";
import type {
  SkillFileRef,
  SkillScope,
  SkillTargetId,
  StudioRunCommand,
  StudioRunLine,
  StudioRunLineKind,
  StudioRunState,
  StudioRunStatus,
  StudioRunSummary,
} from "./types.js";

/** Los tres agentes, en el orden en que el panel los ofrece. */
export const RUN_AGENTS: readonly SkillTargetId[] = ["opencode", "pi", "gentle-shell"];

/**
 * Variable de entorno que redirige el binario de cada agente. Es el override
 * que usan los tests para apuntar a un script fixture en un directorio
 * temporal en vez de ejecutar el agente real.
 */
export const AGENT_BINARY_ENV: Record<SkillTargetId, string> = {
  opencode: "FWINIT_STUDIO_BIN_OPENCODE",
  pi: "FWINIT_STUDIO_BIN_PI",
  "gentle-shell": "FWINIT_STUDIO_BIN_GENTLE_SHELL",
};

const DEFAULT_BINARY: Record<SkillTargetId, string> = {
  opencode: "opencode",
  pi: "pi",
  "gentle-shell": "gentle-shell",
};

/** Tope de salida acumulada por ejecución (spec S12). */
export const MAX_RUN_OUTPUT_BYTES = 2 * 1024 * 1024;

/** Espera entre SIGTERM y SIGKILL al cancelar (spec S12). */
export const CANCEL_GRACE_MS = 5000;

/** Agrupa los `text_delta` en una línea antes de publicarlos. */
const DEFAULT_FLUSH_MS = 250;

/** Cuántas ejecuciones terminadas quedan consultables por id. */
const MAX_RETAINED_RUNS = 5;

/** Nombre de skill aceptado: un único segmento de directorio, nunca una ruta. */
const SKILL_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Tope del modelo elegido por el usuario (spec S14). */
export const MAX_MODEL_LENGTH = 128;

/**
 * Nombre con el que la sesión aparece en el selector del agente (S17).
 *
 * Sin este nombre las sesiones del studio se mezclarían con las de trabajo
 * manual; con él se distinguen de un vistazo en `pi -r`.
 */
export function studioSessionName(skillName: string): string {
  const name = typeof skillName === "string" ? skillName.trim() : "";
  return name === "" ? "fwinit studio" : `fwinit studio · ${name}`;
}

/** Caracteres de control: un modelo es una etiqueta, no una línea de texto. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/** Aviso que acompaña a un run leído del disco sin registro de cierre. */
export const INTERRUPTED_NOTE =
  "La ejecución se interrumpió: el studio se cerró antes de que terminara.";

export type RunErrorCode = "invalid" | "busy" | "skill-missing" | "not-discoverable" | "unknown";

/** Un problema de ejecución que el server traduce a un status concreto. */
export class RunError extends Error {
  readonly code: RunErrorCode;

  constructor(code: RunErrorCode, message: string) {
    super(message);
    this.name = "RunError";
    this.code = code;
  }
}

export interface RunManagerOptions {
  /** Raíz del proyecto: es siempre el `cwd` del agente y del descubrimiento local. */
  projectRoot: string;
  /** Home override, para tests; por defecto `os.homedir()`. */
  home?: string;
  /** Binario por agente; gana sobre el nombre del comando y sobre el entorno. */
  agentBinaries?: Partial<Record<SkillTargetId, string>>;
  maxOutputBytes?: number;
  cancelGraceMs?: number;
  /** Ventana de agrupación de los `text_delta`; los tests la achican. */
  flushMs?: number;
}

export interface RunStartRequest {
  agent: SkillTargetId;
  /** Qué skill ejecutar: se resuelve a un directorio en el server, nunca viene como ruta. */
  skill: SkillFileRef;
  prompt: string;
  /** Modelo elegido por el usuario; vacío u omitido deja el default del agente. */
  model?: string | null;
}

/** True sólo para los tres agentes del contrato. */
export function isRunAgent(value: unknown): value is SkillTargetId {
  return typeof value === "string" && (RUN_AGENTS as readonly string[]).includes(value);
}

/** `true` when `value` is one of the two scopes the studio reports. */
export function isRunScope(value: unknown): value is SkillScope {
  return value === "global" || value === "project";
}

/** Binario a ejecutar: override explícito, variable de entorno, o el del PATH. */
export function resolveAgentBinary(
  agent: SkillTargetId,
  overrides?: Partial<Record<SkillTargetId, string>>
): string {
  const explicit = overrides?.[agent]?.trim();
  if (explicit) return explicit;
  const fromEnv = process.env[AGENT_BINARY_ENV[agent]]?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_BINARY[agent];
}

export interface InvocationOptions {
  /** Directorio de la skill, resuelto por el server. */
  skillDir: string;
  /** Entrada del usuario tal cual: viaja como argumento, nunca por un shell. */
  prompt: string;
  /** Nombre de la skill: entra en el nombre de la sesión (S17). */
  skillName: string;
  /** Modelo elegido; sin él el agente usa su default y no se pasa el flag. */
  model?: string | null;
  /** Binario explícito (tests). */
  binary?: string;
}

/**
 * Valida el modelo como entrada del usuario (S14).
 *
 * Devuelve null cuando no se eligió ninguno y lanza `RunError` cuando el valor
 * no es un nombre de modelo: más de 128 caracteres o caracteres de control.
 * Viaja siempre como argumento, nunca concatenado en un shell.
 */
export function normaliseModel(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new RunError("invalid", "El modelo tiene que ser texto.");
  }
  const model = value.trim();
  if (model === "") return null;
  if (model.length > MAX_MODEL_LENGTH) {
    throw new RunError(
      "invalid",
      `El modelo no puede tener más de ${MAX_MODEL_LENGTH} caracteres.`
    );
  }
  if (CONTROL_CHARS.test(model)) {
    throw new RunError("invalid", "El modelo tiene caracteres de control.");
  }
  return model;
}

/**
 * El comando exacto de S10 para cada agente, con el modelo de S14 y el nombre
 * de sesión de S17.
 *
 * pi y Gentle Shell aceptan `--skill <dir>`; opencode no tiene flag de skill,
 * así que sólo recibe el prompt y descubre la skill por nombre. El modelo se
 * agrega sólo cuando el usuario eligió uno: sin modelo, el agente usa su default.
 *
 * La sesión ya no se descarta: `--name` la deja reconocible en el selector del
 * agente, así que una ejecución del studio se puede retomar después (S17).
 */
export function buildAgentInvocation(
  agent: SkillTargetId,
  options: InvocationOptions
): StudioRunCommand {
  if (!isRunAgent(agent)) {
    throw new RunError("invalid", `Agente desconocido: "${String(agent)}".`);
  }
  const binary = options.binary?.trim() || resolveAgentBinary(agent);
  const model = normaliseModel(options.model);
  const modelArgs = model === null ? [] : ["--model", model];

  if (agent === "opencode") {
    return { binary, args: ["run", "--auto", ...modelArgs, options.prompt] };
  }

  return {
    binary,
    args: [
      "--print",
      "--mode",
      "json",
      "--skill",
      options.skillDir,
      ...modelArgs,
      "-a",
      "--name",
      studioSessionName(options.skillName),
      options.prompt,
    ],
  };
}

/** Una línea traducida antes de recibir su número. */
export interface RunLineDraft {
  kind: StudioRunLineKind;
  text: string;
  /** True cuando el texto se suma a la línea de prosa anterior. */
  append: boolean;
  /** Id de sesión, sólo en el encabezado `session` del JSONL (S17). */
  sessionId?: string | null;
}

export interface NormaliseOptions {
  /** `jsonl` es `pi`/`gentle-shell --mode json`; `text` es la salida de opencode. */
  format?: "jsonl" | "text";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Primer campo con texto útil de un evento de herramienta. */
function toolLabel(event: Record<string, unknown>): string {
  for (const key of ["name", "tool", "toolName", "message", "path", "command"]) {
    const value = event[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

/** Etiqueta corta para los eventos del protocolo que sí conocemos. */
const EVENT_LABELS: Record<string, string> = {
  session: "sesión iniciada",
  agent_start: "agente iniciado",
  turn_start: "turno iniciado",
  message_start: "mensaje iniciado",
};

/**
 * Traduce una línea de salida del agente.
 *
 * Un `text_delta` pide `append` para que el manager lo agrupe; todo lo que no
 * se reconoce —un `type` nuevo, JSON roto, texto suelto— vuelve como `raw` con
 * la línea intacta, porque descartar salida es peor que mostrarla cruda.
 *
 * El encabezado `{"type":"session","id":...}` que pi imprime primero en
 * `--mode json` se presenta como estado y además expone el id: es la sesión que
 * después se puede retomar (S17).
 */
export function normaliseOutputLine(
  line: string,
  options: NormaliseOptions = {}
): RunLineDraft | null {
  if (line.trim() === "") return null;
  if (options.format === "text") return { kind: "text", text: line, append: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { kind: "raw", text: line, append: false };
  }
  if (!isRecord(parsed)) return { kind: "raw", text: line, append: false };

  const type = typeof parsed.type === "string" ? parsed.type : "";

  if (type === "session") {
    return {
      kind: "status",
      text: EVENT_LABELS.session,
      append: false,
      sessionId: normaliseSessionId(parsed.id),
    };
  }

  if (type === "message_update") {
    if (isRecord(parsed.assistantMessageEvent)) {
      const event = parsed.assistantMessageEvent;
      if (event.type === "text_delta" && typeof event.delta === "string") {
        if (event.delta === "") return null;
        return { kind: "text", text: event.delta, append: true };
      }
      if (typeof event.type === "string" && event.type.toLowerCase().includes("tool")) {
        return { kind: "tool", text: toolLabel(event) || line, append: false };
      }
    }
    // Un `message_update` que no es texto ni herramienta no se interpreta: crudo.
    return { kind: "raw", text: line, append: false };
  }

  if (type === "message_end") {
    const message = isRecord(parsed.message) ? parsed.message : {};
    const stop = typeof message.stopReason === "string" ? message.stopReason : "";
    return {
      kind: "status",
      text: stop ? `turno terminado · ${stop}` : "turno terminado",
      append: false,
    };
  }

  if (type.toLowerCase().includes("tool")) {
    return { kind: "tool", text: toolLabel(parsed) || line, append: false };
  }

  if (EVENT_LABELS[type]) {
    return { kind: "status", text: EVENT_LABELS[type], append: false };
  }

  return { kind: "raw", text: line, append: false };
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/** Una ejecución viva o terminada, con su proceso y sus líneas. */
interface ActiveRun {
  id: string;
  agent: SkillTargetId;
  skill: SkillFileRef;
  command: StudioRunCommand;
  /** Modelo elegido, o null cuando el agente usa su default. */
  model: string | null;
  /** Id de sesión que informó el agente, o null mientras no lo haya hecho (S17). */
  sessionId: string | null;
  /** El pedido original: viaja al historial junto con el resto del meta. */
  prompt: string;
  state: StudioRunState;
  exitCode: number | null;
  startedAt: number;
  endedAt: number | null;
  lines: StudioRunLine[];
  bytes: number;
  truncated: boolean;
  notes: string[];
  /** Prosa en curso: los `text_delta` se agrupan antes de publicarse. */
  pendingText: string;
  format: "jsonl" | "text";
  stdoutBuffer: string;
  stderrBuffer: string;
  child: ChildProcess | null;
  cancelRequested: boolean;
  disposed: boolean;
  flushTimer: NodeJS.Timeout | null;
  killTimer: NodeJS.Timeout | null;
  resolveExit: (() => void) | null;
  exitPromise: Promise<void>;
}

export class RunManager {
  private readonly projectRoot: string;
  private readonly home?: string;
  private readonly agentBinaries?: Partial<Record<SkillTargetId, string>>;
  private readonly maxOutputBytes: number;
  private readonly cancelGraceMs: number;
  private readonly flushMs: number;
  /** Copia durable de cada ejecución, dentro del proyecto (S13). */
  private readonly store: RunStore;
  private readonly runs = new Map<string, ActiveRun>();
  private currentId: string | null = null;

  constructor(options: RunManagerOptions) {
    this.projectRoot = resolve(options.projectRoot);
    this.home = options.home;
    this.agentBinaries = options.agentBinaries;
    this.maxOutputBytes = options.maxOutputBytes ?? MAX_RUN_OUTPUT_BYTES;
    this.cancelGraceMs = options.cancelGraceMs ?? CANCEL_GRACE_MS;
    this.flushMs = options.flushMs ?? DEFAULT_FLUSH_MS;
    this.store = new RunStore({ projectRoot: this.projectRoot });
  }

  /**
   * Arranca una ejecución.
   *
   * Un solo run a la vez (S12): mientras haya uno en `running` esto lanza
   * `RunError("busy")`, que el server responde 409.
   */
  async start(request: RunStartRequest): Promise<StudioRunStatus> {
    const { agent, skill } = request;
    if (!isRunAgent(agent)) {
      throw new RunError("invalid", `Agente desconocido: "${String(agent)}".`);
    }
    if (!isRunScope(skill?.scope) || !isRunAgent(skill?.target)) {
      throw new RunError("invalid", "Faltan los parámetros target y scope de la skill.");
    }
    if (typeof skill.name !== "string" || !SKILL_NAME_PATTERN.test(skill.name)) {
      throw new RunError("invalid", `Nombre de skill inválido: "${String(skill.name)}".`);
    }
    const prompt = typeof request.prompt === "string" ? request.prompt.trim() : "";
    if (prompt === "") {
      throw new RunError("invalid", "Escribí qué querés que haga la skill.");
    }
    // El modelo se valida antes de arrancar: un valor inválido no llega al argv.
    const model = normaliseModel(request.model);

    const running = this.runningRun();
    if (running) {
      throw new RunError(
        "busy",
        "Ejecución en curso: esperá a que termine o cancelala antes de lanzar otra."
      );
    }

    const notes: string[] = [];
    const skillDir = await this.resolveSkillDir(skill, agent, notes);
    const command = buildAgentInvocation(agent, {
      skillDir,
      prompt,
      skillName: skill.name,
      model,
      binary: resolveAgentBinary(agent, this.agentBinaries),
    });

    const run = this.createRun(agent, skill, command, notes, { prompt, model });
    this.runs.set(run.id, run);
    this.currentId = run.id;
    this.trimRuns();
    // El `meta` se escribe antes de arrancar el proceso: si el binario no
    // existe, el run igual queda en el historial con su cierre `failed`.
    // `sessionId` arranca en null y lo completa el registro `session` (S17).
    this.store.begin({
      type: "meta",
      id: run.id,
      agent: run.agent,
      skill: run.skill,
      model: run.model,
      sessionId: run.sessionId,
      prompt: run.prompt,
      command: run.command,
      startedAt: new Date(run.startedAt).toISOString(),
    });

    this.spawnRun(run);
    return this.status(run, 0);
  }

  /**
   * Estado y líneas con `n > since`.
   *
   * Primero la memoria (es la ejecución viva); si el id no pertenece a este
   * arranque del server, el archivo del disco, para que la página pueda abrir
   * el historial después de un reinicio (S13).
   */
  poll(id: string, since = 0): StudioRunStatus | null {
    const cursor = Number.isFinite(since) && since > 0 ? Math.floor(since) : 0;
    const run = this.runs.get(id);
    if (run) return this.status(run, cursor);
    return this.storedStatus(id, cursor);
  }

  /** El id de la ejecución en curso, o null cuando no hay ninguna. */
  inFlight(): string | null {
    return this.runningRun()?.id ?? null;
  }

  /**
   * Historial completo: los runs de este server (con su estado vivo) más los
   * que quedaron en el disco de arranques anteriores, del más nuevo al más viejo.
   */
  list(): StudioRunSummary[] {
    const byId = new Map<string, StudioRunSummary>();
    for (const stored of this.store.list()) {
      byId.set(stored.meta.id, summarise(stored, true));
    }
    for (const run of this.runs.values()) byId.set(run.id, this.summary(run));
    return [...byId.values()].sort((a, b) => {
      if (a.startedAt !== b.startedAt) return a.startedAt > b.startedAt ? -1 : 1;
      return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
    });
  }

  /**
   * Cancela la ejecución: SIGTERM y, si a los `cancelGraceMs` sigue viva,
   * SIGKILL (S12). Espera la salida para devolver el estado final.
   */
  async cancel(id: string): Promise<StudioRunStatus | null> {
    const run = this.runs.get(id);
    if (!run) return null;
    if (run.state !== "running") return this.status(run, 0);

    run.cancelRequested = true;
    this.signal(run, "SIGTERM");
    await this.waitForExit(run);
    return this.status(run, 0);
  }

  /** Mata todo lo que siga vivo (cierre del server) y limpia los timers. */
  dispose(): void {
    for (const run of this.runs.values()) {
      run.disposed = true;
      this.clearTimers(run);
      if (run.state === "running") {
        run.cancelRequested = true;
        this.signal(run, "SIGTERM");
        // Nadie espera la salida acá: si no muere con SIGTERM, el kill timer
        // del proceso lo termina, y el handler de cierre marca `cancelled`.
        this.scheduleKill(run);
      }
    }
    this.currentId = null;
  }

  /** El run que está corriendo, si hay alguno. */
  private runningRun(): ActiveRun | null {
    if (!this.currentId) return null;
    const run = this.runs.get(this.currentId);
    return run && run.state === "running" ? run : null;
  }

  /**
   * Resuelve el directorio que recibe `--skill`, y valida el caso de opencode.
   *
   * La ruta se arma siempre acá a partir de `{target, scope, name}`: el cliente
   * nunca manda una ruta. opencode no acepta `--skill`, así que además se
   * comprueba que la skill esté en alguno de sus dos directorios de
   * descubrimiento; si no, se rechaza en vez de fingir que la usó (S10).
   */
  private async resolveSkillDir(
    skill: SkillFileRef,
    agent: SkillTargetId,
    notes: string[]
  ): Promise<string> {
    const targets = resolveSkillTargets({ projectRoot: this.projectRoot, home: this.home });
    const own = targets.find((target) => target.id === skill.target);
    if (!own) throw new RunError("invalid", `Destino desconocido: "${String(skill.target)}".`);

    const base = skill.scope === "global" ? own.globalDir : own.projectDir;
    const dir = join(base, skill.name);

    if (agent === "opencode") {
      const opencode = targets.find((target) => target.id === "opencode");
      const candidates = opencode
        ? [join(opencode.globalDir, skill.name), join(opencode.projectDir, skill.name)]
        : [];
      for (const candidate of candidates) {
        if (await isDirectory(candidate)) return candidate;
      }
      notes.push(
        `opencode no tiene flag de skill: sólo descubre las que están en ${opencode?.globalDir ?? "~/.config/opencode/skills"} o ${opencode?.projectDir ?? "<proyecto>/.opencode/skills"}.`
      );
      throw new RunError(
        "not-discoverable",
        `opencode no puede usar «${skill.name}»: no tiene flag de skill y la busca por nombre en ${opencode?.globalDir ?? "~/.config/opencode/skills"} o ${opencode?.projectDir ?? "<proyecto>/.opencode/skills"}. Instalala ahí o ejecutala con pi / Gentle Shell.`
      );
    }

    if (!(await isDirectory(dir))) {
      throw new RunError(
        "skill-missing",
        `La skill «${skill.name}» no está instalada en ${dir}. Instalala desde este panel o elegí otra.`
      );
    }
    return dir;
  }

  private createRun(
    agent: SkillTargetId,
    skill: SkillFileRef,
    command: StudioRunCommand,
    notes: string[],
    input: { prompt: string; model: string | null }
  ): ActiveRun {
    const run: ActiveRun = {
      id: randomBytes(8).toString("hex"),
      agent,
      skill: { target: skill.target, scope: skill.scope, name: skill.name },
      command,
      model: input.model,
      sessionId: null,
      prompt: input.prompt,
      state: "running",
      exitCode: null,
      startedAt: Date.now(),
      endedAt: null,
      lines: [],
      bytes: 0,
      truncated: false,
      notes: [...notes],
      pendingText: "",
      format: agent === "opencode" ? "text" : "jsonl",
      stdoutBuffer: "",
      stderrBuffer: "",
      child: null,
      cancelRequested: false,
      disposed: false,
      flushTimer: null,
      killTimer: null,
      resolveExit: null,
      exitPromise: Promise.resolve(),
    };
    run.exitPromise = new Promise<void>((resolveExit) => {
      run.resolveExit = resolveExit;
    });
    return run;
  }

  private spawnRun(run: ActiveRun): void {
    let child: ChildProcess;
    try {
      child = spawn(run.command.binary, run.command.args, {
        cwd: this.projectRoot,
        env: { ...process.env },
        // Sin stdin heredado: un agente en modo print no espera entrada y no
        // puede quedar colgado leyendo la terminal del studio.
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      this.fail(run, `No se pudo ejecutar ${run.command.binary}: ${(error as Error).message}`);
      return;
    }
    run.child = child;

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      const parsed = splitLines(run.stdoutBuffer, chunk);
      run.stdoutBuffer = parsed.rest;
      for (const line of parsed.lines) this.consume(run, line, run.format);
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      const parsed = splitLines(run.stderrBuffer, chunk);
      run.stderrBuffer = parsed.rest;
      for (const line of parsed.lines) this.pushLine(run, "raw", line);
    });

    child.once("error", (error: Error) => {
      this.fail(run, `No se pudo ejecutar ${run.command.binary}: ${error.message}`);
    });

    child.once("close", (code: number | null) => {
      // Lo que quedó sin salto de línea igual es salida del agente.
      if (run.stdoutBuffer !== "") {
        this.consume(run, run.stdoutBuffer, run.format);
        run.stdoutBuffer = "";
      }
      if (run.stderrBuffer !== "") {
        this.pushLine(run, "raw", run.stderrBuffer);
        run.stderrBuffer = "";
      }
      this.finish(run, code);
    });
  }

  /** Traduce una línea y la agrega, agrupando la prosa en curso. */
  private consume(run: ActiveRun, line: string, format: "jsonl" | "text"): void {
    const draft = normaliseOutputLine(line, { format });
    if (!draft) return;
    if (draft.sessionId) this.recordSession(run, draft.sessionId);
    if (draft.append) {
      run.pendingText += draft.text;
      this.scheduleFlush(run);
      return;
    }
    this.flushPending(run);
    this.pushLine(run, draft.kind, draft.text);
  }

  /**
   * Guarda el id de sesión que informó el agente (S17).
   *
   * El primero gana: un run es una sola sesión. Se persiste de inmediato, así
   * un studio que se corta a mitad de camino igual deja cómo retomar el trabajo.
   */
  private recordSession(run: ActiveRun, sessionId: string): void {
    if (run.sessionId !== null) return;
    run.sessionId = sessionId;
    this.store.session(run.id, sessionId);
  }

  /**
   * Publica la prosa acumulada.
   *
   * Se publica como máximo cada `flushMs` y también en cuanto llega un evento
   * que no es texto: una línea publicada nunca cambia, así que el cursor
   * `since` del panel no puede perder texto a mitad de camino.
   */
  private scheduleFlush(run: ActiveRun): void {
    if (run.flushTimer) return;
    run.flushTimer = setTimeout(() => {
      run.flushTimer = null;
      this.flushPending(run);
    }, this.flushMs);
    run.flushTimer.unref?.();
  }

  private flushPending(run: ActiveRun): void {
    if (run.flushTimer) {
      clearTimeout(run.flushTimer);
      run.flushTimer = null;
    }
    if (run.pendingText === "") return;
    const text = run.pendingText;
    run.pendingText = "";
    this.pushLine(run, "text", text);
  }

  /** Agrega una línea numerada, respetando el tope de salida (S12). */
  private pushLine(run: ActiveRun, kind: StudioRunLineKind, text: string): void {
    if (run.truncated) return;
    const size = Buffer.byteLength(text, "utf8");
    if (run.bytes + size > this.maxOutputBytes) {
      run.truncated = true;
      this.commitLine(run, {
        n: run.lines.length + 1,
        kind: "status",
        text: `Salida truncada: se alcanzó el tope de ${formatMegabytes(this.maxOutputBytes)} MB acumulados.`,
      });
      return;
    }
    run.bytes += size;
    this.commitLine(run, { n: run.lines.length + 1, kind, text });
  }

  /** Publica una línea en memoria y en el archivo de la ejecución (S13). */
  private commitLine(run: ActiveRun, line: StudioRunLine): void {
    run.lines.push(line);
    this.store.appendLine(run.id, line);
  }

  /** Marca el final, publica el resumen y suelta a quien esperaba la salida. */
  private finish(run: ActiveRun, code: number | null): void {
    // Un `error` de spawn puede venir seguido de `close`: el final se escribe
    // una sola vez, si no el panel mostraría dos resúmenes contradictorios.
    if (run.endedAt !== null) return;
    this.flushPending(run);
    this.clearTimers(run);
    run.state = run.cancelRequested ? "cancelled" : code === 0 ? "done" : "failed";
    run.exitCode = code;
    run.endedAt = Date.now();
    this.pushLine(run, "status", describeEnd(run.state, code));
    this.persistEnd(run);
    run.child = null;
    run.resolveExit?.();
    run.resolveExit = null;
  }

  /** Un fallo que no llegó a producir un proceso (binario inexistente, etc.). */
  private fail(run: ActiveRun, message: string): void {
    if (run.endedAt !== null) return;
    this.flushPending(run);
    this.clearTimers(run);
    run.state = "failed";
    run.exitCode = null;
    run.endedAt = Date.now();
    this.pushLine(run, "status", message);
    this.persistEnd(run);
    run.child = null;
    run.resolveExit?.();
    run.resolveExit = null;
  }

  /** Cierre durable: sin este registro el archivo se leería `interrupted`. */
  private persistEnd(run: ActiveRun): void {
    this.store.end(run.id, {
      state: run.state,
      exitCode: run.exitCode,
      endedAt: new Date(run.endedAt ?? Date.now()).toISOString(),
      truncated: run.truncated,
    });
  }

  private signal(run: ActiveRun, signal: NodeJS.Signals): void {
    try {
      run.child?.kill(signal);
    } catch {
      // El proceso ya murió entre el chequeo y el kill: no es un error.
    }
  }

  /** SIGKILL si el proceso sigue vivo pasado el plazo de gracia. */
  private scheduleKill(run: ActiveRun): void {
    if (run.killTimer) return;
    run.killTimer = setTimeout(() => {
      run.killTimer = null;
      if (run.state === "running") this.signal(run, "SIGKILL");
    }, this.cancelGraceMs);
    run.killTimer.unref?.();
  }

  private async waitForExit(run: ActiveRun): Promise<void> {
    if (run.state !== "running") return;
    this.scheduleKill(run);
    await run.exitPromise;
  }

  private clearTimers(run: ActiveRun): void {
    if (run.flushTimer) {
      clearTimeout(run.flushTimer);
      run.flushTimer = null;
    }
    if (run.killTimer) {
      clearTimeout(run.killTimer);
      run.killTimer = null;
    }
  }

  private status(run: ActiveRun, since: number): StudioRunStatus {
    const endedAt = run.endedAt;
    return {
      id: run.id,
      agent: run.agent,
      skill: { ...run.skill },
      command: { binary: run.command.binary, args: [...run.command.args] },
      model: run.model,
      sessionId: run.sessionId,
      prompt: run.prompt,
      state: run.state,
      exitCode: run.exitCode,
      startedAt: new Date(run.startedAt).toISOString(),
      endedAt: endedAt === null ? null : new Date(endedAt).toISOString(),
      durationMs: (endedAt ?? Date.now()) - run.startedAt,
      lines: run.lines.filter((line) => line.n > since),
      next: run.lines.length === 0 ? 0 : run.lines[run.lines.length - 1].n,
      truncated: run.truncated,
      notes: [...run.notes],
    };
  }

  /** Resumen de un run de este server, con su estado vivo. */
  private summary(run: ActiveRun): StudioRunSummary {
    return {
      id: run.id,
      agent: run.agent,
      skill: { ...run.skill },
      model: run.model,
      sessionId: run.sessionId,
      prompt: run.prompt,
      state: run.state,
      exitCode: run.exitCode,
      startedAt: new Date(run.startedAt).toISOString(),
      endedAt: run.endedAt === null ? null : new Date(run.endedAt).toISOString(),
      lineCount: run.lines.length,
      truncated: run.truncated,
      fromDisk: false,
    };
  }

  /**
   * Un run leído del disco, con el mismo contrato que el de memoria.
   *
   * Un archivo sin cierre se reporta `interrupted` (S13) y se avisa en `notes`:
   * el proceso murió con el server anterior, no sigue corriendo.
   */
  private storedStatus(id: string, since: number): StudioRunStatus | null {
    const stored = this.store.read(id);
    if (!stored) return null;
    const startedMs = Date.parse(stored.meta.startedAt);
    const endedMs = stored.end ? Date.parse(stored.end.endedAt) : null;
    return {
      id: stored.meta.id,
      agent: stored.meta.agent,
      skill: { ...stored.meta.skill },
      command: { binary: stored.meta.command.binary, args: [...stored.meta.command.args] },
      model: stored.meta.model,
      sessionId: stored.meta.sessionId,
      prompt: stored.meta.prompt,
      state: stored.state,
      exitCode: stored.end ? stored.end.exitCode : null,
      startedAt: stored.meta.startedAt,
      endedAt: stored.end ? stored.end.endedAt : null,
      durationMs: Math.max(0, (endedMs ?? Date.now()) - (Number.isFinite(startedMs) ? startedMs : 0)),
      lines: stored.lines.filter((line) => line.n > since),
      next: stored.lines.length === 0 ? 0 : stored.lines[stored.lines.length - 1].n,
      truncated: stored.truncated,
      notes: stored.state === "interrupted" ? [INTERRUPTED_NOTE] : [],
    };
  }

  /** Deja sólo las últimas ejecuciones terminadas, sin tocar la que corre. */
  private trimRuns(): void {
    if (this.runs.size <= MAX_RETAINED_RUNS) return;
    for (const [id, run] of this.runs) {
      if (this.runs.size <= MAX_RETAINED_RUNS) break;
      if (run.state === "running") continue;
      this.runs.delete(id);
    }
  }
}

/** Separa un chunk en líneas completas y el resto sin salto. */
function splitLines(buffer: string, chunk: string): { lines: string[]; rest: string } {
  const combined = buffer + chunk;
  const parts = combined.split("\n");
  const rest = parts.pop() ?? "";
  return {
    lines: parts.map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line)),
    rest,
  };
}

function describeEnd(state: StudioRunState, code: number | null): string {
  if (state === "cancelled") return "Ejecución cancelada.";
  if (state === "done") return "Ejecución terminada con código 0.";
  return `La ejecución falló${code === null ? "." : ` con código ${code}.`}`;
}

function formatMegabytes(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);
  return Number.isInteger(megabytes) ? String(megabytes) : megabytes.toFixed(1);
}
