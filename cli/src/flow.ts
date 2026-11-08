/**
 * Step plan and runner for the interactive creation flow (spec S9).
 *
 * The interactive creation used to be a chain of `await`s: once an answer was
 * given there was no way back. Here the flow is data — an ordered plan of steps
 * — plus a runner that walks it with a cursor, so a step can answer `back` and
 * the runner re-asks the previous one, this time with the answer already given
 * as its default. At the first step the same `back` becomes a cancel signal and
 * the caller exits 0.
 *
 * Nothing here touches the filesystem, a terminal or inquirer: the prompts are
 * injected as `ask`, which keeps the plan, the navigation and the "clear what
 * the new answer invalidated" rules unit-testable.
 */
import {
  findTemplate,
  type Template,
  type TemplateRuntime,
} from "./templates.js";
import type { PackageManager } from "./utils.js";
import type { ProjectScope } from "./prompts.js";

export type FlowStepId =
  | "scope"
  | "backend-template"
  | "frontend-template"
  | "project-name"
  | "package-manager"
  | "layer-layout"
  | "flutter-org"
  | "git"
  | "global-skills";

/**
 * Canonical order of the flow. Every plan is a subsequence of this list, which
 * is what lets the runner move forward by position instead of by plan index: a
 * replanned list can grow or shrink in the middle and the cursor still points
 * at the right place.
 */
export const FLOW_STEP_ORDER: readonly FlowStepId[] = [
  "scope",
  "backend-template",
  "frontend-template",
  "project-name",
  "package-manager",
  "layer-layout",
  "flutter-org",
  "git",
  "global-skills",
];

const STEP_POSITION = new Map<FlowStepId, number>(
  FLOW_STEP_ORDER.map((id, index) => [id, index])
);

function positionOf(step: FlowStepId): number {
  return STEP_POSITION.get(step) ?? 0;
}

/** Runtimes that do not use a JS package manager (they have their own toolchain). */
const OWN_TOOLCHAIN: ReadonlySet<TemplateRuntime> = new Set([
  "dotnet",
  "flutter",
]);

function usesPackageManager(runtime: TemplateRuntime): boolean {
  return !OWN_TOOLCHAIN.has(runtime);
}

/**
 * What the CLI already answered before the interactive flow starts, either as
 * a flag or as a previous pass of the runner. A step whose value is set here is
 * never asked again, so flags always win.
 *
 * `layerLayout` is the `--backend`/`--no-backend` pair, the layout flag that is
 * not part of `-p/-b/-f/-o` but answers the same step for the same reason.
 */
export interface FlowFlags {
  /** `-p, --pm`: skips the package manager question. */
  pm?: PackageManager;
  /** `--git` / `--no-git`: skips the git question and the post-creation skills one. */
  git?: boolean;
  /** `--backend` / `--no-backend`: skips the layer layout question. */
  layerLayout?: boolean;
  /** `-b, --backend-template` (fullstack). */
  backendTemplate?: string;
  /** `-f, --frontend-template` (fullstack). */
  frontendTemplate?: string;
  /** `-o, --org` (Flutter). */
  org?: string;
}

export interface PlanInput {
  /** Undefined while the main menu was not answered yet. */
  scope?: ProjectScope;
  isFullStack: boolean;
  /** The single, already known template (from the argument). */
  template?: Template;
  /** The already known project name (from the argument). */
  projectName?: string;
  flags: FlowFlags;
}
/**
 * The ordered steps that are still open, given everything already answered.
 * Rules:
 * - a flag (or an answer the caller folded into `flags`) removes its step;
 * - `flutter-org` only appears when the selection includes Flutter, and never
 *   in scripting mode (`--git`/`--no-git`), where the org falls back instead;
 * - `backend-template`/`frontend-template` are the two halves of a fullstack
 *   run; a single run asks only the layer of its scope;
 * - `layer-layout` only applies to a single-template run.
 */
export function planSteps(input: PlanInput): FlowStepId[] {
  const { scope, isFullStack, template, projectName, flags } = input;

  // Skills and studio create nothing: choosing them ends the flow.
  if (scope === "skills" || scope === "studio") return [];

  const steps: FlowStepId[] = [];
  if (scope === undefined) steps.push("scope");

  const backendTpl = flags.backendTemplate
    ? findTemplate(flags.backendTemplate)
    : undefined;
  const frontendTpl = flags.frontendTemplate
    ? findTemplate(flags.frontendTemplate)
    : undefined;

  if (isFullStack) {
    if (!flags.backendTemplate) steps.push("backend-template");
    if (!flags.frontendTemplate) steps.push("frontend-template");
  } else if (template === undefined) {
    // Single run: the layer comes from the scope. While the menu is open the
    // layer step is not planned yet; the runner replans after that answer.
    if (scope === "backend") steps.push("backend-template");
    else if (scope === "frontend") steps.push("frontend-template");
  }

  if (projectName === undefined) steps.push("project-name");

  const runtimes: TemplateRuntime[] = [];
  if (isFullStack) {
    if (backendTpl) runtimes.push(backendTpl.runtime);
    if (frontendTpl) runtimes.push(frontendTpl.runtime);
  } else if (template) {
    runtimes.push(template.runtime);
  }
  // While part of the selection is still open the dependent questions stay in
  // the plan: the runner replans after the answer that closes them.
  const selectionKnown = isFullStack
    ? backendTpl !== undefined && frontendTpl !== undefined
    : template !== undefined;

  if (
    flags.pm === undefined &&
    (!selectionKnown || runtimes.some(usesPackageManager))
  ) {
    steps.push("package-manager");
  }

  if (!isFullStack && flags.layerLayout === undefined) {
    steps.push("layer-layout");
  }

  if (
    runtimes.includes("flutter") &&
    flags.org === undefined &&
    flags.git === undefined
  ) {
    steps.push("flutter-org");
  }

  // Both are interactive-only: with --git/--no-git the run is scripted, so git
  // is answered by the flag and the global-skills question is not asked at all.
  if (flags.git === undefined) {
    steps.push("git");
    steps.push("global-skills");
  }

  return steps;
}

/** A prompt's answer: either a value or "the user wants the previous step". */
export type StepResult<T> = { kind: "value"; value: T } | { kind: "back" };

/** Everything the flow collected. Flags are not stored here (they never get asked). */
export interface FlowAnswers {
  scope?: ProjectScope;
  template?: Template;
  backendTemplate?: Template;
  frontendTemplate?: Template;
  projectName?: string;
  packageManager?: PackageManager;
  layerLayout?: boolean;
  org?: string;
  git?: boolean;
  globalSkills?: boolean;
}

export interface FlowStepContext {
  /** False at the first step, where `back` cancels instead of returning. */
  canGoBack: boolean;
  /** Snapshot of what is already answered, for the steps that act on it. */
  answers: Readonly<FlowAnswers>;
}

export type FlowAsk = (
  step: FlowStepId,
  previous: unknown,
  context: FlowStepContext
) => Promise<StepResult<unknown>>;

export interface RunFlowOptions {
  /** Planned steps for the current state, recomputed after every answer. */
  plan: (answers: FlowAnswers) => FlowStepId[];
  ask: FlowAsk;
  /** Answers known before the first prompt (for example, a forced scope). */
  answers?: FlowAnswers;
}

export type FlowOutcome =
  | { kind: "completed"; answers: FlowAnswers }
  | { kind: "cancelled"; answers: FlowAnswers };

function selectionRuntimes(answers: FlowAnswers): TemplateRuntime[] {
  if (answers.scope === "fullstack") {
    return [answers.backendTemplate?.runtime, answers.frontendTemplate?.runtime].filter(
      (runtime): runtime is TemplateRuntime => runtime !== undefined
    );
  }
  return answers.template ? [answers.template.runtime] : [];
}

/**
 * Stores an answer and clears what that answer invalidated, so a step that no
 * longer applies is asked again instead of being silently reused: another
 * template drops a Flutter org, another scope reopens the templates, and a
 * selection without a JS runtime drops the package manager.
 */
export function applyAnswer(
  answers: FlowAnswers,
  step: FlowStepId,
  value: unknown
): FlowAnswers {
  const next: FlowAnswers = { ...answers };

  switch (step) {
    case "scope": {
      const scope = value as ProjectScope;
      if (scope === answers.scope) break;
      // The scope decides the mode (single/fullstack) and the layer, so every
      // answer derived from it is stale: both templates, the layout and the
      // Flutter org (which depends on the template).
      delete next.template;
      delete next.backendTemplate;
      delete next.frontendTemplate;
      delete next.layerLayout;
      delete next.org;
      next.scope = scope;
      break;
    }
    case "backend-template":
    case "frontend-template": {
      const selected = value as Template;
      const fullStack = answers.scope === "fullstack";
      const key =
        !fullStack
          ? "template"
          : step === "backend-template"
            ? "backendTemplate"
            : "frontendTemplate";
      if (answers[key] === selected) break;
      next[key] = selected;
      const runtimes = selectionRuntimes(next);
      if (!runtimes.includes("flutter")) delete next.org;
      if (runtimes.length > 0 && !runtimes.some(usesPackageManager)) {
        delete next.packageManager;
      }
      break;
    }
    case "project-name":
      next.projectName = value as string;
      break;
    case "package-manager":
      next.packageManager = value as PackageManager;
      break;
    case "layer-layout":
      next.layerLayout = value as boolean;
      break;
    case "flutter-org":
      next.org = value as string;
      break;
    case "git":
      next.git = value as boolean;
      break;
    case "global-skills":
      next.globalSkills = value as boolean;
      break;
  }

  return next;
}

/** The answer a step already has, offered as the prompt default when re-entered. */
export function answerFor(step: FlowStepId, answers: FlowAnswers): unknown {
  switch (step) {
    case "scope":
      return answers.scope;
    case "backend-template":
      // Single runs keep the one template under `template`; fullstack runs keep
      // one per layer.
      return answers.scope === "fullstack"
        ? answers.backendTemplate
        : answers.template;
    case "frontend-template":
      return answers.scope === "fullstack"
        ? answers.frontendTemplate
        : answers.template;
    case "project-name":
      return answers.projectName;
    case "package-manager":
      return answers.packageManager;
    case "layer-layout":
      return answers.layerLayout;
    case "flutter-org":
      return answers.org;
    case "git":
      return answers.git;
    case "global-skills":
      return answers.globalSkills;
  }
}

function nextPlannedStep(
  plan: FlowStepId[],
  after: number
): FlowStepId | undefined {
  return plan.find((step) => positionOf(step) > after);
}

/**
 * Walks the plan. Forward movement takes the next planned step; `back` pops the
 * chain of answered steps and re-asks that one, keeping its answer as the
 * default, and cancels once there is no previous step to return to.
 */
export async function runFlow(options: RunFlowOptions): Promise<FlowOutcome> {
  let answers: FlowAnswers = { ...options.answers };
  const answered: FlowStepId[] = [];
  let current: FlowStepId | undefined = nextPlannedStep(
    options.plan(answers),
    -1
  );

  while (current !== undefined) {
    const result = await options.ask(current, answerFor(current, answers), {
      canGoBack: answered.length > 0,
      answers,
    });

    if (result.kind === "back") {
      const previous = answered.pop();
      if (previous === undefined) return { kind: "cancelled", answers };
      current = previous;
      continue;
    }

    answers = applyAnswer(answers, current, result.value);
    answered.push(current);
    current = nextPlannedStep(options.plan(answers), positionOf(current));
  }

  return { kind: "completed", answers };
}
