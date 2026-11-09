import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RUN_STORE_LIMITS,
  RunStore,
  runFilePath,
  runsDir,
  summarise,
  type RunMetaRecord,
  type RunStoreOptions,
} from "./run-store.js";

/**
 * Persistencia en disco de las ejecuciones (spec S13).
 *
 * Todo vive en un directorio temporal: ningún test escribe en el proyecto real
 * ni en el home del usuario. Los tiempos arrancan en una base fija para que el
 * orden del historial y la retención sean deterministas.
 */

let workspace = "";
let projectRoot = "";
let clock = 0;

function nextIso(): string {
  clock += 1000;
  return new Date(Date.UTC(2026, 0, 1) + clock).toISOString();
}

function metaFor(id: string, extra: Partial<RunMetaRecord> = {}): RunMetaRecord {
  return {
    type: "meta",
    id,
    agent: "pi",
    skill: { target: "pi", scope: "global", name: "create-specs" },
    model: "anthropic/claude-sonnet-5",
    prompt: "creá las specs de una app de turnos",
    command: { binary: "pi", args: ["--print", "--mode", "json", "--skill", "/tmp/x"] },
    startedAt: nextIso(),
    ...extra,
  };
}

function storeWith(options: Partial<RunStoreOptions> = {}): RunStore {
  return new RunStore({ projectRoot, ...options });
}

/** Una ejecución completa (meta, dos líneas y cierre) escrita por el store. */
function seedRun(store: RunStore, id: string, state: "done" | "failed" = "done"): void {
  store.begin(metaFor(id));
  store.appendLine(id, { n: 1, kind: "text", text: `hola ${id}` });
  store.appendLine(id, { n: 2, kind: "tool", text: "read" });
  store.end(id, { state, exitCode: state === "done" ? 0 : 2, endedAt: nextIso(), truncated: false });
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-store-"));
  projectRoot = join(workspace, "project");
  await mkdir(projectRoot, { recursive: true });
  clock = 0;
});

afterEach(async () => {
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("run store", () => {
  test("escribe meta, líneas y cierre, y los relee en el mismo orden", async () => {
    const store = storeWith();
    const id = "0123456789abcdef";

    store.begin(metaFor(id));
    store.appendLine(id, { n: 1, kind: "text", text: "hola mundo" });
    store.appendLine(id, { n: 2, kind: "tool", text: "read" });
    store.end(id, { state: "done", exitCode: 0, endedAt: nextIso(), truncated: false });

    // Un archivo JSONL por ejecución, dentro de la carpeta del studio.
    const file = join(runsDir(projectRoot), `${id}.jsonl`);
    expect(existsSync(file)).toBe(true);
    const records = (await readFile(file, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(records[0]).toMatchObject({
      type: "meta",
      id,
      agent: "pi",
      skill: { target: "pi", scope: "global", name: "create-specs" },
      model: "anthropic/claude-sonnet-5",
      prompt: "creá las specs de una app de turnos",
      command: { binary: "pi" },
    });
    expect(typeof records[0].startedAt).toBe("string");
    expect(records[1]).toMatchObject({ type: "line", n: 1, kind: "text", text: "hola mundo" });
    expect(typeof records[1].at).toBe("string");
    expect(records[2]).toMatchObject({ type: "line", n: 2, kind: "tool", text: "read" });
    expect(records[3]).toMatchObject({ type: "end", state: "done", exitCode: 0, truncated: false });
    expect(typeof records[3].endedAt).toBe("string");
    expect(records).toHaveLength(4);

    const stored = store.read(id);
    expect(stored?.lines).toEqual([
      { n: 1, kind: "text", text: "hola mundo" },
      { n: 2, kind: "tool", text: "read" },
    ]);
    expect(stored?.state).toBe("done");
    expect(stored?.meta.prompt).toBe("creá las specs de una app de turnos");
    expect(stored?.bytes).toBeGreaterThan(0);
  });

  test("la carpeta se auto-ignora con .fwinit/.gitignore y no toca el del usuario", async () => {
    const store = storeWith();
    seedRun(store, "aaaaaaaaaaaaaaaa");

    expect(await readFile(join(projectRoot, ".fwinit", ".gitignore"), "utf8")).toBe("*\n");
    // El .gitignore del proyecto es del usuario: el studio no lo escribe.
    expect(existsSync(join(projectRoot, ".gitignore"))).toBe(false);
  });

  test("un archivo con meta y sin cierre se reporta como interrupted", async () => {
    const dir = runsDir(projectRoot);
    await mkdir(dir, { recursive: true });
    const id = "bbbbbbbbbbbbbbbb";
    const records = [
      metaFor(id),
      { type: "line", n: 1, kind: "text", text: "quedó a medias", at: nextIso() },
    ];
    await writeFile(join(dir, `${id}.jsonl`), `${records.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");

    const stored = storeWith().read(id);

    expect(stored?.state).toBe("interrupted");
    expect(stored?.end).toBeNull();
    expect(stored?.lines).toEqual([{ n: 1, kind: "text", text: "quedó a medias" }]);
    // El historial lo resume igual, pero nunca como `running`.
    const summary = summarise(storeWith().list()[0], true);
    expect(summary.state).toBe("interrupted");
    expect(summary.endedAt).toBeNull();
    expect(summary.lineCount).toBe(1);
  });

  test("el listado va de la ejecución más nueva a la más vieja", () => {
    const store = storeWith();
    seedRun(store, "1111111111111111");
    seedRun(store, "2222222222222222");
    seedRun(store, "3333333333333333", "failed");

    const list = store.list();

    expect(list.map((run) => run.meta.id)).toEqual([
      "3333333333333333",
      "2222222222222222",
      "1111111111111111",
    ]);
    expect(summarise(list[0], true)).toMatchObject({
      agent: "pi",
      model: "anthropic/claude-sonnet-5",
      state: "failed",
      exitCode: 2,
      lineCount: 2,
      truncated: false,
      fromDisk: true,
    });
    expect(summarise(list[0], true).skill.name).toBe("create-specs");
  });

  test("la retención conserva los últimos N y borra los más viejos", async () => {
    expect(RUN_STORE_LIMITS).toEqual({ maxRuns: 50, maxBytes: 20 * 1024 * 1024 });
    const store = storeWith({ maxRuns: 2 });

    seedRun(store, "aaaaaaaaaaaaaaa1");
    seedRun(store, "aaaaaaaaaaaaaaa2");
    seedRun(store, "aaaaaaaaaaaaaaa3");

    const files = (await readdir(runsDir(projectRoot))).sort();
    expect(files).toEqual(["aaaaaaaaaaaaaaa2.jsonl", "aaaaaaaaaaaaaaa3.jsonl"]);
    expect(store.read("aaaaaaaaaaaaaaa1")).toBeNull();
  });

  test("la retención respeta el tope de bytes borrando primero lo más viejo", async () => {
    const big = "x".repeat(900);
    const store = storeWith({ maxBytes: 2500 });

    for (const id of ["bbbbbbbbbbbbbbb1", "bbbbbbbbbbbbbbb2", "bbbbbbbbbbbbbbb3"]) {
      store.begin(metaFor(id));
      store.appendLine(id, { n: 1, kind: "text", text: big });
      store.end(id, { state: "done", exitCode: 0, endedAt: nextIso(), truncated: false });
    }

    const files = (await readdir(runsDir(projectRoot))).sort();

    // Cada archivo ronda el kilobyte: con 2.5 KB de tope sólo sobreviven los dos últimos.
    expect(files).toEqual(["bbbbbbbbbbbbbbb2.jsonl", "bbbbbbbbbbbbbbb3.jsonl"]);
  });

  test("una línea rota no borra el resto del archivo", async () => {
    const dir = runsDir(projectRoot);
    await mkdir(dir, { recursive: true });
    const id = "cccccccccccccccc";
    const text = [
      JSON.stringify(metaFor(id)),
      JSON.stringify({ type: "line", n: 1, kind: "text", text: "uno", at: nextIso() }),
      "{ esto no es json",
      JSON.stringify({ type: "line", n: 2, kind: "text", text: "dos", at: nextIso() }),
      JSON.stringify({ type: "end", state: "done", exitCode: 0, endedAt: nextIso(), truncated: true }),
    ].join("\n");
    await writeFile(join(dir, `${id}.jsonl`), `${text}\n`, "utf8");

    const stored = storeWith().read(id);

    expect(stored?.lines.map((line) => line.text)).toEqual(["uno", "dos"]);
    expect(stored?.truncated).toBe(true);
  });

  test("un id con separadores o puntos no sale de la carpeta de ejecuciones", () => {
    expect(runFilePath(projectRoot, "../../evil")).toBeNull();
    expect(runFilePath(projectRoot, "a.b")).toBeNull();
    expect(runFilePath(projectRoot, "con espacio")).toBeNull();
    expect(runFilePath(projectRoot, "")).toBeNull();

    const inside = runFilePath(projectRoot, "0123456789abcdef");
    expect(inside).toBe(join(runsDir(projectRoot), "0123456789abcdef.jsonl"));

    const store = storeWith();
    expect(store.read("../../evil")).toBeNull();
    expect(store.read("a.b")).toBeNull();
  });
});
