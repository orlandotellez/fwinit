import { describe, expect, test } from "bun:test";
import { CLIENT_JS } from "./client.js";
import { renderStudioHtml } from "./document.js";
import { STUDIO_CSS } from "./styles.js";

/**
 * La descripción de la skill se lee en su propia página (spec S19).
 *
 * El cliente es un string, así que lo que se puede fijar acá es el contrato:
 * qué sale del panel de trabajo, qué ruta abre el botón `Leer skill`, cómo se
 * vuelve al mismo punto y qué regiones tienen scroll propio. Lo que se prueba
 * de verdad —el scroll y el foco— se verificó a mano en el navegador.
 */

/** El cuerpo de una función del cliente, para no confundir deberes. */
function sourceOf(name: string): string {
  const start = CLIENT_JS.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`el cliente no tiene la función ${name}`);
  const end = CLIENT_JS.indexOf("\n  function ", start + 1);
  return CLIENT_JS.slice(start, end === -1 ? undefined : end);
}

/** El bloque de una regla CSS, para fijar la propiedad y no su vecindad. */
function cssBlock(selector: string): string {
  const start = STUDIO_CSS.indexOf(`\n${selector} {\n`);
  if (start === -1) throw new Error(`el CSS no tiene la regla ${selector}`);
  const end = STUDIO_CSS.indexOf("\n}\n", start);
  return STUDIO_CSS.slice(start, end === -1 ? undefined : end);
}

const html = renderStudioHtml({ version: "1.2.3", projectRoot: "/tmp/demo" });

describe("la descripción de la skill sale del panel de trabajo (S19)", () => {
  test("el detalle ya no dibuja el SKILL.md, sus archivos ni sus metadatos", () => {
    const detail = sourceOf("renderSkillDetail");
    expect(detail).not.toContain("ensureSkillDoc");
    expect(detail).not.toContain("metaRow(");
    expect(detail).not.toContain("skill-doc");
  });

  test("el panel de trabajo ofrece el botón Leer skill", () => {
    expect(CLIENT_JS).toContain("data-skill-read");
    expect(CLIENT_JS).toContain("text: 'Leer skill'");
    // Vive en el header del panel: es una acción del puesto de trabajo.
    expect(sourceOf("renderRunHead")).toContain("data-skill-read");
    expect(sourceOf("openReader")).toContain("captureOutputScroll(");
  });

  test("una skill que ya no está instalada no ofrece leer un contenido que no existe", () => {
    // El botón se arma condicionado a que la skill esté en el reporte.
    expect(sourceOf("renderRunHead")).toContain("skill.missing");
  });
});

describe("la lectura es una ruta propia, no un modal (S19)", () => {
  test("existe una ruta de lectura en el router por hash", () => {
    expect(CLIENT_JS).toContain("'#/leer/'");
    expect(CLIENT_JS).toContain("parts[0] === 'leer'");
    expect(sourceOf("render")).toContain("renderReader(");
    // El router sigue siendo el mismo: atrás y adelante del navegador andan.
    expect(CLIENT_JS).toContain("window.addEventListener('hashchange', route)");
  });

  test("la página de lectura es un estado del documento, no un diálogo", () => {
    expect(html).toContain('data-view-panel="reader"');
    expect(html).toContain("data-reader");
    expect(html).not.toContain("<dialog");
    expect(CLIENT_JS).not.toContain("showModal");
  });

  test("la página trae el SKILL.md, sus archivos y los metadatos de la skill", () => {
    const reader = sourceOf("renderReader");
    expect(reader).toContain("ensureSkillDoc(");
    expect(reader).toContain("el('h1'");
    expect(reader).toContain("metaRow('Directorio'");
    expect(reader).toContain("metaRow('Archivos'");
    // Los archivos y el contenido siguen saliendo de las mismas rutas de lectura.
    expect(CLIENT_JS).toContain("'/api/skills/files?'");
    expect(CLIENT_JS).toContain("article.innerHTML = sanitize(state.skillFile.html)");
  });
});

describe("Regresar vuelve al punto de trabajo anterior (S19)", () => {
  test("el botón ← Regresar es una vuelta a la ruta del panel, no un cierre de modal", () => {
    expect(CLIENT_JS).toContain("'\u2190 Regresar'");
    expect(sourceOf("leaveReader")).toContain("skillHash(");
    // Entrar directo a la lectura sin historial cae en el panel de esa skill.
    expect(sourceOf("leaveReader")).toContain("'#/skills'");
  });

  test("al volver se recupera la posición de la salida del agente", () => {
    expect(CLIENT_JS).toContain("function captureOutputScroll(");
    expect(CLIENT_JS).toContain("state.outputScroll");
    expect(sourceOf("openReader")).toContain("captureOutputScroll(");
    // El repintado de vuelta ya no salta siempre al fondo: restaura lo guardado.
    expect(sourceOf("paintRun")).toContain("state.pendingScrollOutput");
    expect(sourceOf("paintRun")).toContain("state.outputScroll");
  });

  test("el foco entra a la lectura y vuelve al botón Leer skill", () => {
    // El título recibe el foco al entrar: es la página que se acaba de abrir.
    expect(sourceOf("renderReader")).toContain("focus(");
    expect(sourceOf("restoreReaderFocus")).toContain("data-skill-read");
    expect(sourceOf("restoreReaderFocus")).toContain("focus()");
    expect(sourceOf("route")).toContain("restoreReaderFocus(");
  });

  test("Escape en la lectura vuelve, igual que ← Regresar", () => {
    expect(CLIENT_JS).toContain("event.key === 'Escape' && state.reader");
    expect(CLIENT_JS).toContain("leaveReader()");
  });
});

describe("leer la skill no interrumpe la ejecución (S19)", () => {
  test("entrar y salir de la lectura no toca el run ni su polling", () => {
    for (const name of ["openReader", "leaveReader", "renderReader", "route"]) {
      const body = sourceOf(name);
      expect(body).not.toContain("stopRunPolling");
      expect(body).not.toContain("cancelRun");
      expect(body).not.toContain("state.run = null");
    }
  });

  test("la salida acumulada se repinta al volver", () => {
    // El panel no se destruye al leer: el run sigue llegando y se repinta con
    // las líneas que el polling ya acumuló.
    expect(sourceOf("leaveReader")).toContain("pendingScrollOutput");
    expect(sourceOf("renderSkillDetail")).toContain("paintRun(");
  });
});

describe("el panel queda fijo y sólo dos regiones scrollean (S19)", () => {
  test("el panel de trabajo ocupa el alto del marco y no scrollea como página", () => {
    const pane = cssBlock(".pane[data-detail='skills']");
    expect(pane).toContain("display: flex");
    expect(pane).toContain("flex-direction: column");
    expect(pane).toContain("overflow: hidden");
    expect(pane).toContain("min-height: 0");
    // El alto fijo en `clamp()` dejaba el panel a media pantalla.
    expect(STUDIO_CSS).not.toContain("clamp(28rem, 66vh, 46rem)");
    expect(cssBlock(".run-panel")).toContain("height: 100%");
  });

  test("la lectura ocupa todo el ancho y alto, y sólo su contenido scrollea", () => {
    const reader = cssBlock(".reader");
    expect(reader).toContain("height: 100%");
    expect(reader).toContain("overflow: hidden");
    expect(reader).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(cssBlock(".reader__body")).toContain("overflow-y: auto");
    expect(cssBlock(".reader__head")).toContain("border-bottom: var(--hairline-strong)");
  });

  test("el texto mantiene medida de lectura aunque la página sea full width", () => {
    expect(cssBlock(".reader__inner")).toContain("max-width");
    expect(cssBlock(".reader__inner")).toContain("margin-inline: auto");
  });

  test("la lectura no inventa tokens: esquinas rectas y un solo acento", () => {
    expect(cssBlock(".reader")).not.toContain("border-radius");
    expect(cssBlock(".reader__head")).not.toContain("border-radius");
    expect(cssBlock(".reader__inner")).not.toContain("border-radius");
    expect(cssBlock(".reader__title")).toContain("var(--text-h3)");
    expect(cssBlock(".reader__title")).not.toMatch(/#[0-9a-f]{3,8}/i);
  });
});
