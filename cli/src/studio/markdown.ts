/**
 * Renderer de markdown propio del studio (S3).
 *
 * El studio muestra `specs/*.md` en el navegador, y esas specs pueden venir de
 * cualquier proyecto, así que este archivo es superficie de seguridad además de
 * presentación:
 * - todo el texto de origen se escapa carácter por carácter antes de emitir
 *   markup, por lo que el HTML crudo del documento nunca pasa;
 * - sólo `http(s)` y `mailto` producen anchors con URL; cualquier otro esquema
 *   (`javascript:`, `data:`, `vbscript:`, `file:`, …) se degrada a texto plano;
 * - las imágenes no emiten `<img>` ni piden recursos remotos: quedan como
 *   `span.md-img` con el alt, que el cliente puede mostrar como placeholder;
 * - los enlaces relativos a otro `.md`/`.markdown` se marcan con
 *   `data-spec-link` para que el cliente navegue dentro de `specs/` en vez de
 *   pedirle al servidor una ruta arbitraria.
 *
 * Se implementa a mano (sin dependencias, L3) porque el CLI publica sólo
 * `dist` y un renderer de markdown completo sería peso muerto para el resto de
 * los comandos. El subconjunto soportado es el que usan las specs reales:
 * headings, párrafos, fences, inline code, énfasis, links, imágenes, listas
 * (un nivel de anidamiento), task lists, tablas, blockquotes y reglas.
 */
import type { SpecHeading } from "./types.js";

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapa texto de origen para que nunca se interprete como markup. */
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]!);
}

/** `Install & Run!` -> `install-run`; la puntuación se descarta. */
function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug === "" ? "section" : slug;
}

/** Texto plano de un heading o de un alt: sin marcadores inline. */
function plainText(source: string): string {
  return source
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*\*|\*\*|\*|___|__|_|~~/g, "")
    .trim();
}

interface LinkMatch {
  text: string;
  target: string;
  end: number;
}

/** Parsea `[texto](destino)` desde `start` (que apunta al `[`). */
function matchLink(source: string, start: number): LinkMatch | null {
  const close = source.indexOf("]", start + 1);
  if (close === -1) return null;
  if (source[close + 1] !== "(") return null;

  const destination = matchDestination(source, close + 1);
  if (destination === null) return null;

  return {
    text: source.slice(start + 1, close),
    target: destination.target,
    end: destination.end,
  };
}

/** Parsea el destino de un link contando paréntesis balanceados. */
function matchDestination(
  source: string,
  openParen: number
): { target: string; end: number } | null {
  let depth = 1;
  let index = openParen + 1;

  while (index < source.length) {
    const char = source[index];
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return { target: source.slice(openParen + 1, index), end: index + 1 };
      }
    }
    index += 1;
  }

  return null;
}

const SAFE_PROTOCOL = /^(?:https?|mailto):/i;
const ANY_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;
const SPEC_PATH = /\.(?:md|markdown)$/i;

/** Ruta POSIX normalizada para navegar dentro de `specs/`. */
function normalizeSpecPath(target: string): string {
  const path = target.split("#")[0]!.split("?")[0]!.replace(/\\/g, "/");
  const segments: string[] = [];

  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    segments.push(segment);
  }

  return segments.join("/");
}

function renderLink(text: string, rawTarget: string): string {
  const target = rawTarget.trim();
  const inner = renderInline(text);

  if (SAFE_PROTOCOL.test(target)) {
    return `<a href="${esc(target)}" rel="noreferrer noopener">${inner}</a>`;
  }

  // Cualquier otro esquema (javascript:, data:, vbscript:, file:, …) queda
  // como texto: nunca se emite un anchor con un destino que no controlamos.
  if (ANY_PROTOCOL.test(target)) return inner;

  // Rutas absolutas o protocol-relative tampoco son specs relativas.
  if (target.startsWith("/") || target.startsWith("\\")) return inner;

  const specPath = normalizeSpecPath(target);
  if (SPEC_PATH.test(specPath)) {
    return `<a href="#" data-spec-link="${esc(specPath)}">${inner}</a>`;
  }

  return inner;
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/** Busca el cierre de un énfasis: una run del mismo carácter de largo ≥ size. */
function findEmphasisClose(
  source: string,
  char: string,
  size: number,
  from: number
): { start: number; length: number } | null {
  let index = from;

  while (index < source.length) {
    if (source[index] !== char) {
      index += 1;
      continue;
    }

    let length = 0;
    while (source[index + length] === char) length += 1;

    if (length >= size) {
      // Un cierre `_` pegado a una palabra (snake_case) no cierra énfasis.
      if (char === "_" && WORD_CHAR.test(source[index + length] ?? "")) {
        index += length;
        continue;
      }
      return { start: index, length };
    }

    index += length;
  }

  return null;
}

function matchEmphasis(
  source: string,
  start: number
): { html: string; end: number } | null {
  const char = source[start]!;

  if (char === "~") {
    if (source[start + 1] !== "~") return null;
    const close = source.indexOf("~~", start + 2);
    if (close <= start + 2) return null;
    return {
      html: `<del>${renderInline(source.slice(start + 2, close))}</del>`,
      end: close + 2,
    };
  }

  let run = 0;
  while (source[start + run] === char && run < 3) run += 1;

  if (char === "_" && start > 0 && WORD_CHAR.test(source[start - 1]!)) return null;

  for (let size = run; size >= 1; size -= 1) {
    const close = findEmphasisClose(source, char, size, start + size);
    if (close === null) continue;
    if (close.start === start + size) continue; // contenido vacío

    // Run de cierre más largo que la apertura: los marcadores sobrantes
    // pertenecen al contenido (`**bold *inner***` → strong con em adentro).
    const extra = close.length - size;
    const content = source.slice(start + size, close.start + extra);
    const inner = renderInline(content);

    if (size === 3) {
      return { html: `<strong><em>${inner}</em></strong>`, end: close.start + close.length };
    }
    if (size === 2) {
      return { html: `<strong>${inner}</strong>`, end: close.start + close.length };
    }
    return { html: `<em>${inner}</em>`, end: close.start + close.length };
  }

  return null;
}

/** Renderiza inline: escapa todo y sólo agrega el markup que reconoce. */
function renderInline(source: string): string {
  let html = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index]!;

    if (char === "`") {
      const close = source.indexOf("`", index + 1);
      if (close > index + 1) {
        html += `<code>${esc(source.slice(index + 1, close))}</code>`;
        index = close + 1;
        continue;
      }
    }

    if (char === "!" && source[index + 1] === "[") {
      const image = matchLink(source, index + 1);
      if (image !== null) {
        html += `<span class="md-img">${renderInline(image.text)}</span>`;
        index = image.end;
        continue;
      }
    }

    if (char === "[") {
      const link = matchLink(source, index);
      if (link !== null) {
        html += renderLink(link.text, link.target);
        index = link.end;
        continue;
      }
    }

    if (char === "*" || char === "_" || char === "~") {
      const emphasis = matchEmphasis(source, index);
      if (emphasis !== null) {
        html += emphasis.html;
        index = emphasis.end;
        continue;
      }
    }

    html += esc(char);
    index += 1;
  }

  return html;
}

const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`]*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^ {0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s{0,3}>/;

interface RawItem {
  indent: number;
  ordered: boolean;
  text: string;
}

function tableCells(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  if (!line.includes("|")) return false;
  const cells = tableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell));
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index]!;
  if (line.trim() === "") return true;
  if (FENCE.test(line)) return true;
  if (HEADING.test(line)) return true;
  if (RULE.test(line)) return true;
  if (QUOTE.test(line)) return true;
  if (LIST_ITEM.test(line)) return true;
  if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]!)) {
    return true;
  }
  return false;
}

export function renderMarkdown(markdown: string): {
  html: string;
  headings: SpecHeading[];
} {
  const headings: SpecHeading[] = [];
  const usedIds = new Map<string, number>();

  const uniqueId = (base: string): string => {
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  const renderItem = (item: RawItem): { html: string; task: boolean } => {
    const task = /^\[([ xX])\]\s+(.*)$/.exec(item.text);
    if (task !== null) {
      const checked = task[1]!.toLowerCase() === "x";
      const box = `<input type="checkbox" disabled${checked ? " checked" : ""}>`;
      return { html: `${box} ${renderInline(task[2]!)}`, task: true };
    }
    return { html: renderInline(item.text), task: false };
  };

  const renderItems = (items: RawItem[], ordered: boolean): string => {
    const tag = ordered ? "ol" : "ul";
    const parts = items.map((item) => {
      const { html, task } = renderItem(item);
      const cls = task ? ' class="task"' : "";
      return `<li${cls}>${html}</li>`;
    });
    return `<${tag}>${parts.join("")}</${tag}>`;
  };

  const renderBlocks = (lines: string[]): string => {
    const out: string[] = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index]!;

      if (line.trim() === "") {
        index += 1;
        continue;
      }

      const fence = FENCE.exec(line);
      if (fence !== null) {
        const marker = fence[1]!;
        const fenceChar = marker[0]!;
        const lang = fence[2]!.trim().split(/\s+/)[0] ?? "";
        const body: string[] = [];
        index += 1;

        while (index < lines.length) {
          const candidate = lines[index]!;
          const trimmed = candidate.trim();
          const closes =
            trimmed.length >= marker.length &&
            trimmed.split("").every((char) => char === fenceChar);
          if (closes) {
            index += 1;
            break;
          }
          body.push(candidate);
          index += 1;
        }

        const cls = lang === "" ? "" : ` class="lang-${esc(lang)}"`;
        out.push(`<pre><code${cls}>${esc(body.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = HEADING.exec(line);
      if (heading !== null) {
        const level = heading[1]!.length;
        const raw = heading[2]!.replace(/\s+#+\s*$/, "").trim();
        const text = plainText(raw);
        const id = uniqueId(slugify(text));
        headings.push({ level, text, id });
        out.push(`<h${level} id="${esc(id)}">${renderInline(raw)}</h${level}>`);
        index += 1;
        continue;
      }

      if (RULE.test(line)) {
        out.push("<hr>");
        index += 1;
        continue;
      }

      if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]!)) {
        const header = tableCells(line);
        const rows: string[][] = [];
        index += 2;

        while (
          index < lines.length &&
          lines[index]!.trim() !== "" &&
          lines[index]!.includes("|")
        ) {
          rows.push(tableCells(lines[index]!));
          index += 1;
        }

        const head = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
        const body = rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`
          )
          .join("");
        out.push(
          `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
        );
        continue;
      }

      if (QUOTE.test(line)) {
        const quoted: string[] = [];
        while (index < lines.length && QUOTE.test(lines[index]!)) {
          quoted.push(lines[index]!.replace(/^\s{0,3}>\s?/, ""));
          index += 1;
        }
        out.push(`<blockquote>${renderBlocks(quoted)}</blockquote>`);
        continue;
      }

      if (LIST_ITEM.test(line)) {
        const items: RawItem[] = [];
        let baseIndent = -1;

        while (index < lines.length) {
          const match = LIST_ITEM.exec(lines[index]!);
          if (match === null) break;
          const indent = match[1]!.length;
          if (baseIndent === -1) baseIndent = indent;
          items.push({
            indent,
            ordered: /\d/.test(match[2]!),
            text: match[3]!,
          });
          index += 1;
        }

        // Un nivel de anidamiento: los ítems más indentados cuelgan del último
        // ítem de primer nivel.
        const top: { item: RawItem; children: RawItem[] }[] = [];
        for (const item of items) {
          if (item.indent > baseIndent && top.length > 0) {
            top[top.length - 1]!.children.push(item);
          } else {
            top.push({ item, children: [] });
          }
        }

        const ordered = top[0]!.item.ordered;
        const lis = top.map(({ item, children }) => {
          const { html, task } = renderItem(item);
          const cls = task ? ' class="task"' : "";
          const nested = children.length > 0 ? renderItems(children, children[0]!.ordered) : "";
          return `<li${cls}>${html}${nested}</li>`;
        });

        out.push(`<${ordered ? "ol" : "ul"}>${lis.join("")}</${ordered ? "ol" : "ul"}>`);
        continue;
      }

      const paragraph: string[] = [];
      const start = index;
      while (index < lines.length) {
        const current = lines[index]!;
        if (current.trim() === "") break;
        if (index > start && isBlockStart(lines, index)) break;
        paragraph.push(current.trim());
        index += 1;
      }
      out.push(`<p>${renderInline(paragraph.join("\n"))}</p>`);
    }

    return out.join("");
  };

  return { html: renderBlocks(markdown.replace(/\r\n?/g, "\n").split("\n")), headings };
}
