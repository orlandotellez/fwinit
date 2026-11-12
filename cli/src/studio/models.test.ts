import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  MODEL_LIST_ARGS,
  ModelCatalog,
  parseOpencodeModels,
  parsePiModelTable,
  type ModelCatalogOptions,
} from "./models.js";

/**
 * Catálogo de modelos por agente (spec S14).
 *
 * Los parsers se prueban contra fixtures copiados de la salida real de `pi
 * --list-models` y `opencode models`, y el catálogo contra scripts fixture: en
 * ningún test se ejecuta un agente de verdad.
 *
 * El modelo activo (S15) se lee de un home temporal armado en el workspace, así
 * que ningún test toca el `$HOME` real ni el `settings.json` de verdad.
 */

const FIXTURES = join(import.meta.dir, "fixtures");

const SAVED_GENTLE_SHELL_HOME = process.env.GENTLE_SHELL_HOME;

let workspace = "";
let projectRoot = "";
let home = "";

async function fixture(name: string): Promise<string> {
  return readFile(join(FIXTURES, name), "utf8");
}

async function script(name: string, body: string): Promise<string> {
  const path = join(workspace, name);
  await writeFile(path, `#!/bin/sh\n${body}\n`, "utf8");
  await chmod(path, 0o755);
  return path;
}

function catalogWith(options: Partial<ModelCatalogOptions> = {}): ModelCatalog {
  // `home` siempre apunta al workspace: ningún test lee el `$HOME` real (S15).
  return new ModelCatalog({ projectRoot, home, timeoutMs: 4000, ...options });
}

/** Escribe un settings dentro del home temporal y devuelve su ruta absoluta. */
async function settings(relativePath: string, body: unknown): Promise<string> {
  const path = join(home, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof body === "string" ? body : JSON.stringify(body), "utf8");
  return path;
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-models-"));
  projectRoot = workspace;
  home = join(workspace, "home");
  await mkdir(home, { recursive: true });
  // `resolveSkillTargets` honra GENTLE_SHELL_HOME sobre `home`: limpiarlo es lo
  // que mantiene el hogar de gentle-shell dentro del fixture.
  delete process.env.GENTLE_SHELL_HOME;
});

afterEach(async () => {
  if (SAVED_GENTLE_SHELL_HOME === undefined) delete process.env.GENTLE_SHELL_HOME;
  else process.env.GENTLE_SHELL_HOME = SAVED_GENTLE_SHELL_HOME;
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("model catalogue parsing", () => {
  test("lee la tabla real de pi --list-models por las columnas del header", async () => {
    const models = parsePiModelTable(await fixture("pi-list-models.txt"));

    expect(models).toHaveLength(5);
    expect(models[0]).toEqual({
      provider: "opencode-go",
      model: "beam-free",
      id: "opencode-go/beam-free",
      context: "1.0M",
      maxOut: "131.1K",
      thinking: true,
      images: false,
    });
    // Un modelo con otro provider y con imágenes sigue leyéndose bien.
    const sonnet = models.find((model) => model.model === "claude-sonnet-5");
    expect(sonnet).toMatchObject({
      provider: "anthropic",
      id: "anthropic/claude-sonnet-5",
      context: "1M",
      maxOut: "128K",
      thinking: true,
      images: true,
    });
    // La cabecera no es un modelo.
    expect(models.map((model) => model.id)).not.toContain("provider/model");
  });

  test("lee la salida de opencode models, una provider/model por línea", async () => {
    const models = parseOpencodeModels(await fixture("opencode-models.txt"));

    expect(models.map((model) => model.id)).toEqual([
      "opencode/beam-free",
      "opencode/claude-sonnet-5",
      "opencode-go/deepseek-v4-pro",
      "anthropic/claude-haiku-4-5",
    ]);
    expect(models[2]).toMatchObject({ provider: "opencode-go", model: "deepseek-v4-pro" });
  });

  test("ignora líneas vacías y texto que no es un id de modelo", () => {
    expect(parseOpencodeModels("\n\nproveedor sin modelo\n\nopencode/beam-free\n")).toEqual([
      { provider: "opencode", model: "beam-free", id: "opencode/beam-free" },
    ]);
    expect(parsePiModelTable("")).toEqual([]);
    expect(parsePiModelTable("no es una tabla")).toEqual([]);
  });
});

describe("model catalogue per agent", () => {
  test("pi lee su tabla con --list-models y cachea por arranque del server", async () => {
    const table = join(FIXTURES, "pi-list-models.txt");
    const counter = join(workspace, "calls.txt");
    const pi = await script(
      "pi-models.sh",
      [`printf '%s\\n' llamada >> "${counter}"`, `cat "${table}"`, `exit 0`].join("\n")
    );
    const catalog = catalogWith({ agentBinaries: { pi } });

    const first = await catalog.list("pi");
    const second = await catalog.list("pi");

    expect(first.available).toBe(true);
    expect(first.source).toBe("pi");
    expect(first.models).toHaveLength(5);
    expect(first.command).toEqual({ binary: pi, args: ["--list-models"] });
    expect(MODEL_LIST_ARGS.pi).toEqual(["--list-models"]);
    // El catálogo se cachea, pero el modelo activo se relee en cada request
    // (S15): por eso la respuesta es un objeto nuevo con la misma tabla.
    expect(second.models).toEqual(first.models);
    // Se ejecutó una sola vez: el catálogo se cachea por server.
    expect((await readFile(counter, "utf8")).trim().split("\n")).toHaveLength(1);
  });

  test("opencode lee models y gentle-shell reusa el catálogo de pi", async () => {
    const lines = join(FIXTURES, "opencode-models.txt");
    const table = join(FIXTURES, "pi-list-models.txt");
    const opencode = await script("oc-models.sh", `cat "${lines}"\nexit 0`);
    const pi = await script("pi-models.sh", `cat "${table}"\nexit 0`);
    const catalog = catalogWith({ agentBinaries: { opencode, pi } });

    const open = await catalog.list("opencode");
    const gentle = await catalog.list("gentle-shell");

    expect(open.available).toBe(true);
    expect(open.source).toBe("opencode");
    expect(open.command).toEqual({ binary: opencode, args: ["models"] });
    expect(open.models.map((model) => model.id)).toContain("opencode/beam-free");

    // gentle-shell envuelve a pi: mismo catálogo, con pi como fuente.
    expect(gentle.available).toBe(true);
    expect(gentle.source).toBe("pi");
    expect(gentle.command).toEqual({ binary: pi, args: ["--list-models"] });
    expect(gentle.models).toEqual((await catalog.list("pi")).models);
    expect(MODEL_LIST_ARGS["gentle-shell"]).toEqual(["--list-models"]);
  });

  test("un comando de catálogo que falla degrada en vez de tirar", async () => {
    const failing = await script(
      "pi-broken.sh",
      [`printf '%s\\n' "no hay proveedores configurados" >&2`, `exit 3`].join("\n")
    );
    const empty = await script("pi-empty.sh", "exit 0");
    const catalog = catalogWith({ agentBinaries: { pi: failing } });

    const failed = await catalog.list("pi");
    expect(failed.available).toBe(false);
    expect(failed.models).toEqual([]);
    expect(failed.error).toContain("no hay proveedores configurados");
    expect(failed.command).toEqual({ binary: failing, args: ["--list-models"] });

    const nothing = await catalogWith({ agentBinaries: { pi: empty } }).list("pi");
    expect(nothing.available).toBe(false);
    expect(nothing.models).toEqual([]);
    expect(nothing.error).toBeTruthy();
  });

  test("un binario que no existe también degrada, con el motivo", async () => {
    const catalog = catalogWith({ agentBinaries: { opencode: join(workspace, "no-existe") } });

    const report = await catalog.list("opencode");

    expect(report.available).toBe(false);
    expect(report.models).toEqual([]);
    expect(report.error).toContain("no-existe");
  });
});

/**
 * Modelo activo por agente (spec S15).
 *
 * pi guarda su `defaultModel` en `~/.pi/agent/settings.json` y Gentle Shell en
 * el suyo (`$GENTLE_SHELL_HOME` o `~/.gentle-shell/agent/settings.json`): son
 * archivos distintos y pueden decir cosas distintas. opencode no declara un
 * modelo por defecto en su configuración, así que ahí el studio no inventa uno.
 */
describe("active model per agent (S15)", () => {
  const PI_TABLE = join(FIXTURES, "pi-list-models.txt");
  const OC_LINES = join(FIXTURES, "opencode-models.txt");

  async function piBinary(): Promise<string> {
    return script("pi-models.sh", `cat "${PI_TABLE}"\nexit 0`);
  }

  test("pi y gentle-shell leen su propio defaultModel, cada uno de su home", async () => {
    const pi = await piBinary();
    const piSettings = await settings(".pi/agent/settings.json", {
      defaultModel: "anthropic/claude-sonnet-5",
      apiKey: "sk-no-tiene-que-salir",
    });
    const gentleSettings = await settings(".gentle-shell/agent/settings.json", {
      defaultModel: "opencode-go/beam-free",
    });
    const catalog = catalogWith({ agentBinaries: { pi } });

    const piReport = await catalog.list("pi");
    const gentleReport = await catalog.list("gentle-shell");

    expect(piReport.current).toBe("anthropic/claude-sonnet-5");
    expect(piReport.currentSource).toBe(piSettings);
    // Gentle Shell es otro archivo: no hereda el default de pi.
    expect(gentleReport.current).toBe("opencode-go/beam-free");
    expect(gentleReport.currentSource).toBe(gentleSettings);
    expect(gentleReport.currentSource).not.toBe(piReport.currentSource);
    // Del settings sólo sale la clave del modelo: nunca el resto del archivo.
    expect(JSON.stringify(piReport)).not.toContain("sk-no-tiene-que-salir");
  });

  test("GENTLE_SHELL_HOME redirige el home de gentle-shell y no el de pi", async () => {
    const pi = await piBinary();
    const piSettings = await settings(".pi/agent/settings.json", {
      defaultModel: "anthropic/claude-sonnet-5",
    });
    const gentleHome = join(workspace, "gentle-home");
    await mkdir(gentleHome, { recursive: true });
    const gentleSettings = join(gentleHome, "settings.json");
    await writeFile(gentleSettings, JSON.stringify({ defaultModel: "opencode/beam-free" }), "utf8");
    process.env.GENTLE_SHELL_HOME = gentleHome;
    const catalog = catalogWith({ agentBinaries: { pi } });

    const gentleReport = await catalog.list("gentle-shell");
    const piReport = await catalog.list("pi");

    expect(gentleReport.current).toBe("opencode/beam-free");
    expect(gentleReport.currentSource).toBe(gentleSettings);
    expect(piReport.current).toBe("anthropic/claude-sonnet-5");
    expect(piReport.currentSource).toBe(piSettings);
  });

  test("un settings ausente, sin la clave o ilegible degrada a null con el motivo", async () => {
    const pi = await piBinary();
    const catalog = catalogWith({ agentBinaries: { pi } });
    const expectedPath = join(home, ".pi", "agent", "settings.json");

    // Archivo ausente: desconocido, no un error, y el catálogo sigue disponible.
    const missing = await catalog.list("pi");
    expect(missing.current).toBeNull();
    expect(missing.currentSource).toBe(expectedPath);
    expect(missing.currentNote).toContain("No se pudo leer");
    expect(missing.available).toBe(true);

    // JSON válido sin la clave.
    await settings(".pi/agent/settings.json", { theme: "dark", apiKey: "sk-oculto" });
    const noKey = await catalog.list("pi");
    expect(noKey.current).toBeNull();
    expect(noKey.currentNote).toBeTruthy();
    expect(JSON.stringify(noKey)).not.toContain("sk-oculto");

    // JSON roto.
    await settings(".pi/agent/settings.json", "{ esto no es json");
    const broken = await catalog.list("pi");
    expect(broken.current).toBeNull();
    expect(broken.currentNote).toBeTruthy();

    // Clave presente pero inutilizable: vacía, con espacios o de otro tipo.
    await settings(".pi/agent/settings.json", { defaultModel: "   " });
    expect((await catalog.list("pi")).current).toBeNull();
    await settings(".pi/agent/settings.json", { defaultModel: 42 });
    expect((await catalog.list("pi")).current).toBeNull();
    await settings(".pi/agent/settings.json", { defaultModel: "a\u0007b" });
    expect((await catalog.list("pi")).current).toBeNull();
  });

  test("un settings que no se puede leer como archivo también degrada", async () => {
    const pi = await piBinary();
    // Un directorio en el lugar del archivo: abrirlo para leer falla.
    await mkdir(join(home, ".pi", "agent", "settings.json"), { recursive: true });
    const catalog = catalogWith({ agentBinaries: { pi } });

    const report = await catalog.list("pi");

    expect(report.current).toBeNull();
    expect(report.currentNote).toContain("No se pudo leer");
    expect(report.available).toBe(true);
    expect(report.models.length).toBeGreaterThan(0);
  });

  test("opencode no declara modelo activo y aun así responde sin fallar", async () => {
    const opencode = await script("oc-models.sh", `cat "${OC_LINES}"\nexit 0`);
    const catalog = catalogWith({ agentBinaries: { opencode } });

    const report = await catalog.list("opencode");

    expect(report.available).toBe(true);
    expect(report.error).toBeUndefined();
    expect(report.models.length).toBeGreaterThan(0);
    expect(report.current).toBeNull();
    expect(report.currentSource).toBeNull();
    expect(report.currentNote).toBeTruthy();
  });

  test("el activo se relee en cada request aunque el catálogo se cachee", async () => {
    const counter = join(workspace, "calls.txt");
    const pi = await script(
      "pi-models.sh",
      [`printf '%s\\n' llamada >> "${counter}"`, `cat "${PI_TABLE}"`, `exit 0`].join("\n")
    );
    const catalog = catalogWith({ agentBinaries: { pi } });

    await settings(".pi/agent/settings.json", { defaultModel: "anthropic/claude-sonnet-5" });
    const first = await catalog.list("pi");
    // Cambio hecho por fuera, entre dos requests del panel.
    await settings(".pi/agent/settings.json", { defaultModel: "opencode-go/beam-free" });
    const second = await catalog.list("pi");

    expect(first.current).toBe("anthropic/claude-sonnet-5");
    expect(second.current).toBe("opencode-go/beam-free");
    // El catálogo sigue saliendo una sola vez del CLI: sólo el activo se relee.
    expect((await readFile(counter, "utf8")).trim().split("\n")).toHaveLength(1);
  });
});
