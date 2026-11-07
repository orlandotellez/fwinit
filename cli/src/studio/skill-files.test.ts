/**
 * Contenido de una skill instalada para `fwinit studio` (S7).
 *
 * El studio ya lista las skills; este módulo deja leer lo que la skill dice sin
 * escapar nunca del directorio de la skill. El test arma el layout real (HOME
 * descartable + proyecto descartable) porque las rutas se resuelven por target
 * en cada llamada, y cubre los tres frentes que rompen una implementación
 * ingenua: orden de listado, recorte de frontmatter al renderizar, y cada código
 * de error de contención (incluidos los symlinks plantados adentro).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { listSkillFiles, readSkillFile, SkillFileError } from "./skill-files.js";
import type { SkillFileErrorCode } from "./skill-files.js";
import type { SkillFileRef, SkillScope, SkillTargetId } from "./types.js";

const MAX_BYTES = 512 * 1024;

let root: string;
let home: string;
let projectRoot: string;
let skillDir: string;
let outsideFile: string;
let outsideDir: string;

const globalRef: SkillFileRef = { target: "opencode", scope: "global", name: "demo" };

const context = (): { projectRoot: string; home: string } => ({ projectRoot, home });

const SKILL_MD = [
  "---",
  "name: demo",
  "description: Skill de prueba",
  "metadata:",
  "  version: '2.0'",
  "---",
  "",
  "# Demo",
  "",
  "Cuerpo de la skill.",
  "",
].join("\n");

const COMMAND_MD = "# /demo\n\nEjecuta la skill.\n";
const EXAMPLE_MD = "# Ejemplo 3\n\nDetalle.\n";
const PY_SCRIPT = 'print("hola")\n';
/** Frontmatter abierto: el bloque nunca se cierra, así que no se recorta. */
const BROKEN_MD = "---\nname: roto\n\n# Sin cerrar\n\nCuerpo igual.\n";

async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "fwinit-studio-skill-files-"));
  home = join(root, "home");
  projectRoot = join(root, "project");
  outsideDir = join(root, "outside");
  outsideFile = join(outsideDir, "secreto.md");
  skillDir = join(home, ".config", "opencode", "skills", "demo");

  await mkdir(projectRoot, { recursive: true });
  await write(outsideFile, "# Secreto\n\nNunca se sirve.\n");

  await write(join(skillDir, "SKILL.md"), SKILL_MD);
  await write(join(skillDir, "command.md"), COMMAND_MD);
  await write(join(skillDir, "examples", "03-x.md"), EXAMPLE_MD);
  await write(join(skillDir, "scripts", "run.py"), PY_SCRIPT);
  await write(join(skillDir, "broken.md"), BROKEN_MD);
  // Extensiones no soportadas: no aparecen en el listado y fallan al leer.
  await write(join(skillDir, "diagrama.png"), "no es un png");
  // Archivo que supera el tope de 512 KB.
  await write(join(skillDir, "grande.md"), `# Grande\n\n${"a".repeat(MAX_BYTES)}\n`);
  // Archivo con un byte NUL temprano: binario disfrazado de markdown.
  await write(join(skillDir, "binario.md"), "abc\u0000def\n");
  // Entradas ocultas o de dependencias: nunca se listan.
  await write(join(skillDir, ".privado.md"), "# Oculto\n");
  await write(join(skillDir, ".git", "nota.md"), "# Oculto\n");
  await write(join(skillDir, "node_modules", "pkg", "readme.md"), "# Dep\n");
  // Symlinks plantados: ni se listan ni se siguen.
  await symlink(outsideFile, join(skillDir, "enlace.md"));
  await symlink(outsideDir, join(skillDir, "enlace-dir"));

  // Skill de scope project, para probar la resolución por scope.
  await write(
    join(projectRoot, ".opencode", "skills", "proyecto", "SKILL.md"),
    "# Proyecto\n\nSkill local.\n"
  );
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Espera un `SkillFileError` con el código pedido y devuelve el error. */
async function expectCode(
  promise: Promise<unknown>,
  code: SkillFileErrorCode
): Promise<SkillFileError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason
  );
  expect(error).toBeInstanceOf(SkillFileError);
  const typed = error as SkillFileError;
  expect(typed.code).toBe(code);
  expect(typed.message.length).toBeGreaterThan(0);
  return typed;
}

describe("listSkillFiles", () => {
  test("lists the skill files with SKILL.md and command.md first", async () => {
    const list = await listSkillFiles(context(), globalRef);

    expect(list.skill).toBe("demo");
    expect(list.dir).toBe(skillDir);
    expect(list.files.map((file) => file.path)).toEqual([
      "SKILL.md",
      "command.md",
      "binario.md",
      "broken.md",
      "examples/03-x.md",
      "grande.md",
      "scripts/run.py",
    ]);
  });

  test("reports bytes and kind for each entry", async () => {
    const list = await listSkillFiles(context(), globalRef);
    const byPath = new Map(list.files.map((file) => [file.path, file]));

    expect(byPath.get("SKILL.md")).toEqual({
      path: "SKILL.md",
      bytes: Buffer.byteLength(SKILL_MD, "utf8"),
      kind: "markdown",
    });
    expect(byPath.get("scripts/run.py")).toEqual({
      path: "scripts/run.py",
      bytes: Buffer.byteLength(PY_SCRIPT, "utf8"),
      kind: "text",
    });
    expect(byPath.get("examples/03-x.md")?.kind).toBe("markdown");
  });

  test("skips symlinks, dot entries, node_modules and unknown extensions", async () => {
    const list = await listSkillFiles(context(), globalRef);
    const paths = list.files.map((file) => file.path);

    expect(paths).not.toContain("enlace.md");
    expect(paths).not.toContain("enlace-dir/secreto.md");
    expect(paths).not.toContain(".privado.md");
    expect(paths.some((path) => path.startsWith(".git/"))).toBe(false);
    expect(paths.some((path) => path.startsWith("node_modules/"))).toBe(false);
    expect(paths).not.toContain("diagrama.png");
  });

  test("walks nested directories in project scope too", async () => {
    const list = await listSkillFiles(context(), {
      target: "opencode",
      scope: "project",
      name: "proyecto",
    });

    expect(list.skill).toBe("proyecto");
    expect(list.files.map((file) => file.path)).toEqual(["SKILL.md"]);
  });
});

describe("readSkillFile", () => {
  test("renders a markdown file without its frontmatter but keeps the raw text", async () => {
    const file = await readSkillFile(context(), globalRef, "SKILL.md");

    expect(file.path).toBe("SKILL.md");
    expect(file.kind).toBe("markdown");
    expect(file.bytes).toBe(Buffer.byteLength(SKILL_MD, "utf8"));
    expect(file.text).toBe(SKILL_MD);
    // El frontmatter es metadata: se recorta antes de renderizar.
    expect(file.html).toContain("<h1");
    expect(file.html).toContain("Cuerpo de la skill.");
    expect(file.html).not.toContain("description: Skill de prueba");
    expect(file.warnings).toEqual([]);
    expect(Number.isNaN(Date.parse(file.modified))).toBe(false);
  });

  test("returns plain text with no html property for a .py file", async () => {
    const file = await readSkillFile(context(), globalRef, "scripts/run.py");

    expect(file.kind).toBe("text");
    expect(file.text).toBe(PY_SCRIPT);
    expect("html" in file).toBe(false);
    expect(file.warnings).toEqual([]);
  });

  test("renders a nested markdown file", async () => {
    const file = await readSkillFile(context(), globalRef, "examples/03-x.md");

    expect(file.path).toBe("examples/03-x.md");
    expect(file.kind).toBe("markdown");
    expect(file.html).toContain("<h1");
  });

  test("warns about an unterminated frontmatter block and still renders", async () => {
    const file = await readSkillFile(context(), globalRef, "broken.md");

    expect(file.text).toBe(BROKEN_MD);
    expect(file.warnings.length).toBeGreaterThan(0);
    expect(file.html).toBeDefined();
    expect(file.html).toContain("Sin cerrar");
  });

  test("normalizes a redundant relative path", async () => {
    const file = await readSkillFile(context(), globalRef, "./SKILL.md");

    expect(file.path).toBe("SKILL.md");
  });
});

describe("readSkillFile containment", () => {
  test("rejects an unknown target", async () => {
    await expectCode(
      readSkillFile(
        context(),
        { target: "emacs" as SkillTargetId, scope: "global", name: "demo" },
        "SKILL.md"
      ),
      "invalid"
    );
  });

  test("rejects an unknown scope", async () => {
    await expectCode(
      readSkillFile(
        context(),
        { target: "opencode", scope: "machine" as SkillScope, name: "demo" },
        "SKILL.md"
      ),
      "invalid"
    );
  });

  test("rejects a name with a slash, a traversal or a leading dot", async () => {
    await expectCode(
      listSkillFiles(context(), { ...globalRef, name: "demo/nested" }),
      "invalid"
    );
    await expectCode(listSkillFiles(context(), { ...globalRef, name: ".." }), "invalid");
    await expectCode(listSkillFiles(context(), { ...globalRef, name: "." }), "invalid");
    await expectCode(listSkillFiles(context(), { ...globalRef, name: ".oculto" }), "invalid");
    await expectCode(listSkillFiles(context(), { ...globalRef, name: "   " }), "invalid");
    await expectCode(listSkillFiles(context(), { ...globalRef, name: "demo\\nested" }), "invalid");
  });

  test("reports a missing skill directory", async () => {
    await expectCode(listSkillFiles(context(), { ...globalRef, name: "no-existe" }), "missing");
  });

  test("rejects absolute paths, traversal and NUL in the file path", async () => {
    await expectCode(readSkillFile(context(), globalRef, "/etc/passwd"), "invalid");
    await expectCode(readSkillFile(context(), globalRef, "../secreto.md"), "invalid");
    await expectCode(readSkillFile(context(), globalRef, "examples/../../x.md"), "invalid");
    await expectCode(readSkillFile(context(), globalRef, "SKILL\u0000.md"), "invalid");
    await expectCode(readSkillFile(context(), globalRef, ""), "invalid");
  });

  test("rejects a path that is not a regular file", async () => {
    await expectCode(readSkillFile(context(), globalRef, "examples"), "missing");
    await expectCode(readSkillFile(context(), globalRef, "no-existe.md"), "missing");
  });

  test("rejects extensions outside the allowlist", async () => {
    await expectCode(readSkillFile(context(), globalRef, "diagrama.png"), "unsupported");
  });

  test("rejects a file over 512 KB with a reason", async () => {
    const error = await expectCode(readSkillFile(context(), globalRef, "grande.md"), "unsupported");
    expect(error.message).toContain("512");
  });

  test("rejects a file with NUL bytes with a reason", async () => {
    const error = await expectCode(readSkillFile(context(), globalRef, "binario.md"), "unsupported");
    expect(error.message.toLowerCase()).toContain("binario");
  });

  test("rejects a NUL byte far past the sniff window", async () => {
    // El fixture vive sólo dentro de este test: el listado compartido no cambia.
    const path = join(skillDir, "binario-tardio.md");
    await write(path, "# x\n" + "B".repeat(5000) + "\u0000tail\n");
    try {
      const error = await expectCode(readSkillFile(context(), globalRef, "binario-tardio.md"), "unsupported");
      expect(error.message.toLowerCase()).toContain("binario");
    } finally {
      await rm(path, { force: true });
    }
  });

  test("rejects a symlinked file that resolves outside the skill", async () => {
    await expectCode(readSkillFile(context(), globalRef, "enlace.md"), "outside");
  });

  test("rejects a file reached through a symlinked directory outside the skill", async () => {
    await expectCode(readSkillFile(context(), globalRef, "enlace-dir/secreto.md"), "outside");
  });
});
