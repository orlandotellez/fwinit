/**
 * Banner rendering for the interactive `fwinit` entry (specs S1 and S2).
 *
 * The banner must never depend on the terminal it cannot see: the mode is
 * resolved from columns/isTTY/color, the plain variant carries no escape
 * sequences at all, and the color variant degrades through chalk levels
 * (truecolor / 256 / 16 / none) instead of assuming one.
 */
import { afterEach, describe, expect, test } from "bun:test";
import chalk from "chalk";
import {
  renderBanner,
  renderWordmark,
  resolveBannerMode,
} from "./banner.js";

const ANSI = /\u001b\[[0-9;]*m/;

// The 44-column block wordmark, unquoted from the feature document.
const BLOCK = [
  "███████╗██╗    ██╗██╗███╗   ██╗██╗████████╗",
  "██╔════╝██║    ██║██║████╗  ██║██║╚══██╔══╝",
  "█████╗  ██║ █╗ ██║██║██╔██╗ ██║██║   ██║",
  "██╔══╝  ██║███╗██║██║██║╚██╗██║██║   ██║",
  "██║     ╚███╔███╔╝██║██║ ╚████║██║   ██║",
  "╚═╝      ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝",
];

const COMPACT = [
  "█▀▀ █ █ █ █▄ █ █ ▀█▀",
  "█▀  █▄█ █ █ ▀█ █  █",
];

const savedLevel = chalk.level;

afterEach(() => {
  chalk.level = savedLevel;
});

describe("resolveBannerMode", () => {
  test("block from 60 columns up", () => {
    expect(resolveBannerMode({ columns: 60, isTTY: true, color: true })).toBe(
      "block"
    );
  });

  test("compact at 59 columns", () => {
    expect(resolveBannerMode({ columns: 59, isTTY: true, color: true })).toBe(
      "compact"
    );
  });

  test("compact at 24 columns", () => {
    expect(resolveBannerMode({ columns: 24, isTTY: true, color: true })).toBe(
      "compact"
    );
  });

  test("plain below 24 columns", () => {
    expect(resolveBannerMode({ columns: 23, isTTY: true, color: true })).toBe(
      "plain"
    );
  });

  test("plain without a TTY even on a wide terminal", () => {
    expect(resolveBannerMode({ columns: 120, isTTY: false, color: true })).toBe(
      "plain"
    );
  });

  test("plain without color even on a wide TTY", () => {
    expect(resolveBannerMode({ columns: 120, isTTY: true, color: false })).toBe(
      "plain"
    );
  });
});

describe("renderWordmark", () => {
  test("block keeps 6 lines of 44 columns", () => {
    const lines = renderWordmark("block");
    expect(lines).toHaveLength(6);
    for (const line of lines) {
      expect([...line]).toHaveLength(44);
    }
  });

  test("block keeps the documented art", () => {
    const lines = renderWordmark("block").map((line) => line.trimEnd());
    expect(lines).toEqual(BLOCK);
  });

  test("compact keeps the 2-line variant", () => {
    const lines = renderWordmark("compact");
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.trimEnd())).toEqual(COMPACT);
  });

  test("plain draws no art", () => {
    expect(renderWordmark("plain")).toEqual([]);
  });
});

describe("renderBanner", () => {
  test("without color there is no ANSI at all and the plain line carries the version", () => {
    chalk.level = 3;
    const out = renderBanner({ version: "1.7.1", mode: "block", color: false });
    expect(out).not.toMatch(ANSI);
    expect(out.endsWith("fwinit v1.7.1 — scaffolding full stack")).toBe(true);
  });

  test("with color the wordmark and tagline are painted when chalk allows it", () => {
    chalk.level = 3;
    const out = renderBanner({ version: "1.7.1", mode: "block", color: true });
    expect(out).toMatch(ANSI);
    expect(out).toContain(BLOCK[0]);
    expect(out).toContain("scaffolding full stack");
    expect(out).toContain("v1.7.1");
  });

  test("with color but chalk level 0 there are no escape sequences", () => {
    chalk.level = 0;
    const out = renderBanner({ version: "1.7.1", mode: "block", color: true });
    expect(out).not.toMatch(ANSI);
    expect(out).toContain(BLOCK[0]);
  });

  test("plain mode is a single line", () => {
    chalk.level = 3;
    const out = renderBanner({ version: "2.0.0", mode: "plain", color: true });
    expect(out).not.toMatch(ANSI);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toContain("fwinit v2.0.0");
  });
});
