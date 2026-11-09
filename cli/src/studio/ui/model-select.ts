/**
 * Opciones del `select` de modelo del panel (spec S15).
 *
 * El cliente del studio viaja como un string dentro del bundle del CLI, así que
 * esta lógica se escribe una sola vez acá y se interpola en `CLIENT_JS`: el
 * navegador ejecuta exactamente este texto y los tests evalúan el mismo texto en
 * vez de una copia paralela. Por eso es JS plano, sin tipos ni sintaxis que no
 * sobreviva a la interpolación (ni backticks ni `${`).
 *
 * Reglas de S15 que implementa:
 * - la primera opción es el default del agente, con valor vacío (sin `--model`);
 * - la opción del modelo activo se rotula `(actual)` y queda seleccionada;
 * - si el activo no está en el catálogo se agrega igual, para no mentir;
 * - si el activo es desconocido, queda seleccionado el default.
 *
 * `desired` distingue "el usuario todavía no eligió" (`null`) de "eligió el
 * default" (`''`): en el primer caso se preselecciona el activo, en el segundo
 * se respeta la elección aunque haya un activo conocido.
 */
export const MODEL_CHOICE_SOURCE = `
  /**
   * Opciones del select de modelo, en orden, con el valor que debe quedar
   * seleccionado. No inventa ids: sólo usa el catálogo, el activo y lo elegido.
   */
  function modelChoice(defaultLabel, current, modelIds, desired) {
    var options = [{ value: '', label: defaultLabel }];
    var seen = { '': true };

    function add(id, label) {
      if (!id || seen[id]) return;
      seen[id] = true;
      options.push({ value: id, label: label || id });
    }

    var ids = modelIds || [];
    for (var i = 0; i < ids.length; i++) {
      add(ids[i], ids[i] === current ? ids[i] + ' (actual)' : '');
    }
    // El activo se rotula (actual) aunque el catálogo no lo traiga: es el modelo
    // que el agente está usando de verdad y esconderlo sería mentir.
    if (current) add(current, current + ' (actual)');
    // Un run del historial puede nombrar un modelo que el catálogo ya no lista:
    // se conserva la opción para no cambiar lo que se está mostrando.
    if (desired) add(desired, '');

    var value = typeof desired === 'string' ? desired : (current || '');
    if (!seen[value]) value = '';
    return { options: options, value: value };
  }
`;
