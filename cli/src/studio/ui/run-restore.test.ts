import { describe, expect, test } from "bun:test";
import { RUN_RESTORE_SOURCE } from "./run-restore.js";

/**
 * Qué run del historial restaura el panel de una skill (spec S16).
 *
 * Igual que el select de modelo (S15), esta lógica se escribe una sola vez y se
 * interpola en `CLIENT_JS`: acá se evalúa exactamente el texto que corre en el
 * navegador, no una copia paralela.
 */

interface RunRef {
  target: string;
  scope: "global" | "project";
  name: string;
}

interface RunSummary {
  id: string;
  skill: RunRef;
  startedAt: string;
  state: string;
  model: string | null;
}

interface RestoreFlags {
  dismissed?: boolean;
  selected?: boolean;
  live?: boolean;
}

interface RunRestoreApi {
  runRefKey(ref: RunRef): string;
  runsForSkill(runs: RunSummary[] | null | undefined, ref: RunRef): RunSummary[];
  latestRunForSkill(runs: RunSummary[] | null | undefined, ref: RunRef): RunSummary | null;
  restoreCandidate(
    list: { inFlight: string | null; runs: RunSummary[] } | null | undefined,
    ref: RunRef,
    flags?: RestoreFlags
  ): RunSummary | null;
}

const api = new Function(`${RUN_RESTORE_SOURCE}; return {
  runRefKey: runRefKey,
  runsForSkill: runsForSkill,
  latestRunForSkill: latestRunForSkill,
  restoreCandidate: restoreCandidate
};`)() as RunRestoreApi;

const GLOBAL_PI: RunRef = { target: "pi", scope: "global", name: "create-specs" };

function run(id: string, overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id,
    skill: GLOBAL_PI,
    startedAt: "2026-11-09T10:00:00.000Z",
    state: "done",
    model: null,
    ...overrides,
  };
}

describe("run restore (S16)", () => {
  test("la identidad del run incluye destino, alcance y nombre", () => {
    expect(api.runRefKey(GLOBAL_PI)).toBe("pi/global/create-specs");
    expect(api.runRefKey({ target: "opencode", scope: "project", name: "design" })).toBe(
      "opencode/project/design"
    );
  });

  test("restaura el run más reciente de la skill aunque ya haya terminado", () => {
    // El server lista de la más nueva a la más vieja; el más nuevo de esta skill
    // terminó hace rato. No importa que no esté en curso: se tiene que ver.
    const list = {
      inFlight: null,
      runs: [
        run("run-nuevo", { startedAt: "2026-11-09T12:00:00.000Z", state: "done" }),
        run("run-viejo", { startedAt: "2026-11-09T09:00:00.000Z", state: "failed" }),
      ],
    };

    expect(api.restoreCandidate(list, GLOBAL_PI)?.id).toBe("run-nuevo");
  });

  test("no depende del orden del listado: ordena por fecha de arranque", () => {
    const runs = [
      run("viejo", { startedAt: "2026-11-09T09:00:00.000Z" }),
      run("nuevo", { startedAt: "2026-11-09T12:00:00.000Z" }),
      run("medio", { startedAt: "2026-11-09T10:30:00.000Z" }),
    ];

    expect(api.runsForSkill(runs, GLOBAL_PI).map((item) => item.id)).toEqual([
      "nuevo",
      "medio",
      "viejo",
    ]);
    expect(api.latestRunForSkill(runs, GLOBAL_PI)?.id).toBe("nuevo");
  });

  test("ignora los runs de otra skill y de otro alcance", () => {
    const list = {
      inFlight: "en-curso-ajeno",
      runs: [
        run("en-curso-ajeno", {
          startedAt: "2026-11-09T13:00:00.000Z",
          state: "running",
          skill: { target: "pi", scope: "global", name: "design" },
        }),
        run("mismo-nombre-proyecto", {
          skill: { target: "pi", scope: "project", name: "create-specs" },
        }),
        run("mismo-nombre-otro-destino", {
          skill: { target: "opencode", scope: "global", name: "create-specs" },
        }),
        run("el-bueno", { startedAt: "2026-11-09T08:00:00.000Z" }),
      ],
    };

    expect(api.runsForSkill(list.runs, GLOBAL_PI).map((item) => item.id)).toEqual(["el-bueno"]);
    // Un run en curso de otra skill no se restaura acá: cada panel restaura lo suyo.
    expect(api.restoreCandidate(list, GLOBAL_PI)?.id).toBe("el-bueno");
  });

  test("sin runs de esa skill no hay nada que restaurar", () => {
    expect(api.restoreCandidate({ inFlight: null, runs: [] }, GLOBAL_PI)).toBeNull();
    expect(api.restoreCandidate(null, GLOBAL_PI)).toBeNull();
    expect(api.latestRunForSkill(null, GLOBAL_PI)).toBeNull();
  });

  test("no restaura si el usuario ya cerró el historial de esa skill", () => {
    const list = { inFlight: null, runs: [run("run-1")] };

    expect(api.restoreCandidate(list, GLOBAL_PI, { dismissed: true })).toBeNull();
  });

  test("no pisa una selección ni un run vivo de la misma skill", () => {
    const list = { inFlight: null, runs: [run("run-1")] };

    expect(api.restoreCandidate(list, GLOBAL_PI, { selected: true })).toBeNull();
    expect(api.restoreCandidate(list, GLOBAL_PI, { live: true })).toBeNull();
  });

  test("un run huérfano se restaura igual: los archivos no dependen del reporte", () => {
    // La skill ya no está instalada, pero su run sigue en disco y es legible.
    const list = {
      inFlight: null,
      runs: [run("huerfano", { skill: { target: "pi", scope: "global", name: "ya-no-esta" } })],
    };

    expect(
      api.restoreCandidate(list, { target: "pi", scope: "global", name: "ya-no-esta" })?.id
    ).toBe("huerfano");
  });
});
