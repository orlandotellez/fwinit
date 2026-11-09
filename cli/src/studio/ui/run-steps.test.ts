import { describe, expect, test } from "bun:test";
import { RUN_STEPS_SOURCE } from "./run-steps.js";

/**
 * Cómo el panel convierte una línea de salida en una fila legible (spec S18).
 *
 * Igual que el select de modelo (S15) y la restauración del run (S16), esta
 * lógica se escribe una sola vez y se interpola en `CLIENT_JS`: acá se evalúa
 * exactamente el texto que corre en el navegador, no una copia paralela.
 *
 * La regla que se prueba es la del panel: cada línea no-prosa es una fila
 * `verbo · destino · resultado`, y la prosa queda como prosa. Nada se descarta:
 * lo que no se entiende se muestra crudo, con su texto intacto.
 */

interface RunLine {
  n: number;
  kind: "text" | "tool" | "status" | "raw";
  text: string;
}

interface Step {
  n: number;
  kind: string;
  verb: string;
  target: string;
  body: string;
}

interface RunStepsApi {
  stepOfLine(line: RunLine | null | undefined): Step | null;
  stepLabel(step: Step | null | undefined): string;
  stepCount(lines: RunLine[] | null | undefined): number;
  currentActivity(lines: RunLine[] | null | undefined): string;
}

const api = new Function(`${RUN_STEPS_SOURCE}; return {
  stepOfLine: stepOfLine,
  stepLabel: stepLabel,
  stepCount: stepCount,
  currentActivity: currentActivity
};`)() as RunStepsApi;

function line(n: number, kind: RunLine["kind"], text: string): RunLine {
  return { n, kind, text };
}

describe("run steps (S18)", () => {
  test("una herramienta con destino se parte en verbo y destino", () => {
    expect(api.stepOfLine(line(4, "tool", "read specs/frontend/01-style.md"))).toEqual({
      n: 4,
      kind: "tool",
      verb: "read",
      target: "specs/frontend/01-style.md",
      body: "",
    });
  });

  test("una herramienta sin destino queda con su verbo solo", () => {
    expect(api.stepOfLine(line(2, "tool", "read"))).toEqual({
      n: 2,
      kind: "tool",
      verb: "read",
      target: "",
      body: "",
    });
  });

  test("un comando de shell no inventa un destino: el resto es el resultado", () => {
    // `bun test` no es "verbo bun, destino test": el comando entero es la fila.
    expect(api.stepOfLine(line(7, "tool", "bash bun test"))).toEqual({
      n: 7,
      kind: "tool",
      verb: "bash",
      target: "",
      body: "bun test",
    });
  });

  test("un estado se presenta como fila con su texto", () => {
    expect(api.stepOfLine(line(6, "status", "turno terminado · end_turn"))).toEqual({
      n: 6,
      kind: "status",
      verb: "estado",
      target: "",
      body: "turno terminado · end_turn",
    });
  });

  test("una línea cruda se conserva tal cual, sin recortar nada", () => {
    const raw = '{"type":"mystery_event","payload":42}';

    expect(api.stepOfLine(line(5, "raw", raw))).toEqual({
      n: 5,
      kind: "raw",
      verb: "crudo",
      target: "",
      body: raw,
    });
  });

  test("la prosa no es una fila: el panel la dibuja como párrafo", () => {
    expect(api.stepOfLine(line(3, "text", "leo el contrato de specs"))).toBeNull();
  });

  test("una herramienta sin texto no rompe la fila", () => {
    expect(api.stepOfLine(line(1, "tool", ""))?.verb).toBe("herramienta");
    expect(api.stepOfLine(null)).toBeNull();
  });

  test("la etiqueta de la fila junta verbo, destino y resultado", () => {
    expect(api.stepLabel(api.stepOfLine(line(4, "tool", "write specs/tasks.md")))).toBe(
      "write specs/tasks.md"
    );
    expect(api.stepLabel(null)).toBe("");
  });

  test("los pasos son las líneas de herramienta, no toda la salida", () => {
    const lines = [
      line(1, "status", "sesión iniciada"),
      line(2, "text", "voy a leer el contrato"),
      line(3, "tool", "read specs/x.md"),
      line(4, "raw", "texto suelto"),
      line(5, "tool", "bash bun test"),
    ];

    expect(api.stepCount(lines)).toBe(2);
    expect(api.stepCount([])).toBe(0);
    expect(api.stepCount(null)).toBe(0);
  });

  test("qué está haciendo ahora es la última herramienta, no la última línea", () => {
    // Después de la herramienta puede venir prosa: la actividad sigue siendo el paso.
    const lines = [
      line(1, "tool", "read specs/x.md"),
      line(2, "tool", "write specs/y.md"),
      line(3, "text", "listo, escribí la spec"),
    ];

    expect(api.currentActivity(lines)).toBe("write specs/y.md");
    expect(api.currentActivity([line(1, "status", "agente iniciado")])).toBe("");
    expect(api.currentActivity(null)).toBe("");
  });
});
