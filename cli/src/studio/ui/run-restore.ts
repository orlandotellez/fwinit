/**
 * Restauración del último run por skill en el panel (spec S16).
 *
 * El cliente del studio viaja como un string dentro del bundle del CLI, así que
 * la selección del run que se restaura se escribe una sola vez acá y se
 * interpola en `CLIENT_JS`: el navegador ejecuta exactamente este texto y los
 * tests evalúan el mismo texto. Por eso es JS plano, sin tipos ni sintaxis que
 * no sobreviva a la interpolación (ni backticks ni `${`).
 *
 * Reglas de S16 que implementa:
 * - la identidad de una skill es destino + alcance + nombre;
 * - el orden es por fecha de arranque, de la más nueva a la más vieja;
 * - se restaura el run más reciente, terminado o no;
 * - no se restaura si el usuario cerró el historial de esa skill, si ya hay una
 *   selección de esa skill o si hay un run vivo de esa skill.
 *
 * No arranca procesos ni escribe nada: sólo elige un run ya persistido.
 */
export const RUN_RESTORE_SOURCE = `
  /** La identidad de un run, igual que la clave del panel (S16). */
  function runRefKey(ref) {
    return ref.target + '/' + ref.scope + '/' + ref.name;
  }

  /** Las ejecuciones de una skill, de la más nueva a la más vieja (S16). */
  function runsForSkill(runs, ref) {
    var key = ref ? runRefKey(ref) : '';
    var out = [];
    if (!key) return out;
    (runs || []).forEach(function (run) {
      if (run && run.skill && runRefKey(run.skill) === key) out.push(run);
    });
    out.sort(function (a, b) {
      var ta = Date.parse(a.startedAt) || 0;
      var tb = Date.parse(b.startedAt) || 0;
      return tb - ta;
    });
    return out;
  }

  /** El run más reciente de esa skill, o null si no hay ninguno. */
  function latestRunForSkill(runs, ref) {
    var list = runsForSkill(runs, ref);
    return list.length ? list[0] : null;
  }

  /**
   * Qué run restaurar en el panel, o null cuando no corresponde restaurar.
   * Las flags distinguen que el usuario cerró el historial, que ya hay una
   * selección o que hay un run vivo de la misma skill.
   */
  function restoreCandidate(list, ref, flags) {
    if (!ref) return null;
    if (flags && (flags.dismissed === true || flags.selected === true || flags.live === true)) {
      return null;
    }
    return latestRunForSkill(list ? list.runs : null, ref);
  }
`;
