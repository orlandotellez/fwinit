/**
 * Bundle de skills: registro y plan de instalación.
 *
 * El invariante que cubre este archivo es el fallo silencioso más caro del
 * bundle: una skill instalada SIN su cuerpo. `ui-ux-pro-max` es una skill
 * search-driven — si viaja solo su SKILL.md (sin data/ ni scripts/), cada
 * búsqueda devuelve 0 resultados y el agente cae a los defaults genéricos sin
 * que nadie lo note. Por eso se verifica de las dos direcciones: que el plan
 * la incluya, y que el catálogo exista realmente en el repo.
 *
 * Vive dentro de la biblioteca de diseño (`skills/design/`) para que su comando
 * sea `/design-ui-ux-pro-max`, igual que el resto de la familia `/design-<estilo>`.
 */
import { describe, expect, test } from "bun:test";
import { access } from "fs/promises";
import { join } from "path";
import { AGENT_BUNDLE, planAgentBundle, type AgentBundleEntry } from "./agent-bundle.js";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const CATALOGO = "skills/design/ui-ux-pro-max";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("biblioteca de diseño", () => {
  test("está registrada como library, no como skill suelta", () => {
    const entry = AGENT_BUNDLE.find(
      (e): e is Extract<AgentBundleEntry, { kind: "library" }> =>
        e.dir === "design" && e.kind === "library"
    );
    expect(entry).toBeDefined();
    // Opcional a propósito: el resto del bundle se instala igual sin ella.
    expect(entry!.required).toBe(false);
    // El catálogo NO se registra por separado: viaja dentro de la library.
    expect(AGENT_BUNDLE.some((e) => e.dir === "ui-ux-pro-max")).toBe(false);
  });

  test("el plan copia la biblioteca entera recursivamente", async () => {
    const plan = await planAgentBundle(REPO_ROOT);
    const lib = plan.installs.find((i) => i.to === "skills/design");
    expect(lib, "la biblioteca de diseño no se planifica").toBeDefined();
    expect(lib!.recursive).toBe(true);
  });

  test("expone /design-ui-ux-pro-max como el resto de la familia", async () => {
    const plan = await planAgentBundle(REPO_ROOT);
    const cmd = plan.installs.find(
      (i) => i.to === "commands/design-ui-ux-pro-max.md"
    );
    expect(cmd, "no se planifica /design-ui-ux-pro-max").toBeDefined();
    expect(await exists(cmd!.from)).toBe(true);
  });

  test("cada comando de la biblioteca se planifica", async () => {
    const plan = await planAgentBundle(REPO_ROOT);
    const planificados = plan.installs
      .filter((i) => i.to.startsWith("commands/"))
      .map((i) => i.to);
    for (const esperado of [
      "commands/design.md",
      "commands/design-dark-luxury.md",
      "commands/design-docs-starship.md",
      "commands/design-glassmorphism.md",
      "commands/design-minimal-dashboard.md",
      "commands/design-minimal-light.md",
      "commands/design-neo-brutalist.md",
      "commands/design-ui-ux-pro-max.md",
    ]) {
      expect(planificados, `falta ${esperado}`).toContain(esperado);
    }
  });

  test("los archivos que el SKILL.md promete existen en el repo", async () => {
    // Cada path es una promesa explícita del SKILL.md: sin ellos la skill
    // degrada a la tabla de defaults sin avisar.
    const requeridos = [
      `${CATALOGO}/SKILL.md`,
      `${CATALOGO}/NOTICE.md`,
      `${CATALOGO}/scripts/search.py`,
      `${CATALOGO}/scripts/core.py`,
      `${CATALOGO}/data/styles.csv`,
      `${CATALOGO}/data/ux-guidelines.csv`,
      `${CATALOGO}/references/quick-reference.md`,
      `${CATALOGO}/references/pro-rules.md`,
    ];
    for (const rel of requeridos) {
      expect(await exists(join(REPO_ROOT, rel)), `no existe ${rel}`).toBe(true);
    }
  });

  test("cada install del plan apunta a un origen real", async () => {
    const plan = await planAgentBundle(REPO_ROOT);
    for (const item of plan.installs) {
      expect(
        await exists(item.from),
        `el plan copia un origen inexistente: ${item.from}`
      ).toBe(true);
    }
  });

  test("los extras de carpeta preexistentes siguen siendo recursivos", async () => {
    const plan = await planAgentBundle(REPO_ROOT);
    const examples = plan.installs.find(
      (i) => i.to === "skills/create-specs/examples"
    );
    expect(examples, "create-specs/examples dejó de planificarse").toBeDefined();
    expect(examples!.recursive).toBe(true);
  });
});
