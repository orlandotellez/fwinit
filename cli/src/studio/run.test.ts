import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentInvocation,
  isRunAgent,
  normaliseOutputLine,
  RunError,
  RunManager,
  type RunManagerOptions,
} from "./run.js";
import type { SkillFileRef, StudioRunStatus } from "./types.js";

/**
 * Contratos de ejecución (spec S10) y normalización de la salida (spec S11).
 *
 * Los binarios son scripts fixture en un directorio temporal: ningún test
 * habla con un agente real, ni con un modelo, ni con la red.
 */

let workspace = "";
let home = "";
let projectRoot = "";
const managers: RunManager[] = [];

/** Escribe un script POSIX ejecutable y devuelve su ruta absoluta. */
async function script(name: string, body: string): Promise<string> {
  const path = join(workspace, name);
  await writeFile(path, `#!/bin/sh\n${body}\n`, "utf8");
  await chmod(path, 0o755);
  return path;
}

/** El agente que termina enseguida y cubre todos los tipos de evento. */
const FAST_OUTPUT = [
  `printf '%s\\n' '{"type":"agent_start"}'`,
  `printf '%s\\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hola "}}'`,
  `printf '%s\\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"mundo"}}'`,
  `printf '%s\\n' '{"type":"tool_start","name":"read","path":"SKILL.md"}'`,
  `printf '%s\\n' '{"type":"mystery_event","payload":42}'`,
  `printf '%s\\n' '{"type":"message_end","message":{"role":"assistant","stopReason":"end_turn"}}'`,
  `exit 0`,
].join("\n");

/** El agente que sigue vivo hasta que lo matan (para cancelar). */
const SLOW_OUTPUT = [
  `printf '%s\\n' '{"type":"agent_start"}'`,
  `exec sleep 30`,
].join("\n");

const piSkill: SkillFileRef = { target: "pi", scope: "global", name: "create-specs" };

function managerWith(overrides: Partial<RunManagerOptions> = {}): RunManager {
  const manager = new RunManager({
    projectRoot,
    home,
    flushMs: 5,
    cancelGraceMs: 500,
    ...overrides,
  });
  managers.push(manager);
  return manager;
}

/** Espera a que la ejecución salga de `running`, con tope de tiempo. */
async function waitForIdle(manager: RunManager, id: string): Promise<StudioRunStatus> {
  const deadline = Date.now() + 5000;
  for (;;) {
    const status = manager.poll(id, 0);
    if (!status) throw new Error(`la ejecución ${id} desapareció`);
    if (status.state !== "running") return status;
    if (Date.now() > deadline) throw new Error("la ejecución no terminó a tiempo");
    await Bun.sleep(20);
  }
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-run-"));
  home = join(workspace, "home");
  projectRoot = join(workspace, "project");
  await mkdir(join(home, ".pi", "agent", "skills", "create-specs"), { recursive: true });
  await writeFile(
    join(home, ".pi", "agent", "skills", "create-specs", "SKILL.md"),
    "---\nname: create-specs\n---\n",
    "utf8"
  );
  await mkdir(projectRoot, { recursive: true });
});

afterEach(async () => {
  for (const manager of managers.splice(0)) manager.dispose();
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("agent invocation contracts", () => {
  const options = { skillDir: "/tmp/skills/create-specs", prompt: "creá las specs de una app de turnos" };

  test("pin the pi argument list from S10", () => {
    expect(buildAgentInvocation("pi", options)).toEqual({
      binary: "pi",
      args: [
        "--print",
        "--mode",
        "json",
        "--skill",
        "/tmp/skills/create-specs",
        "-a",
        "--no-session",
        "creá las specs de una app de turnos",
      ],
    });
  });

  test("gentle-shell reenvía exactamente los mismos argumentos que pi", () => {
    expect(buildAgentInvocation("gentle-shell", options)).toEqual({
      binary: "gentle-shell",
      args: [
        "--print",
        "--mode",
        "json",
        "--skill",
        "/tmp/skills/create-specs",
        "-a",
        "--no-session",
        "creá las specs de una app de turnos",
      ],
    });
  });

  test("opencode ejecuta sin flag de skill, con el prompt como argumento", () => {
    const command = buildAgentInvocation("opencode", options);

    expect(command).toEqual({
      binary: "opencode",
      args: ["run", "--auto", "creá las specs de una app de turnos"],
    });
    // Sin shell de por medio: cada argumento viaja entero, aunque tenga espacios.
    expect(command.args.some((arg) => arg.includes("--skill"))).toBe(false);
  });

  test("un binario explícito o del entorno reemplaza al del PATH", () => {
    expect(buildAgentInvocation("pi", { ...options, binary: "/tmp/fixture" }).binary).toBe(
      "/tmp/fixture"
    );
    process.env.FWINIT_STUDIO_BIN_PI = "/tmp/desde-el-entorno";
    try {
      expect(buildAgentInvocation("pi", options).binary).toBe("/tmp/desde-el-entorno");
    } finally {
      delete process.env.FWINIT_STUDIO_BIN_PI;
    }
  });

  test("rechaza un agente que no es opencode, pi ni gentle-shell", () => {
    expect(isRunAgent("pi")).toBe(true);
    expect(isRunAgent("agents")).toBe(false);
    expect(() =>
      buildAgentInvocation("agents" as unknown as "pi", options)
    ).toThrow(RunError);
  });
});

describe("output normalisation", () => {
  test("el texto en streaming se acumula como una sola línea de texto", () => {
    const first = normaliseOutputLine(
      '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hola "}}'
    );
    const second = normaliseOutputLine(
      '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"mundo"}}'
    );

    expect(first).toEqual({ kind: "text", text: "hola ", append: true });
    expect(second).toEqual({ kind: "text", text: "mundo", append: true });
  });

  test("message_end se presenta como estado con su stopReason", () => {
    expect(
      normaliseOutputLine(
        '{"type":"message_end","message":{"role":"assistant","stopReason":"end_turn"}}'
      )
    ).toEqual({ kind: "status", text: "turno terminado · end_turn", append: false });
  });

  test("un evento de herramienta se presenta como actividad", () => {
    expect(normaliseOutputLine('{"type":"tool_start","name":"read"}')).toEqual({
      kind: "tool",
      text: "read",
      append: false,
    });
  });

  test("una línea JSONL desconocida sobrevive como línea cruda", () => {
    const line = '{"type":"mystery_event","payload":42}';

    expect(normaliseOutputLine(line)).toEqual({ kind: "raw", text: line, append: false });
  });

  test("una línea que no es JSON también se conserva", () => {
    expect(normaliseOutputLine("texto suelto del agente")).toEqual({
      kind: "raw",
      text: "texto suelto del agente",
      append: false,
    });
  });

  test("en modo texto (opencode) cada línea es prosa, no cruda", () => {
    expect(normaliseOutputLine("Listo: creé specs/", { format: "text" })).toEqual({
      kind: "text",
      text: "Listo: creé specs/",
      append: false,
    });
  });

  test("las líneas vacías no generan nada", () => {
    expect(normaliseOutputLine("")).toBeNull();
    expect(normaliseOutputLine("   ")).toBeNull();
  });
});

describe("run manager", () => {
  test("llega a done con las líneas en orden y numeradas", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    expect(started.state).toBe("running");
    expect(started.next).toBe(0);

    const finished = await waitForIdle(manager, started.id);

    expect(finished.state).toBe("done");
    expect(finished.exitCode).toBe(0);
    expect(finished.lines.map((line) => line.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(finished.lines.map((line) => line.kind)).toEqual([
      "status",
      "text",
      "tool",
      "raw",
      "status",
      "status",
    ]);
    // Los dos deltas llegaron como una sola línea de texto.
    expect(finished.lines[1].text).toBe("hola mundo");
    // Lo que no se entiende queda como estaba, no se descarta.
    expect(finished.lines[3].text).toBe('{"type":"mystery_event","payload":42}');
  });

  test("`since` devuelve sólo las líneas nuevas y un cursor mayor", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    const finished = await waitForIdle(manager, started.id);

    const fromZero = manager.poll(started.id, 0);
    const fromTwo = manager.poll(started.id, 2);

    expect(fromZero?.lines.map((line) => line.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(fromTwo?.lines.map((line) => line.n)).toEqual([3, 4, 5, 6]);
    expect(fromTwo?.next).toBe(finished.next);
    // Un cursor más grande que todo lo emitido no inventa líneas.
    expect(manager.poll(started.id, 99)?.lines).toEqual([]);
  });

  test("cancelar termina la ejecución como cancelled", async () => {
    const manager = managerWith({
      agentBinaries: { "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT) },
      cancelGraceMs: 300,
    });
    const started = await manager.start({
      agent: "gentle-shell",
      skill: piSkill,
      prompt: "tarda",
    });

    expect(started.state).toBe("running");
    const cancelled = await manager.cancel(started.id);

    expect(cancelled?.state).toBe("cancelled");
    expect(cancelled?.exitCode).toBeNull();
    expect(manager.poll(started.id, 0)?.state).toBe("cancelled");
  });

  test("no arranca una segunda ejecución mientras corre la primera", async () => {
    const manager = managerWith({
      agentBinaries: {
        "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT),
        pi: await script("pi-fast.sh", FAST_OUTPUT),
      },
    });
    const started = await manager.start({ agent: "gentle-shell", skill: piSkill, prompt: "tarda" });

    await expect(manager.start({ agent: "pi", skill: piSkill, prompt: "otra" })).rejects.toThrow(
      RunError
    );
    await manager.cancel(started.id);
  });

  test("rechaza un nombre que intentaría salir del directorio de skills", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    await expect(
      manager.start({
        agent: "pi",
        skill: { target: "pi", scope: "global", name: "../evil" },
        prompt: "x",
      })
    ).rejects.toThrow(RunError);
  });

  test("rechaza una skill que no está instalada", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    await expect(
      manager.start({
        agent: "pi",
        skill: { target: "pi", scope: "global", name: "no-existe" },
        prompt: "x",
      })
    ).rejects.toThrow(RunError);
  });

  test("opencode se rechaza si la skill no es descubrible por opencode", async () => {
    const manager = managerWith({ agentBinaries: { opencode: await script("oc.sh", FAST_OUTPUT) } });

    await expect(
      manager.start({ agent: "opencode", skill: piSkill, prompt: "x" })
    ).rejects.toThrow(RunError);
  });

  test("el agente corre con la raíz del proyecto como cwd (S12)", async () => {
    const binary = await script(
      "pi-cwd.sh",
      [
        `printf '{"type":"cwd_probe","cwd":"%s"}\\n' "$(pwd -P)"`,
        `exit 0`,
      ].join("\n")
    );
    const manager = managerWith({ agentBinaries: { pi: binary } });

    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    const finished = await waitForIdle(manager, started.id);

    // La ruta de la skill la resuelve el server; el cwd es siempre el proyecto.
    expect(finished.lines[0].kind).toBe("raw");
    expect(finished.lines[0].text).toContain(`"cwd":"${projectRoot}"`);
  });

  test("el binario del entorno ejecuta el fixture cuando no hay opción explícita", async () => {
    const binary = await script("pi-env.sh", FAST_OUTPUT);
    process.env.FWINIT_STUDIO_BIN_PI = binary;
    try {
      const manager = new RunManager({ projectRoot, home, flushMs: 5 });
      managers.push(manager);

      const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
      expect(started.command.binary).toBe(binary);
      expect((await waitForIdle(manager, started.id)).state).toBe("done");
    } finally {
      delete process.env.FWINIT_STUDIO_BIN_PI;
    }
  });

  test("dispose mata la ejecución en curso", async () => {    const manager = managerWith({
      agentBinaries: { "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT) },
      cancelGraceMs: 200,
    });
    const started = await manager.start({ agent: "gentle-shell", skill: piSkill, prompt: "x" });

    manager.dispose();

    const after = await waitForIdle(manager, started.id);
    expect(after.state).toBe("cancelled");
  });
});
