/**
 * Registro de templates: el array TEMPLATES es la única fuente que resuelve
 * `fwinit <alias>` — `templates/<FOLDER>/template.json` NO registra nada por sí
 * solo (solo se lee para mostrar postInit). Estos tests cubren las dos
 * direcciones: que el alias de Flutter resuelva, y que TODO template
 * registrado apunte a una carpeta real y consistente. El invariante es el
 * guard que hubiera detectado una entrada sin registración.
 */
import { describe, expect, test } from "bun:test";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import {
  TEMPLATES,
  findTemplate,
  getTemplatesByLayer,
  type Template,
} from "./templates.js";

const REPO_ROOT = join(import.meta.dir, "..", "..");

interface TemplateJson {
  name: string;
  runtime: string;
  layer: string;
  postInit?: { install?: string; dev?: string };
}

async function readTemplateJson(tpl: Template): Promise<TemplateJson> {
  const dir = join(REPO_ROOT, "templates", tpl.folder);
  const raw = await readFile(join(dir, "template.json"), "utf-8");
  return JSON.parse(raw) as TemplateJson;
}

describe("registro de Flutter", () => {
  test("el alias de Flutter resuelve a la misma entrada", () => {
    const flutter = findTemplate("flutter");
    expect(flutter).toBeDefined();
    expect(findTemplate("FLUTTER")).toBe(flutter!);
    expect(findTemplate("dart")).toBe(flutter!);
    expect(findTemplate("fwiflu")).toBe(flutter!);
  });

  test("la entrada de Flutter tiene runtime, layer y folder correctos", () => {
    const flutter = findTemplate("flutter");
    expect(flutter!.runtime).toBe("flutter");
    expect(flutter!.layer).toBe("frontend");
    expect(flutter!.folder).toBe("FLUTTER");
  });

  test("Flutter aparece solo en la capa frontend", () => {
    expect(getTemplatesByLayer("frontend")).toContain(findTemplate("flutter")!);
    expect(getTemplatesByLayer("backend")).not.toContain(findTemplate("flutter")!);
  });

  test("un alias inexistente no resuelve", () => {
    expect(findTemplate("nope")).toBeUndefined();
  });
});

describe("invariante de registro de TEMPLATES", () => {
  test("cada entrada apunta a una carpeta real con template.json consistente", async () => {
    expect(TEMPLATES.length).toBeGreaterThan(0);

    for (const tpl of TEMPLATES) {
      const dir = join(REPO_ROOT, "templates", tpl.folder);
      expect(existsSync(dir), `falta templates/${tpl.folder}`).toBe(true);

      const json = await readTemplateJson(tpl);

      expect(json.runtime, `runtime de templates/${tpl.folder}`).toBe(
        tpl.runtime
      );
      expect(json.layer, `layer de templates/${tpl.folder}`).toBe(tpl.layer);
      expect(typeof json.postInit?.install, `postInit.install de ${tpl.folder}`)
        .toBe("string");
      expect(json.postInit!.install!.length).toBeGreaterThan(0);
      expect(typeof json.postInit?.dev, `postInit.dev de ${tpl.folder}`).toBe(
        "string"
      );
      expect(json.postInit!.dev!.length).toBeGreaterThan(0);

      expect(findTemplate(json.name), `alias "${json.name}"`).toBe(tpl);
    }
  });
});
