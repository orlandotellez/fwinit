import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStudio } from "./server.js";
import type { StudioServer } from "./types.js";

/**
 * The install route is the only place the studio writes, so these tests pin the
 * gates around it: nothing is created unless the request carries the document's
 * token, comes from the studio's own origin and asks for a bundle skill.
 */

let workspace = "";
let home = "";
let bundle = "";
let studio: StudioServer | null = null;
let token = "";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function origin(): string {
  return `http://127.0.0.1:${studio?.address.port ?? 0}`;
}

function install(name: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${studio?.address.url}/api/skills/install`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: origin(), ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-server-"));
  home = join(workspace, "home");
  bundle = join(workspace, "bundle");
  await mkdir(join(home), { recursive: true });
  await mkdir(join(bundle, "skills", "create-specs"), { recursive: true });
  await writeFile(
    join(bundle, "skills", "create-specs", "SKILL.md"),
    "---\nname: create-specs\n---\n"
  );
  delete process.env.GENTLE_SHELL_HOME;
  delete process.env.FWINIT_BUNDLE_ROOT;

  studio = await startStudio({ projectRoot: home, home, bundleRoot: bundle, open: false });
  const html = await (await fetch(`${studio.address.url}/`)).text();
  const meta = /<script type="application\/json" id="studio-meta">([\s\S]*?)<\/script>/.exec(html);
  token = JSON.parse(meta?.[1] ?? "{}").installToken;
});

afterEach(async () => {
  await studio?.close();
  studio = null;
  token = "";
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("studio install route", () => {
  test("issues the token in the document and advertises the bundle", async () => {
    expect(token).toHaveLength(32);

    const meta = await (await fetch(`${studio?.address.url}/api/meta`)).json();
    expect(meta.install).toEqual({
      available: true,
      source: bundle,
      skills: ["create-specs"],
    });
    // El token viaja en el documento, no en un GET reutilizable.
    expect(JSON.stringify(meta)).not.toContain(token);
  });

  test("refuses a request without the token and writes nothing", async () => {
    const response = await install("create-specs", { name: "create-specs" });

    expect(response.status).toBe(403);
    expect(await exists(join(home, ".pi", "agent", "skills", "create-specs"))).toBe(false);
  });

  test("refuses a request from another origin", async () => {
    const response = await install(
      "create-specs",
      { name: "create-specs", token },
      { origin: "https://evil.example" }
    );

    expect(response.status).toBe(403);
    expect(await exists(join(home, ".pi", "agent", "skills", "create-specs"))).toBe(false);
  });

  test("refuses a non-JSON body", async () => {
    const response = await fetch(`${studio?.address.url}/api/skills/install`, {
      method: "POST",
      headers: { "content-type": "text/plain", origin: origin() },
      body: JSON.stringify({ name: "create-specs", token }),
    });

    expect(response.status).toBe(415);
  });

  test("installs after the confirmed request and reports every destination", async () => {
    const response = await install("create-specs", { name: "create-specs", token });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.results.map((item: { target: string }) => item.target)).toEqual([
      "opencode",
      "pi",
      "gentle-shell",
    ]);
    expect(await exists(join(home, ".pi", "agent", "skills", "create-specs", "SKILL.md"))).toBe(
      true
    );
  });

  test("rejects a name outside the bundle", async () => {
    const response = await install("dark-luxury", { name: "dark-luxury", token });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("unknown");
  });

  test("serves the plan the confirmation dialog needs", async () => {
    const response = await fetch(
      `${studio?.address.url}/api/skills/install?name=create-specs`,
      { headers: { origin: origin() } }
    );
    const plan = await response.json();

    expect(response.status).toBe(200);
    expect(plan.name).toBe("create-specs");
    expect(plan.destinations).toHaveLength(3);
  });

  test("keeps 405 for the methods it does not serve", async () => {
    const response = await fetch(`${studio?.address.url}/api/skills/install`, {
      method: "DELETE",
      headers: { origin: origin() },
    });

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, POST");

    const readOnly = await fetch(`${studio?.address.url}/api/skills`, { method: "POST" });
    expect(readOnly.status).toBe(405);
    expect(readOnly.headers.get("allow")).toBe("GET, HEAD");
  });

  test("refuses a write from a foreign Host before anything else", async () => {
    const response = await install(
      "create-specs",
      { name: "create-specs", token },
      { host: "evil.example" }
    );

    expect(response.status).toBe(403);
    expect(await exists(join(home, ".pi", "agent", "skills", "create-specs"))).toBe(false);
  });

  test("leaves the read views untouched", async () => {
    const skills = await (await fetch(`${studio?.address.url}/api/skills`)).json();

    expect(skills.projectRoot).toBe(home);
    expect(skills.totals).toBeDefined();
    expect((await fetch(`${studio?.address.url}/health`)).status).toBe(200);
  });
});
