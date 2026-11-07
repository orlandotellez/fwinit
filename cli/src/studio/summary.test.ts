/**
 * Summary block of the studio (spec S8).
 *
 * `fwinit studio` y la opción "Abrir studio" del menú imprimen el mismo
 * resumen: extraerlo a un renderer puro permite probar el bloque exacto —
 * etiquetas, alineación, colores y las líneas en blanco que lo enmarcan — sin
 * levantar un servidor. El caso "sin specs/" va como passthrough: el texto del
 * fallback lo arma el caller, el renderer no lo reescribe.
 */
import { afterEach, describe, expect, test } from "bun:test";
import chalk from "chalk";
import {
  printStudioSummary,
  renderStudioSummary,
  type StudioSummaryInput,
} from "./summary.js";

const savedLevel = chalk.level;

afterEach(() => {
  chalk.level = savedLevel;
});

const fullInput: StudioSummaryInput = {
  version: "1.8.0",
  projectRoot: "/home/x/proyecto",
  skillsLine: "12 (7 globales · 5 del proyecto)",
  specsLine: "9 archivos en specs/",
  url: "http://127.0.0.1:4321",
};

describe("renderStudioSummary", () => {
  test("renders the exact block the studio command prints", () => {
    chalk.level = 0;
    expect(renderStudioSummary(fullInput)).toEqual([
      "",
      "  fwinit studio",
      "",
      "  Proyecto  /home/x/proyecto",
      "  Skills    12 (7 globales · 5 del proyecto)",
      "  Specs     9 archivos en specs/",
      "  URL       http://127.0.0.1:4321",
      "",
      "  Ctrl+C para cerrar",
      "",
    ]);
  });

  test("paints the URL cyan and the labels dim", () => {
    chalk.level = 1;
    const lines = renderStudioSummary(fullInput);
    const urlLine = lines.find((line) => line.includes(fullInput.url))!;
    expect(urlLine).toContain(chalk.cyan(fullInput.url));
    expect(urlLine).toContain(chalk.dim("URL"));
    const skillsLine = lines.find((line) => line.includes("globales"))!;
    expect(skillsLine).toContain(chalk.dim("Skills"));
    const specsLine = lines.find((line) => line.includes("archivos en specs/"))!;
    expect(specsLine).toContain(chalk.dim("Specs"));
  });

  test("keeps the bold header escapes the command printed, line by line", () => {
    // El comando imprimía `chalk.bold("\n  fwinit studio\n")` de una sola vez;
    // chalk 5 reabre el bold después de cada salto de línea. Estos son los
    // bytes exactos de esos tres tramos, para que la salida no cambie.
    chalk.level = 1;
    expect(renderStudioSummary(fullInput).slice(0, 3)).toEqual([
      "\u001b[1m\u001b[22m",
      "\u001b[1m  fwinit studio\u001b[22m",
      "\u001b[1m\u001b[22m",
    ]);
  });

  test("passes a missing-specs line through unchanged", () => {
    chalk.level = 0;
    const input: StudioSummaryInput = {
      ...fullInput,
      specsLine: "sin carpeta specs/ (creala con la skill create-specs)",
    };
    expect(renderStudioSummary(input)).toContain(`  Specs     ${input.specsLine}`);
  });
});

describe("printStudioSummary", () => {
  test("logs every rendered line once, in order", () => {
    chalk.level = 0;
    const logged: string[] = [];
    const saved = console.log;
    console.log = (...args: unknown[]) => {
      logged.push(args.map((arg) => String(arg)).join(" "));
    };
    try {
      printStudioSummary(fullInput);
    } finally {
      console.log = saved;
    }
    expect(logged).toEqual(renderStudioSummary(fullInput));
  });
});
