/**
 * Banner for the interactive `fwinit` entry (specs S1 and S2).
 *
 * Rendering is pure so it can be tested without a terminal: the caller says
 * how wide the terminal is, whether it is a TTY and whether color is allowed,
 * and `resolveBannerMode` decides between the 44-column wordmark, the compact
 * one and the single plain line. `printBanner` is the only part that reads
 * `process.stdout`; it is a thin wrapper around the pure renderers.
 *
 * No ANSI is emitted when color is off: the plain line is a real fallback, not
 * a painted line with the escapes stripped.
 */
import chalk from "chalk";

export type BannerMode = "block" | "compact" | "plain";

/** Landing-page accent; chalk degrades it to 256/16 colors on its own. */
export const BANNER_ACCENT = "#8aa2ff";

const TAGLINE = "scaffolding full stack";

const BLOCK_WORDMARK = [
  "███████╗██╗    ██╗██╗███╗   ██╗██╗████████╗",
  "██╔════╝██║    ██║██║████╗  ██║██║╚══██╔══╝",
  "█████╗  ██║ █╗ ██║██║██╔██╗ ██║██║   ██║",
  "██╔══╝  ██║███╗██║██║██║╚██╗██║██║   ██║",
  "██║     ╚███╔███╔╝██║██║ ╚████║██║   ██║",
  "╚═╝      ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚═╝   ╚═╝",
];

const COMPACT_WORDMARK = [
  "█▀▀ █ █ █ █▄ █ █ ▀█▀",
  "█▀  █▄█ █ █ ▀█ █  █",
];

const BLOCK_WIDTH = 44;

/** Right-pads every line so a block wordmark is a real rectangle. */
function padTo(lines: string[], width: number): string[] {
  return lines.map((line) => {
    const missing = width - [...line].length;
    return missing > 0 ? line + " ".repeat(missing) : line;
  });
}

const BLOCK = padTo(BLOCK_WORDMARK, BLOCK_WIDTH);
const COMPACT = padTo(
  COMPACT_WORDMARK,
  Math.max(...COMPACT_WORDMARK.map((line) => [...line].length))
);

/**
 * Which variant the terminal can afford. Width is only consulted when the
 * output can actually be styled: a piped run never gets half a banner.
 */
export function resolveBannerMode(options: {
  columns: number;
  isTTY: boolean;
  color: boolean;
}): BannerMode {
  const { columns, isTTY, color } = options;
  if (!isTTY || !color) return "plain";
  if (columns >= 60) return "block";
  if (columns >= 24) return "compact";
  return "plain";
}

/** The wordmark lines for a mode; `plain` deliberately has no art. */
export function renderWordmark(mode: BannerMode): string[] {
  if (mode === "block") return [...BLOCK];
  if (mode === "compact") return [...COMPACT];
  return [];
}

function plainLine(version: string): string {
  return `fwinit v${version} — ${TAGLINE}`;
}

/**
 * The full banner. Without color (or on the plain mode) the result is a single
 * line with zero escape sequences, so a piped or `NO_COLOR` run stays clean.
 */
export function renderBanner(options: {
  version: string;
  mode: BannerMode;
  color: boolean;
}): string {
  const { version, mode, color } = options;
  if (mode === "plain" || !color) return plainLine(version);

  const accent = (text: string) => chalk.hex(BANNER_ACCENT)(text);
  const art = renderWordmark(mode).map(accent);
  return [...art, "", TAGLINE, chalk.dim(`v${version}`)].join("\n");
}

/** Prints the banner plus one blank line, using the real terminal options. */
export function printBanner(options: { version: string }): void {
  const color = chalk.level > 0;
  // A PTY that never reported its size (script(1), some CI terminals) gives 0,
  // which is "unknown", not "zero columns": fall back to 80 so the wordmark
  // is not lost to a terminal that simply did not answer.
  const columns = process.stdout.columns ?? 80;
  const mode = resolveBannerMode({
    columns: columns > 0 ? columns : 80,
    isTTY: process.stdout.isTTY === true,
    color,
  });
  process.stdout.write(
    `${renderBanner({ version: options.version, mode, color })}\n\n`
  );
}
