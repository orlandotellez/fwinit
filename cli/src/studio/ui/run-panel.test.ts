import { describe, expect, test } from "bun:test";
import { CLIENT_JS } from "./client.js";
import { STUDIO_CSS } from "./styles.js";

/**
 * El panel de ejecución se parte en tres regiones (spec S18).
 *
 * El cliente del studio es un string, así que lo que se puede fijar acá es el
 * contrato del markup y de los estilos: el header con sus datos y acciones, la
 * columna del agente con su composer al pie, el raíl de estado y la adaptación
 * a una sola columna. Lo que se prueba de verdad —cómo se arma cada fila— vive
 * en `run-steps.test.ts`.
 */
describe("panel de ejecución en tres regiones (S18)", () => {
  test("el header reúne skill, agente, estado, modelo, tiempo, pasos, líneas y acciones", () => {
    expect(CLIENT_JS).toContain("data-run-head");
    expect(CLIENT_JS).toContain("data-run-agent-name");
    expect(CLIENT_JS).toContain("data-run-badge");
    expect(CLIENT_JS).toContain("data-run-fact-model");
    expect(CLIENT_JS).toContain("data-run-timer");
    expect(CLIENT_JS).toContain("data-run-fact-steps");
    expect(CLIENT_JS).toContain("data-run-fact-lines");
    // Las dos acciones del header: historial y cancelar, sin prosa alrededor.
    expect(CLIENT_JS).toContain("data-run-history-action");
    expect(CLIENT_JS).toContain("data-run-cancel");
    expect(CLIENT_JS).toContain("text: 'Historial'");
    expect(CLIENT_JS).toContain("text: 'Cancelar'");
    // El estado que cambia es el que se anuncia.
    expect(CLIENT_JS).toContain("'aria-live': 'polite'");
  });

  test("el header no miente cuando no hay ninguna ejecución", () => {
    // Sin run no hay tiempo, pasos ni líneas: se dice, no se rellena con ceros.
    expect(CLIENT_JS).toContain("'sin ejecución'");
    expect(CLIENT_JS).toContain("function runStateShort(");
    expect(CLIENT_JS).toContain("function runStateTone(");
  });

  test("la columna del agente muestra el pedido y los pasos como filas", () => {
    expect(CLIENT_JS).toContain("data-run-stream");
    expect(CLIENT_JS).toContain("data-run-flow");
    expect(CLIENT_JS).toContain("function flowNode(");
    expect(CLIENT_JS).toContain("run-step__verb");
    expect(CLIENT_JS).toContain("run-step__target");
    expect(CLIENT_JS).toContain("run-step__result");
    expect(CLIENT_JS).toContain("run-step__tail");
    expect(CLIENT_JS).toContain("run-prose");
    // Lo que pediste, arriba, antes de la salida.
    expect(CLIENT_JS).toContain("data-run-prompt-block");
    expect(CLIENT_JS).toContain("Lo que pediste");
  });

  test("las líneas crudas siguen a un click: la salida nunca se pierde", () => {
    expect(CLIENT_JS).toContain("data-run-view-toggle");
    expect(CLIENT_JS).toContain("data-run-raw");
    expect(CLIENT_JS).toContain("function toggleRunView(");
    expect(CLIENT_JS).toContain("Líneas crudas");
    expect(CLIENT_JS).toContain("function paintLines(");
  });

  test("el composer vive al pie de la columna: pedido, agente, modelo y ejecutar", () => {
    expect(CLIENT_JS).toContain("data-run-composer");
    expect(CLIENT_JS).toContain("data-run-prompt");
    expect(CLIENT_JS).toContain("data-run-agent");
    expect(CLIENT_JS).toContain("data-run-model");
    expect(CLIENT_JS).toContain("text: 'Ejecutar skill'");
  });

  test("el raíl derecho trae progreso, qué hace ahora, consumo, sesión e historial", () => {
    expect(CLIENT_JS).toContain("data-run-rail");
    expect(CLIENT_JS).toContain("data-run-progress");
    expect(CLIENT_JS).toContain("data-run-now");
    expect(CLIENT_JS).toContain("data-run-consumo");
    expect(CLIENT_JS).toContain("data-run-session");
    expect(CLIENT_JS).toContain("data-skill-runs");
    // Sin métricas inventadas: el studio dice por qué no muestra tokens ni costo.
    expect(CLIENT_JS).toContain("no informa tokens ni costo");
  });

  test("un run recién restaurado informa las líneas que el server ya conoce", () => {
    // El historial dice cuántas líneas tiene el run: el header no puede mostrar
    // 0 mientras llega la salida (S18: no mentir sobre el estado).
    expect(CLIENT_JS).toContain("function runLineCount(");
    expect(CLIENT_JS).toContain("summary.lineCount");
  });

  test("el orden del DOM es el orden de lectura: header, columna, raíl", () => {
    const head = CLIENT_JS.indexOf("data-run-head");
    const stream = CLIENT_JS.indexOf("data-run-stream");
    const rail = CLIENT_JS.indexOf("data-run-rail");

    expect(head).toBeGreaterThan(-1);
    expect(stream).toBeGreaterThan(head);
    expect(rail).toBeGreaterThan(stream);
  });

  test("tres columnas desde 1100px y tira de estado por debajo", () => {
    expect(STUDIO_CSS).toContain("container-type: inline-size");
    expect(STUDIO_CSS).toContain("@container studio-pane");
    expect(STUDIO_CSS).toContain("1100px");
    expect(STUDIO_CSS).toContain("grid-template-areas: 'stream rail'");
    expect(STUDIO_CSS).toContain("grid-template-areas: 'rail' 'stream'");
    expect(STUDIO_CSS).toContain("320px");
  });

  test("el panel usa los tokens del sistema, sin colores ni radios nuevos", () => {
    // Esquinas rectas y separadores hairline: el panel no inventa estilo propio.
    expect(STUDIO_CSS).toContain(".run-panel {");
    expect(STUDIO_CSS).toContain(".run-block {");
    expect(STUDIO_CSS).toContain("border-bottom: var(--hairline-strong)");
    expect(STUDIO_CSS).not.toContain(".run-panel {\n  border-radius");
    expect(STUDIO_CSS).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
