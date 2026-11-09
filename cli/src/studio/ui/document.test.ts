import { describe, expect, test } from "bun:test";
import { renderStudioHtml } from "./document.js";
import { CLIENT_JS } from "./client.js";

/**
 * The studio shell is a string, so what can be pinned here is the contract the
 * browser relies on: the mobile navigation exists in the markup, the initial
 * view is Specs, and the client owns the drawer wiring.
 */
describe("studio document", () => {
  const html = renderStudioHtml({ version: "1.2.3", projectRoot: "/tmp/demo" });

  test("renders the mobile navigation controls", () => {
    expect(html).toContain("data-drawer-toggle");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("data-drawer-scrim");
    expect(html).toContain("nav-bars");
  });

  test("opens on Specs, with the tab and the panel in agreement", () => {
    expect(html).toContain('data-view="specs" aria-selected="true"');
    expect(html).toContain('data-view-panel="specs" data-active="true"');
    expect(html).toContain('data-view-panel="skills" data-active="false"');
  });

  test("the client owns the drawer wiring", () => {
    expect(CLIENT_JS).toContain("function setDrawer(");
    expect(CLIENT_JS).toContain("closeDrawer();");
    expect(CLIENT_JS).toContain("body.dataset.drawer = 'open'");
  });

  test("starts the skills view on the project scope, with globals one click away", () => {
    expect(html).toContain('data-scope="project" aria-pressed="true"');
    expect(html).toContain('data-scope="global" aria-pressed="false"');
    expect(CLIENT_JS).toContain("scope: 'project'");
    expect(CLIENT_JS).toContain("function setScope(");
  });

  test("the install action depends on the server-resolved bundle and token", () => {    expect(CLIENT_JS).toContain("function canInstall(");
    expect(CLIENT_JS).toContain("meta.installToken");
    const withInstall = renderStudioHtml({
      version: "1.2.3",
      projectRoot: "/tmp/demo",
      install: { available: true, source: "/repo", skills: ["create-specs"] },
      installToken: "abc123",
    });
    expect(withInstall).toContain('\"installToken\":\"abc123\"');
    expect(withInstall).toContain('\"skills\":[\"create-specs\"]');
  });

  test("el detalle ejecuta la skill: input, selector de agente, stream y cancelar", () => {
    // Ejecutar es la acción principal (S9): el input, los tres agentes y la
    // salida viva existen, y la instalación queda como acción secundaria.
    expect(CLIENT_JS).toContain("function renderRunBlock(");
    expect(CLIENT_JS).toContain("data-run-prompt");
    expect(CLIENT_JS).toContain("data-run-agent");
    expect(CLIENT_JS).toContain("text: 'Ejecutar skill'");
    expect(CLIENT_JS).toContain("data-run-cancel");
    expect(CLIENT_JS).toContain("text: 'Instalar en los agentes'");
    expect(CLIENT_JS).toContain("'gentle-shell', label: 'Gentle Shell'");
  });

  test("el panel consulta por cursor, sin inventar líneas", () => {
    expect(CLIENT_JS).toContain("'/api/skills/run?id='");
    expect(CLIENT_JS).toContain("'&since=' + run.next");
    expect(CLIENT_JS).toContain("/api/skills/run/cancel");
    // El polling se detiene solo y refresca los reportes al terminar.
    expect(CLIENT_JS).toContain("function refreshReports(");
    expect(CLIENT_JS).toContain("state.specs = null;");
  });

  test("el historial reengancha la ejecución en curso al cargar la página (S13)", () => {
    // El historial vive en el raíl: se ve sin abrir el detalle de una skill.
    expect(html).toContain("data-run-history");
    expect(CLIENT_JS).toContain("'/api/skills/runs'");
    expect(CLIENT_JS).toContain("function bootRunHistory(");
    expect(CLIENT_JS).toContain("function reattachRun(");
    expect(CLIENT_JS).toContain("function renderRunHistory(");
    expect(CLIENT_JS).toContain("function loadHistoricalRun(");
    // Un run sin cierre se nombra como interrumpido, nunca como en curso.
    expect(CLIENT_JS).toContain("interrupted");
  });

  test("el panel elige el modelo con un select y muestra el activo (S14/S15)", () => {
    expect(CLIENT_JS).toContain("'/api/skills/models?agent='");
    expect(CLIENT_JS).toContain("data-run-model");
    expect(CLIENT_JS).toContain("function ensureModelList(");
    expect(CLIENT_JS).toContain("model: model");
    // El campo dejó de ser texto libre: es un select alimentado por el catálogo
    // y por el modelo activo del agente, no un input con sugerencias.
    expect(CLIENT_JS).toContain("function modelChoice(");
    expect(CLIENT_JS).toContain("el('select'");
    expect(CLIENT_JS).not.toContain("datalist");
    expect(CLIENT_JS).toContain("(actual)");
  });

  test("el panel restaura el último run de la skill aunque ya haya terminado (S16)", () => {
    // Recargar después de que la ejecución terminó no puede dejar el panel vacío:
    // se restaura el run más reciente de la skill que se está mirando.
    expect(CLIENT_JS).toContain("function restoreHistoricalRun(");
    expect(CLIENT_JS).toContain("function restoreCurrentSkillRun(");
    expect(CLIENT_JS).toContain("function latestRunForSkill(");
    expect(CLIENT_JS).toContain("function runsForSkill(");
    expect(CLIENT_JS).toContain("restoreCandidate(");
    expect(CLIENT_JS).toContain("state.restoreDismissed");
    // Restaurar es sólo lectura: pide el run guardado con since=0, sin POST.
    expect(CLIENT_JS).toContain("loadHistoricalRun(");
    expect(CLIENT_JS).toContain("'&since=0'");
  });

  test("el panel lista las ejecuciones de la skill ahí mismo (S16)", () => {
    // El raíl sigue siendo el historial global; el panel muestra las de la skill.
    expect(CLIENT_JS).toContain("function renderSkillRunHistory(");
    expect(CLIENT_JS).toContain("Ejecuciones de esta skill");
    expect(CLIENT_JS).toContain("openHistoricalRun(");
  });

  test("un run de una skill desinstalada se abre igual, con su aviso (S16)", () => {
    // Antes se dibujaba como texto muerto; ahora es un botón y el panel avisa
    // que la skill no está instalada sin ocultar la salida guardada.
    expect(CLIENT_JS).toContain("function orphanRunSkill(");
    expect(CLIENT_JS).toContain("function renderOrphanRunDetail(");
    expect(CLIENT_JS).toContain("ya no está instalada");
    expect(CLIENT_JS).not.toContain("(ya no está instalada) · '" );
    expect(CLIENT_JS).not.toContain("no se puede abrir");
  });

  test("el panel dice cuál es el modelo activo y que elegir no toca la config (S15)", () => {
    // El activo se anuncia con su origen, y si no se pudo leer se dice, en vez
    // de inventar un modelo.
    expect(CLIENT_JS).toContain("Modelo activo de ");
    expect(CLIENT_JS).toContain("No se pudo leer el modelo activo de ");
    expect(CLIENT_JS).toContain("function syncModelNote(");
    // Elegir un modelo aplica sólo a esa ejecución: el studio no reescribe la
    // configuración de los agentes.
    expect(CLIENT_JS).toContain("no escribe en la configuración de ");
  });
});
