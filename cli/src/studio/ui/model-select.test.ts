import { describe, expect, test } from "bun:test";
import { MODEL_CHOICE_SOURCE } from "./model-select.js";

/**
 * Las opciones del select de modelo (spec S15).
 *
 * El cliente del studio se sirve como un string dentro del bundle, así que la
 * función que arma las opciones se escribe una sola vez y se interpola ahí. Acá
 * se evalúa exactamente ese texto: lo que se prueba es el código que corre en
 * el navegador, no una copia paralela que pueda desincronizarse.
 */

interface ChoiceOption {
  value: string;
  label: string;
}

interface Choice {
  options: ChoiceOption[];
  value: string;
}

const modelChoice = new Function(`${MODEL_CHOICE_SOURCE}; return modelChoice;`)() as (
  defaultLabel: string,
  current: string | null,
  modelIds: string[],
  desired: string | null
) => Choice;

const DEFAULT_LABEL = "Default de pi (sin --model)";
const CATALOGUE = ["opencode-go/beam-free", "anthropic/claude-sonnet-5"];

describe("model select options (S15)", () => {
  test("la primera opción es el default del agente, con valor vacío", () => {
    const choice = modelChoice(DEFAULT_LABEL, null, [], null);

    expect(choice.options[0]).toEqual({ value: "", label: DEFAULT_LABEL });
    // Vacío = sin `--model`: el agente usa su default (S14).
    expect(choice.value).toBe("");
  });

  test("el modelo activo se rotula (actual) y queda preseleccionado", () => {
    const choice = modelChoice(DEFAULT_LABEL, "anthropic/claude-sonnet-5", CATALOGUE, null);
    const active = choice.options.filter((option) => option.value === "anthropic/claude-sonnet-5");

    expect(active).toHaveLength(1);
    expect(active[0].label).toBe("anthropic/claude-sonnet-5 (actual)");
    expect(choice.value).toBe("anthropic/claude-sonnet-5");
    expect(choice.options).toHaveLength(CATALOGUE.length + 1);
    // El resto del catálogo sigue ofreciéndose sin rótulo.
    expect(choice.options[1].label).toBe("opencode-go/beam-free");
  });

  test("un activo que no está en el catálogo se agrega igual como opción", () => {
    const choice = modelChoice(DEFAULT_LABEL, "google/gemini-fuera", CATALOGUE, null);
    const active = choice.options.find((option) => option.value === "google/gemini-fuera");

    expect(active?.label).toBe("google/gemini-fuera (actual)");
    expect(choice.value).toBe("google/gemini-fuera");
    expect(choice.options.map((option) => option.value)).toEqual([
      "",
      ...CATALOGUE,
      "google/gemini-fuera",
    ]);
  });

  test("sin modelo activo se preselecciona el default del agente", () => {
    const choice = modelChoice(DEFAULT_LABEL, null, CATALOGUE, null);

    expect(choice.value).toBe("");
    expect(choice.options.map((option) => option.value)).toEqual(["", ...CATALOGUE]);
  });

  test("elegir el default deja el valor vacío aunque haya un modelo activo", () => {
    const choice = modelChoice(DEFAULT_LABEL, "anthropic/claude-sonnet-5", CATALOGUE, "");

    expect(choice.value).toBe("");
    expect(choice.options[0].value).toBe("");
  });

  test("respeta la elección del usuario por encima del modelo activo", () => {
    const choice = modelChoice(DEFAULT_LABEL, "anthropic/claude-sonnet-5", CATALOGUE, "opencode-go/beam-free");

    expect(choice.value).toBe("opencode-go/beam-free");
  });

  test("un run del historial con un modelo que ya no está en el catálogo lo conserva", () => {
    const choice = modelChoice(DEFAULT_LABEL, null, CATALOGUE, "viejo/modelo");

    expect(choice.options.map((option) => option.value)).toContain("viejo/modelo");
    expect(choice.value).toBe("viejo/modelo");
  });

  test("no inventa ids: sin catálogo sólo quedan el default y el activo", () => {
    const choice = modelChoice(DEFAULT_LABEL, "anthropic/claude-sonnet-5", [], null);

    expect(choice.options.map((option) => option.value)).toEqual([
      "",
      "anthropic/claude-sonnet-5",
    ]);
  });

  test("no repite un id que el catálogo ya trae", () => {
    const choice = modelChoice(DEFAULT_LABEL, "opencode-go/beam-free", [
      "opencode-go/beam-free",
      "opencode-go/beam-free",
    ], null);

    expect(choice.options.map((option) => option.value)).toEqual(["", "opencode-go/beam-free"]);
    expect(choice.options[1].label).toBe("opencode-go/beam-free (actual)");
  });
});
