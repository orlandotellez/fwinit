/**
 * Resumen que imprime el studio (spec S8).
 *
 * `fwinit studio` y la opción "Abrir studio" del menú muestran el mismo bloque:
 * proyecto, skills, specs y la URL. Vive acá, como renderer puro más un
 * printer, para que los dos caminos impriman exactamente lo mismo y el bloque
 * se pueda probar sin levantar el servidor.
 *
 * El renderer no calcula nada: `skillsLine` y `specsLine` llegan ya armados
 * (con sus fallbacks) desde el caller, que es el único que lee el disco.
 */
import chalk from "chalk";

export interface StudioSummaryInput {
  /**
   * Versión del CLI. El caller la pasa igual que al servidor (badge de la UI),
   * pero el bloque impreso no la muestra: mantener el header sin cambios es lo
   * que hace que la salida de `fwinit studio` siga siendo byte a byte la misma.
   */
  version: string;
  /** Raíz del proyecto que muestra el studio. */
  projectRoot: string;
  /** Fragmento ya formateado, p. ej. "12 (7 globales · 5 del proyecto)". */
  skillsLine: string;
  /** Fragmento ya formateado, p. ej. "9 archivos en specs/". */
  specsLine: string;
  /** URL loopback del servidor, p. ej. "http://127.0.0.1:4321". */
  url: string;
}

/**
 * Las líneas exactas que imprime `fwinit studio`, incluidas las líneas en
 * blanco que enmarcan el bloque: el resultado en pantalla no cambia.
 */
export function renderStudioSummary(input: StudioSummaryInput): string[] {
  // El header se arma de una pieza y se parte en líneas: chalk 5 reabre el
  // bold después de cada `\n`, así que cada línea lleva sus propios escapes y
  // el resultado con color es el mismo que imprimía el comando.
  return [
    ...chalk.bold("\n  fwinit studio\n").split("\n"),
    `  ${chalk.dim("Proyecto")}  ${input.projectRoot}`,
    `  ${chalk.dim("Skills")}    ${input.skillsLine}`,
    `  ${chalk.dim("Specs")}     ${input.specsLine}`,
    `  ${chalk.dim("URL")}       ${chalk.cyan(input.url)}`,
    "",
    `  ${chalk.dim("Ctrl+C para cerrar")}`,
    "",
  ];
}

/** Imprime el resumen línea por línea, con el mismo espaciado que hoy. */
export function printStudioSummary(input: StudioSummaryInput): void {
  for (const line of renderStudioSummary(input)) {
    console.log(line);
  }
}
