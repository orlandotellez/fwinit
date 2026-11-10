import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildAgentInvocation,
  CANCEL_FAILED_MESSAGE,
  isRunAgent,
  normaliseOutputLine,
  RunError,
  RunManager,
  studioSessionName,
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

/** El id de sesión que pi informa en el primer evento de su JSONL (S17). */
const SESSION_ID = "01936f5e-7a1b-7d3c-9f00-2c9a1d4e5b60";

/** Salida con el encabezado de sesión: es la primera línea de `--mode json`. */
const SESSION_OUTPUT = [
  `printf '%s\\n' '{"type":"session","version":3,"id":"${SESSION_ID}","cwd":"/tmp/proyecto"}'`,
  `printf '%s\\n' '{"type":"agent_start"}'`,
  `exit 0`,
].join("\n");

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

/**
 * El agente que deja un nieto trabajando, como opencode con su servidor propio
 * o un `bash` que abrió pi (S20).
 *
 * Escribe el pid del nieto dentro del proyecto temporal y después duerme, así
 * el test puede comprobar que la cancelación alcanzó también al nieto.
 */
const GRANDCHILD_OUTPUT = [
  `sleep 30 &`,
  `echo $! > grandchild.pid`,
  `printf '%s\\n' '{"type":"agent_start"}'`,
  `exec sleep 30`,
].join("\n");

/**
 * Igual que el anterior, pero con la sesión y algo de prosa ya emitida: sirve
 * para probar que cancelar conserva la salida parcial y el id de sesión (S20).
 */
const GRANDCHILD_SESSION_OUTPUT = [
  `printf '%s\\n' '{"type":"session","version":3,"id":"${SESSION_ID}"}'`,
  `printf '%s\\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"voy escribiendo specs"}}'`,
  `printf '%s\\n' '{"type":"message_end","message":{"stopReason":"end_turn"}}'`,
  `sleep 30 &`,
  `echo $! > grandchild.pid`,
  `exec sleep 30`,
].join("\n");

/** El agente que ignora SIGTERM: obliga a escalar a SIGKILL para detenerlo. */
const STUBBORN_OUTPUT = [
  `trap '' TERM`,
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

/**
 * True mientras el pid exista y no esté sólo como zombi (S20).
 *
 * `kill(pid, 0)` responde también por un proceso ya muerto que nadie enterró;
 * `/proc/<pid>/stat` distingue ese caso y, sin `/proc` (macOS), basta con que el
 * pid siga respondiendo.
 */
async function processAlive(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  try {
    const stat = await readFile(`/proc/${pid}/stat`, "utf8");
    const state = /\)\s+(\S)/.exec(stat)?.[1] ?? "";
    return state !== "Z";
  } catch {
    return true;
  }
}

/** Espera a que el pid desaparezca; false si sigue vivo al vencer el plazo. */
async function waitForProcessGone(pid: number, timeoutMs = 5000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (!(await processAlive(pid))) return true;
    if (Date.now() > deadline) return false;
    await Bun.sleep(20);
  }
}

/** El pid que el fixture dejó escrito en el proyecto, esperando a que aparezca. */
async function waitForPidFile(path: string): Promise<number> {
  const deadline = Date.now() + 5000;
  for (;;) {
    const text = await readFile(path, "utf8").catch(() => "");
    const pid = Number.parseInt(text.trim(), 10);
    if (Number.isFinite(pid) && pid > 0) return pid;
    if (Date.now() > deadline) throw new Error(`el fixture no escribió ${path}`);
    await Bun.sleep(20);
  }
}

/** Mata un pid que sobrevivió, para que un test en rojo no deje basura suelta. */
function killQuietly(pid: number): void {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ya no está: es justo lo que el test esperaba.
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
  const options = {
    skillDir: "/tmp/skills/create-specs",
    prompt: "creá las specs de una app de turnos",
    skillName: "create-specs",
  };

  test("pi conserva los argumentos de S10, pero ya no es efímera (S17)", () => {
    const command = buildAgentInvocation("pi", options);

    expect(command).toEqual({
      binary: "pi",
      args: [
        "--print",
        "--mode",
        "json",
        "--skill",
        "/tmp/skills/create-specs",
        "-a",
        "--name",
        "fwinit studio · create-specs",
        "creá las specs de una app de turnos",
      ],
    });
    // La sesión se guarda: sin `--no-session` aparece en `pi -r` (S17).
    expect(command.args).not.toContain("--no-session");
  });

  test("gentle-shell reenvía exactamente los mismos argumentos que pi", () => {
    const command = buildAgentInvocation("gentle-shell", options);

    expect(command).toEqual({
      binary: "gentle-shell",
      args: buildAgentInvocation("pi", options).args,
    });
    expect(command.args).not.toContain("--no-session");
  });

  test("el nombre de la sesión lleva la skill para reconocerla en el selector", () => {
    expect(studioSessionName("dark-luxury")).toBe("fwinit studio · dark-luxury");
    expect(studioSessionName("  ")).toBe("fwinit studio");
  });

  test("opencode ejecuta sin flag de skill, con el prompt como argumento", () => {
    const command = buildAgentInvocation("opencode", options);

    expect(command).toEqual({
      binary: "opencode",
      // `--standalone`: servidor propio dentro de nuestro grupo, no el de fondo (S20).
      args: ["run", "--auto", "--standalone", "creá las specs de una app de turnos"],
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

describe("model flag (spec S14)", () => {
  const options = {
    skillDir: "/tmp/skills/create-specs",
    prompt: "hacé las specs",
    skillName: "create-specs",
  };
  const model = "anthropic/claude-sonnet-5";

  test("pi recibe --model con el modelo elegido", () => {
    expect(buildAgentInvocation("pi", { ...options, model }).args).toEqual([
      "--print",
      "--mode",
      "json",
      "--skill",
      "/tmp/skills/create-specs",
      "--model",
      "anthropic/claude-sonnet-5",
      "-a",
      "--name",
      "fwinit studio · create-specs",
      "hacé las specs",
    ]);
  });

  test("gentle-shell también recibe --model", () => {
    const args = buildAgentInvocation("gentle-shell", { ...options, model }).args;

    expect(args[args.indexOf("--model") + 1]).toBe("anthropic/claude-sonnet-5");
    expect(args[args.length - 1]).toBe("hacé las specs");
  });

  test("opencode run recibe --model antes del prompt", () => {
    expect(buildAgentInvocation("opencode", { ...options, model }).args).toEqual([
      "run",
      "--auto",
      "--standalone",
      "--model",
      "anthropic/claude-sonnet-5",
      "hacé las specs",
    ]);
  });

  test("sin modelo elegido no se pasa el flag y el agente usa su default", () => {
    for (const agent of ["pi", "gentle-shell", "opencode"] as const) {
      expect(buildAgentInvocation(agent, options).args).not.toContain("--model");
      expect(buildAgentInvocation(agent, { ...options, model: "   " }).args).not.toContain(
        "--model"
      );
    }
  });

  test("un modelo con caracteres de control o de más de 128 caracteres se rechaza", () => {
    expect(() => buildAgentInvocation("pi", { ...options, model: "a\nb" })).toThrow(RunError);
    expect(() => buildAgentInvocation("pi", { ...options, model: "modelo\u0007" })).toThrow(
      RunError
    );
    expect(() => buildAgentInvocation("pi", { ...options, model: "x".repeat(129) })).toThrow(
      RunError
    );
    // 128 caracteres es el límite aceptado.
    expect(
      buildAgentInvocation("pi", { ...options, model: "x".repeat(128) }).args
    ).toContain("x".repeat(128));
  });
});

describe("output normalisation", () => {
  test("el encabezado de sesión se presenta como estado y expone el id (S17)", () => {
    expect(
      normaliseOutputLine(
        `{"type":"session","version":3,"id":"${SESSION_ID}","cwd":"/tmp/proyecto"}`
      )
    ).toEqual({ kind: "status", text: "sesión iniciada", append: false, sessionId: SESSION_ID });
  });

  test("un id de sesión con forma de ruta no se captura como sesión", () => {
    // El id se muestra y se copia como comando: no puede traer separadores.
    for (const id of ["../../evil", "a\nb", "", "   "]) {
      const draft = normaliseOutputLine(`{"type":"session","id":"${id.replace("\n", "\\n")}"}`);
      expect(draft?.sessionId ?? null).toBeNull();
    }
  });

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

  test("el modelo elegido queda en el estado y en los argumentos (S14)", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    const started = await manager.start({
      agent: "pi",
      skill: piSkill,
      prompt: "hola",
      model: "anthropic/claude-sonnet-5",
    });

    expect(started.model).toBe("anthropic/claude-sonnet-5");
    expect(started.command.args[started.command.args.indexOf("--model") + 1]).toBe(
      "anthropic/claude-sonnet-5"
    );
    await waitForIdle(manager, started.id);

    const plain = await manager.start({ agent: "pi", skill: piSkill, prompt: "sin modelo" });
    expect(plain.model).toBeNull();
    expect(plain.command.args).not.toContain("--model");
    await waitForIdle(manager, plain.id);
  });

  test("rechaza un modelo inválido sin arrancar el proceso", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    await expect(
      manager.start({ agent: "pi", skill: piSkill, prompt: "x", model: "a\nb" })
    ).rejects.toThrow(RunError);
    await expect(
      manager.start({ agent: "pi", skill: piSkill, prompt: "x", model: "y".repeat(200) })
    ).rejects.toThrow(RunError);
  });

  test("la ejecución persiste en disco y la lee un manager nuevo (S13)", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    const finished = await waitForIdle(manager, started.id);

    // Un server nuevo sobre el mismo proyecto: el run se recupera del disco.
    const restarted = new RunManager({ projectRoot, home });
    managers.push(restarted);

    const fromDisk = restarted.poll(started.id, 0);
    expect(fromDisk?.state).toBe("done");
    expect(fromDisk?.lines).toEqual(
      finished.lines.map((line) => ({ n: line.n, kind: line.kind, text: line.text }))
    );
    expect(fromDisk?.next).toBe(finished.next);
    expect(restarted.list().map((summary) => summary.id)).toContain(started.id);
  });

  test("captura el id de sesión del primer evento del JSONL (S17)", async () => {
    const manager = managerWith({
      agentBinaries: { pi: await script("pi-session.sh", SESSION_OUTPUT) },
    });

    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    const finished = await waitForIdle(manager, started.id);

    expect(finished.sessionId).toBe(SESSION_ID);
    // El encabezado sigue visible como estado: no se descarta salida.
    expect(finished.lines[0]).toEqual({ n: 1, kind: "status", text: "sesión iniciada" });
  });

  test("sin evento de sesión el id queda en null: nunca se inventa", async () => {
    const manager = managerWith({ agentBinaries: { pi: await script("pi-fast.sh", FAST_OUTPUT) } });

    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    const finished = await waitForIdle(manager, started.id);

    expect(started.sessionId).toBeNull();
    expect(finished.sessionId).toBeNull();
  });

  test("el id de sesión queda en disco y lo lee un manager nuevo (S17)", async () => {
    const manager = managerWith({
      agentBinaries: { pi: await script("pi-session.sh", SESSION_OUTPUT) },
    });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "hola" });
    await waitForIdle(manager, started.id);

    const restarted = new RunManager({ projectRoot, home });
    managers.push(restarted);

    expect(restarted.poll(started.id, 0)?.sessionId).toBe(SESSION_ID);
    expect(restarted.list().find((run) => run.id === started.id)?.sessionId).toBe(SESSION_ID);
  });

  test("dispose mata la ejecución en curso", async () => {
    const manager = managerWith({
      agentBinaries: { "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT) },
      cancelGraceMs: 200,
    });
    const started = await manager.start({ agent: "gentle-shell", skill: piSkill, prompt: "x" });

    manager.dispose();

    const after = await waitForIdle(manager, started.id);
    expect(after.state).toBe("cancelled");
  });
});

/**
 * Cancelar detiene de verdad al agente (S20).
 *
 * El caso que el usuario reportó: cancelaba y opencode seguía trabajando. La
 * causa era matar sólo el PID directo mientras el nieto —el servidor de
 * opencode, o un `bash` que abrió pi— seguía vivo.
 */
describe("cancelación real del agente (S20)", () => {
  test("cancelar mata al agente y también al nieto que dejó trabajando", async () => {
    const manager = managerWith({
      agentBinaries: { "gentle-shell": await script("gentle-nieto.sh", GRANDCHILD_OUTPUT) },
      cancelGraceMs: 300,
    });
    const started = await manager.start({
      agent: "gentle-shell",
      skill: piSkill,
      prompt: "tarda",
    });
    const grandchild = await waitForPidFile(join(projectRoot, "grandchild.pid"));

    try {
      const cancelled = await manager.cancel(started.id);

      expect(cancelled?.state).toBe("cancelled");
      // La señal va al grupo: matar sólo el PID directo dejaba vivo al nieto.
      expect(await waitForProcessGone(grandchild)).toBe(true);
    } finally {
      killQuietly(grandchild);
    }
  });

  test("cerrar el studio tampoco deja al nieto trabajando", async () => {
    const manager = managerWith({
      agentBinaries: { pi: await script("pi-nieto.sh", GRANDCHILD_OUTPUT) },
      cancelGraceMs: 300,
    });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "tarda" });
    const grandchild = await waitForPidFile(join(projectRoot, "grandchild.pid"));

    try {
      manager.dispose();

      expect((await waitForIdle(manager, started.id)).state).toBe("cancelled");
      expect(await waitForProcessGone(grandchild)).toBe(true);
    } finally {
      killQuietly(grandchild);
    }
  });

  test("un agente que ignora SIGTERM se escala a SIGKILL y se reporta cancelado", async () => {
    const manager = managerWith({
      agentBinaries: { pi: await script("pi-tozudo.sh", STUBBORN_OUTPUT) },
      cancelGraceMs: 100,
    });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "tarda" });

    const cancelled = await manager.cancel(started.id);

    // El estado final es `cancelled` porque el proceso efectivamente salió.
    expect(cancelled?.state).toBe("cancelled");
    expect(cancelled?.cancelError).toBeNull();
    expect(cancelled?.lines.at(-1)?.text).toBe("Ejecución cancelada.");
  });

  test("cancelar conserva la salida parcial y la sesión en disco", async () => {
    const manager = managerWith({
      agentBinaries: { pi: await script("pi-nieto-sesion.sh", GRANDCHILD_SESSION_OUTPUT) },
      cancelGraceMs: 300,
    });
    const started = await manager.start({ agent: "pi", skill: piSkill, prompt: "tarda" });
    const grandchild = await waitForPidFile(join(projectRoot, "grandchild.pid"));

    try {
      const cancelled = await manager.cancel(started.id);

      expect(cancelled?.state).toBe("cancelled");
      expect(cancelled?.sessionId).toBe(SESSION_ID);
      expect(cancelled?.lines.map((line) => line.text)).toContain("voy escribiendo specs");

      // Cancelar no borra nada: el run sigue en el disco, con su final.
      const restarted = new RunManager({ projectRoot, home });
      managers.push(restarted);
      const fromDisk = restarted.poll(started.id, 0);
      expect(fromDisk?.state).toBe("cancelled");
      expect(fromDisk?.sessionId).toBe(SESSION_ID);
      expect(fromDisk?.lines.map((line) => line.text)).toContain("voy escribiendo specs");
    } finally {
      killQuietly(grandchild);
    }
  });

  test("si el proceso no sale dentro del plazo, no se reporta cancelado", async () => {
    // Un SIGKILL no se puede sobrevivir, así que lo que se ejercita es el plazo
    // agotado (0 = no esperar): el manager da la cancelación por fallida en vez
    // de mentir un final feliz, y el run queda con su salida parcial.
    const manager = managerWith({
      agentBinaries: { "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT) },
      cancelGraceMs: 0,
      cancelKillWaitMs: 0,
    });
    const started = await manager.start({
      agent: "gentle-shell",
      skill: piSkill,
      prompt: "tarda",
    });

    const cancelled = await manager.cancel(started.id);

    expect(cancelled?.state).toBe("failed");
    expect(cancelled?.cancelError).toBe(CANCEL_FAILED_MESSAGE);
    // El motivo queda también en la salida, que es lo que se ve al reabrir.
    expect(cancelled?.lines.map((line) => line.text)).toContain(CANCEL_FAILED_MESSAGE);

    // Nada se borra: el archivo conserva la salida parcial y el motivo.
    const restarted = new RunManager({ projectRoot, home });
    managers.push(restarted);
    const fromDisk = restarted.poll(started.id, 0);
    expect(fromDisk?.state).toBe("failed");
    expect(fromDisk?.lines.map((line) => line.text)).toContain(CANCEL_FAILED_MESSAGE);
  });
});
