/**
 * Browser client for `fwinit studio`.
 *
 * Vanilla ES2017, shipped as a string inside the CLI bundle so `files: ["dist"]`
 * keeps working. No framework, no build step: the same constraint the landing
 * page meets with plain CSS.
 *
 * The client never invents data: it renders `/api/skills`, `/api/specs` and
 * `/api/specs/file`, and it sanitizes the server-rendered document before it
 * touches the DOM.
 */
export const CLIENT_JS = `
(function () {
  'use strict';

  var THEME_KEY = 'fwinit:theme';
  var metaEl = document.getElementById('studio-meta');
  var meta = metaEl ? JSON.parse(metaEl.textContent || '{}') : {};

  var state = {
    view: 'skills',
    scope: 'global',
    skillKey: null,
    specPath: null,
    filter: { skills: '', specs: '' },
    skills: null,
    specs: null,
    doc: null,
    collapsed: {},
    expanded: {},
    tocLinks: []
  };

  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value === undefined || value === null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = String(value);
        else if (key === 'dataset') {
          Object.keys(value).forEach(function (dataKey) {
            node.dataset[dataKey] = String(value[dataKey]);
          });
        } else if (key.indexOf('on') === 0 && typeof value === 'function') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (key === 'html') {
          node.innerHTML = value;
        } else {
          node.setAttribute(key, String(value));
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function fmtBytes(bytes) {
    if (typeof bytes !== 'number' || !isFinite(bytes)) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    var pad = function (value) { return String(value).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
  }

  function shortPath(path) {
    var home = meta.home || '';
    if (home && path.indexOf(home) === 0) return '~' + path.slice(home.length);
    return path;
  }

  function copyValue(value, button) {
    var run = function () {
      var done = function () {
        if (!button) return;
        var previous = button.getAttribute('data-label') || button.textContent;
        button.setAttribute('data-label', previous);
        button.setAttribute('data-copied', 'true');
        button.textContent = 'Copiado';
        setTimeout(function () {
          button.removeAttribute('data-copied');
          button.textContent = previous;
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, function () {});
        return;
      }
      var area = el('textarea', { style: 'position:fixed;opacity:0' });
      area.value = value;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch (error) { /* ignore */ }
      document.body.removeChild(area);
    };
    run();
  }

  function copyButton(label, value) {
    return el('button', {
      type: 'button',
      class: 'btn',
      'aria-label': 'Copiar ' + label,
      text: label,
      onclick: function (event) { copyValue(value, event.currentTarget); }
    });
  }

  /* ── Theme ─────────────────────────────────────────────────────────────── */

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function currentTheme() {
    var stored = document.documentElement.dataset.theme;
    if (stored === 'light' || stored === 'dark') return stored;
    return systemTheme();
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* private mode */ }
    var button = q('[data-theme-toggle]');
    if (!button) return;
    var isLight = theme === 'light';
    button.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    button.setAttribute('aria-label', isLight ? 'Cambiar al tema oscuro' : 'Cambiar al tema claro');
  }

  function toggleTheme() {
    applyTheme(currentTheme() === 'light' ? 'dark' : 'light');
  }

  /* ── Data ──────────────────────────────────────────────────────────────── */

  function fetchJson(url) {
    return fetch(url, { headers: { accept: 'application/json' } }).then(function (response) {
      if (response.ok) return response.json();
      return response.json().catch(function () { return {}; }).then(function (body) {
        var error = new Error(body.error || 'La solicitud falló (' + response.status + ')');
        error.status = response.status;
        throw error;
      });
    });
  }

  function loadSkills() {
    if (state.skills) return Promise.resolve(state.skills);
    return fetchJson('/api/skills').then(function (data) {
      state.skills = data;
      return data;
    });
  }

  function loadSpecs() {
    if (state.specs) return Promise.resolve(state.specs);
    return fetchJson('/api/specs').then(function (data) {
      state.specs = data;
      return data;
    });
  }

  /* ── Routing ───────────────────────────────────────────────────────────── */

  function route() {
    var raw = (location.hash || '#/skills').replace(/^#\\/?/, '');
    var parts = raw.split('/').map(function (part) {
      try { return decodeURIComponent(part); } catch (error) { return part; }
    });
    state.view = parts[0] === 'specs' ? 'specs' : 'skills';
    if (state.view === 'skills') {
      if (parts.length >= 4) {
        state.scope = parts[1] === 'project' ? 'project' : 'global';
        state.skillKey = parts.slice(2).join('/');
      }
    } else {
      var nextPath = parts.slice(1).join('/') || null;
      if (state.doc && state.doc.path !== nextPath) state.doc = null;
      state.specPath = nextPath;
    }
    render();
    // Cambiar de ruta tiene que pedir el documento: render() sólo dibuja el
    // estado que ya tiene en memoria.
    if (state.view === 'specs') loadSpecDoc();
  }

  function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function skillHash(target, name) {
    return '#/skills/' + state.scope + '/' + encodeURIComponent(target) + '/' + encodeURIComponent(name);
  }

  function specHash(path) {
    return '#/specs/' + path.split('/').map(encodeURIComponent).join('/');
  }

  /* ── Shell ─────────────────────────────────────────────────────────────── */

  function syncShell() {
    qa('[data-view]').forEach(function (tab) {
      tab.setAttribute('aria-selected', tab.dataset.view === state.view ? 'true' : 'false');
    });
    qa('[data-view-panel]').forEach(function (panel) {
      panel.dataset.active = panel.dataset.viewPanel === state.view ? 'true' : 'false';
    });
    var skillsCount = q('[data-count="skills"]');
    var specsCount = q('[data-count="specs"]');
    if (skillsCount && state.skills) {
      skillsCount.textContent = String(state.skills.totals.global + state.skills.totals.project);
    }
    if (specsCount && state.specs) {
      specsCount.textContent = String(state.specs.totals.files);
    }
    var counts = q('[data-status-counts]');
    if (counts) {
      var bits = [];
      if (state.skills) bits.push(state.skills.totals.global + ' skills globales');
      if (state.skills) bits.push(state.skills.totals.project + ' skills del proyecto');
      if (state.specs) bits.push(state.specs.totals.files + ' archivos de specs');
      counts.textContent = bits.join(' · ');
    }
    var root = q('[data-status-root]');
    if (root) {
      root.textContent = shortPath(meta.projectRoot || '');
      root.title = meta.projectRoot || '';
    }
  }

  function emptyState(options) {
    return el('div', { class: 'empty' }, [
      el('p', { class: 'empty__title', text: options.title }),
      options.text ? el('p', { class: 'empty__text', text: options.text }) : null,
      options.path ? el('p', { class: 'empty__path', text: options.path }) : null,
      options.hint ? el('p', { class: 'empty__hint', text: options.hint }) : null
    ]);
  }

  function renderError(container, error) {
    container.textContent = '';
    container.appendChild(emptyState({
      title: 'El studio no pudo leer esto',
      text: error && error.message ? error.message : 'Error desconocido.',
      hint: 'Volvé a ejecutar fwinit studio desde la raíz del proyecto.'
    }));
  }

  /* ── Skills view ───────────────────────────────────────────────────────── */

  function visibleSkills(report, scope) {
    var filter = state.filter.skills.trim().toLowerCase();
    var out = [];
    (report.targets || []).forEach(function (target) {
      (target.skills || []).forEach(function (skill) {
        if (skill.scope !== scope) return;
        if (filter) {
          var haystack = (skill.name + ' ' + (skill.description || '') + ' ' + (skill.version || '')).toLowerCase();
          if (haystack.indexOf(filter) === -1) return;
        }
        out.push(skill);
      });
    });
    return out;
  }

  function skillMetaLine(skill) {
    var bits = [];
    bits.push(skill.files + (skill.files === 1 ? ' archivo' : ' archivos'));
    if (skill.version) bits.push('v' + skill.version);
    if (skill.hasCommand) bits.push('command');
    return bits.join(' · ');
  }

  function renderSkillList() {
    var container = q('[data-list="skills"]');
    if (!container) return;
    container.textContent = '';
    var report = state.skills;
    if (!report) {
      container.appendChild(el('p', { class: 'loading', text: 'Leyendo las skills instaladas…' }));
      return;
    }
    var shown = visibleSkills(report, state.scope);
    if (!shown.length) {
      container.appendChild(emptyState({
        title: state.filter.skills ? 'Ninguna skill coincide con el filtro' : 'No hay skills en este alcance',
        text: state.filter.skills
          ? 'Limpiá el filtro para ver todo lo instalado.'
          : 'Instalalas con: fwinit skills --global ' + state.scope,
        hint: String(shown.length) + ' de ' + String(report.totals[state.scope]) + ' en este alcance'
      }));
    }
    (report.targets || []).forEach(function (target) {
      var skills = (target.skills || []).filter(function (skill) {
        return skill.scope === state.scope && shown.indexOf(skill) !== -1;
      });
      var dir = state.scope === 'global' ? target.globalDir : target.projectDir;
      var exists = state.scope === 'global' ? target.globalExists : target.projectExists;
      var collapsed = state.collapsed[state.scope + ':' + target.id] === true;
      var group = el('div', { class: 'group' });

      group.appendChild(el('button', {
        type: 'button',
        class: 'group__head',
        'aria-expanded': collapsed ? 'false' : 'true',
        onclick: function () {
          state.collapsed[state.scope + ':' + target.id] = !collapsed;
          renderSkillList();
        }
      }, [
        target.label,
        el('span', { class: 'group__count', text: String(skills.length) })
      ]));

      if (!collapsed) {
        group.appendChild(el('p', { class: 'group__path', title: dir, text: shortPath(dir) }));
        if (!exists || !skills.length) {
          group.appendChild(el('p', {
            class: 'row--empty',
            text: exists ? 'No hay skills acá' : 'No instalado'
          }));
        }
        skills.forEach(function (skill) {
          var key = skill.target + '/' + skill.name;
          group.appendChild(el('button', {
            type: 'button',
            class: 'row',
            'aria-current': state.skillKey === key ? 'true' : 'false',
            title: skill.description || skill.name,
            onclick: function () { navigate(skillHash(skill.target, skill.name)); }
          }, [
            el('span', { class: 'row__name', text: skill.name }),
            el('span', { class: 'row__meta', text: skillMetaLine(skill) })
          ]));
        });
      }
      container.appendChild(group);
    });
    // Avisos del reporte (directorios ilegibles o symlinks salteados): sin esto
    // una skill salteada desaparece de la lista sin explicación.
    (report.warnings || []).forEach(function (warning) {
      container.appendChild(el('p', { class: 'row--empty', text: 'Aviso: ' + warning }));
    });
  }

  function selectedSkill() {
    if (!state.skills || !state.skillKey) return null;
    var parts = state.skillKey.split('/');
    var target = parts[0];
    var name = parts.slice(1).join('/');
    var found = null;
    (state.skills.targets || []).forEach(function (entry) {
      if (entry.id !== target) return;
      (entry.skills || []).forEach(function (skill) {
        if (skill.scope !== state.scope) return;
        if (skill.name !== name) return;
        found = skill;
      });
    });
    return found;
  }

  function metaRow(key, value, strong) {
    return el('div', { class: 'meta__row' }, [
      el('span', { class: 'meta__key', text: key }),
      el('span', { class: 'meta__value' + (strong ? ' meta__value--strong' : ''), text: value === undefined || value === '' ? '—' : String(value) })
    ]);
  }

  function renderSkillDetail() {
    var container = q('[data-detail="skills"]');
    if (!container) return;
    container.textContent = '';
    if (!state.skills) {
      container.appendChild(el('p', { class: 'loading', text: 'Leyendo las skills instaladas…' }));
      return;
    }
    var skill = selectedSkill();
    if (!skill) {
      var target = (state.skills.targets || [])[0] || null;
      var dir = target ? (state.scope === 'global' ? target.globalDir : target.projectDir) : '';
      container.appendChild(emptyState({
        title: 'Elegí una skill',
        text: 'Las skills de este alcance están a la izquierda, agrupadas por la herramienta que las lee.',
        path: dir ? shortPath(dir) : undefined,
        hint: 'fwinit skills --global opencode|pi|gentle-shell'
      }));
      return;
    }
    var report = null;
    (state.skills.targets || []).forEach(function (entry) {
      if (entry.id === skill.target) report = entry;
    });

    container.appendChild(el('header', null, [
      el('p', { class: 'eyebrow', text: (report ? report.label : skill.target) + ' · ' + skill.scope }),
      el('h1', { class: 'detail__title', text: skill.name }),
      el('p', { class: 'detail__lede', text: skill.description || 'Esta skill no tiene descripción en su frontmatter.' }),
      el('div', { class: 'detail__actions' }, [
        copyButton('Copiar ruta', skill.path),
        copyButton('Copiar nombre', skill.name),
        skill.version ? el('span', { class: 'badge badge--accent', text: 'v' + skill.version }) : null,
        el('span', { class: 'badge badge--muted', text: skill.files + (skill.files === 1 ? ' archivo' : ' archivos') }),
        skill.hasCommand ? el('span', { class: 'badge badge--muted', text: 'command.md' }) : null
      ])
    ]));

    container.appendChild(el('div', { class: 'meta' }, [
      metaRow('Directorio', shortPath(skill.dir), true),
      metaRow('Archivo', skill.path.replace(meta.projectRoot || '', '')),
      metaRow('Destino', report ? report.label : skill.target),
      metaRow('Alcance', skill.scope === 'global' ? 'instalación global del usuario' : 'este proyecto'),
      metaRow('Versión', skill.version),
      metaRow('Licencia', skill.license),
      metaRow('Autor', skill.author),
      metaRow('Archivos', String(skill.files)),
      metaRow('Tamaño', fmtBytes(skill.bytes)),
      metaRow('Modificado', fmtDate(skill.modified))
    ]));

    if (skill.warnings && skill.warnings.length) {
      container.appendChild(el('div', { class: 'meta' }, skill.warnings.map(function (warning) {
        return el('div', { class: 'meta__row' }, [
          el('span', { class: 'meta__key', text: 'Aviso' }),
          el('span', { class: 'meta__value', text: warning })
        ]);
      })));
    }
  }

  /* ── Specs view ────────────────────────────────────────────────────────── */

  function matchesFilter(node, filter) {
    if (!filter) return true;
    if (node.path.toLowerCase().indexOf(filter) !== -1) return true;
    return (node.children || []).some(function (child) { return matchesFilter(child, filter); });
  }

  function renderTreeNodes(nodes, depth, container) {
    var filter = state.filter.specs.trim().toLowerCase();
    (nodes || []).forEach(function (node) {
      if (!matchesFilter(node, filter)) return;
      if (node.type === 'dir') {
        var key = node.path;
        var open = filter ? true : (state.expanded[key] === true || (state.expanded[key] !== false && depth < 2));
        container.appendChild(el('button', {
          type: 'button',
          class: 'row row--dir',
          'aria-expanded': open ? 'true' : 'false',
          onclick: function () {
            state.expanded[key] = !open;
            renderSpecTree();
          }
        }, [
          el('span', { class: 'tree__toggle' }, [
            el('span', { class: 'tree__chevron', dataset: { open: open ? 'true' : 'false' }, text: '›' }),
            node.name
          ]),
          el('span', { class: 'row__meta', text: String(countFiles(node)) + ' arch.' })
        ]));
        if (open) {
          var kids = el('div', { class: 'tree__children' });
          renderTreeNodes(node.children, depth + 1, kids);
          container.appendChild(kids);
        }
        return;
      }
      container.appendChild(el('button', {
        type: 'button',
        class: 'row row--file',
        'aria-current': state.specPath === node.path ? 'true' : 'false',
        title: node.path,
        onclick: function () { navigate(specHash(node.path)); }
      }, [
        el('span', { class: 'row__name', text: node.name }),
        el('span', { class: 'row__meta', text: fmtBytes(node.bytes) })
      ]));
    });
  }

  function countFiles(node) {
    if (node.type === 'file') return 1;
    var total = 0;
    (node.children || []).forEach(function (child) { total += countFiles(child); });
    return total;
  }

  function renderSpecTree() {
    var container = q('[data-list="specs"]');
    if (!container) return;
    container.textContent = '';
    var specs = state.specs;
    if (!specs) {
      container.appendChild(el('p', { class: 'loading', text: 'Buscando specs/…' }));
      return;
    }
    if (!specs.found) {
      container.appendChild(el('p', { class: 'row--empty', text: 'Este proyecto no tiene carpeta specs/' }));
      return;
    }
    if (!specs.tree.length) {
      container.appendChild(el('p', { class: 'row--empty', text: 'specs/ está vacía' }));
      return;
    }
    var tree = el('div', { class: 'tree' });
    renderTreeNodes(specs.tree, 0, tree);
    container.appendChild(tree);
  }

  var SANITIZE_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'form', 'base', 'noscript'];

  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<div id="studio-root">' + html + '</div>', 'text/html');
    var root = doc.getElementById('studio-root');
    if (!root) return '';
    qa(SANITIZE_TAGS.join(','), root).forEach(function (node) { node.remove(); });
    qa('*', root).forEach(function (node) {
      Array.prototype.slice.call(node.attributes).forEach(function (attribute) {
        var name = attribute.name.toLowerCase();
        if (name.indexOf('on') === 0 || name === 'style' || name === 'srcdoc') {
          node.removeAttribute(attribute.name);
          return;
        }
        if (name === 'href' || name === 'src' || name === 'xlink:href') {
          var value = String(attribute.value).trim().toLowerCase();
          var safe = value.indexOf('http://') === 0 || value.indexOf('https://') === 0 ||
            value.indexOf('mailto:') === 0 || value.indexOf('#') === 0;
          if (!safe) node.removeAttribute(attribute.name);
        }
      });
    });
    return root.innerHTML;
  }

  function renderToc(headings) {
    var list = q('[data-toc-list]');
    if (!list) return;
    list.textContent = '';
    state.tocLinks = [];
    var items = (headings || []).filter(function (heading) { return heading.level >= 2 && heading.level <= 3; });
    if (!items.length) {
      list.appendChild(el('p', { class: 'empty__hint', text: 'Sin secciones' }));
      return;
    }
    items.forEach(function (heading) {
      var link = el('a', {
        class: 'toc__link',
        href: '#' + heading.id,
        dataset: { level: String(heading.level), target: heading.id },
        text: heading.text,
        onclick: function (event) {
          event.preventDefault();
          var target = document.getElementById(heading.id);
          if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      });
      list.appendChild(link);
      state.tocLinks.push(link);
    });
  }

  function renderSpecDoc() {
    var container = q('[data-detail="specs"]');
    if (!container) return;
    var specs = state.specs;
    if (!specs) {
      container.textContent = '';
      container.appendChild(el('p', { class: 'loading', text: 'Buscando specs/…' }));
      return;
    }
    if (!specs.found) {
      container.textContent = '';
      container.appendChild(emptyState({
        title: 'Este proyecto todavía no tiene specs/',
        text: 'El studio busca specs/ en la raíz del proyecto. Creala con la skill create-specs y recargá la página.',
        path: specs.projectRoot + '/specs',
        hint: 'Skill: create-specs · /create-specs'
      }));
      renderToc([]);
      return;
    }
    var doc = state.doc;
    if (!doc) {
      container.textContent = '';
      container.appendChild(
        state.specPath ? el('p', { class: 'loading', text: 'Leyendo la spec…' }) : emptyState({
          title: 'Elegí un documento',
          text: 'El árbol de la izquierda es el specs/ de este proyecto, ordenado como lo escribe la skill create-specs.',
          path: specs.root ? shortPath(specs.root) : undefined,
          hint: specs.totals.files + ' archivos · ' + fmtBytes(specs.totals.bytes)
        })
      );
      renderToc([]);
      return;
    }
    container.textContent = '';
    container.appendChild(el('header', { class: 'doc-head' }, [
      el('p', { class: 'doc-head__path', text: 'specs/' + doc.path }),
      el('h1', { class: 'doc-head__title', text: doc.title }),
      el('div', { class: 'doc-head__stats' }, [
        el('span', { text: fmtBytes(doc.bytes) }),
        el('span', { text: 'modificado ' + fmtDate(doc.modified) }),
        el('span', { text: (doc.headings ? doc.headings.length : 0) + ' títulos' }),
        copyButton('Copiar ruta', doc.absolutePath)
      ])
    ]));
    var article = el('article', { class: 'doc' });
    article.innerHTML = sanitize(doc.html || '');
    // El título ya vive en la cabecera del documento: repetirlo en el cuerpo
    // deja dos h1 iguales en la misma página.
    var duplicateTitle = q('h1', article);
    if (duplicateTitle && duplicateTitle.textContent.trim() === doc.title.trim()) {
      duplicateTitle.remove();
    }
    qa('[data-spec-link]', article).forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        var target = link.getAttribute('data-spec-link');
        if (!target) return;
        // El server ya reescribió el target como path desde specs/: resolverlo
        // otra vez contra doc.path duplicaría el prefijo (modules/x → docs/modules/x).
        navigate(specHash(target));
      });
    });
    container.appendChild(article);
    if (doc.warnings && doc.warnings.length) {
      container.appendChild(el('div', { class: 'meta' }, doc.warnings.map(function (warning) {
        return el('div', { class: 'meta__row' }, [
          el('span', { class: 'meta__key', text: 'Aviso' }),
          el('span', { class: 'meta__value', text: warning })
        ]);
      })));
    }
    renderToc(doc.headings);
    container.scrollTop = 0;
  }

  function loadSpecDoc() {
    if (!state.specPath) {
      state.doc = null;
      renderSpecDoc();
      return;
    }
    var path = state.specPath;
    q('[data-list="specs"]');
    fetchJson('/api/specs/file?path=' + encodeURIComponent(path)).then(function (doc) {
      if (state.specPath !== path) return;
      state.doc = doc;
      renderSpecDoc();
      renderSpecTree();
    }, function (error) {
      if (state.specPath !== path) return;
      state.doc = null;
      renderSpecDoc();
      var container = q('[data-detail="specs"]');
      if (container) {
        container.textContent = '';
        renderError(container, error);
      }
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  function render() {
    syncShell();
    if (state.view === 'skills') {
      renderSkillList();
      renderSkillDetail();
      return;
    }
    renderSpecTree();
    renderSpecDoc();
  }

  function bootSkills() {
    loadSkills().then(function () {
      // Elegir la primera skill no debe reescribir la URL: si el usuario llegó
      // por un deep link a /specs, el hash ya es la ruta que eligió.
      if (!state.skillKey) {
        var first = visibleSkills(state.skills, state.scope)[0];
        if (first) state.skillKey = first.target + '/' + first.name;
      }
      renderSkillList();
      renderSkillDetail();
      syncShell();
    }, function (error) {
      var list = q('[data-list="skills"]');
      var detail = q('[data-detail="skills"]');
      if (list) { list.textContent = ''; renderError(list, error); }
      if (detail) { detail.textContent = ''; renderError(detail, error); }
    });
  }

  function bootSpecs() {
    loadSpecs().then(function (specs) {
      renderSpecTree();
      syncShell();
      if (!state.specPath && specs.found) {
        var firstFile = null;
        var walk = function (nodes) {
          (nodes || []).forEach(function (node) {
            if (firstFile) return;
            if (node.type === 'file') { firstFile = node; return; }
            walk(node.children);
          });
        };
        walk(specs.tree);
        if (firstFile) state.specPath = firstFile.path;
      }
      loadSpecDoc();
    }, function (error) {
      var list = q('[data-list="specs"]');
      var detail = q('[data-detail="specs"]');
      if (list) { list.textContent = ''; renderError(list, error); }
      if (detail) { detail.textContent = ''; renderError(detail, error); }
    });
  }

  function boot() {
    applyTheme(currentTheme());

    var toggle = q('[data-theme-toggle]');
    if (toggle) toggle.addEventListener('click', toggleTheme);

    qa('[data-view]').forEach(function (tab) {
      tab.addEventListener('click', function () { navigate('#/' + tab.dataset.view); });
    });

    qa('[data-scope]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.scope = button.dataset.scope;
        state.skillKey = null;
        qa('[data-scope]').forEach(function (other) {
          other.setAttribute('aria-pressed', other.dataset.scope === state.scope ? 'true' : 'false');
        });
        var first = state.skills ? visibleSkills(state.skills, state.scope)[0] : null;
        if (first) {
          state.skillKey = first.target + '/' + first.name;
          history.replaceState(null, '', skillHash(first.target, first.name));
        }
        renderSkillList();
        renderSkillDetail();
        syncShell();
      });
    });

    qa('[data-search]').forEach(function (input) {
      input.addEventListener('input', function () {
        state.filter[input.dataset.search] = input.value;
        if (input.dataset.search === 'skills') {
          renderSkillList();
          return;
        }
        renderSpecTree();
      });
    });

    document.addEventListener('keydown', function (event) {
      var target = event.target;
      var typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        var input = q('[data-search="' + state.view + '"]');
        if (input) input.focus();
        return;
      }
      if (event.key === 'Escape' && typing) {
        target.value = '';
        state.filter[state.view] = '';
        render();
        target.blur();
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 't') { toggleTheme(); return; }
      if (event.key === '1') { navigate('#/skills'); return; }
      if (event.key === '2') { navigate('#/specs'); return; }
    });

    var pane = q('[data-detail="specs"]');
    if (pane) {
      pane.addEventListener('scroll', function () {
        if (!state.tocLinks.length) return;
        var active = null;
        for (var i = 0; i < state.tocLinks.length; i++) {
          var heading = document.getElementById(state.tocLinks[i].dataset.target);
          if (!heading) continue;
          if (heading.getBoundingClientRect().top - pane.getBoundingClientRect().top <= 24) active = state.tocLinks[i];
        }
        state.tocLinks.forEach(function (link) {
          link.setAttribute('aria-current', link === active ? 'true' : 'false');
        });
      });
    }

    window.addEventListener('hashchange', route);

    route();
    bootSkills();
    bootSpecs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`;
