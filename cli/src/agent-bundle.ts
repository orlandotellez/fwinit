// Bundle de skills que viaja a cada proyecto generado.
//
// Este módulo es lógica pura del scaffold: no importa nada del CLI ni ejecuta
// prompts, así se puede importar y verificar por separado del entrypoint.

// Una entrada del bundle. `dir` es la carpeta dentro de skills/ en el repo y
// también el nombre de la skill y del comando slash (commands/<dir>.md → /<dir>).
//
// Hay dos formas, y son distintas a propósito:
//
// - "skill": expone SKILL.md (y command.md si tiene comando slash). Se
//   instala archivo por archivo, y sus extras (examples/, references/...)
//   viajan dentro de la carpeta de la skill.
// - "library": no tiene SKILL.md propio, es un contenedor de skills
//   (skills/design/ tiene dark-luxury/SKILL.md, etc.). Se copia entera, y sus
//   commands viven en <dir>/commands/*.md.
//
// `required` NO aborta la instalación. El bundle de skills se descarga del
// repo remoto, así que el CLI instalado y el bundle pueden version-skewear
// (alguien pushea una skill nueva y el CLI local todavía no la conoce, o al
// revés). Ante un skew se instala TODO lo que exista y se avisa qué falta:
// fallar en silencio y no instalar nada es peor que instalar un bundle
// parcial, porque el usuario se queda sin /create-specs y sin /design.
export type AgentBundleEntry =
  | {
      kind: "skill";
      dir: string;
      required: boolean;
      /** Subcarpetas que viajan dentro de la skill. Opcionales una por una. */
      extras?: string[];
    }
  | {
      kind: "library";
      dir: string;
      required: boolean;
    };

export const AGENT_BUNDLE: AgentBundleEntry[] = [
  {
    kind: "skill",
    dir: "create-specs",
    required: true,
    // Los ejemplos de prompts viajan a <agent>/skills/create-specs/examples/
    // para que la skill pueda mostrarlos dentro del proyecto generado.
    extras: ["examples"],
  },
  {
    // Skill espejo para proyectos que YA existen: misma familia, el comando
    // /create-specs rutea entre las dos según el estado del repo. Comparte el
    // Spec Tree Contract con create-specs, así que no duplica ejemplos: los
    // referencia desde ahí.
    kind: "skill",
    dir: "create-specs-from-code",
    required: true,
  },
  {
    // Biblioteca de estilos: skills/design/ con una subskill por estilo y sus
    // commands (/design, /design-<estilo>) que leen specs/frontend/02-design.md.
    kind: "library",
    dir: "design",
    required: false,
  },
];

// Una copia del plan. `to` es relativo al directorio del agente, así el
// mismo plan sirve para .opencode/ y para .pi/.
export interface BundleInstall {
  from: string;
  to: string;
  recursive?: boolean;
}

export interface BundlePlan {
  installs: BundleInstall[];
  /** Carpetas de skills a crear antes de copiar (solo entradas "skill"). */
  skillDirs: string[];
  /** Directorios de commands a crear antes de copiar. */
  commandDirs: string[];
  /**
   * Entradas `required` que el bundle remoto no trae. NO impiden instalar el
   * resto: se reportan para que el scaffold avise en vez de fallar en silencio.
   * Causa habitual: version skew entre el CLI instalado y el repo remoto.
   */
  missingRequired: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    const { access } = await import("node:fs/promises");
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdown(dir: string): Promise<string[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    return (await readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

// Resuelve qué se instala, sin tocar el filesystem del proyecto. Siempre
// devuelve un plan; las entradas requeridas ausentes van en `missingRequired`.
// `bundle` es inyectable para poder ejercitar las reglas sin depender de cómo
// esté poblado el bundle real.
export async function planAgentBundle(
  repoRoot: string,
  bundle: AgentBundleEntry[] = AGENT_BUNDLE
): Promise<BundlePlan> {
  const { join } = await import("node:path");
  const installs: BundleInstall[] = [];
  const skillDirs: string[] = [];
  const missingRequired: string[] = [];

  for (const entry of bundle) {
    const src = join(repoRoot, "skills", entry.dir);

    if (entry.kind === "library") {
      if (!(await exists(src))) {
        if (entry.required) missingRequired.push(entry.dir);
        continue;
      }
      installs.push({ from: src, to: `skills/${entry.dir}`, recursive: true });
      const cmds = join(src, "commands");
      for (const file of await listMarkdown(cmds)) {
        installs.push({ from: join(cmds, file), to: `commands/${file}` });
      }
      continue;
    }

    const skill = join(src, "SKILL.md");
    const command = join(src, "command.md");
    // El command.md es parte del contrato de una skill con comando slash, pero
    // que falte no la invalida: la skill se instala y el comando se omite.
    if (!(await exists(skill))) {
      if (entry.required) missingRequired.push(entry.dir);
      continue;
    }

    skillDirs.push(`skills/${entry.dir}`);
    installs.push({ from: skill, to: `skills/${entry.dir}/SKILL.md` });
    if (await exists(command)) {
      installs.push({ from: command, to: `commands/${entry.dir}.md` });
    } else if (entry.required) {
      missingRequired.push(`${entry.dir}/command.md`);
    }
    for (const extra of entry.extras ?? []) {
      const from = join(src, extra);
      if (await exists(from)) {
        installs.push({
          from,
          to: `skills/${entry.dir}/${extra}`,
          recursive: true,
        });
      }
    }
  }

  return { installs, skillDirs, commandDirs: ["commands"], missingRequired };
}
