import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStudio } from "./server.js";
import type {
  StudioModelList,
  StudioRunStatus,
  StudioRunsList,
  StudioServer,
} from "./types.js";

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
let bundleRoot = "";
let piBinary = "";
let opencodeBinary = "";
let gentleBinary = "";
let studio: StudioServer | null = null;
let token = "";
let piSkillDir = "";
let piTable = "";

/** El id de sesión que pi informa en el primer evento de su JSONL (S17). */
const SESSION_ID = "01936f5e-7a1b-7d3c-9f00-2c9a1d4e5b60";

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

/**
 * Salida rápida pero con vida observable: duerme antes de imprimir, así un test
 * puede ver el run `running` sin depender de ganar una carrera contra el fixture.
 */
const LINGERING_OUTPUT = [`sleep 0.7`, FAST_OUTPUT].join("\n");

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

/** El historial: ejecución en curso más el resumen de cada run en disco. */
function readRuns() {
  return fetch(`${studio?.address.url}/api/skills/runs`, { headers: { origin: origin() } });
}

/** El catálogo de modelos que el CLI de cada agente publica (S14). */
function readModels(agent: string) {
  return fetch(`${studio?.address.url}/api/skills/models?agent=${encodeURIComponent(agent)}`, {
    headers: { origin: origin() },
  });
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
  bundleRoot = bundle;

  // Los fixtures contestan el catálogo de modelos y, para el resto de los
  // argumentos, se comportan como el agente que transmite la salida.
  piTable = join(import.meta.dir, "fixtures", "pi-list-models.txt");
  piBinary = await script(
    "pi-fast.sh",
    [
      `if [ "$1" = "--list-models" ]; then`,
      `  cat "${piTable}"`,
      `  exit 0`,
      `fi`,
      FAST_OUTPUT,
    ].join("\n")
  );
  opencodeBinary = await script(
    "oc-fast.sh",
    [
      `if [ "$1" = "models" ]; then`,
      `  printf '%s\\n' "opencode no tiene proveedores configurados" >&2`,
      `  exit 1`,
      `fi`,
      FAST_OUTPUT,
    ].join("\n")
  );
  gentleBinary = await script("gentle-slow.sh", SLOW_OUTPUT);

  // HOME y GENTLE_SHELL_HOME a un directorio temporal: nada toca el home real.
  process.env.HOME = home;
  process.env.GENTLE_SHELL_HOME = join(home, ".gentle-shell", "agent");
  delete process.env.FWINIT_BUNDLE_ROOT;

  studio = await openStudio();
});

/**
 * Levanta el studio sobre el proyecto temporal.
 *
 * Se puede volver a llamar dentro de un test: es la forma de simular un
 * reinicio del server conservando el disco del proyecto.
 */
async function openStudio(overrides: { piBinary?: string } = {}): Promise<StudioServer> {
  const server = await startStudio({
    projectRoot,
    home,
    bundleRoot,
    open: false,
    agentBinaries: {
      pi: overrides.piBinary ?? piBinary,
      opencode: opencodeBinary,
      "gentle-shell": gentleBinary,
    },
    runCancelGraceMs: 500,
  });
  studio = server;
  const html = await (await fetch(`${server.address.url}/`)).text();
  const meta = /<script type="application\/json" id="studio-meta">([\s\S]*?)<\/script>/.exec(html);
  token = JSON.parse(meta?.[1] ?? "{}").installToken;
  return server;
}

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
    // S10 al pie de la letra, con el nombre de sesión de S17 y la ruta que
    // resolvió el server. Ya no hay `--no-session`: la sesión se guarda.
    expect(status.command.args).toEqual([
      "--print",
      "--mode",
      "json",
      "--skill",
      piSkillDir,
      "-a",
      "--name",
      "fwinit studio · create-specs",
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

  test("el historial lista el run en curso y después su resumen (S13)", async () => {
    // El fixture rápido termina antes de que se pueda consultar: este test
    // necesita ver el estado `running`, así que usa uno que respira.
    const lingering = await script("pi-lingering.sh", LINGERING_OUTPUT);
    await studio?.close();
    await openStudio({ piBinary: lingering });

    const started = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "hola", token, model: "anthropic/claude-sonnet-5" })
    ).json()) as StudioRunStatus;

    const during = (await (await readRuns()).json()) as StudioRunsList;
    expect(during.inFlight).toBe(started.id);
    expect(during.runs[0]).toMatchObject({
      id: started.id,
      agent: "pi",
      model: "anthropic/claude-sonnet-5",
      prompt: "hola",
      state: "running",
      // La salida avanza mientras se consulta: no se fija una cantidad exacta.
      lineCount: expect.any(Number),
      skill: piSkill,
    });

    const finished = await waitForRun(started.id);
    const after = (await (await readRuns()).json()) as StudioRunsList;

    expect(after.inFlight).toBeNull();
    expect(after.runs[0]).toMatchObject({
      id: started.id,
      state: "done",
      exitCode: 0,
      lineCount: finished.lines.length,
    });
    expect(after.runs[0].endedAt).toBeTruthy();
  });

  test("una ejecución sin cierre se lee como interrupted, no como running", async () => {
    const id = "fedcba9876543210";
    const records = [
      {
        type: "meta",
        id,
        agent: "pi",
        skill: piSkill,
        model: null,
        prompt: "quedó a medias",
        command: { binary: "pi", args: ["--print"] },
        startedAt: "2026-01-01T00:00:00.000Z",
      },
      { type: "line", n: 1, kind: "text", text: "primera", at: "2026-01-01T00:00:01.000Z" },
      { type: "line", n: 2, kind: "text", text: "segunda", at: "2026-01-01T00:00:02.000Z" },
    ];
    await mkdir(join(projectRoot, ".fwinit", "studio", "runs"), { recursive: true });
    await writeFile(
      join(projectRoot, ".fwinit", "studio", "runs", `${id}.jsonl`),
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
      "utf8"
    );

    const list = (await (await readRuns()).json()) as StudioRunsList;
    const run = (await (await readRun(id, 1)).json()) as StudioRunStatus;

    expect(list.inFlight).toBeNull();
    expect(list.runs[0]).toMatchObject({ id, state: "interrupted", exitCode: null, lineCount: 2 });
    // Un run anterior a S17 no tiene sesión guardada: se abre igual, sin id.
    expect(list.runs[0].sessionId).toBeNull();
    expect(run.state).toBe("interrupted");
    expect(run.sessionId).toBeNull();
    expect(run.lines.map((line) => line.text)).toEqual(["segunda"]);
    expect(run.next).toBe(2);
    expect(run.endedAt).toBeNull();
  });

  test("tras reiniciar el studio, el run sigue consultable desde el disco", async () => {
    const started = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "hola", token })
    ).json()) as StudioRunStatus;
    const finished = await waitForRun(started.id);

    await studio?.close();
    await openStudio();

    const response = await readRun(started.id, 0);
    const reloaded = (await response.json()) as StudioRunStatus;

    expect(response.status).toBe(200);
    expect(reloaded.state).toBe("done");
    expect(reloaded.exitCode).toBe(0);
    expect(reloaded.lines).toEqual(
      finished.lines.map((line) => ({ n: line.n, kind: line.kind, text: line.text }))
    );
    expect(reloaded.prompt).toBe("hola");
  });

  test("la sesión de pi se expone, se lista y sobrevive al reinicio (S17)", async () => {
    const withSession = await script(
      "pi-session.sh",
      [
        `if [ "$1" = "--list-models" ]; then`,
        `  cat "${piTable}"`,
        `  exit 0`,
        `fi`,
        `printf '%s\\n' '{"type":"session","version":3,"id":"${SESSION_ID}","cwd":"'"$PWD"'"}'`,
        FAST_OUTPUT,
      ].join("\n")
    );
    await studio?.close();
    await openStudio({ piBinary: withSession });

    const started = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "hola", token })
    ).json()) as StudioRunStatus;

    // La sesión es de verdad: el proceso no corre aislado del historial del agente.
    expect(started.command.args).not.toContain("--no-session");
    expect(started.command.args[started.command.args.indexOf("--name") + 1]).toBe(
      "fwinit studio · create-specs"
    );

    const finished = await waitForRun(started.id);
    expect(finished.state).toBe("done");
    expect(finished.sessionId).toBe(SESSION_ID);

    const list = (await (await readRuns()).json()) as StudioRunsList;
    expect(list.runs[0]).toMatchObject({ id: started.id, sessionId: SESSION_ID });

    // Reiniciar el studio no pierde la sesión: sale del meta del run en disco.
    await studio?.close();
    await openStudio();
    const reloaded = (await (await readRun(started.id, 0)).json()) as StudioRunStatus;
    expect(reloaded.sessionId).toBe(SESSION_ID);
  });

  test("sin id de sesión en la salida, el estado no lo inventa (S17)", async () => {
    const started = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "hola", token })
    ).json()) as StudioRunStatus;
    const finished = await waitForRun(started.id);

    expect(finished.sessionId).toBeNull();
    expect((await (await readRuns()).json()) as StudioRunsList).toMatchObject({
      runs: [expect.objectContaining({ id: started.id, sessionId: null })],
    });
  });

  test("el proyecto se auto-ignora en .fwinit/.gitignore", async () => {
    await startRun({ ...piSkill, agent: "pi", prompt: "hola", token });

    const ignore = await readFile(join(projectRoot, ".fwinit", ".gitignore"), "utf8");

    expect(ignore).toBe("*\n");
  });

  test("el modelo viaja como argumento y uno inválido se rechaza (S14)", async () => {
    const started = (await (
      await startRun({
        ...piSkill,
        agent: "pi",
        prompt: "x",
        token,
        model: "anthropic/claude-sonnet-5",
      })
    ).json()) as StudioRunStatus;

    expect(started.model).toBe("anthropic/claude-sonnet-5");
    expect(started.command.args).toContain("--model");
    expect(started.command.args[started.command.args.indexOf("--model") + 1]).toBe(
      "anthropic/claude-sonnet-5"
    );
    await waitForRun(started.id);

    const newline = await startRun({ ...piSkill, agent: "pi", prompt: "x", token, model: "a\nb" });
    const tooLong = await startRun({
      ...piSkill,
      agent: "pi",
      prompt: "x",
      token,
      model: "y".repeat(160),
    });
    const plain = (await (
      await startRun({ ...piSkill, agent: "pi", prompt: "x", token, model: "   " })
    ).json()) as StudioRunStatus;

    expect(newline.status).toBe(400);
    expect(tooLong.status).toBe(400);
    // Sin modelo elegido no hay flag: el agente usa su default.
    expect(plain.model).toBeNull();
    expect(plain.command.args).not.toContain("--model");
    await waitForRun(plain.id);
  });

  test("el catálogo de modelos se lee de cada CLI y degrada si falla (S14)", async () => {
    const pi = (await (await readModels("pi")).json()) as StudioModelList;
    const gentle = (await (await readModels("gentle-shell")).json()) as StudioModelList;
    const opencode = (await (await readModels("opencode")).json()) as StudioModelList;
    const bad = await readModels("bash");

    expect(pi.available).toBe(true);
    expect(pi.source).toBe("pi");
    expect(pi.models.length).toBeGreaterThan(0);
    expect(pi.models[0].id).toBe("opencode-go/beam-free");
    // gentle-shell envuelve a pi: mismo catálogo, misma fuente.
    expect(gentle.source).toBe("pi");
    expect(gentle.models).toEqual(pi.models);
    // Un CLI que falla no rompe la ruta: el campo queda como texto libre.
    expect(opencode.available).toBe(false);
    expect(opencode.models).toEqual([]);
    expect(opencode.error).toContain("proveedores");
    expect(bad.status).toBe(400);
  });

  test("el modelo activo viaja en el catálogo y refleja un cambio por fuera (S15)", async () => {
    const piSettings = join(home, ".pi", "agent", "settings.json");
    await writeFile(
      piSettings,
      JSON.stringify({ defaultModel: "anthropic/claude-sonnet-5", apiKey: "sk-no-sale" }),
      "utf8"
    );

    const pi = (await (await readModels("pi")).json()) as StudioModelList;
    const gentle = (await (await readModels("gentle-shell")).json()) as StudioModelList;
    const opencode = (await (await readModels("opencode")).json()) as StudioModelList;

    expect(pi.current).toBe("anthropic/claude-sonnet-5");
    expect(pi.currentSource).toBe(piSettings);
    // Del settings sólo sale la clave del modelo, nunca el resto del archivo.
    expect(JSON.stringify(pi)).not.toContain("sk-no-sale");
    // gentle-shell tiene su propio home (GENTLE_SHELL_HOME) y ahí no hay modelo.
    expect(gentle.current).toBeNull();
    // opencode no declara modelo por defecto: desconocido, sin romper la ruta.
    expect(opencode.current).toBeNull();

    // El catálogo se cachea, pero el activo se relee en cada request.
    await writeFile(piSettings, JSON.stringify({ defaultModel: "opencode-go/beam-free" }), "utf8");
    const again = (await (await readModels("pi")).json()) as StudioModelList;
    expect(again.current).toBe("opencode-go/beam-free");
    expect(again.models).toEqual(pi.models);
  });

  test("el historial y el catálogo son de lectura; un id con ruta se rechaza", async () => {
    const runsPost = await fetch(`${studio?.address.url}/api/skills/runs`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: origin() },
      body: JSON.stringify({ token }),
    });
    const modelsPost = await fetch(`${studio?.address.url}/api/skills/models?agent=pi`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: origin() },
      body: JSON.stringify({ token }),
    });
    const escaped = await readRun("../../etc/passwd");
    const dotted = await readRun("a.b");

    expect(runsPost.status).toBe(405);
    expect(runsPost.headers.get("allow")).toBe("GET, HEAD");
    expect(modelsPost.status).toBe(405);
    expect(escaped.status).toBe(400);
    expect(dotted.status).toBe(400);
  });
});
