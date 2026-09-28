// Instalación GLOBAL de skills: el bundle del repo (skills/) a las
// ubicaciones globales de cada agente. Misma lógica que installAgentSkills
// de index.ts, pero hacia el home del usuario en vez de un proyecto.
//
// Este módulo es lógica pura (recibe rutas ya resueltas), así se puede
// verificar por separado del entrypoint, igual que agent-bundle.ts.
//
// Layout por destino (espeja el bundle de proyecto):
// - OpenCode: ~/.config/opencode/skills/<name>/ con SKILL.md + extras,
//   y commands en ~/.config/opencode/command/<name>.md (singular).
// - Pi: ~/.pi/agent/skills/<name>/ con SKILL.md + extras, y prompt
//   templates en ~/.pi/agent/prompts/<name>.md (nombre de archivo = comando).
// - Agent Skills: ~/.agents/skills/<name>/ con SKILL.md + extras. Sin
//   commands: es la ubicación estándar de Agent Skills y no define commands.
import { mkdir, cp, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  planAgentBundle,
  AGENT_BUNDLE,
  type AgentBundleEntry,
  type BundlePlan,
} from "./agent-bundle.js";

export type GlobalTarget = "opencode" | "pi" | "agents";

export interface GlobalTargetSpec {
  id: GlobalTarget;
  /** Etiqueta para menús y resúmenes. */
  label: string;
  /** Ruta raíz absoluta del destino. */
  root: string;
  /** Carpeta de skills relativa a root. */
  skillsDir: string;
  /** Carpeta de commands relativa a root (undefined = no soporta commands). */
  commandsDir?: string;
}

// HOME se resuelve en runtime (no a nivel de módulo) para que los tests
// puedan redirigirlo. Si no hay HOME, los destinos globales no aplican.
export function resolveGlobalTargets(): GlobalTargetSpec[] {
  const home = process.env.HOME;
  if (!home) return [];
  return [
    {
      id: "opencode",
      label: `OpenCode global (${home}/.config/opencode)`,
      root: join(home, ".config", "opencode"),
      skillsDir: "skills",
      commandsDir: "command",
    },
    {
      id: "pi",
      label: `Pi global (${home}/.pi/agent)`,
      root: join(home, ".pi", "agent"),
      skillsDir: "skills",
      commandsDir: "prompts",
    },
    {
      id: "agents",
      label: `Agent Skills global (${home}/.agents/skills)`,
      root: join(home, ".agents"),
      skillsDir: "skills",
    },
  ];
}

export interface BundleFilter {
  bundle: AgentBundleEntry[];
  /** Nombres pedidos que no existen en el registro del CLI. */
  unknown: string[];
}

// Filtra el registro del bundle por nombre (--only create-specs,design).
// Sirve para instalar/eliminar un subconjunto sin tocar el resto.
export function filterBundleByNames(only: string[]): BundleFilter {
  const set = new Set(only);
  const bundle = AGENT_BUNDLE.filter((e) => set.has(e.dir));
  const known = new Set(AGENT_BUNDLE.map((e) => e.dir));
  return { bundle, unknown: only.filter((n) => !known.has(n)) };
}

// Convierte el plan de proyecto (installs relativos a <agent>/) en copias
// absolutas hacia un destino global. Comparte la forma exacta del plan para
// que el layout global sea idéntico al de proyecto.
function mapPlanToTarget(
  plan: BundlePlan,
  target: GlobalTargetSpec
): BundlePlan["installs"] {
  const mapped: BundlePlan["installs"] = [];
  for (const item of plan.installs) {
    // "skills/<name>/..." siempre va al skillsDir del destino.
    if (item.to.startsWith("skills/")) {
      mapped.push({
        from: item.from,
        to: join(target.root, target.skillsDir, item.to.slice("skills/".length)),
        recursive: item.recursive,
      });
      continue;
    }
    // "commands/<name>.md" va al commandsDir del destino (si lo soporta).
    if (item.to.startsWith("commands/")) {
      if (!target.commandsDir) continue; // destino sin commands: se omite
      mapped.push({
        from: item.from,
        to: join(target.root, target.commandsDir, item.to.slice("commands/".length)),
        recursive: item.recursive,
      });
      continue;
    }
    // El plan solo emite skills/ y commands/ — pero si mañana emite otra
    // cosa, lo omitimos a conciencia en vez de inventar una ubicación.
  }
  return mapped;
}

export interface GlobalInstallResult {
  target: GlobalTargetSpec;
  /** Cantidad de archivos/carpetas copiados. */
  copied: number;
  error?: string;
}

// Instala el bundle en un destino global. Misma semántica que el bundle de
// proyecto: sobrescribe la skill, borra primero las carpetas que el plan
// copia recursivamente (así un ejemplo eliminado del repo no queda huérfano).
export async function installGlobalSkills(
  repoRoot: string,
  targets: GlobalTargetSpec[],
  bundle: AgentBundleEntry[] = AGENT_BUNDLE
): Promise<GlobalInstallResult[]> {
  const plan = await planAgentBundle(repoRoot, bundle);
  const results: GlobalInstallResult[] = [];

  for (const target of targets) {
    try {
      let copied = 0;
      for (const item of mapPlanToTarget(plan, target)) {
        // Las copias recursivas van a una carpeta: borrarla antes evita
        // quedar con archivos viejos que el repo ya no tiene (drift).
        if (item.recursive === true) {
          await rm(item.to, { recursive: true, force: true });
        }
        await mkdir(
          item.recursive === true ? item.to : join(item.to, ".."),
          { recursive: true }
        );
        await cp(item.from, item.to, {
          recursive: item.recursive === true,
        });
        copied++;
      }
      results.push({ target, copied });
    } catch (error) {
      results.push({
        target,
        copied: 0,
        error: (error as Error).message,
      });
    }
  }

  return results;
}

export interface GlobalRemoveResult {
  target: GlobalTargetSpec;
  /** Skills/commands efectivamente eliminados (aunque no existieran). */
  removed: string[];
  error?: string;
}

// Elimina del destino global las skills del bundle (o del subconjunto dado).
// El borrado NO descarga el repo: deriva las rutas del registro del bundle.
// Solo borra lo que el propio bundle instala — nunca toca otras skills que
// el usuario tenga en esas ubicaciones.
export async function uninstallGlobalSkills(
  targets: GlobalTargetSpec[],
  bundle: AgentBundleEntry[] = AGENT_BUNDLE
): Promise<GlobalRemoveResult[]> {
  const skillNames = bundle.map((e) => e.dir);
  const results: GlobalRemoveResult[] = [];

  for (const target of targets) {
    try {
      const removed: string[] = [];

      // Skills: borrar la carpeta entera de cada skill del bundle.
      for (const name of skillNames) {
        await rm(join(target.root, target.skillsDir, name), {
          recursive: true,
          force: true,
        });
        removed.push(`${target.skillsDir}/${name}`);
      }

      // Commands: coincidencia exacta (<name>.md) + prefijo (<name>-*.md)
      // para cubrir los commands de las libraries (design.md y sus
      // design-<estilo>.md). La carpeta de commands puede no existir.
      if (target.commandsDir) {
        const cmdDir = join(target.root, target.commandsDir);
        for (const name of skillNames) {
          await rm(join(cmdDir, `${name}.md`), { force: true });
          removed.push(`${target.commandsDir}/${name}.md`);
          try {
            const prefix = `${name}-`;
            for (const f of await readdir(cmdDir)) {
              if (f.startsWith(prefix) && f.endsWith(".md")) {
                await rm(join(cmdDir, f), { force: true });
                removed.push(`${target.commandsDir}/${f}`);
              }
            }
          } catch {
            // El destino no tiene carpeta de commands: nada que borrar.
          }
        }
      }

      results.push({ target, removed });
    } catch (error) {
      results.push({ target, removed: [], error: (error as Error).message });
    }
  }

  return results;
}
