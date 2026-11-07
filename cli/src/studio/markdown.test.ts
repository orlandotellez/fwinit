/**
 * Renderer de markdown del studio (T3, S3).
 *
 * El studio sirve `specs/*.md` del proyecto a un navegador, así que el renderer
 * es superficie de seguridad, no sólo de estética: todo el texto de origen se
 * escapa antes de emitir markup, los esquemas peligrosos (`javascript:`,
 * `data:`, `file:`, `vbscript:`) nunca producen un anchor, las imágenes no
 * emiten `<img>` ni disparan requests remotas, y los enlaces relativos a otro
 * `.md` se marcan con `data-spec-link` para que el cliente navegue dentro de
 * `specs/` en vez de pedirle al servidor una ruta arbitraria.
 *
 * Se verifica sobre el HTML público (nunca sobre estructuras internas) porque
 * lo que consume el navegador es exactamente ese string.
 */
import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "./markdown.js";

describe("headings", () => {
  test("emite h1..h6 con id slug y lista headings en orden de documento", () => {
    const { html, headings } = renderMarkdown(
      "# Setup\n\n## Install & Run!\n\n### Usage\n\n#### Deep\n\n##### Deeper\n\n###### Deepest\n"
    );

    expect(html).toContain('<h1 id="setup">Setup</h1>');
    expect(html).toContain('<h2 id="install-run">Install &amp; Run!</h2>');
    expect(html).toContain('<h3 id="usage">Usage</h3>');
    expect(html).toContain('<h4 id="deep">Deep</h4>');
    expect(html).toContain('<h5 id="deeper">Deeper</h5>');
    expect(html).toContain('<h6 id="deepest">Deepest</h6>');
    expect(headings.map((h) => [h.level, h.text, h.id])).toEqual([
      [1, "Setup", "setup"],
      [2, "Install & Run!", "install-run"],
      [3, "Usage", "usage"],
      [4, "Deep", "deep"],
      [5, "Deeper", "deeper"],
      [6, "Deepest", "deepest"],
    ]);
  });

  test("ids duplicados reciben sufijos -2 y -3 y el heading reporta el id final", () => {
    const { html, headings } = renderMarkdown(
      "# Setup\n\n## Setup\n\n### Setup\n"
    );

    expect(html).toContain('<h1 id="setup">Setup</h1>');
    expect(html).toContain('<h2 id="setup-2">Setup</h2>');
    expect(html).toContain('<h3 id="setup-3">Setup</h3>');
    expect(headings.map((h) => h.id)).toEqual(["setup", "setup-2", "setup-3"]);
  });

  test("el slug colapsa espacios y descarta puntuación", () => {
    const { headings } = renderMarkdown("## Specs   &   Tasks: v1.2!\n");

    expect(headings).toEqual([
      { level: 2, text: "Specs   &   Tasks: v1.2!", id: "specs-tasks-v12" },
    ]);
  });
});

describe("code", () => {
  test("fenced code con info string escapa el contenido y marca el lenguaje", () => {
    const source = ['```ts', '<script>alert("x")</script>', "```"].join("\n");
    const { html } = renderMarkdown(source);

    expect(html).toBe(
      '<pre><code class="lang-ts">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</code></pre>'
    );
    expect(html).not.toContain("<script>");
  });

  test("fenced code sin info string no lleva class", () => {
    const source = ["```", "a < b && c > d", "```"].join("\n");

    expect(renderMarkdown(source).html).toBe(
      "<pre><code>a &lt; b &amp;&amp; c &gt; d</code></pre>"
    );
  });

  test("inline code se escapa y no se re-renderiza como markup", () => {
    expect(renderMarkdown("Usa `a <b> *x*` aquí\n").html).toBe(
      "<p>Usa <code>a &lt;b&gt; *x*</code> aquí</p>"
    );
  });
});

describe("links", () => {
  test("http(s) y mailto se vuelven anchors con rel noreferrer noopener", () => {
    expect(renderMarkdown("[docs](https://example.com/a?b=1)\n").html).toBe(
      '<p><a href="https://example.com/a?b=1" rel="noreferrer noopener">docs</a></p>'
    );
    expect(renderMarkdown("[mail](mailto:a@b.co)\n").html).toBe(
      '<p><a href="mailto:a@b.co" rel="noreferrer noopener">mail</a></p>'
    );
  });

  test("un .md relativo se vuelve anchor interno con data-spec-link normalizado", () => {
    expect(renderMarkdown("[guide](./docs/guide.md)\n").html).toBe(
      '<p><a href="#" data-spec-link="docs/guide.md">guide</a></p>'
    );
    expect(renderMarkdown("[a](docs/./a.md)\n").html).toBe(
      '<p><a href="#" data-spec-link="docs/a.md">a</a></p>'
    );
    expect(renderMarkdown("[b](docs/b.markdown)\n").html).toBe(
      '<p><a href="#" data-spec-link="docs/b.markdown">b</a></p>'
    );
  });

  test("esquemas peligrosos nunca emiten un anchor", () => {
    for (const target of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      const { html } = renderMarkdown(`[click](${target})`);

      expect(html).not.toContain("<a");
      expect(html).toContain("click");
      expect(html).not.toContain("javascript:");
    }

    expect(renderMarkdown("[click](javascript:alert(1))\n").html).toBe(
      "<p>click</p>"
    );
  });
});

describe("imágenes", () => {
  test("se renderizan como span.md-img con el alt y nunca como img", () => {
    const { html } = renderMarkdown("![un diagrama](./pic.png)\n");

    expect(html).toBe('<p><span class="md-img">un diagrama</span></p>');
    expect(html).not.toContain("<img");
  });
});

describe("html crudo", () => {
  test("se escapa en bloques y en línea, nunca pasa como markup", () => {
    const { html } = renderMarkdown(
      '<div class="x">hi</div>\n\ntexto <b onclick="y()">bold</b> final\n'
    );

    expect(html).toContain(
      "&lt;div class=&quot;x&quot;&gt;hi&lt;/div&gt;"
    );
    expect(html).toContain(
      "&lt;b onclick=&quot;y()&quot;&gt;bold&lt;/b&gt;"
    );
    expect(html).not.toContain("<div");
    expect(html).not.toContain("<b ");
  });
});

describe("bloques", () => {
  test("tabla con separador alineado se vuelve table/thead/tbody escapada", () => {
    const source = [
      "| Name | Type |",
      "| --- | :-: |",
      "| A & B | <x> |",
    ].join("\n");

    expect(renderMarkdown(source).html).toBe(
      "<table><thead><tr><th>Name</th><th>Type</th></tr></thead>" +
        "<tbody><tr><td>A &amp; B</td><td>&lt;x&gt;</td></tr></tbody></table>"
    );
  });

  test("listas con un nivel de anidamiento", () => {
    expect(renderMarkdown("- one\n  - child\n- two\n").html).toBe(
      "<ul><li>one<ul><li>child</li></ul></li><li>two</li></ul>"
    );
    expect(renderMarkdown("1. uno\n2. dos\n").html).toBe(
      "<ol><li>uno</li><li>dos</li></ol>"
    );
  });

  test("task list marca hechos y pendientes con checkbox deshabilitado", () => {
    const { html } = renderMarkdown("- [ ] todo\n- [x] done\n- [X] also done\n");

    expect(html).toBe(
      "<ul>" +
        '<li class="task"><input type="checkbox" disabled> todo</li>' +
        '<li class="task"><input type="checkbox" disabled checked> done</li>' +
        '<li class="task"><input type="checkbox" disabled checked> also done</li>' +
        "</ul>"
    );
  });

  test("párrafo multilínea queda en un solo p sin br", () => {
    const { html } = renderMarkdown("line one\nline two\nline three\n");

    expect(html).toBe("<p>line one\nline two\nline three</p>");
    expect(html).not.toContain("<br");
  });

  test("blockquote y regla horizontal", () => {
    expect(renderMarkdown("> quoted text\n").html).toBe(
      "<blockquote><p>quoted text</p></blockquote>"
    );
    expect(renderMarkdown("---\n").html).toBe("<hr>");
    expect(renderMarkdown("***\n").html).toBe("<hr>");
    expect(renderMarkdown("___\n").html).toBe("<hr>");
  });
});

describe("énfasis", () => {
  test("soporta ***, **, *, __, _, ~~ y anidamiento", () => {
    const source =
      "**bold** *italic* ***both*** __strong__ _em_ ~~gone~~ **bold *inner***\n";

    expect(renderMarkdown(source).html).toBe(
      "<p><strong>bold</strong> <em>italic</em> " +
        "<strong><em>both</em></strong> <strong>strong</strong> " +
        "<em>em</em> <del>gone</del> " +
        "<strong>bold <em>inner</em></strong></p>"
    );
  });

  test("no interpreta guiones bajos dentro de palabras", () => {
    expect(renderMarkdown("snake_case_name\n").html).toBe(
      "<p>snake_case_name</p>"
    );
  });
});

describe("documento mixto", () => {
  test("un documento real con heading, código y link de specs", () => {
    const source = [
      "# Guide",
      "",
      "Intro con **énfasis**.",
      "",
      "```sh",
      "bun test",
      "```",
      "",
      "- paso uno",
      "- paso dos",
      "",
      "Ver [tasks](./tasks/plan.md).",
    ].join("\n");

    const { html, headings } = renderMarkdown(source);

    expect(headings).toEqual([{ level: 1, text: "Guide", id: "guide" }]);
    expect(html).toContain('<h1 id="guide">Guide</h1>');
    expect(html).toContain("<p>Intro con <strong>énfasis</strong>.</p>");
    expect(html).toContain(
      '<pre><code class="lang-sh">bun test</code></pre>'
    );
    expect(html).toContain("<ul><li>paso uno</li><li>paso dos</li></ul>");
    expect(html).toContain(
      '<a href="#" data-spec-link="tasks/plan.md">tasks</a>'
    );
  });
});
