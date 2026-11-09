/**
 * Cómo el panel muestra la sesión de una ejecución (spec S17).
 *
 * El cliente del studio viaja como un string dentro del bundle del CLI, así que
 * esta lógica se escribe una sola vez acá y se interpola en `CLIENT_JS`: el
 * navegador ejecuta exactamente este texto y los tests evalúan el mismo texto.
 * Por eso es JS plano, sin tipos ni sintaxis que no sobreviva a la interpola-
 * ción (ni backticks ni `${`).
 *
 * Reglas de S17 que implementa:
 * - pi y Gentle Shell guardan la sesión: se retoma con `<binario> --session <id>`
 *   o se elige en el selector del agente con `<binario> -r`;
 * - opencode tiene su propio formato de sesión: no se le inventa un comando de
 *   retomar, se ofrece listar sus sesiones;
 * - sin id capturado el panel lo dice en vez de fingir que se puede retomar.
 */
export const RUN_SESSION_SOURCE = `
  /** Etiqueta y binario de cada agente, para nombrar la sesión sin adivinar. */
  var RUN_SESSION_AGENTS = {
    opencode: { label: 'opencode', binary: null },
    pi: { label: 'Pi', binary: 'pi' },
    'gentle-shell': { label: 'Gentle Shell', binary: 'gentle-shell' }
  };

  function sessionAgentInfo(agent) {
    return RUN_SESSION_AGENTS[agent] || { label: String(agent || 'agente'), binary: null };
  }

  /** El id corto que entra en una fila; el completo queda en el botón de copiar. */
  function sessionShort(id) {
    var text = typeof id === 'string' ? id.trim() : '';
    if (!text) return '';
    return text.length > 8 ? text.slice(0, 8) : text;
  }

  /**
   * El comando exacto para retomar la sesión, o null cuando el agente no expone
   * una forma de hacerlo (opencode maneja su propio formato: no se inventa).
   */
  function sessionResumeCommand(agent, id) {
    var info = sessionAgentInfo(agent);
    var text = typeof id === 'string' ? id.trim() : '';
    if (!info.binary || !text) return null;
    return info.binary + ' --session ' + text;
  }

  /** Cómo elegirla a mano en el selector de sesiones del agente. */
  function sessionPickerCommand(agent) {
    var info = sessionAgentInfo(agent);
    return info.binary ? info.binary + ' -r' : null;
  }

  /**
   * El texto del panel: qué sesión hay y cómo retomarla, o por qué no se puede.
   * Nunca promete una sesión que el agente no informó.
   */
  function sessionNote(agent, id) {
    var info = sessionAgentInfo(agent);
    var text = typeof id === 'string' ? id.trim() : '';

    if (agent === 'opencode') {
      if (text) {
        return 'Sesión de opencode: ' + text + '. opencode maneja su propio formato: listala con opencode session list.';
      }
      return 'opencode no informó el id de esta sesión y el studio no lo inventa: listá sus sesiones con opencode session list.';
    }

    if (!text) {
      return 'Esta ejecución no tiene una sesión guardada en ' + info.label +
        ': se hizo antes de que el studio la registrara, así que no se puede retomar.';
    }

    return 'Sesión de ' + info.label + ': ' + text + '. Retomala con ' +
      sessionResumeCommand(agent, text) + ' o elegila en el selector con ' +
      sessionPickerCommand(agent) + '.';
  }
`;
