/**
 * Instalación global del bundle: copia real sobre el filesystem.
 *
 * `planAgentBundle` dice qué se copia, pero no prueba que la copia funcione.
 * Este archivo cierra esa brecha con un HOME aislado — el mismo camino que
 * corre `fwinit skills` — sobre la biblioteca de diseño, que es la entrada más
 * frágil del bundle: adentro viaja el catálogo search-driven
 * (`ui-ux-pro-max/`) con su motor Python y su base de datos. Si esa carpeta se
 * copia incompleta, cada búsqueda devuelve 0 resultados y el agente cae a
 * defaults genéricos sin avisar. Se cubren los dos modos de fallo que un plan
 * correcto no detecta: que falte parte del catálogo y que la reinstalación
 * acumule drift en vez de refrescar.
 */
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, lstat, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installGlobalSkills,
  uninstallGlobalSkills,
  type GlobalTargetSpec,
} from "./global-skills.js";
import { AGENT_BUNDLE } from "./agent-bundle.js";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const SOLO_DESIGN = AGENT_BUNDLE.filter((e) => e.dir === "design");

// Cuántos commands publica la biblioteca. Se deriva del repo en vez de
// hardcodearlo: sumar un estilo no debería romper este test.
async function comandosDeLaBiblioteca(): Promise<number> {
  return (await readdir(join(REPO_ROOT, "skills", "design", "commands"))).filter(
    (f) => f.endsWith(".md")
  ).length;
}

// Los 4 destinos reales (mismo layout que resolveGlobalTargets), pero con
// `root` adentro de un HOME temporal: no tocamos las skills globales de quien
// corre los tests. `agents` va sin commandsDir a propósito, para ejercitar el
// destino que no soporta comandos.
function destinos(home: string): GlobalTargetSpec[] {
  return [
    {
      id: "opencode",
      label: "opencode",
      root: join(home, "opencode"),
      skillsDir: "skills",
      commandsDir: "command",
    },
    {
      id: "pi",
      label: "pi",
      root: join(home, "pi"),
      skillsDir: "skills",
      commandsDir: "prompts",
    },
    {
      id: "gentle-shell",
      label: "gentle-shell",
      root: join(home, "gentle-shell"),
      skillsDir: "skills",
      commandsDir: "prompts",
    },
    { id: "agents", label: "agents", root: join(home, "agents"), skillsDir: "skills" },
  ];
}

let home: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), "fwinit-global-skills-"));
});

afterAll(async () => {
  await rm(home, { recursive: true, force: true });
});

describe("instalación global de la biblioteca de diseño", () => {
  test("copia la biblioteca entera en los 4 destinos", async () => {
    const targets = destinos(home);
    const resultados = await installGlobalSkills(REPO_ROOT, targets, SOLO_DESIGN);
    const comandos = await comandosDeLaBiblioteca();

    for (const result of resultados) {
      expect(result.error, result.error).toBeUndefined();
      // La biblioteca (recursiva) + un archivo por command, salvo en los
      // destinos sin carpeta de commands.
      expect(result.copied).toBe(1 + (result.target.commandsDir ? comandos : 0));

      const design = join(result.target.root, "skills", "design");
      // Los estilos curados siguen viajando…
      expect((await lstat(join(design, "dark-luxury", "SKILL.md"))).isFile()).toBe(
        true
      );
      // …y el catálogo viaja COMPLETO. Sin data/ ni scripts/ la skill degrada
      // en silencio a defaults genéricos: por eso se verifica cada pieza.
      const catalogo = join(design, "ui-ux-pro-max");
      expect((await lstat(join(catalogo, "SKILL.md"))).isFile()).toBe(true);
      expect((await lstat(join(catalogo, "NOTICE.md"))).isFile()).toBe(true);
      expect((await readdir(join(catalogo, "scripts"))).length).toBeGreaterThan(0);
      expect((await readdir(join(catalogo, "data"))).length).toBeGreaterThan(0);
      expect((await readdir(join(catalogo, "references"))).length).toBeGreaterThan(0);

      // El comando de la familia de diseño, con el nombre pedido.
      if (result.target.commandsDir) {
        const cmdDir = join(result.target.root, result.target.commandsDir);
        expect(
          (await lstat(join(cmdDir, "design-ui-ux-pro-max.md"))).isFile()
        ).toBe(true);
        // Y el resto de la familia sigue ahí.
        expect((await lstat(join(cmdDir, "design-dark-luxury.md"))).isFile()).toBe(
          true
        );
      }
    }
  });

  test("reinstalar refresca sin anidar ni duplicar el catálogo", async () => {
    const targets = destinos(home);
    await installGlobalSkills(REPO_ROOT, targets, SOLO_DESIGN);
    await installGlobalSkills(REPO_ROOT, targets, SOLO_DESIGN);

    for (const target of targets) {
      const catalogo = join(target.root, "skills", "design", "ui-ux-pro-max");
      // NOTICE.md tiene que seguir siendo un ARCHIVO: como carpeta quedaría en
      // NOTICE.md/NOTICE.md y la licencia dejaría de viajar legible.
      expect((await readdir(catalogo)).includes("NOTICE.md")).toBe(true);
      expect(await readdir(join(catalogo, "NOTICE.md")).catch(() => null)).toBeNull();
      // El catálogo no se re-anida dentro de sí mismo al reinstalar.
      expect(
        await readdir(join(catalogo, "ui-ux-pro-max")).catch(() => null)
      ).toBeNull();
    }
  });

  test("desinstalar no deja restos", async () => {
    const targets = destinos(home);
    await installGlobalSkills(REPO_ROOT, targets, SOLO_DESIGN);
    const resultados = await uninstallGlobalSkills(targets, SOLO_DESIGN);

    for (const result of resultados) {
      expect(result.error, result.error).toBeUndefined();
      const skills = join(result.target.root, "skills");
      expect(await readdir(skills).catch(() => [])).not.toContain("design");

      // La familia entera de commands se limpia por prefijo `design-`, incluido
      // el del catálogo, que no comparte nombre con ninguna carpeta suelta.
      if (result.target.commandsDir) {
        const cmdDir = join(result.target.root, result.target.commandsDir);
        const restantes = await readdir(cmdDir).catch(() => []);
        expect(restantes.filter((f) => f.startsWith("design"))).toEqual([]);
      }
    }
  });

  // El motor es Python 3 stdlib. En una máquina sin Python la skill degrada a
  // sus defaults por diseño, así que el test se saltea en vez de fallar.
  const python = Bun.which("python3") ?? Bun.which("python");
  test.skipIf(python === null)(
    "el buscador instalado responde consultas reales",
    async () => {
      const targets = destinos(home);
      await installGlobalSkills(REPO_ROOT, targets, SOLO_DESIGN);
      const script = join(
        targets[0].root,
        "skills",
        "design",
        "ui-ux-pro-max",
        "scripts",
        "search.py"
      );

      // cwd fuera del skill: el motor resuelve data/ contra su propio path.
      const proc = Bun.spawnSync(
        [python!, script, "keyboard focus modal", "--domain", "ux"],
        { cwd: tmpdir() }
      );
      const salida = proc.stdout.toString();

      expect(proc.exitCode).toBe(0);
      // 0 resultados es el síntoma exacto de una skill instalada sin su data/.
      expect(salida).not.toContain("Found:** 0 results");
      expect(salida).toContain("Found:");
    }
  );
});
