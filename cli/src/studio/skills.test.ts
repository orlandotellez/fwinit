/**
 * Skills discovery for `fwinit studio`.
 *
 * The studio shows what is really installed, so this test builds the three
 * target layouts inside a throwaway HOME and project root (never the real
 * one). The cases that break a naive implementation are all covered: a
 * target with no skills dir (must not throw), a skill whose frontmatter is
 * broken (must not lose the row), a skill directory without `SKILL.md` (must
 * not appear), recursive file accounting, project scope, and the
 * `GENTLE_SHELL_HOME` override.
 */
import { describe, expect, test, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { discoverSkills } from "./skills.js";

let root: string;
const savedGentleShellHome = process.env.GENTLE_SHELL_HOME;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "fwinit-studio-skills-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  if (savedGentleShellHome === undefined) delete process.env.GENTLE_SHELL_HOME;
  else process.env.GENTLE_SHELL_HOME = savedGentleShellHome;
});

beforeEach(() => {
  delete process.env.GENTLE_SHELL_HOME;
});

/** Isolated home + project root per test; nothing is shared between cases. */
async function fixture(name: string): Promise<{ home: string; projectRoot: string }> {
  const base = join(root, name);
  const home = join(base, "home");
  const projectRoot = join(base, "project");
  await mkdir(home, { recursive: true });
  await mkdir(projectRoot, { recursive: true });
  return { home, projectRoot };
}

/** Writes `files` (path -> content) under `base`, creating parents. */
async function writeTree(base: string, files: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const target = join(base, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf-8");
  }
}

const FRONTMATTER_SKILL = [
  "---",
  "name: create-specs",
  'description: "Create the specs/ folder for a project"',
  "license: Apache-2.0",
  "metadata:",
  '  author: "orlandotellez"',
  '  version: "2.0"',
  "---",
  "",
  "## Activation Contract",
  "",
  "Body prose that must not become the description.",
  "",
].join("\n");

describe("discoverSkills", () => {
  test("reports the three targets in order, with labels and absolute dirs", async () => {
    const { home, projectRoot } = await fixture("targets");

    const report = await discoverSkills({ projectRoot, home });

    expect(report.targets.map((t) => t.id)).toEqual(["opencode", "pi", "gentle-shell"]);
    expect(report.targets.map((t) => t.label)).toEqual(["opencode", "pi", "Gentle Shell"]);
    expect(report.targets[0].globalDir).toBe(join(home, ".config", "opencode", "skills"));
    expect(report.targets[0].projectDir).toBe(join(projectRoot, ".opencode", "skills"));
    expect(report.targets[1].globalDir).toBe(join(home, ".pi", "agent", "skills"));
    expect(report.targets[1].projectDir).toBe(join(projectRoot, ".pi", "skills"));
    expect(report.targets[2].globalDir).toBe(
      join(home, ".gentle-shell", "agent", "skills")
    );
    expect(report.targets[2].projectDir).toBe(join(projectRoot, ".gentle-shell", "skills"));
    expect(report.projectRoot).toBe(projectRoot);
    expect(Number.isNaN(Date.parse(report.generatedAt))).toBe(false);
  });

  test("discovers two targets, tolerates the missing one, and sorts by name", async () => {
    const { home, projectRoot } = await fixture("two-targets");
    const opencodeGlobal = join(home, ".config", "opencode", "skills");
    const gentleGlobal = join(home, ".gentle-shell", "agent", "skills");

    await writeTree(opencodeGlobal, {
      "create-specs/SKILL.md": FRONTMATTER_SKILL,
      "Zeta/SKILL.md": "---\ndescription: Uppercase name sorts case-insensitively\n---\n",
      "alpha/SKILL.md": "---\ndescription: Lowercase name\n---\n",
    });
    await writeTree(gentleGlobal, {
      "only-gentle/SKILL.md": "---\ndescription: Gentle shell skill\n---\n",
    });
    // pi's global dir does not exist at all.

    const report = await discoverSkills({ projectRoot, home });

    const [opencode, pi, gentle] = report.targets;
    expect(opencode.globalExists).toBe(true);
    // Case-insensitive ascending: alpha, create-specs, Zeta.
    expect(opencode.skills.map((s) => s.name)).toEqual(["alpha", "create-specs", "Zeta"]);
    expect(opencode.skills.every((s) => s.scope === "global")).toBe(true);
    expect(opencode.skills.every((s) => s.target === "opencode")).toBe(true);
    expect(pi.globalExists).toBe(false);
    expect(pi.skills).toEqual([]);
    expect(gentle.globalExists).toBe(true);
    expect(gentle.skills.map((s) => s.name)).toEqual(["only-gentle"]);
    expect(report.totals).toEqual({ global: 4, project: 0 });
    expect(report.warnings).toEqual([]);
  });

  test("reads nested frontmatter metadata, the command sibling, and the entry mtime", async () => {
    const { home, projectRoot } = await fixture("metadata");
    const skillsDir = join(home, ".config", "opencode", "skills");
    const skillDir = join(skillsDir, "create-specs");

    await writeTree(skillsDir, {
      "create-specs/SKILL.md": FRONTMATTER_SKILL,
      "create-specs/command.md": "Run the spec wizard.\n",
    });

    const report = await discoverSkills({ projectRoot, home });
    const [entry] = report.targets[0].skills;

    expect(entry.name).toBe("create-specs");
    expect(entry.description).toBe("Create the specs/ folder for a project");
    expect(entry.version).toBe("2.0");
    expect(entry.author).toBe("orlandotellez");
    expect(entry.license).toBe("Apache-2.0");
    expect(entry.dir).toBe(skillDir);
    expect(entry.path).toBe(join(skillDir, "SKILL.md"));
    expect(entry.hasCommand).toBe(true);
    expect(entry.warnings).toEqual([]);
    expect(entry.modified).toBe(
      (await stat(join(skillDir, "SKILL.md"))).mtime.toISOString()
    );
  });

  test("falls back to the first prose line when frontmatter has no description", async () => {
    const { home, projectRoot } = await fixture("fallback");
    const entryFile = [
      "---",
      "name: no-description",
      "---",
      "",
      "# Heading is not prose",
      "",
      "```bash",
      "echo not-a-description",
      "```",
      "",
      "First real prose line.",
      "",
      "Second line.",
      "",
    ].join("\n");

    await writeTree(join(home, ".pi", "agent", "skills"), {
      "no-description/SKILL.md": entryFile,
    });

    const report = await discoverSkills({ projectRoot, home });
    const [entry] = report.targets[1].skills;

    expect(entry.description).toBe("First real prose line.");
    expect(entry.version).toBeUndefined();
    expect(entry.author).toBeUndefined();
    expect(entry.license).toBeUndefined();
    expect(entry.hasCommand).toBe(false);
  });

  test("keeps the skill and warns when the frontmatter is malformed", async () => {
    const { home, projectRoot } = await fixture("malformed");
    const entryFile = [
      "---",
      "name: broken",
      "this line is not a key value pair",
      "---",
      "",
      "# Title",
      "",
      "Prose used as the description.",
      "",
    ].join("\n");

    await writeTree(join(home, ".pi", "agent", "skills"), {
      "broken/SKILL.md": entryFile,
    });

    const report = await discoverSkills({ projectRoot, home });
    const [entry] = report.targets[1].skills;

    expect(entry.name).toBe("broken");
    expect(entry.description).toBe("Prose used as the description.");
    expect(entry.warnings).toHaveLength(1);
    expect(report.warnings).toEqual([]);
  });

  test("counts regular files and bytes recursively, including SKILL.md", async () => {
    const { home, projectRoot } = await fixture("sizes");
    const files = {
      "SKILL.md": "---\ndescription: Size accounting\n---\n\nBody.\n",
      "command.md": "Command body.\n",
      "examples/one.md": "Example one.\n",
      "examples/nested/two.md": "Example two, longer.\n",
    };
    await writeTree(join(home, ".config", "opencode", "skills", "sized"), files);

    const expectedBytes = Object.values(files).reduce(
      (sum, content) => sum + Buffer.byteLength(content, "utf-8"),
      0
    );

    const report = await discoverSkills({ projectRoot, home });
    const [entry] = report.targets[0].skills;

    expect(entry.files).toBe(4);
    expect(entry.bytes).toBe(expectedBytes);
  });

  test("discovers project-scope skills and counts them separately", async () => {
    const { home, projectRoot } = await fixture("project-scope");
    await writeTree(join(home, ".config", "opencode", "skills"), {
      "global-skill/SKILL.md": "---\ndescription: Installed globally\n---\n",
    });
    await writeTree(join(projectRoot, ".pi", "skills"), {
      "project-skill/SKILL.md": "---\ndescription: Only in this project\n---\n",
    });

    const report = await discoverSkills({ projectRoot, home });

    const [, pi] = report.targets;
    expect(pi.projectExists).toBe(true);
    expect(pi.globalExists).toBe(false);
    expect(pi.skills).toHaveLength(1);
    expect(pi.skills[0].name).toBe("project-skill");
    expect(pi.skills[0].scope).toBe("project");
    expect(pi.skills[0].dir).toBe(join(projectRoot, ".pi", "skills", "project-skill"));
    expect(report.totals).toEqual({ global: 1, project: 1 });
  });

  test("ignores directories without an entry file and accepts lowercase skill.md", async () => {
    const { home, projectRoot } = await fixture("entry-file");
    const skillsDir = join(home, ".pi", "agent", "skills");

    await writeTree(skillsDir, {
      "no-entry/README.md": "No entry file here.\n",
      "lower/skill.md": "---\ndescription: Lowercase entry file\n---\n",
      "regular-file.md": "Not a directory.\n",
    });

    const report = await discoverSkills({ projectRoot, home });

    expect(report.targets[1].skills.map((s) => s.name)).toEqual(["lower"]);
    expect(report.targets[1].skills[0].path).toBe(join(skillsDir, "lower", "skill.md"));
    expect(report.warnings).toEqual([]);
  });

  test("honours GENTLE_SHELL_HOME for the gentle-shell global dir", async () => {
    const { home, projectRoot } = await fixture("gentle-home");
    const override = join(root, "gentle-home", "custom-agent");
    process.env.GENTLE_SHELL_HOME = override;

    await writeTree(join(override, "skills"), {
      "from-override/SKILL.md": "---\ndescription: Installed in the override\n---\n",
    });
    // A second copy under the default location must be ignored.
    await writeTree(join(home, ".gentle-shell", "agent", "skills"), {
      "from-default/SKILL.md": "---\ndescription: Must not be read\n---\n",
    });

    const report = await discoverSkills({ projectRoot, home });
    const gentle = report.targets[2];

    expect(gentle.globalDir).toBe(join(override, "skills"));
    expect(gentle.skills.map((s) => s.name)).toEqual(["from-override"]);
  });

  test("skips a symlinked skill directory with a warning and never follows symlinks", async () => {
    const { home, projectRoot } = await fixture("symlinks");
    const skillsDir = join(home, ".pi", "agent", "skills");
    const outside = join(root, "symlinks", "outside-skill");

    await writeTree(outside, { "SKILL.md": "---\ndescription: Linked skill\n---\n" });
    await writeTree(skillsDir, {
      "real/SKILL.md": "---\ndescription: Real skill\n---\n",
    });
    // A loop inside the real skill must not be walked.
    await symlink(".", join(skillsDir, "real", "loop"));
    // A symlinked skill directory must be reported, not silently listed.
    await symlink(outside, join(skillsDir, "linked"));

    const report = await discoverSkills({ projectRoot, home });

    expect(report.targets[1].skills.map((s) => s.name)).toEqual(["real"]);
    expect(report.targets[1].skills[0].files).toBe(1);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain("linked");
    expect(report.warnings[0]).toContain("symlink");
  });
});
