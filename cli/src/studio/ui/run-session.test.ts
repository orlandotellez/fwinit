import { describe, expect, test } from "bun:test";
import { RUN_SESSION_SOURCE } from "./run-session.js";

/**
 * Cómo el panel muestra la sesión de una ejecución (spec S17).
 *
 * Igual que el select de modelo (S15) y la restauración del run (S16), esta
 * lógica se escribe una sola vez y se interpola en `CLIENT_JS`: acá se evalúa
 * exactamente el texto que corre en el navegador, no una copia paralela.
 */

interface SessionApi {
  sessionShort(id: unknown): string;
  sessionResumeCommand(agent: string, id: unknown): string | null;
  sessionPickerCommand(agent: string): string | null;
  sessionNote(agent: string, id: unknown): string;
}

const api = new Function(`${RUN_SESSION_SOURCE}; return {
  sessionShort: sessionShort,
  sessionResumeCommand: sessionResumeCommand,
  sessionPickerCommand: sessionPickerCommand,
  sessionNote: sessionNote
};`)() as SessionApi;

const ID = "01936f5e-7a1b-7d3c-9f00-2c9a1d4e5b60";

describe("run session panel (S17)", () => {
  test("el id corto de la fila es el prefijo del id completo", () => {
    expect(api.sessionShort(ID)).toBe("01936f5e");
    // Un id corto se muestra entero: no se recorta lo que no sobra.
    expect(api.sessionShort("ses-1234")).toBe("ses-1234");
    expect(api.sessionShort(null)).toBe("");
    expect(api.sessionShort("  ")).toBe("");
  });

  test("pi y Gentle Shell se retoman con --session <id>", () => {
    expect(api.sessionResumeCommand("pi", ID)).toBe(`pi --session ${ID}`);
    expect(api.sessionResumeCommand("gentle-shell", ID)).toBe(`gentle-shell --session ${ID}`);
    // Y se pueden elegir a mano en el selector del agente.
    expect(api.sessionPickerCommand("pi")).toBe("pi -r");
    expect(api.sessionPickerCommand("gentle-shell")).toBe("gentle-shell -r");
  });

  test("opencode no se retoma con un comando inventado", () => {
    // Su formato de sesión es suyo: el studio no fuerza ni inventa un id.
    expect(api.sessionResumeCommand("opencode", ID)).toBeNull();
    expect(api.sessionPickerCommand("opencode")).toBeNull();
  });

  test("un run de pi con sesión muestra el id y el comando exacto para retomarla", () => {
    const note = api.sessionNote("pi", ID);

    expect(note).toContain(`pi --session ${ID}`);
    expect(note).toContain("pi -r");
    expect(note).toContain(ID);
  });

  test("un run sin sesión guardada lo dice en vez de fingir que se puede retomar", () => {
    const note = api.sessionNote("pi", null);

    expect(note).toContain("no tiene una sesión guardada");
    expect(note).not.toContain("--session");
  });

  test("opencode sin id ofrece listar sus sesiones, sin implicar que se ve en pi", () => {
    const note = api.sessionNote("opencode", null);

    expect(note).toContain("opencode session list");
    expect(note).toContain("no lo inventa");
    expect(note).not.toContain("--session");
  });

  test("opencode con id capturado muestra el id y cómo listar sus sesiones", () => {
    const note = api.sessionNote("opencode", ID);

    expect(note).toContain(ID);
    expect(note).toContain("opencode session list");
    expect(note).not.toContain("no lo inventa");
  });
});
