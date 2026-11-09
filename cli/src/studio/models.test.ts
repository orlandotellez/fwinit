import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
 */

const FIXTURES = join(import.meta.dir, "fixtures");

let workspace = "";
let projectRoot = "";

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
  return new ModelCatalog({ projectRoot, timeoutMs: 4000, ...options });
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-models-"));
  projectRoot = workspace;
});

afterEach(async () => {
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
    expect(second).toBe(first);
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
