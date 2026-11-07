/**
 * Minimal YAML frontmatter reader for skill files.
 *
 * The studio only needs the handful of keys a skill actually declares
 * (`description`, `license`, and `metadata.author` / `metadata.version`), so
 * this is deliberately not a YAML parser (decision L3: no new runtime
 * dependency). It understands a leading `---` block, flat `key: value` pairs,
 * one nested block, quoted values, comments, blank lines and CRLF.
 *
 * Failures are data, never exceptions: a malformed or unterminated block
 * returns empty `data` plus exactly one warning so the caller can fall back to
 * the body text for the description and still render the skill.
 */

/** Frontmatter `data` keys are flat; nested keys are dotted (`metadata.author`). */
export interface Frontmatter {
  data: Record<string, string>;
  warnings: string[];
}

/** Frontmatter plus the markdown body that follows the closing delimiter. */
export interface ParsedFrontmatter extends Frontmatter {
  body: string;
}

const DELIMITER = "---";
const KEY_VALUE = /^([A-Za-z0-9_.-]+)[ \t]*:[ \t]*(.*)$/;
const MAX_LINE_IN_WARNING = 80;

function splitLines(source: string): string[] {
  return source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function stripQuotes(value: string): string {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' || first === "'") && first === last) {
    return value.slice(1, -1);
  }
  return value;
}

function malformed(reason: string, body: string): ParsedFrontmatter {
  // A terminated-but-broken block loses its data, but the body after the
  // closing delimiter is still readable prose: keep it for the description
  // fallback so the skill is never rendered without one.
  return { data: {}, warnings: [`malformed frontmatter: ${reason}`], body };
}

/**
 * Parses a skill source into frontmatter data plus its body.
 *
 * A block only counts when `---` is the first line; anything else is body.
 */
export function parseFrontmatter(source: string): ParsedFrontmatter {
  const lines = splitLines(source);

  if ((lines[0] ?? "").trimEnd() !== DELIMITER) {
    return { data: {}, warnings: [], body: source };
  }

  let closing = -1;
  for (let index = 1; index < lines.length; index++) {
    if (lines[index].trimEnd() === DELIMITER) {
      closing = index;
      break;
    }
  }
  if (closing === -1) {
    return {
      data: {},
      warnings: ["frontmatter: block is unterminated"],
      body: "",
    };
  }

  const data: Record<string, string> = {};
  const body = lines.slice(closing + 1).join("\n");
  let parent: string | null = null;

  for (const raw of lines.slice(1, closing)) {
    // Blank lines and full-line comments carry no data.
    if (!raw.trim()) continue;
    if (raw.trimStart().startsWith("#")) continue;

    const indented = /^[ \t]/.test(raw);
    const match = KEY_VALUE.exec(raw.trim());
    if (!match) {
      return malformed(
        `line is not "key: value": ${raw.trim().slice(0, MAX_LINE_IN_WARNING)}`,
        body
      );
    }

    const key = match[1];
    const rawValue = match[2].trim();
    const value = stripQuotes(rawValue);

    if (indented) {
      // Only one nesting level is supported, and only under a parent key.
      if (parent === null) {
        return malformed(`indented key without a parent block: ${key}`, body);
      }
      if (rawValue === "") {
        return malformed(`nested key has no value: ${parent}.${key}`, body);
      }
      data[`${parent}.${key}`] = value;
      continue;
    }

    if (rawValue === "") {
      // `metadata:` opens a nested block; it carries no value of its own.
      parent = key;
      continue;
    }

    parent = null;
    data[key] = value;
  }

  return { data, warnings: [], body };
}

/** Frontmatter-only view for callers that do not need the body. */
export function readFrontmatter(source: string): Frontmatter {
  const { data, warnings } = parseFrontmatter(source);
  return { data, warnings };
}
