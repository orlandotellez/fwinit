import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startStudio } from "./server.js";
import type { StudioServer } from "./types.js";

/**
 * Guards around the only write the studio performs (spec S5/S6).
 *
 * `install-route.test.ts` covers the ordinary path; this file pins the ways a
 * request can try to get around it — escaped names, a token of the wrong shape,
 * an origin that is not this server, an oversized body, a folder that sits in
 * the bundle root without being a bundle entry — plus the two rules that make
 * a partial install honest: every destination reports its own outcome and
 * `~/.agents` is never written.
 */

const exists = (path: string) => access(path).then(() => true, () => false);

let dir = "";
let home = "";
let bundle = "";
let studio: StudioServer | null = null;
let token = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "fwinit-install-guards-"));
  home = join(dir, "home");
  bundle = join(dir, "bundle");
  await mkdir(join(home), { recursive: true });
  await mkdir(join(bundle, "skills", "create-specs"), { recursive: true });
  await writeFile(
    join(bundle, "skills", "create-specs", "SKILL.md"),
    "---\nname: create-specs\n---\n"
  );
  // A folder inside the bundle root that the registry does not know about.
  await mkdir(join(bundle, "skills", "not-in-bundle"), { recursive: true });
  await writeFile(join(bundle, "skills", "not-in-bundle", "SKILL.md"), "x");
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
  if (dir) await rm(dir, { recursive: true, force: true });
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${studio?.address.url}/api/skills/install`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: `http://127.0.0.1:${studio?.address.port}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });

const piSkill = () => join(home, ".pi", "agent", "skills", "create-specs");

describe("install route guards", () => {
  test("refuses a token of the wrong shape without writing", async () => {
    expect((await post({ name: "create-specs", token: token + "aa" })).status).toBe(403);
    expect((await post({ name: "create-specs", token: "0".repeat(32) })).status).toBe(403);
    expect((await post({ name: "create-specs", token: "" })).status).toBe(403);
    expect(await exists(piSkill())).toBe(false);
  });

  test("accepts any loopback alias for the port it listens on", async () => {
    const localhost = await post(
      { name: "create-specs", token },
      { origin: `http://localhost:${studio?.address.port}` }
    );

    expect(localhost.status).toBe(200);
    expect(await exists(join(piSkill(), "SKILL.md"))).toBe(true);
  });

  test("refuses a loopback name without the server's port", async () => {
    const response = await post(
      { name: "create-specs", token },
      { origin: "http://localhost" }
    );

    expect(response.status).toBe(403);
    expect(await exists(piSkill())).toBe(false);
  });

  test("refuses with no Origin and no Sec-Fetch-Site, and trusts same-origin", async () => {
    expect((await post({ name: "create-specs", token }, { origin: "" })).status).toBe(403);
    expect(await exists(piSkill())).toBe(false);

    const trusted = await post(
      { name: "create-specs", token },
      { origin: "", "sec-fetch-site": "same-origin" }
    );
    expect(trusted.status).toBe(200);
  });

  test("refuses a cross-site Sec-Fetch-Site even without Origin", async () => {
    const response = await post(
      { name: "create-specs", token },
      { origin: "", "sec-fetch-site": "cross-site" }
    );

    expect(response.status).toBe(403);
    expect(await exists(piSkill())).toBe(false);
  });

  test("refuses an oversized body before reading the token", async () => {
    const response = await post({ name: "create-specs", token, pad: "x".repeat(6000) });

    expect(response.status).toBe(413);
    expect(await exists(piSkill())).toBe(false);
  });

  test("refuses names that would leave the destination", async () => {
    for (const name of ["../../evil", "/tmp/evil", "create-specs/../../evil", "  "]) {
      expect((await post({ name, token })).status).toBe(400);
    }

    expect(await exists(join(home, ".opencode"))).toBe(false);
    expect(await exists(join(dir, "evil"))).toBe(false);
  });

  test("refuses a bundle folder that is not in the registry", async () => {
    const response = await post({ name: "not-in-bundle", token });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("unknown");
    expect(await exists(join(home, ".pi", "agent", "skills", "not-in-bundle"))).toBe(false);
  });

  test("reports one failing destination without claiming a global success", async () => {
    await mkdir(join(home, ".pi", "agent"), { recursive: true });
    await writeFile(join(home, ".pi", "agent", "skills"), "no es un directorio");

    const body = await (await post({ name: "create-specs", token })).json();
    const pi = body.results.find((item: { target: string }) => item.target === "pi");

    expect(body.ok).toBe(false);
    expect(pi.error).toBeTruthy();
    expect(pi.copied).toBe(0);
    expect(await exists(join(home, ".config", "opencode", "skills", "create-specs", "SKILL.md")))
      .toBe(true);
    // Agent Skills sigue siendo target del CLI, nunca del studio.
    expect(await exists(join(home, ".agents"))).toBe(false);
  });
});
