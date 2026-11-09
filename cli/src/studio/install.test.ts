import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyInstall,
  buildInstallPlan,
  InstallError,
  resolveInstallInfo,
  walkUp,
} from "./install.js";

/**
 * These tests never touch the real agent homes: every path comes from a
 * throwaway `home` and a throwaway bundle, so an accidental write would be
 * visible in the assertions instead of in the developer's `~/.pi`.
 */

const SAVED_ENV = {
  GENTLE_SHELL_HOME: process.env.GENTLE_SHELL_HOME,
  FWINIT_BUNDLE_ROOT: process.env.FWINIT_BUNDLE_ROOT,
};

let workspace = "";
let home = "";
let bundle = "";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** The smallest bundle that exercises a skill with extras plus a second skill. */
async function makeBundle(root: string): Promise<void> {
  const skills = join(root, "skills");
  await mkdir(join(skills, "create-specs", "examples"), { recursive: true });
  await writeFile(join(skills, "create-specs", "SKILL.md"), "---\nname: create-specs\n---\n");
  await writeFile(join(skills, "create-specs", "examples", "prompt.md"), "ejemplo\n");
  await mkdir(join(skills, "create-prompt"), { recursive: true });
  await writeFile(join(skills, "create-prompt", "SKILL.md"), "---\nname: create-prompt\n---\n");
}

function context(): { projectRoot: string; home: string; bundleRoot: string } {
  return { projectRoot: join(workspace, "project"), home, bundleRoot: bundle };
}

const OPENCODE = ".config/opencode/skills";
const PI = ".pi/agent/skills";
const GENTLE = ".gentle-shell/agent/skills";

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "fwinit-studio-"));
  home = join(workspace, "home");
  bundle = join(workspace, "bundle");
  await mkdir(home, { recursive: true });
  await mkdir(join(workspace, "project"), { recursive: true });
  await makeBundle(bundle);
  // `resolveSkillTargets` honours GENTLE_SHELL_HOME over `home`: clearing it is
  // what keeps the gentle-shell destination inside the fixture.
  delete process.env.GENTLE_SHELL_HOME;
  delete process.env.FWINIT_BUNDLE_ROOT;
});

afterEach(async () => {
  if (SAVED_ENV.GENTLE_SHELL_HOME === undefined) delete process.env.GENTLE_SHELL_HOME;
  else process.env.GENTLE_SHELL_HOME = SAVED_ENV.GENTLE_SHELL_HOME;
  if (SAVED_ENV.FWINIT_BUNDLE_ROOT === undefined) delete process.env.FWINIT_BUNDLE_ROOT;
  else process.env.FWINIT_BUNDLE_ROOT = SAVED_ENV.FWINIT_BUNDLE_ROOT;
  if (workspace) await rm(workspace, { recursive: true, force: true });
});

describe("install bundle resolution", () => {
  test("uses the explicit root and lists only the skills it carries", async () => {
    const info = await resolveInstallInfo(bundle);

    expect(info.available).toBe(true);
    expect(info.source).toBe(bundle);
    // `create-specs-from-code` and `design` are in the registry but not here.
    expect(info.skills).toEqual(["create-specs", "create-prompt"]);
  });

  test("names the CLI fallback when the root carries no bundle", async () => {
    const empty = join(workspace, "empty");
    await mkdir(empty, { recursive: true });

    const info = await resolveInstallInfo(empty);

    expect(info.available).toBe(false);
    expect(info.skills).toEqual([]);
    expect(info.reason).toContain("fwinit skills --global opencode,pi,gentle-shell");
  });

  test("walks up from a nested directory", () => {
    expect(walkUp(join(bundle, "skills", "create-specs"), 3)).toEqual([
      join(bundle, "skills", "create-specs"),
      join(bundle, "skills"),
      bundle,
    ]);
  });
});

describe("install plan", () => {
  test("plans one destination per agent home", async () => {
    const plan = await buildInstallPlan(context(), "create-specs");

    expect(plan.destinations.map((item) => item.target)).toEqual([
      "opencode",
      "pi",
      "gentle-shell",
    ]);
    expect(plan.destinations.map((item) => item.dir)).toEqual([
      join(home, OPENCODE, "create-specs"),
      join(home, PI, "create-specs"),
      join(home, GENTLE, "create-specs"),
    ]);
    expect(plan.destinations.every((item) => item.replaces === false)).toBe(true);
  });

  test("flags a destination that would be replaced", async () => {
    await mkdir(join(home, PI, "create-specs"), { recursive: true });

    const plan = await buildInstallPlan(context(), "create-specs");
    const pi = plan.destinations.find((item) => item.target === "pi");

    expect(pi?.replaces).toBe(true);
    expect(plan.destinations.filter((item) => item.replaces)).toHaveLength(1);
  });

  test("refuses a name that is not in the bundle", async () => {
    const attempt = buildInstallPlan(context(), "dark-luxury");

    await expect(attempt).rejects.toThrow(InstallError);
    await expect(buildInstallPlan(context(), "dark-luxury")).rejects.toMatchObject({
      code: "unknown",
    });
  });

  test("refuses a bundle skill the source does not carry", async () => {
    await rm(join(bundle, "skills", "create-specs"), { recursive: true, force: true });

    const plan = buildInstallPlan(context(), "create-specs");

    await expect(plan).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("install apply", () => {
  test("copies the skill and its extras into the three homes only", async () => {
    const result = await applyInstall(context(), "create-specs");

    expect(result.ok).toBe(true);
    expect(result.results.map((item) => item.copied)).toEqual([2, 2, 2]);

    for (const relative of [OPENCODE, PI, GENTLE]) {
      expect(await exists(join(home, relative, "create-specs", "SKILL.md"))).toBe(true);
      expect(await exists(join(home, relative, "create-specs", "examples", "prompt.md"))).toBe(
        true
      );
    }
    // Agent Skills is a CLI target, never a studio one.
    expect(await exists(join(home, ".agents"))).toBe(false);
  });

  test("keeps the skills already installed next to the target", async () => {
    const neighbour = join(home, PI, "other-skill", "SKILL.md");
    await mkdir(join(home, PI, "other-skill"), { recursive: true });
    await writeFile(neighbour, "---\nname: other-skill\n---\n");

    await applyInstall(context(), "create-specs");

    expect(await exists(neighbour)).toBe(true);
  });

  test("replaces the previous copy so a removed file does not survive", async () => {
    const stale = join(home, OPENCODE, "create-specs", "examples", "old.md");
    await mkdir(join(home, OPENCODE, "create-specs", "examples"), { recursive: true });
    await writeFile(join(home, OPENCODE, "create-specs", "SKILL.md"), "viejo\n");
    await writeFile(stale, "viejo\n");

    await applyInstall(context(), "create-specs");

    expect(await exists(stale)).toBe(false);
    expect(await exists(join(home, OPENCODE, "create-specs", "examples", "prompt.md"))).toBe(true);
  });

  test("reports a failing destination without claiming a global success", async () => {
    // Un archivo donde va el directorio del destino: la copia no puede completarse.
    await mkdir(join(home, ".pi", "agent"), { recursive: true });
    await writeFile(join(home, ".pi", "agent", "skills"), "no es un directorio\n");

    const result = await applyInstall(context(), "create-specs");

    expect(result.ok).toBe(false);
    expect(result.results.filter((item) => item.error).map((item) => item.target)).toEqual(["pi"]);
    expect(result.results.filter((item) => !item.error).map((item) => item.target)).toEqual([
      "opencode",
      "gentle-shell",
    ]);
  });
});
