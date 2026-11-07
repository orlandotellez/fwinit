/**
 * Menu identity for the interactive `fwinit` entry (specs S3 and S7).
 *
 * `brandTheme` is the single inquirer theme shared by the eleven prompts: it
 * uses only keys that inquirer 12 actually supports (`prefix`, `icon` and
 * `style.*`, plus `keybindings` for the list/checkbox prompts), so a key can
 * never be silently ignored. Colors come from the landing palette and go
 * through chalk, which already resolves truecolor/256/16 and turns into plain
 * text when the level is 0 (`--no-color`, `NO_COLOR`, non-TTY).
 *
 * `prefix` and `icon` are getters on purpose: chalk paints the string at call
 * time, and the theme is read by inquirer when a prompt starts. Baking them at
 * module load would keep escape sequences after `--no-color` had zeroed the
 * level.
 *
 * The small helpers around the prompt (context line, separators, choice
 * descriptions) live here too so the menu has one home.
 */
import { homedir } from "node:os";
import chalk from "chalk";

/** Landing-page accent. */
export const MENU_ACCENT = "#8aa2ff";

/** Error red: same family as the landing page, never a second palette. */
export const MENU_ERROR = "#f87171";

/** Width of the hairline separators between menu groups. */
const SEPARATOR_MAX = 48;

const accent = (text: string): string => chalk.hex(MENU_ACCENT)(text);

export interface BrandTheme {
  prefix: { idle: string; done: string };
  icon: { cursor: string; checked: string; unchecked: string };
  style: {
    answer: (text: string) => string;
    message: (text: string, status?: string) => string;
    error: (text: string) => string;
    defaultAnswer: (text: string) => string;
    help: (text: string) => string;
    highlight: (text: string) => string;
    key: (text: string) => string;
    description: (text: string) => string;
    disabled: (text: string) => string;
    disabledChoice: (text: string) => string;
    keysHelpTip: (keys: [string, string][]) => string | undefined;
  };
}

/** List/checkbox theme: the brand look plus the `j`/`k` navigation (S7). */
export interface SelectionTheme extends BrandTheme {
  keybindings: readonly ["vim"];
}

function themedPrefix(): BrandTheme["prefix"] {
  return { idle: accent("?"), done: accent("✔") };
}

function themedIcon(): BrandTheme["icon"] {
  return {
    cursor: accent("❯"),
    checked: accent("◉"),
    unchecked: chalk.dim("○"),
  };
}

const brandStyle: BrandTheme["style"] = {
  answer: (text) => chalk.bold(text),
  message: (text) => chalk.bold(text),
  error: (text) => chalk.hex(MENU_ERROR)(text),
  defaultAnswer: (text) => chalk.dim(`(${text})`),
  help: (text) => chalk.dim(text),
  highlight: (text) => accent(text),
  key: (text) => accent(chalk.bold(`<${text}>`)),
  description: (text) => chalk.dim(text),
  disabled: (text) => chalk.dim(`- ${text}`),
  disabledChoice: (text) => chalk.dim(`- ${text}`),
  keysHelpTip: (keys) =>
    keys
      .map(([key, action]) => `${chalk.bold(key)} ${chalk.dim(action)}`)
      .join(chalk.dim(" • ")),
};

/** Shared theme for every prompt, including input and confirm. */
export const brandTheme: BrandTheme = {
  get prefix() {
    return themedPrefix();
  },
  get icon() {
    return themedIcon();
  },
  style: brandStyle,
};

/**
 * Theme for the list and checkbox prompts. `keybindings: ["vim"]` is
 * inquirer's own opt-in for `j`/`k` as down/up: it adds nothing else (no `h`,
 * `l` or `q`) and leaves the arrow keys untouched. Input and confirm keep
 * `brandTheme`, so `j` and `k` stay literal characters there.
 */
export const selectionTheme: SelectionTheme = {
  get prefix() {
    return themedPrefix();
  },
  get icon() {
    return themedIcon();
  },
  style: brandStyle,
  keybindings: ["vim"],
};

/**
 * A dim hairline row (`─`) with an optional inline label, capped at 48
 * characters so it never wraps a normal terminal.
 */
export function separatorRow(label?: string, width = SEPARATOR_MAX): string {
  const total = Math.max(0, Math.min(Math.trunc(width), SEPARATOR_MAX));
  const text = label?.trim();
  if (!text) return chalk.dim("─".repeat(total));
  const head = `── ${text} `;
  const fill = Math.max(0, total - [...head].length);
  return chalk.dim(head + "─".repeat(fill));
}

/** Replaces the home prefix with `~`; anything outside home is untouched. */
export function shortenHomePath(path: string): string {
  const home = (process.env.HOME ?? homedir()).replace(/\/+$/, "");
  if (!home) return path;
  if (path === home) return "~";
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}

/**
 * One line under the banner: version, working directory, template count and,
 * when it is known, how many global skills are installed.
 */
export function contextLine(parts: {
  version: string;
  cwd: string;
  templates: number;
  globalSkills?: number;
}): string {
  const segments = [
    `v${parts.version}`,
    shortenHomePath(parts.cwd),
    `${parts.templates} templates`,
  ];
  if (parts.globalSkills !== undefined) {
    segments.push(`${parts.globalSkills} skills globales`);
  }
  return segments.join(chalk.dim(" · "));
}

/**
 * Choice with a label and its own description: inquirer renders the
 * description on a dim column instead of gluing it to the label.
 */
export function describeChoice(
  label: string,
  description?: string
): { name: string; description?: string } {
  return description === undefined
    ? { name: label }
    : { name: label, description };
}
