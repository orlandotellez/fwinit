/**
 * Step plan and runner for the interactive creation flow (spec S9).
 *
 * Everything here is pure: the plan is data, the runner takes the prompt as an
 * injected `ask`, and the templates come from the static registry. No test
 * touches the filesystem, inquirer or a real terminal — the prompts are
 * scripted answers, so the observable behaviour is the exact order of the steps
 * asked, the default each one receives and the answers the flow ends with.
 */
import { describe, expect, test } from "bun:test";
import {
  FLOW_STEP_ORDER,
  applyAnswer,
  planSteps,
  runFlow,
  type FlowAnswers,
  type FlowFlags,
  type FlowStepId,
  type StepResult,
} from "./flow.js";
import { findTemplate, type Template } from "./templates.js";
import { backHint } from "./prompts.js";

const EXPRESS = findTemplate("express")!;
const FASTIFY = findTemplate("fastify")!;
const ASPNET = findTemplate("aspnet")!;
const ASTRO = findTemplate("astro")!;
const FLUTTER = findTemplate("flutter")!;

function value<T>(result: T): StepResult<T> {
  return { kind: "value", value: result };
}

const back: StepResult<never> = { kind: "back" };

/**
 * Mirrors how the CLI feeds the plan: CLI flags stay flags, and the fullstack
 * templates already answered are folded in so the steps that depend on them
 * (flutter-org, package-manager) can be decided.
 */
function planFrom(flags: FlowFlags, projectName?: string) {
  return (answers: FlowAnswers): FlowStepId[] =>
    planSteps({
      scope: answers.scope,
      isFullStack: answers.scope === "fullstack",
      template: answers.template,
      projectName: answers.projectName ?? projectName,
      flags: {
        ...flags,
        backendTemplate: flags.backendTemplate ?? answers.backendTemplate?.name,
        frontendTemplate:
          flags.frontendTemplate ?? answers.frontendTemplate?.name,
      },
    });
}

interface Asked {
  step: FlowStepId;
  previous: unknown;
  canGoBack: boolean;
}

/** Records every prompt and answers it with the next scripted result. */
function scripted(results: StepResult<unknown>[]) {
  const asked: Asked[] = [];
  let index = 0;
  const ask: Parameters<typeof runFlow>[0]["ask"] = async (
    step,
    previous,
    context
  ) => {
    asked.push({ step, previous, canGoBack: context.canGoBack });
    const result = results[index++];
    if (result === undefined) throw new Error(`unscripted prompt: ${step}`);
    return result;
  };
  return { ask, asked };
}

describe("planSteps", () => {
  test("the canonical order covers every step exactly once", () => {
    expect(new Set(FLOW_STEP_ORDER).size).toBe(FLOW_STEP_ORDER.length);
    expect(FLOW_STEP_ORDER).toContain("global-skills");
  });

  test("no flags with a backend asks the layer template first", () => {
    expect(planSteps({ scope: "backend", isFullStack: false, flags: {} })).toEqual([
      "backend-template",
      "project-name",
      "package-manager",
      "layer-layout",
      "git",
      "global-skills",
    ]);
  });

  test("no flags with a known backend template", () => {
    expect(
      planSteps({
        scope: "backend",
        isFullStack: false,
        template: EXPRESS,
        flags: {},
      })
    ).toEqual([
      "project-name",
      "package-manager",
      "layer-layout",
      "git",
      "global-skills",
    ]);
  });

  test("no flags with a known frontend template", () => {
    expect(
      planSteps({
        scope: "frontend",
        isFullStack: false,
        template: ASTRO,
        flags: {},
      })
    ).toEqual([
      "project-name",
      "package-manager",
      "layer-layout",
      "git",
      "global-skills",
    ]);
  });

  test("the main menu is the first step while the scope is unknown", () => {
    expect(planSteps({ isFullStack: false, flags: {} })[0]).toBe("scope");
  });

  test("skills and studio create nothing", () => {
    expect(planSteps({ scope: "skills", isFullStack: false, flags: {} })).toEqual(
      []
    );
    expect(
      planSteps({ scope: "studio", isFullStack: false, flags: {} })
    ).toEqual([]);
  });

  test("fullstack with no flags asks both templates and no layer layout", () => {
    expect(planSteps({ scope: "fullstack", isFullStack: true, flags: {} })).toEqual([
      "backend-template",
      "frontend-template",
      "project-name",
      "package-manager",
      "git",
      "global-skills",
    ]);
  });

  test("fullstack with -b skips only the backend template", () => {
    expect(
      planSteps({
        scope: "fullstack",
        isFullStack: true,
        flags: { backendTemplate: "fastify" },
      })
    ).toEqual([
      "frontend-template",
      "project-name",
      "package-manager",
      "git",
      "global-skills",
    ]);
  });

  test("fullstack with -b and -f asks no templates", () => {
    expect(
      planSteps({
        scope: "fullstack",
        isFullStack: true,
        flags: { backendTemplate: "fastify", frontendTemplate: "astro" },
      })
    ).toEqual([
      "project-name",
      "package-manager",
      "git",
      "global-skills",
    ]);
  });

  test("a single template with -p and --git keeps only name and layout", () => {
    expect(
      planSteps({
        scope: "frontend",
        isFullStack: false,
        template: ASTRO,
        flags: { pm: "bun", git: true },
      })
    ).toEqual(["project-name", "layer-layout"]);
  });

  test("Flutter asks the org and no package manager", () => {
    expect(
      planSteps({
        scope: "frontend",
        isFullStack: false,
        template: FLUTTER,
        flags: {},
      })
    ).toEqual([
      "project-name",
      "layer-layout",
      "flutter-org",
      "git",
      "global-skills",
    ]);
  });

  test("Flutter with --org skips the org step", () => {
    expect(
      planSteps({
        scope: "frontend",
        isFullStack: false,
        template: FLUTTER,
        flags: { org: "ar.miempresa" },
      })
    ).toEqual(["project-name", "layer-layout", "git", "global-skills"]);
  });

  test("a flag-driven complete run leaves an empty plan", () => {
    expect(
      planSteps({
        scope: "fullstack",
        isFullStack: true,
        projectName: "demo",
        flags: {
          pm: "bun",
          git: true,
          layerLayout: true,
          backendTemplate: "fastify",
          frontendTemplate: "astro",
          org: "ar.miempresa",
        },
      })
    ).toEqual([]);
  });
});

describe("runFlow", () => {
  test("going back re-asks the previous step with its answer as default", async () => {
    const { ask, asked } = scripted([
      value("demo"),
      back,
      value("demo"),
      value("bun"),
      value(true),
      value(true),
      value(false),
    ]);

    const outcome = await runFlow({
      plan: planFrom({}),
      ask,
      answers: { scope: "backend", template: EXPRESS },
    });

    expect(outcome.kind).toBe("completed");
    if (outcome.kind !== "completed") return;

    // name → pm → back → name (prefilled) → pm → layout → git → global skills
    expect(asked.map((entry) => entry.step)).toEqual([
      "project-name",
      "package-manager",
      "project-name",
      "package-manager",
      "layer-layout",
      "git",
      "global-skills",
    ]);
    expect(asked[0]?.canGoBack).toBe(false);
    expect(asked[2]?.previous).toBe("demo");
    expect(asked[3]?.previous).toBeUndefined();
    expect(outcome.answers.projectName).toBe("demo");
    expect(outcome.answers.packageManager).toBe("bun");
    expect(outcome.answers.layerLayout).toBe(true);
    expect(outcome.answers.git).toBe(true);
    expect(outcome.answers.globalSkills).toBe(false);
  });

  test("going back at the first step cancels", async () => {
    const { ask, asked } = scripted([back]);

    const outcome = await runFlow({
      plan: planFrom({}),
      ask,
      answers: { scope: "backend", template: EXPRESS },
    });

    expect(outcome.kind).toBe("cancelled");
    expect(asked.map((entry) => entry.step)).toEqual(["project-name"]);
    expect(asked[0]?.canGoBack).toBe(false);
  });

  test("going back past the template drops the Flutter org", async () => {
    const { ask, asked } = scripted([
      value(FLUTTER),
      value("demo"),
      value(true),
      value("ar.miempresa"),
      value(true),
      // back five times: global skills → git → org → layout → name → template
      back,
      back,
      back,
      back,
      back,
      value(ASTRO),
      value("bun"),
      value(true),
      value(true),
      value(false),
    ]);

    const outcome = await runFlow({
      plan: planFrom({}),
      ask,
      answers: { scope: "frontend" },
    });

    expect(outcome.kind).toBe("completed");
    if (outcome.kind !== "completed") return;

    const steps = asked.map((entry) => entry.step);
    // The template is re-entered holding the previous selection.
    const templateAsks = asked.filter(
      (entry) => entry.step === "frontend-template"
    );
    expect(templateAsks.map((entry) => entry.previous)).toEqual([
      undefined,
      FLUTTER,
    ]);
    // Astro is not Flutter, so the org answer no longer applies.
    expect(steps).toContain("flutter-org");
    expect(outcome.answers.template).toBe(ASTRO);
    expect(outcome.answers.org).toBeUndefined();
    expect(outcome.answers.projectName).toBe("demo");
    expect(outcome.answers.packageManager).toBe("bun");
  });

  test("switching the scope to fullstack asks both templates", async () => {
    const { ask, asked } = scripted([
      value("backend"),
      value(EXPRESS),
      value("demo"),
      // back from the layout (the last open step) all the way to the menu
      back,
      back,
      back,
      value("fullstack"),
      value(FASTIFY),
      value(ASTRO),
    ]);

    const outcome = await runFlow({
      plan: planFrom({ pm: "bun", git: true }),
      ask,
    });

    expect(outcome.kind).toBe("completed");
    if (outcome.kind !== "completed") return;

    expect(asked.map((entry) => entry.step)).toEqual([
      "scope",
      "backend-template",
      "project-name",
      "layer-layout",
      "project-name",
      "backend-template",
      "scope",
      "backend-template",
      "frontend-template",
    ]);
    expect(outcome.answers.scope).toBe("fullstack");
    expect(outcome.answers.template).toBeUndefined();
    expect(outcome.answers.backendTemplate).toBe(FASTIFY);
    expect(outcome.answers.frontendTemplate).toBe(ASTRO);
  });

  test("an empty plan asks nothing and keeps what the flags said", async () => {
    let asked = 0;
    const outcome = await runFlow({
      plan: planFrom({
        pm: "bun",
        git: true,
        layerLayout: true,
        backendTemplate: "fastify",
        frontendTemplate: "astro",
        org: "ar.miempresa",
      }, "demo"),
      ask: async () => {
        asked += 1;
        return value("unexpected");
      },
      answers: { scope: "fullstack" },
    });

    expect(asked).toBe(0);
    expect(outcome.kind).toBe("completed");
  });

  test("the Esc hint says volver, or cancelar at the first step", () => {
    const plain = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, "");

    expect(plain(backHint(true))).toBe("Esc para volver");
    expect(plain(backHint(false))).toBe("Esc para cancelar");
  });

  test("going back keeps the answers that do not depend on the change", async () => {
    const answers = applyAnswer(
      { scope: "backend", template: ASPNET, projectName: "api", org: "ar.x" },
      "backend-template",
      EXPRESS
    );

    expect(answers.projectName).toBe("api");
    expect(answers.template).toBe(EXPRESS);
    expect(answers.org).toBeUndefined();
  });
});
