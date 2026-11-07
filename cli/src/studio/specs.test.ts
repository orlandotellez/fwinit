/**
 * Árbol de `specs/` y lectura de una spec concreta (T3, S3 y S5).
 *
 * Dos reglas del feature se juegan acá y no se pueden verificar leyendo el
 * código: que un proyecto sin `specs/` reporte `found=false` en vez de fallar
 * (S5: el resto del studio sigue usable), y que ni el árbol ni la lectura
 * puedan salirse de la carpeta `specs/` (S6). Por eso los tests construyen
 * proyectos reales en `mkdtemp` — nunca el `specs/` del repo — y ejercitan
 * symlinks reales con `fs.symlink`.
 */
import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { buildSpecsTree, readSpecFile, SpecPathError } from "./specs.js";
import type { SpecNode, SpecsTree } from "./types.js";

const scratch: string[] = [];

async function makeDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
}

/** Crea un proyecto temporal con los archivos dados (rutas relativas). */
async function makeProject(files: Record<string, string>): Promise<string> {
  const root = await makeDir("fwinit-studio-project-");
  for (const [relative, content] of Object.entries(files)) {
    const full = join(root, relative);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content);
  }
  return root;
}

/** Proyecto con `specs/` y un directorio `outside/` hermano de specs. */
async function makeProjectWithOutside(files: Record<string, string>) {
  const root = await makeProject(files);
  const outside = await makeDir("fwinit-studio-outside-");
  await writeFile(join(outside, "secret.md"), "# Secret\n");
  return { root, outside };
}

afterEach(async () => {
  while (scratch.length > 0) {
    await rm(scratch.pop()!, { recursive: true, force: true });
  }
});

/** Forma compacta del árbol para comparar sin bytes ni timestamps. */
function outline(nodes: SpecNode[]): unknown[] {
  return nodes.map((node) => ({
    name: node.name,
    path: node.path,
    type: node.type,
    children: node.children ? outline(node.children) : undefined,
  }));
}

async function treeOf(root: string): Promise<SpecsTree> {
  return buildSpecsTree(root);
}

describe("buildSpecsTree", () => {
  test("ordena directorios antes que archivos, case-insensitive, y resume totales", async () => {
    const guide = "# Guide\n";
    const deep = "# N\n";
    const root = await makeProject({
      "specs/docs/guide.md": guide,
      "specs/docs/deep/n.md": deep,
      "specs/01-a.md": "a\n",
      "specs/02-b.md": "b\n",
      "specs/Tasks.md": "T\n",
      "specs/alpha.md": "al\n",
      "specs/Zeta.md": "Z\n",
      "specs/node_modules/pkg/x.md": "x\n",
      "specs/.git/config": "c\n",
      "specs/.hidden/secret.md": "s\n",
    });
    // Directorio vacío: un módulo puede existir sin archivos todavía.
    await mkdir(join(root, "specs", "modules"), { recursive: true });

    const tree = await treeOf(root);

    expect(tree.found).toBe(true);
    expect(tree.root).toBe(join(root, "specs"));
    expect(tree.projectRoot).toBe(root);
    expect(tree.sections).toEqual(["docs", "modules"]);
    expect(outline(tree.tree)).toEqual([
      {
        name: "docs",
        path: "docs",
        type: "dir",
        children: [
          {
            name: "deep",
            path: "docs/deep",
            type: "dir",
            children: [
              { name: "n.md", path: "docs/deep/n.md", type: "file", children: undefined },
            ],
          },
          { name: "guide.md", path: "docs/guide.md", type: "file", children: undefined },
        ],
      },
      { name: "modules", path: "modules", type: "dir", children: [] },
      { name: "01-a.md", path: "01-a.md", type: "file", children: undefined },
      { name: "02-b.md", path: "02-b.md", type: "file", children: undefined },
      { name: "alpha.md", path: "alpha.md", type: "file", children: undefined },
      { name: "Tasks.md", path: "Tasks.md", type: "file", children: undefined },
      { name: "Zeta.md", path: "Zeta.md", type: "file", children: undefined },
    ]);
    expect(tree.totals).toEqual({
      files: 7,
      dirs: 3,
      bytes: [guide, deep, "a\n", "b\n", "T\n", "al\n", "Z\n"].reduce(
        (total, content) => total + Buffer.byteLength(content),
        0
      ),
    });
    expect(Number.isNaN(Date.parse(tree.generatedAt))).toBe(false);
  });

  test("found=false cuando el proyecto no tiene specs/ (S5)", async () => {
    const root = await makeProject({ "package.json": "{}\n" });

    const tree = await treeOf(root);

    expect(tree.found).toBe(false);
    expect(tree.root).toBeNull();
    expect(tree.sections).toEqual([]);
    expect(tree.tree).toEqual([]);
    expect(tree.totals).toEqual({ files: 0, dirs: 0, bytes: 0 });
    expect(tree.projectRoot).toBe(root);
    expect(Number.isNaN(Date.parse(tree.generatedAt))).toBe(false);
  });

  test("found=false sin lanzar cuando el proyecto ni existe", async () => {
    const missing = join(tmpdir(), "fwinit-studio-does-not-exist-xyz");

    const tree = await treeOf(missing);

    expect(tree.found).toBe(false);
    expect(tree.root).toBeNull();
    expect(tree.totals).toEqual({ files: 0, dirs: 0, bytes: 0 });
  });

  test("ignora symlinks en vez de seguirlos", async () => {
    const { root, outside } = await makeProjectWithOutside({
      "specs/README.md": "# Readme\n",
    });
    await symlink(join(outside, "secret.md"), join(root, "specs", "link.md"));
    await symlink(outside, join(root, "specs", "linkdir"));

    const tree = await treeOf(root);

    expect(outline(tree.tree)).toEqual([
      { name: "README.md", path: "README.md", type: "file", children: undefined },
    ]);
    expect(tree.totals).toEqual({
      files: 1,
      dirs: 0,
      bytes: Buffer.byteLength("# Readme\n"),
    });
  });
});

describe("readSpecFile", () => {
  test("happy path: titulo, html, headings, bytes y modified de disco", async () => {
    const content = "# Guide\n\nTexto con **bold**.\n";
    const root = await makeProject({ "specs/docs/guide.md": content });
    const specsRoot = join(root, "specs");
    const full = join(specsRoot, "docs", "guide.md");

    const file = await readSpecFile({ specsRoot, projectRoot: root }, "docs/guide.md");

    expect(file.path).toBe("docs/guide.md");
    expect(file.absolutePath).toBe(full);
    expect(file.title).toBe("Guide");
    expect(file.markdown).toBe(content);
    expect(file.html).toContain('<h1 id="guide">Guide</h1>');
    expect(file.html).toContain("<strong>bold</strong>");
    expect(file.headings).toEqual([{ level: 1, text: "Guide", id: "guide" }]);
    expect(file.bytes).toBe(Buffer.byteLength(content));
    expect(file.modified).toBe((await stat(full)).mtime.toISOString());
    expect(file.warnings).toEqual([]);
  });

  test("sin heading nivel 1 el titulo cae al nombre del archivo", async () => {
    const root = await makeProject({ "specs/notes.txt": "plain notes\n" });

    const file = await readSpecFile(
      { specsRoot: join(root, "specs"), projectRoot: root },
      "notes.txt"
    );

    expect(file.title).toBe("notes.txt");
    expect(file.headings).toEqual([]);
    expect(file.html).toBe("<p>plain notes</p>");
  });

  test("frontmatter sin cerrar agrega un warning sin fallar", async () => {
    const root = await makeProject({
      "specs/broken.md": "---\ntitle: x\n\n# Hi\n",
    });

    const file = await readSpecFile(
      { specsRoot: join(root, "specs"), projectRoot: root },
      "broken.md"
    );

    expect(file.warnings).toHaveLength(1);
    expect(file.warnings[0]).toContain("frontmatter");
    expect(file.html).toContain('<h1 id="hi">Hi</h1>');
  });

  test("rechaza con SpecPathError 'missing' un archivo inexistente", async () => {
    const root = await makeProject({ "specs/README.md": "# R\n" });

    await expect(
      readSpecFile({ specsRoot: join(root, "specs"), projectRoot: root }, "nope.md")
    ).rejects.toMatchObject({ name: "SpecPathError", code: "missing" });
  });

  test("rechaza con SpecPathError 'invalid' vacío, NUL y rutas absolutas", async () => {
    const root = await makeProject({ "specs/README.md": "# R\n" });
    const roots = { specsRoot: join(root, "specs"), projectRoot: root };

    for (const bad of ["", "docs/\u0000x.md", join(root, "specs", "README.md")]) {
      const error = await readSpecFile(roots, bad).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SpecPathError);
      expect((error as SpecPathError).code).toBe("invalid");
    }
  });

  test("rechaza con SpecPathError 'outside' un '../' que escapa del specs root", async () => {
    const root = await makeProject({
      "specs/README.md": "# R\n",
      "outside.md": "# Outside\n",
    });

    const error = await readSpecFile(
      { specsRoot: join(root, "specs"), projectRoot: root },
      "../outside.md"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpecPathError);
    expect((error as SpecPathError).code).toBe("outside");
  });

  test("rechaza con SpecPathError 'outside' un symlink que apunta fuera del specs root", async () => {
    const { root, outside } = await makeProjectWithOutside({
      "specs/README.md": "# R\n",
    });
    await symlink(join(outside, "secret.md"), join(root, "specs", "link.md"));

    const error = await readSpecFile(
      { specsRoot: join(root, "specs"), projectRoot: root },
      "link.md"
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpecPathError);
    expect((error as SpecPathError).code).toBe("outside");
  });

  test("rechaza con SpecPathError 'unsupported' extensiones y directorios", async () => {
    const root = await makeProject({
      "specs/notes.yaml": "a: 1\n",
      "specs/docs/guide.md": "# Guide\n",
    });
    const roots = { specsRoot: join(root, "specs"), projectRoot: root };

    for (const bad of ["notes.yaml", "docs"]) {
      const error = await readSpecFile(roots, bad).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(SpecPathError);
      expect((error as SpecPathError).code).toBe("unsupported");
    }
  });

  test("acepta ruta normalizada con './' inicial", async () => {
    const root = await makeProject({ "specs/docs/guide.md": "# Guide\n" });

    const file = await readSpecFile(
      { specsRoot: join(root, "specs"), projectRoot: root },
      "./docs/guide.md"
    );

    expect(file.path).toBe("docs/guide.md");
  });
});
