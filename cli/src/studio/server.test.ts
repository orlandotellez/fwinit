import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  SkillFileContent,
  SkillFileList,
  SkillsReport,
  SpecFile,
  SpecsTree,
  StudioServer,
} from "./types.js";
import { startStudio } from "./server.js";

const cleaned: string[] = [];
let studio: StudioServer;
let projectRoot: string;
let emptyProject: string;
let emptyStudio: StudioServer;
let home: string;

async function makeDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  cleaned.push(dir);
  return dir;
}

async function seedProject(): Promise<string> {
  const root = await makeDir("fwinit-studio-project-");
  await mkdir(join(root, "specs", "docs"), { recursive: true });
  await mkdir(join(root, "specs", "modules", "backend"), { recursive: true });
  await writeFile(
    join(root, "specs", "docs", "01-descripcion.md"),
    "# Descripción del proyecto\n\nTexto normal.\n\n<script>alert(1)</script>\n\n[Ver stack](../modules/backend/01-stack.md)\n",
    "utf8"
  );
  await writeFile(
    join(root, "specs", "modules", "backend", "01-stack.md"),
    "# Stack\n\n| Campo | Valor |\n| --- | --- |\n| Lenguaje | TypeScript |\n",
    "utf8"
  );
  // Un archivo real con extensión no soportada, para probar el 415 del servidor.
  await writeFile(join(root, "specs", "docs", "diagrama.png"), "not really a png", "utf8");
  await writeFile(
    join(root, "specs", "docs", "03-con-frontmatter.md"),
    "---\ntitle: Guía\nowner: equipo\n---\n\n# Guía\n\nCuerpo.\n",
    "utf8"
  );
  return root;
}

async function seedHome(): Promise<string> {
  const dir = await makeDir("fwinit-studio-home-");
  const skillDir = join(dir, ".config", "opencode", "skills", "create-specs");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    join(skillDir, "SKILL.md"),
    "---\nname: create-specs\ndescription: Genera la carpeta specs/ del proyecto\nmetadata:\n  author: Orlando\n  version: '1.0'\nlicense: MIT\n---\n\n# create-specs\n\nCuerpo de la skill.\n",
    "utf8"
  );
  await writeFile(join(skillDir, "command.md"), "# /create-specs\n\nPrompt del comando.\n", "utf8");
  // Extensión no soportada y un symlink que sale de la skill, para el 415 y el 403.
  await writeFile(join(skillDir, "diagrama.png"), "no es un png", "utf8");
  const secret = join(dir, "secreto.md");
  await writeFile(secret, "# Secreto\n\nNo se sirve.\n", "utf8");
  await symlink(secret, join(skillDir, "enlace.md"));
  return dir;
}

beforeAll(async () => {
  projectRoot = await seedProject();
  emptyProject = await makeDir("fwinit-studio-empty-");
  home = await seedHome();
  studio = await startStudio({
    port: 0,
    projectRoot,
    home,
    open: false,
    version: "9.9.9",
  });
  emptyStudio = await startStudio({
    port: 0,
    projectRoot: emptyProject,
    home,
    open: false,
    version: "9.9.9",
  });
});

afterAll(async () => {
  await studio?.close();
  await emptyStudio?.close();
  await Promise.all(cleaned.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("studio server", () => {
  test("binds loopback on an ephemeral port", () => {
    expect(studio.address.host).toBe("127.0.0.1");
    expect(studio.address.port).toBeGreaterThan(0);
    expect(studio.address.url).toBe(`http://127.0.0.1:${studio.address.port}`);
  });

  test("serves the document with the landing design tokens and a strict CSP", async () => {
    const response = await fetch(`${studio.address.url}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(html).toContain("fwinit");
    expect(html).toContain("v9.9.9");
    expect(html).toContain("Filtrar skills");
    expect(html).toContain("--accent: #8aa2ff");
    expect(html).toContain("fwinit:theme");
    // `~` shortening in the client depends on this being in the inline meta.
    expect(html).toContain(`"home":"${home}"`);
  });

  test("reports installed skills with frontmatter metadata", async () => {
    const response = await fetch(`${studio.address.url}/api/skills`);
    const report = (await response.json()) as SkillsReport;

    expect(response.status).toBe(200);
    expect(report.targets).toHaveLength(3);
    expect(report.totals.global).toBe(1);
    expect(report.totals.project).toBe(0);

    const opencode = report.targets.find((target) => target.id === "opencode");
    expect(opencode?.globalExists).toBe(true);
    expect(opencode?.skills[0]).toMatchObject({
      name: "create-specs",
      description: "Genera la carpeta specs/ del proyecto",
      version: "1.0",
      license: "MIT",
      author: "Orlando",
      scope: "global",
      target: "opencode",
    });
    expect(opencode?.skills[0]?.path).toBe(join(home, ".config", "opencode", "skills", "create-specs", "SKILL.md"));
  });

  test("reports the specs tree of the project it was started in", async () => {
    const response = await fetch(`${studio.address.url}/api/specs`);
    const tree = (await response.json()) as SpecsTree;

    expect(response.status).toBe(200);
    expect(tree.found).toBe(true);
    expect(tree.projectRoot).toBe(projectRoot);
    expect(tree.sections).toEqual(["docs", "modules"]);
    expect(tree.totals.files).toBe(4);
  });

  test("renders a spec file and escapes source HTML", async () => {
    const response = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("docs/01-descripcion.md")}`
    );
    const file = (await response.json()) as SpecFile;

    expect(response.status).toBe(200);
    expect(file.title).toBe("Descripción del proyecto");
    expect(file.html).toContain("&lt;script&gt;");
    expect(file.html).not.toContain("<script>alert");
    expect(file.html).toContain('data-spec-link="modules/backend/01-stack.md"');
    expect(file.headings[0]).toMatchObject({ level: 1, text: "Descripción del proyecto" });
  });

  test("normalizes internal spec links to paths from the specs root", async () => {
    const response = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("modules/backend/01-stack.md")}`
    );
    const file = (await response.json()) as SpecFile;
    expect(response.status).toBe(200);
    expect(file.html).toContain("<table>");
  });

  test("refuses spec paths that leave the specs root", async () => {
    const traversal = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("../../etc/passwd")}`
    );
    expect([400, 403]).toContain(traversal.status);

    const absolute = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("/etc/passwd")}`
    );
    expect(absolute.status).toBe(400);
  });

  test("serves one skill's file list and the content of a file", async () => {
    const listResponse = await fetch(
      `${studio.address.url}/api/skills/files?target=opencode&scope=global&name=create-specs`
    );
    const list = (await listResponse.json()) as SkillFileList;

    expect(listResponse.status).toBe(200);
    expect(listResponse.headers.get("cache-control")).toBe("no-store");
    expect(list.skill).toBe("create-specs");
    expect(list.dir).toBe(join(home, ".config", "opencode", "skills", "create-specs"));
    expect(list.files.map((file) => file.path)).toEqual(["SKILL.md", "command.md"]);

    const contentResponse = await fetch(
      `${studio.address.url}/api/skills/file?target=opencode&scope=global&name=create-specs&path=SKILL.md`
    );
    const content = (await contentResponse.json()) as SkillFileContent;

    expect(contentResponse.status).toBe(200);
    expect(contentResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(contentResponse.headers.get("cache-control")).toBe("no-store");
    expect(content.path).toBe("SKILL.md");
    expect(content.kind).toBe("markdown");
    expect(content.text).toContain("name: create-specs");
    expect(content.html).toContain("<h1");
    expect(content.html).not.toContain("name: create-specs");
  });

  test("maps skill file errors to 400, 403, 404 and 415", async () => {
    const base = `${studio.address.url}/api/skills/file?target=opencode&scope=global&name=create-specs`;

    // Parámetros obligatorios faltantes.
    expect(
      (await fetch(`${studio.address.url}/api/skills/files?target=opencode`)).status
    ).toBe(400);
    expect(
      (await fetch(`${studio.address.url}/api/skills/files?name=create-specs`)).status
    ).toBe(400);
    expect((await fetch(base)).status).toBe(400);

    // `invalid`: target desconocido.
    const unknownTarget = await fetch(
      `${studio.address.url}/api/skills/files?target=emacs&scope=global&name=create-specs`
    );
    expect(unknownTarget.status).toBe(400);
    expect(((await unknownTarget.json()) as { code: string }).code).toBe("invalid");

    // `outside`: traversal y symlink plantado adentro de la skill.
    const traversal = await fetch(`${base}&path=${encodeURIComponent("../../etc/passwd")}`);
    expect([400, 403]).toContain(traversal.status);
    expect((await fetch(`${base}&path=enlace.md`)).status).toBe(403);

    // `missing`: la skill no existe.
    expect(
      (
        await fetch(
          `${studio.address.url}/api/skills/files?target=opencode&scope=global&name=no-existe`
        )
      ).status
    ).toBe(404);

    // `unsupported`: extensión fuera de la allowlist.
    expect((await fetch(`${base}&path=diagrama.png`)).status).toBe(415);
  });

  test("reports a missing spec file as 404 and a bad extension as 415", async () => {
    const missing = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("docs/nope.md")}`
    );
    expect(missing.status).toBe(404);

    const unsupported = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("docs/diagrama.png")}`
    );
    expect(unsupported.status).toBe(415);
  });

  test("answers a project without specs/ without failing", async () => {
    const treeResponse = await fetch(`${emptyStudio.address.url}/api/specs`);
    const tree = (await treeResponse.json()) as SpecsTree;
    expect(treeResponse.status).toBe(200);
    expect(tree.found).toBe(false);
    expect(tree.root).toBeNull();

    const page = await fetch(`${emptyStudio.address.url}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("fwinit");
  });

  test("rejects writes and unknown routes", async () => {
    const post = await fetch(`${studio.address.url}/api/skills`, { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET, HEAD");

    const unknown = await fetch(`${studio.address.url}/nope`);
    expect(unknown.status).toBe(404);
  });

  test("exposes the project root and version for the status bar", async () => {
    const response = await fetch(`${studio.address.url}/api/meta`);
    const meta = (await response.json()) as {
      version: string;
      projectRoot: string;
      home: string;
    };
    expect(meta.version).toBe("9.9.9");
    expect(meta.projectRoot).toBe(projectRoot);
    expect(meta.home).toBe(home);
  });

  /** Petición cruda: `fetch` normaliza rutas y no deja falsificar `Host`. */
  function rawRequest(path: string, host?: string): Promise<number> {
    const address = new URL(studio.address.url);
    return new Promise((resolveStatus, rejectRequest) => {
      const request = httpRequest(
        {
          host: address.hostname,
          port: address.port,
          path,
          headers: host ? { host } : {},
        },
        (response) => {
          response.resume();
          response.on("end", () => resolveStatus(response.statusCode ?? 0));
        }
      );
      request.on("error", rejectRequest);
      request.end();
    });
  }

  test("rejects a foreign Host header", async () => {
    expect(await rawRequest("/", "evil.example")).toBe(403);
    expect(await rawRequest("/api/specs", "attacker.test:4321")).toBe(403);
    expect(await rawRequest("/", `127.0.0.1:${studio.address.port}`)).toBe(200);
    expect(await rawRequest("/", `localhost:${studio.address.port}`)).toBe(200);
  });

  test("answers malformed percent-encoding with 400", async () => {
    expect(await rawRequest("/%")).toBe(400);
    expect(await rawRequest("/api/specs/%zz")).toBe(400);
  });

  test("never renders a spec frontmatter block as document content", async () => {
    const response = await fetch(
      `${studio.address.url}/api/specs/file?path=${encodeURIComponent("docs/03-con-frontmatter.md")}`
    );
    const file = (await response.json()) as SpecFile;

    expect(response.status).toBe(200);
    expect(file.title).toBe("Guía");
    expect(file.html).not.toContain("owner: equipo");
    expect(file.html).toContain("<p>Cuerpo.</p>");
    // El markdown crudo se conserva para cualquier consumidor que lo necesite.
    expect(file.markdown).toContain("owner: equipo");
    expect(file.warnings).toEqual([]);
  });
});
