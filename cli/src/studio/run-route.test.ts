import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStudio } from "./server.js";
import type { StudioRunStatus, StudioServer } from "./types.js";

/**
 * Rutas de ejecución (spec S11/S12).
 *
 * Cubren las guardas de escritura, el cursor `since`, la exclusión mutua de un
 * run por vez y el final cancelado. Los agentes son scripts fixture: ningún
 * test ejecuta `pi`, `opencode` ni `gentle-shell` de verdad.
 */

let workspace = "";
let home = "";
let projectRoot = "";
let studio: StudioServer | null = null;
let token = "";
let piSkillDir = "";

async function script(name: string, body: string): Promise<string> {
  const path = join(workspace, name);
  await writeFile(path, `#!/bin/sh\n${body}\n`, "utf8");
  await chmod(path, 0o755);
  return path;
}

const FAST_OUTPUT = [
  `printf '%s\\n' '{"type":"agent_start"}'`,
  `printf '%s\\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"hola "}}'`,
  `printf '%s\\n' '{"type":"message_update","assistantMessageEvent":{"type":"text_delta","delta":"mundo"}}'`,
  `printf '%s\\n' '{"type":"tool_start","name":"read"}'`,
  `printf '%s\\n' '{"type":"mystery_event","payload":42}'`,
  `printf '%s\\n' '{"type":"message_end","message":{"role":"assistant","stopReason":"end_turn"}}'`,
  `exit 0`,
].join("\n");

const SLOW_OUTPUT = [`printf '%s\\n' '{"type":"agent_start"}'`, `exec sleep 30`].join("\n");

async function seedSkill(root: string, name: string): Promise<void> {
  await mkdir(join(root, name), { recursive: true });
  await writeFile(join(root, name, "SKILL.md"), `---\nname: ${name}\n---\n`, "utf8");
}

function origin(): string {
  return `http://127.0.0.1:${studio?.address.port ?? 0}`;
}

function startRun(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${studio?.address.url}/api/skills/run`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: origin(), ...headers },
    body: JSON.stringify(body),
  });
}

function cancelRun(body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${studio?.address.url}/api/skills/run/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: origin(), ...headers },
    body: JSON.stringify(body),
  });
}

function readRun(id: string, since = 0) {
  return fetch(
    `${studio?.address.url}/api/skills/run?id=${encodeURIComponent(id)}&since=${since}`,
    { headers: { origin: origin() } }
  );
}

/** Consulta el estado hasta que la ejecución termina o se acaba el tiempo. */
async function waitForRun(id: string): Promise<StudioRunStatus> {
  const deadline = Date.now() + 5000;
  for (;;) {
    const status = (await (await readRun(id)).json()) as StudioRunStatus;
    if (status.state !== "running") return status;
    if (Date.now() > deadline) throw new Error("la ejecución no terminó a tiempo");
    await Bun.sleep(25);
  }
}

const piSkill = { target: "pi", scope: "global", name: "create-specs" };

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-run-route-"));
  home = join(workspace, "home");
  projectRoot = join(workspace, "project");
  piSkillDir = join(home, ".pi", "agent", "skills", "create-specs");
  await seedSkill(join(home, ".pi", "agent", "skills"), "create-specs");
  // La misma skill para opencode: es la única forma en que opencode la descubre.
  await seedSkill(join(home, ".config", "opencode", "skills"), "dark-luxury");
  await mkdir(projectRoot, { recursive: true });
  const bundle = join(workspace, "bundle");
  await seedSkill(join(bundle, "skills"), "create-specs");

  // HOME y GENTLE_SHELL_HOME a un directorio temporal: nada toca el home real.
  process.env.HOME = home;
  process.env.GENTLE_SHELL_HOME = join(home, ".gentle-shell", "agent");
  delete process.env.FWINIT_BUNDLE_ROOT;

  studio = await startStudio({
    projectRoot,
    home,
    bundleRoot: bundle,
    open: false,
    agentBinaries: {
      pi: await script("pi-fast.sh", FAST_OUTPUT),
      opencode: await script("oc-fast.sh", FAST_OUTPUT),
      "gentle-shell": await script("gentle-slow.sh", SLOW_OUTPUT),
    },
    runCancelGraceMs: 500,
  });
  const html = await (await fetch(`${studio.address.url}/`)).text();
  const meta = /<script type="application\/json" id="studio-meta">([\s\S]*?)<\/script>/.exec(html);
  token = JSON.parse(meta?.[1] ?? "{}").installToken;
});

afterEach(async () => {
  await studio?.close();
  studio = null;
  token = "";
  delete process.env.HOME;
  delete process.env.GENTLE_SHELL_HOME;
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("studio run route", () => {
  test("rechaza un inicio sin token, desde otro origen o sin JSON", async () => {
    const noToken = await startRun({ ...piSkill, agent: "pi", prompt: "x" });
    const foreign = await startRun(
      { ...piSkill, agent: "pi", prompt: "x", token },
      { origin: "https://evil.example" }
    );
    const notJson = await fetch(`${studio?.address.url}/api/skills/run`, {
      method: "POST",
      headers: { "content-type": "text/plain", origin: origin() },
      body: JSON.stringify({ ...piSkill, agent: "pi", prompt: "x", token }),
    });

    expect(noToken.status).toBe(403);
    expect(foreign.status).toBe(403);
    expect(notJson.status).toBe(415);
    // Nada arrancó: un id inventado sigue sin existir.
    expect((await readRun("0000000000000000")).status).toBe(404);
  });

  test("ejecuta con pi, resuelve la skill en el server y llega a done en orden", async () => {
    const started = await startRun({ ...piSkill, agent: "pi", prompt: "creá las specs", token });
    const status = (await started.json()) as StudioRunStatus;

    expect(started.status).toBe(200);
    expect(status.state).toBe("running");
    expect(status.id).toBeTruthy();
    // S10 al pie de la letra, con la ruta que resolvió el server.
    expect(status.command.args).toEqual([
      "--print",
      "--mode",
      "json",
      "--skill",
      piSkillDir,
      "-a",
      "--no-session",
      "creá las specs",
    ]);

    const finished = await waitForRun(status.id);

    expect(finished.state).toBe("done");
    expect(finished.exitCode).toBe(0);
    expect(finished.lines.map((line) => line.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(finished.lines[1]).toEqual({ n: 2, kind: "text", text: "hola mundo" });
    expect(finished.lines[3].kind).toBe("raw");
    expect(finished.lines[3].text).toBe('{"type":"mystery_event","payload":42}');
  });

  test("`since` devuelve sólo las líneas nuevas", async () => {
    const started = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "hola", token })
    ).json()) as StudioRunStatus;
    const finished = await waitForRun(started.id);

    const response = await readRun(started.id, 3);
    const body = (await response.json()) as StudioRunStatus;

    expect(response.status).toBe(200);
    expect(body.lines.map((line) => line.n)).toEqual([4, 5, 6]);
    expect(body.next).toBe(finished.next);
    expect(body.state).toBe("done");
    expect(body.exitCode).toBe(0);
  });

  test("una segunda ejecución concurrente responde 409 y la primera sigue viva", async () => {
    const first = (await (
      await startRun({ ...piSkill, agent: "gentle-shell", prompt: "tarda", token })
    ).json()) as StudioRunStatus;

    const second = await startRun({ ...piSkill, agent: "pi", prompt: "otra", token });
    const body = await second.json();

    expect(second.status).toBe(409);
    expect(body.error).toContain("Ejecución en curso");
    expect(body.code).toBe("busy");
    expect((await readRun(first.id)).status).toBe(200);

    const cancelled = (await (await cancelRun({ id: first.id, token })).json()) as StudioRunStatus;
    expect(cancelled.state).toBe("cancelled");
  });

  test("cancelar termina la ejecución como cancelled", async () => {
    const started = (await (
      await startRun({ ...piSkill, agent: "gentle-shell", prompt: "tarda", token })
    ).json()) as StudioRunStatus;

    const response = await cancelRun({ id: started.id, token });
    const body = (await response.json()) as StudioRunStatus;

    expect(response.status).toBe(200);
    expect(body.state).toBe("cancelled");
    expect(body.exitCode).toBeNull();
    expect(((await (await readRun(started.id)).json()) as StudioRunStatus).state).toBe(
      "cancelled"
    );
  });

  test("cancelar exige el mismo token que el inicio", async () => {
    const started = (await (
      await startRun({ ...piSkill, agent: "gentle-shell", prompt: "tarda", token })
    ).json()) as StudioRunStatus;

    expect((await cancelRun({ id: started.id })).status).toBe(403);
    expect(((await (await readRun(started.id)).json()) as StudioRunStatus).state).toBe("running");

    await cancelRun({ id: started.id, token });
  });

  test("rechaza nombres y agentes que no son del contrato", async () => {
    const escaped = await startRun({
      ...piSkill,
      name: "../../evil",
      agent: "pi",
      prompt: "x",
      token,
    });
    const badAgent = await startRun({ ...piSkill, agent: "bash", prompt: "x", token });
    const emptyPrompt = await startRun({ ...piSkill, agent: "pi", prompt: "   ", token });
    const missing = await startRun({
      target: "pi",
      scope: "global",
      name: "no-existe",
      agent: "pi",
      prompt: "x",
      token,
    });

    expect(escaped.status).toBe(400);
    expect(badAgent.status).toBe(400);
    expect(emptyPrompt.status).toBe(400);
    expect(missing.status).toBe(404);
    expect((await missing.json()).code).toBe("skill-missing");
  });

  test("opencode se rechaza con 409 cuando no puede descubrir la skill", async () => {
    const response = await startRun({
      // create-specs sólo está instalada para pi, no para opencode.
      ...piSkill,
      agent: "opencode",
      prompt: "x",
      token,
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.code).toBe("not-discoverable");
    expect(body.error).toContain(".opencode/skills");
  });

  test("opencode ejecuta cuando la skill sí es descubrible", async () => {
    const started = await startRun({
      target: "opencode",
      scope: "global",
      name: "dark-luxury",
      agent: "opencode",
      prompt: "hacé la landing",
      token,
    });
    const body = (await started.json()) as StudioRunStatus;

    expect(started.status).toBe(200);
    expect(body.command.args).toEqual(["run", "--auto", "hacé la landing"]);

    const finished = await waitForRun(body.id);
    expect(finished.state).toBe("done");
  });

  test("un id desconocido y un `since` inválido se rechazan", async () => {
    const unknown = await fetch(`${studio?.address.url}/api/skills/run?id=nope`, {
      headers: { origin: origin() },
    });
    const badSince = await fetch(`${studio?.address.url}/api/skills/run?id=nope&since=-4`, {
      headers: { origin: origin() },
    });
    const noId = await fetch(`${studio?.address.url}/api/skills/run`, {
      headers: { origin: origin() },
    });

    expect(unknown.status).toBe(404);
    expect(badSince.status).toBe(400);
    expect(noId.status).toBe(400);
  });

  test("mantiene 405 para los métodos que no sirve", async () => {
    const run = await fetch(`${studio?.address.url}/api/skills/run`, {
      method: "DELETE",
      headers: { origin: origin() },
    });
    const cancelGet = await fetch(`${studio?.address.url}/api/skills/run/cancel`, {
      headers: { origin: origin() },
    });

    expect(run.status).toBe(405);
    expect(run.headers.get("allow")).toBe("GET, HEAD, POST");
    expect(cancelGet.status).toBe(405);
  });
});
