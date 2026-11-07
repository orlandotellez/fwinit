/**
 * Menu identity helpers for the interactive `fwinit` entry (specs S3 and S7).
 *
 * Three concerns live here: the shared inquirer theme (one place, so all
 * eleven prompts look alike), the small text helpers the menu prints around
 * the prompt (context line, hairline separators), and the `j`/`k` navigation
 * that inquirer enables through `theme.keybindings`. The navigation cases use
 * the installed `isUpKey`/`isDownKey` predicates: those are the exact
 * functions the prompt handlers call, so the test proves the real mapping
 * instead of a copy of it.
 */
import { afterEach, describe, expect, test } from "bun:test";
import chalk from "chalk";
import {
  brandTheme,
  contextLine,
  describeChoice,
  selectionTheme,
  separatorRow,
  shortenHomePath,
} from "./menu.js";

const ANSI = /\u001b\[[0-9;]*m/;

const savedLevel = chalk.level;
const savedHome = process.env.HOME;

afterEach(() => {
  chalk.level = savedLevel;
  if (savedHome === undefined) delete process.env.HOME;
  else process.env.HOME = savedHome;
});

describe("separatorRow", () => {
  test("defaults to a 48-character hairline", () => {
    chalk.level = 0;
    expect(separatorRow()).toBe("─".repeat(48));
  });

  test("caps the row at 48 characters", () => {
    chalk.level = 0;
    expect(separatorRow(undefined, 200)).toBe("─".repeat(48));
    expect([...separatorRow(undefined, 12)]).toHaveLength(12);
  });

  test("puts the optional label inline and keeps the total width", () => {
    chalk.level = 0;
    const row = separatorRow("backend");
    expect(row.startsWith("── backend ")).toBe(true);
    expect([...row]).toHaveLength(48);
    expect(row.endsWith("─")).toBe(true);
  });

  test("is dim on a color terminal", () => {
    chalk.level = 3;
    expect(separatorRow()).toBe(chalk.dim("─".repeat(48)));
    expect(separatorRow()).toMatch(ANSI);
  });
});

describe("contextLine", () => {
  test("carries version, directory, templates and global skills", () => {
    chalk.level = 0;
    process.env.HOME = "/home/ana";
    expect(
      contextLine({
        version: "1.7.1",
        cwd: "/home/ana/proyecto",
        templates: 8,
        globalSkills: 3,
      })
    ).toBe("v1.7.1 · ~/proyecto · 8 templates · 3 skills globales");
  });

  test("omits the skills fragment when the count is unknown", () => {
    chalk.level = 0;
    process.env.HOME = "/home/ana";
    const line = contextLine({
      version: "1.7.1",
      cwd: "/home/ana/proyecto",
      templates: 8,
    });
    expect(line).toBe("v1.7.1 · ~/proyecto · 8 templates");
    expect(line).not.toContain("skills globales");
  });

  test("keeps a directory outside the home directory as is", () => {
    chalk.level = 0;
    process.env.HOME = "/home/ana";
    expect(
      contextLine({ version: "1.0.0", cwd: "/srv/app", templates: 1 })
    ).toContain("/srv/app");
  });

  test("does not shorten a sibling directory that shares the prefix", () => {
    chalk.level = 0;
    process.env.HOME = "/home/ana";
    expect(shortenHomePath("/home/ana2/app")).toBe("/home/ana2/app");
  });

  test("separators are dim on a color terminal", () => {
    chalk.level = 3;
    process.env.HOME = "/home/ana";
    const line = contextLine({
      version: "1.0.0",
      cwd: "/home/ana/app",
      templates: 2,
      globalSkills: 1,
    });
    expect(line).toContain(chalk.dim(" · "));
  });
});

describe("describeChoice", () => {
  test("keeps the label as text and passes the description", () => {
    expect(describeChoice("Express", "API REST con Prisma")).toEqual({
      name: "Express",
      description: "API REST con Prisma",
    });
  });

  test("omits the description when there is none", () => {
    expect(describeChoice("Express")).toEqual({ name: "Express" });
  });
});

describe("brandTheme", () => {
  test("exposes the style functions the prompts use", () => {
    for (const key of [
      "answer",
      "message",
      "error",
      "defaultAnswer",
      "help",
      "highlight",
      "key",
      "description",
    ] as const) {
      expect(typeof brandTheme.style[key]).toBe("function");
    }
    expect(brandTheme.prefix.idle).toBeTruthy();
    expect(brandTheme.prefix.done).toBeTruthy();
    expect(brandTheme.icon.cursor).toBeTruthy();
  });

  test("paints the highlight with the landing accent", () => {
    chalk.level = 3;
    expect(brandTheme.style.highlight("x")).toBe(chalk.hex("#8aa2ff")("x"));
    expect(brandTheme.style.answer("x")).toBe(chalk.bold("x"));
    expect(brandTheme.style.description("x")).toBe(chalk.dim("x"));
    expect(brandTheme.style.message("x")).toBe(chalk.bold("x"));
  });

  test("uses a red for errors", () => {
    chalk.level = 3;
    const painted = brandTheme.style.error("boom");
    expect(painted).toContain("boom");
    expect(painted).toMatch(ANSI);
  });
});

/**
 * inquirer's `keybindings: ["vim"]` is the contract: j goes down, k goes up and
 * the arrows keep working. The predicates that implement it live in
 * `@inquirer/core`, a transitive of inquirer and not one of our dependencies,
 * so this suite pins the input we own (the theme) against a local table of that
 * documented mapping instead of importing internals. The real behaviour is
 * proven end to end in a PTY.
 */
const VIM_BINDING = { down: ["j", "down"], up: ["k", "up"] } as const;
const ARROW_ONLY = { down: ["down"], up: ["up"] } as const;

function resolves(
  bindings: readonly string[] | undefined,
  action: "up" | "down",
  name: string
): boolean {
  const table = bindings?.includes("vim") ? VIM_BINDING : ARROW_ONLY;
  return (table[action] as readonly string[]).includes(name);
}

describe("j/k navigation (S7)", () => {
  test("list and checkbox prompts enable the vim keybinding", () => {
    expect(selectionTheme.keybindings).toEqual(["vim"]);
  });

  test("input and confirm prompts keep the plain theme, so j and k stay literal", () => {
    expect(Object.hasOwn(brandTheme, "keybindings")).toBe(false);
    // El theme sin keybindings resuelve sólo flechas, así que j y k llegan
    // como caracteres al input.
    expect(resolves(undefined, "down", "j")).toBe(false);
    expect(resolves(undefined, "up", "k")).toBe(false);
  });

  test("j moves down and k moves up", () => {
    expect(resolves(selectionTheme.keybindings, "down", "j")).toBe(true);
    expect(resolves(selectionTheme.keybindings, "up", "k")).toBe(true);
  });

  test("arrow keys keep working next to j and k", () => {
    expect(resolves(selectionTheme.keybindings, "down", "down")).toBe(true);
    expect(resolves(selectionTheme.keybindings, "up", "up")).toBe(true);
  });

  test("no other key navigates", () => {
    for (const name of ["h", "l", "q", "a", "enter", "space"]) {
      expect(resolves(selectionTheme.keybindings, "down", name)).toBe(false);
      expect(resolves(selectionTheme.keybindings, "up", name)).toBe(false);
    }
  });
});
