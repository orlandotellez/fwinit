/**
 * Las filas del panel de ejecución (spec S18).
 *
 * El cliente del studio viaja como un string dentro del bundle del CLI, así que
 * esta lógica se escribe una sola vez acá y se interpola en `CLIENT_JS`: el
 * navegador ejecuta exactamente este texto y los tests evalúan el mismo texto en
 * vez de una copia paralela. Por eso es JS plano, sin tipos ni sintaxis que no
 * sobreviva a la interpolación (ni backticks ni `${`).
 *
 * Reglas de S18 que implementa:
 * - cada línea que no es prosa se presenta como una fila `verbo · destino · resultado`;
 * - el destino sólo se separa cuando el agente lo nombra como una ruta, no se
 *   inventa a partir de la primera palabra que aparezca;
 * - la prosa se devuelve null: el panel la dibuja como párrafo, no como fila;
 * - lo que el studio no entiende se conserva tal cual, como fila cruda.
 */

export const RUN_STEPS_SOURCE = `
  /** Cómo se nombra una fila de un tipo de línea que el studio sí conoce. */
  var RUN_STEP_VERBS = { tool: 'herramienta', status: 'estado', raw: 'crudo' };

  /** Las palabras de una etiqueta, sin depender de regex con escapes. */
  function stepWords(text) {
    var parts = String(text || '').trim().split(' ');
    var words = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] !== '') words.push(parts[i]);
    }
    return words;
  }

  /** True cuando la palabra parece una ruta o un destino nombrado por el agente. */
  function stepTargetLike(word) {
    return word.indexOf('/') !== -1 || word.indexOf('.') !== -1 || word.indexOf(':') !== -1;
  }

  /**
   * Una línea de salida como fila del panel, o null cuando es prosa.
   *
   * El verbo de una herramienta es su nombre tal como lo informa el agente. Si
   * además nombra un destino con forma de ruta (read specs/x.md) se separa en la
   * columna de destino y el resto queda como resultado. Un comando como
   * 'bash bun test' no se parte: el verbo es bash y el comando entero es el
   * resultado, porque 'test' no es un destino.
   */
  function stepOfLine(line) {
    if (!line || typeof line.text !== 'string') return null;
    if (line.kind === 'text') return null;

    var text = line.text.trim();
    var verb = RUN_STEP_VERBS[line.kind] || String(line.kind || '');
    var target = '';
    var body = text;

    if (line.kind === 'tool') {
      var words = stepWords(text);
      if (words.length > 0) {
        verb = words[0];
        body = words.slice(1).join(' ');
        if (words.length > 1 && stepTargetLike(words[1])) {
          target = words[1];
          body = words.slice(2).join(' ');
        }
      } else {
        verb = RUN_STEP_VERBS.tool;
      }
    }

    return { n: line.n, kind: line.kind, verb: verb, target: target, body: body };
  }

  /** La fila en una línea de texto: la usa el raíl para nombrar la actividad. */
  function stepLabel(step) {
    if (!step) return '';
    var parts = [step.verb];
    if (step.target) parts.push(step.target);
    if (step.body) parts.push(step.body);
    return parts.join(' ');
  }

  /** Cuántos pasos de herramienta hay: es el 'pasos' del header. */
  function stepCount(lines) {
    var list = lines || [];
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].kind === 'tool') total++;
    }
    return total;
  }

  /**
   * Qué está haciendo el agente: la última herramienta, no la última línea.
   * Después de un paso puede venir prosa, y la actividad sigue siendo el paso.
   */
  function currentActivity(lines) {
    var list = lines || [];
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i] && list[i].kind === 'tool') return stepLabel(stepOfLine(list[i]));
    }
    return '';
  }
`;
