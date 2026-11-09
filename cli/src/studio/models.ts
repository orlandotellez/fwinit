/**
 * Catálogo de modelos por agente (spec S14).
 *
 * El studio no inventa ids de modelo: los lee del CLI real que va a ejecutar.
 * `pi --list-models` imprime una tabla (`provider model context max-out thinking
 * images`) y `opencode models` una `provider/model` por línea. Gentle Shell
 * envuelve a pi, así que reusa el catálogo de pi en vez de inventar uno propio.
 *
 * Si el comando falla, el catálogo se reporta vacío con el motivo: el panel
 * sólo ofrece el default del agente y el modelo que ya está usando, en vez de
 * recibir una lista de modelos que no existen. El catálogo se cachea por
 * arranque del server para que abrir el panel no dispare un proceso por click.
 *
 * El modelo activo (S15) es otra cosa y se lee aparte, en cada request: pi lo
 * guarda en el `defaultModel` de su settings y Gentle Shell en el suyo
 * (`$GENTLE_SHELL_HOME` o `~/.gentle-shell/agent/settings.json`), que puede
 * diferir del de pi. De esos archivos sale **sólo esa clave**: nunca el archivo
 * entero, nunca credenciales, y un archivo ausente o ilegible es "desconocido",
 * no un error.
 */
import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { dirname, join } from "node:path";
import { normaliseModel, resolveAgentBinary } from "./run.js";
import { resolveSkillTargets } from "./skills.js";
import type { SkillTargetId, StudioModel, StudioModelList } from "./types.js";

/** Argumentos del catálogo por agente: los mismos binarios de la ejecución. */
export const MODEL_LIST_ARGS: Record<SkillTargetId, string[]> = {
  opencode: ["models"],
  pi: ["--list-models"],
  "gentle-shell": ["--list-models"],
};

/**
 * Agente cuyo CLI se consulta para cada agente del panel.
 *
 * Gentle Shell reenvía los flags a pi, así que su tabla es la de pi y no hace
 * falta un segundo proceso para mostrar lo mismo.
 */
export const MODEL_SOURCE_AGENT: Record<SkillTargetId, SkillTargetId> = {
  opencode: "opencode",
  pi: "pi",
  "gentle-shell": "pi",
};

/** Corte del comando de catálogo; un CLI colgado no puede colgar el panel. */
export const MODEL_LIST_TIMEOUT_MS = 5000;

/** Archivo donde pi y Gentle Shell guardan su modelo activo (S15). */
const SETTINGS_FILE = "settings.json";

/**
 * Tope de lectura del settings: interesa una clave, no el archivo entero. Se lee
 * como mucho esto desde el disco y sólo `defaultModel` sobrevive al parseo.
 */
const MAX_SETTINGS_BYTES = 64 * 1024;

/** Columnas de `pi --list-models`, en el orden en que las imprime. */
const PI_COLUMNS = ["provider", "model", "context", "max-out", "thinking", "images"] as const;

/** Posiciones donde empieza cada columna, leídas del header real. */
function columnOffsets(header: string): number[] | null {
  const offsets: number[] = [];
  let cursor = 0;
  for (const column of PI_COLUMNS) {
    const index = header.indexOf(column, cursor);
    if (index === -1) return null;
    offsets.push(index);
    cursor = index + column.length;
  }
  return offsets;
}

function cell(line: string, offsets: number[], index: number): string {
  const start = offsets[index];
  const end = index + 1 < offsets.length ? offsets[index + 1] : line.length;
  return line.slice(start, end).trim();
}

/**
 * Lee la tabla de `pi --list-models`.
 *
 * Usa las posiciones del header, no una separación adivinada: así un modelo con
 * un espacio en el nombre no corre las columnas. El id que se expone es
 * `provider/model`, el mismo formato que documenta `pi --model`.
 */
export function parsePiModelTable(text: string): StudioModel[] {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => columnOffsets(line) !== null);
  if (headerIndex === -1) return [];
  const offsets = columnOffsets(lines[headerIndex]);
  if (!offsets) return [];

  const models: StudioModel[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (line.trim() === "" || /^[\s-]+$/.test(line)) continue;
    const provider = cell(line, offsets, 0);
    const model = cell(line, offsets, 1);
    if (provider === "" || model === "") continue;
    models.push({
      provider,
      model,
      id: `${provider}/${model}`,
      context: cell(line, offsets, 2),
      maxOut: cell(line, offsets, 3),
      thinking: cell(line, offsets, 4).toLowerCase() === "yes",
      images: cell(line, offsets, 5).toLowerCase() === "yes",
    });
  }
  return models;
}

/**
 * Lee la salida de `opencode models`: una `provider/model` por línea.
 *
 * Cualquier línea con espacios, vacía o sin `/` no es un id de modelo y se
 * saltea, igual que el `#variant` de `opencode --model`. Se mantiene tal cual
 * porque es lo que el CLI acepta: `provider/model` (o `provider/model#variant`).
 */
export function parseOpencodeModels(text: string): StudioModel[] {
  const models: StudioModel[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || /\s/.test(line)) continue;
    const slash = line.indexOf("/");
    if (slash <= 0 || slash === line.length - 1) continue;
    const provider = line.slice(0, slash);
    const model = line.slice(slash + 1);
    models.push({ provider, model, id: line });
  }
  return models;
}

export interface ModelCatalogOptions {
  /** Raíz del proyecto: es el `cwd` del comando de catálogo. */
  projectRoot: string;
  /**
   * Home directory override, para tests: el modelo activo sale de ahí y nunca
   * del `$HOME` real. Sin esto se usa `os.homedir()`.
   */
  home?: string;
  /** Binario por agente; gana sobre el nombre del comando y sobre el entorno. */
  agentBinaries?: Partial<Record<SkillTargetId, string>>;
  timeoutMs?: number;
}

export interface ActiveModelOptions {
  /** Raíz del proyecto: `resolveSkillTargets` arma los homes a partir de ella. */
  projectRoot: string;
  /** Home override, para tests; por defecto `os.homedir()`. */
  home?: string;
}

/** El modelo activo de un agente y de dónde salió (S15). */
export interface ActiveModel {
  /** Modelo activo declarado por el agente, o `null` si no se puede saber. */
  current: string | null;
  /** Archivo donde se buscó; `null` cuando el agente no declara modelo. */
  currentSource: string | null;
  /** Motivo por el que `current` es `null`: el panel lo muestra tal cual. */
  currentNote?: string;
}

/**
 * Settings del agente con su modelo activo.
 *
 * Se reusa `resolveSkillTargets` para el home de cada agente, así
 * `GENTLE_SHELL_HOME` redirige esta lectura igual que redirige la instalación.
 * opencode no declara un modelo por defecto en su configuración en esta
 * máquina, así que ahí no hay archivo que leer.
 */
function settingsPathFor(agent: SkillTargetId, options: ActiveModelOptions): string | null {
  if (agent === "opencode") return null;
  const home = resolveSkillTargets({ projectRoot: options.projectRoot, home: options.home }).find(
    (target) => target.id === agent
  );
  if (!home) return null;
  return join(dirname(home.globalDir), SETTINGS_FILE);
}

/**
 * Primeros `MAX_SETTINGS_BYTES` del archivo, o `null` si no se puede leer.
 *
 * Un archivo ausente, un directorio en su lugar o un permiso denegado son todos
 * "desconocido": el studio no distingue para romper el panel.
 */
async function readSettingsHead(path: string): Promise<string | null> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, "r");
    const buffer = Buffer.alloc(MAX_SETTINGS_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_SETTINGS_BYTES, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => {
      // Ya está cerrado: nada que hacer.
    });
  }
}

/**
 * Modelo activo del agente (spec S15), leído de su settings.
 *
 * Del archivo sale **sólo** `defaultModel`: ni credenciales, ni el resto de las
 * claves. Un archivo ausente, un JSON roto o una clave vacía devuelven
 * `current: null` con el motivo, nunca un error y nunca un modelo inventado.
 */
export async function readActiveModel(
  agent: SkillTargetId,
  options: ActiveModelOptions
): Promise<ActiveModel> {
  const path = settingsPathFor(agent, options);
  if (!path) {
    return {
      current: null,
      currentSource: null,
      currentNote:
        "opencode no guarda un modelo por defecto en su configuración: no hay un modelo activo que mostrar.",
    };
  }

  const text = await readSettingsHead(path);
  if (text === null) {
    return { current: null, currentSource: path, currentNote: `No se pudo leer ${path}.` };
  }

  let settings: unknown;
  try {
    settings = JSON.parse(text);
  } catch {
    return { current: null, currentSource: path, currentNote: `${path} no es JSON válido.` };
  }

  const raw =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>).defaultModel
      : undefined;

  let current: string | null = null;
  try {
    // La misma validación que el modelo elegido a mano (S14): si el archivo
    // trae cualquier cosa, el panel muestra "desconocido" en vez de basura.
    current = normaliseModel(raw);
  } catch {
    current = null;
  }

  if (current === null) {
    return {
      current: null,
      currentSource: path,
      currentNote: `${path} no tiene un defaultModel usable.`,
    };
  }

  return { current, currentSource: path };
}

interface CatalogueRun {
  ok: boolean;
  stdout: string;
  error?: string;
}

/** Ejecuta el comando de catálogo sin shell y con tope de tiempo. */
function runCatalogue(binary: string, args: string[], cwd: string, timeoutMs: number): Promise<CatalogueRun> {
  return new Promise<CatalogueRun>((resolveRun) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let child: ReturnType<typeof spawn>;

    const settle = (result: CatalogueRun): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveRun(result);
    };

    const timer = setTimeout(() => {
      try {
        child?.kill("SIGKILL");
      } catch {
        // Ya murió entre el timeout y el kill.
      }
      settle({ ok: false, stdout: "", error: `El catálogo tardó más de ${timeoutMs} ms en responder.` });
    }, timeoutMs);
    timer.unref?.();

    try {
      child = spawn(binary, args, { cwd, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env } });
    } catch (error) {
      settle({ ok: false, stdout: "", error: `No se pudo ejecutar ${binary}: ${(error as Error).message}` });
      return;
    }

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.once("error", (error: Error) => {
      settle({ ok: false, stdout: "", error: `No se pudo ejecutar ${binary}: ${error.message}` });
    });
    child.once("close", (code: number | null) => {
      if (code === 0) {
        settle({ ok: true, stdout });
        return;
      }
      const detail = stderr.trim().split(/\r?\n/)[0] ?? "";
      settle({
        ok: false,
        stdout: "",
        error: detail
          ? `${binary} ${args.join(" ")} falló: ${detail}`
          : `${binary} ${args.join(" ")} terminó con código ${code ?? "—"}.`,
      });
    });
  });
}

/** Catálogo sin el modelo activo: lo único que se cachea por arranque. */
type CatalogueBase = Omit<StudioModelList, "current" | "currentSource" | "currentNote">;

export class ModelCatalog {
  private readonly projectRoot: string;
  private readonly home?: string;
  private readonly agentBinaries?: Partial<Record<SkillTargetId, string>>;
  private readonly timeoutMs: number;
  /** Un catálogo por agente consultado en este arranque del server. */
  private readonly catalogueCache = new Map<SkillTargetId, Promise<CatalogueBase>>();

  constructor(options: ModelCatalogOptions) {
    this.projectRoot = options.projectRoot;
    this.home = options.home;
    this.agentBinaries = options.agentBinaries;
    this.timeoutMs = options.timeoutMs ?? MODEL_LIST_TIMEOUT_MS;
  }

  /**
   * Catálogo del agente más su modelo activo; degrada con `available: false`.
   *
   * El comando del CLI se cachea por arranque (S14), pero el modelo activo se
   * relee en cada request (S15): un cambio hecho por fuera del studio se ve sin
   * reiniciarlo.
   */
  async list(agent: SkillTargetId): Promise<StudioModelList> {
    const [catalogue, active] = await Promise.all([
      this.catalogue(agent),
      readActiveModel(agent, { projectRoot: this.projectRoot, home: this.home }),
    ]);
    return { ...catalogue, ...active };
  }

  private catalogue(agent: SkillTargetId): Promise<CatalogueBase> {
    const cached = this.catalogueCache.get(agent);
    if (cached) return cached;
    const pending = this.load(agent);
    this.catalogueCache.set(agent, pending);
    return pending;
  }

  private async load(agent: SkillTargetId): Promise<CatalogueBase> {
    const source = MODEL_SOURCE_AGENT[agent] ?? agent;
    const args = MODEL_LIST_ARGS[source] ?? MODEL_LIST_ARGS.pi;
    const binary = resolveAgentBinary(source, this.agentBinaries);
    const command = { binary, args: [...args] };
    const result = await runCatalogue(binary, args, this.projectRoot, this.timeoutMs);

    if (!result.ok) {
      return {
        agent,
        source,
        available: false,
        models: [],
        command,
        error: result.error ?? "El catálogo de modelos no está disponible.",
      };
    }

    const models = source === "opencode" ? parseOpencodeModels(result.stdout) : parsePiModelTable(result.stdout);
    if (models.length === 0) {
      return {
        agent,
        source,
        available: false,
        models: [],
        command,
        error: `El catálogo de ${source} no devolvió ningún modelo. Elegí el default del agente o el modelo que ya está usando.`,
      };
    }

    return { agent, source, available: true, models, command };
  }
}

/** `true` para los tres agentes que el panel ofrece. */
export function isModelAgent(value: unknown): value is SkillTargetId {
  return typeof value === "string" && (value === "opencode" || value === "pi" || value === "gentle-shell");
}
