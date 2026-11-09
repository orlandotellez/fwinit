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
import { MODEL_CHOICE_SOURCE } from './model-select.js';
import { RUN_RESTORE_SOURCE } from './run-restore.js';
import { RUN_SESSION_SOURCE } from './run-session.js';
import { RUN_STEPS_SOURCE } from './run-steps.js';

export const CLIENT_JS = `
(function () {
  'use strict';

  var THEME_KEY = 'fwinit:theme';
  var metaEl = document.getElementById('studio-meta');
  var meta = metaEl ? JSON.parse(metaEl.textContent || '{}') : {};

  var state = {
    view: 'specs',
    // Arranca en el proyecto: lo instalado acá es lo que el usuario vino a ver,
    // y lo global queda a un click en el control de alcance.
    scope: 'project',
    skillKey: null,
    specPath: null,
    loadedSkillKey: null,
    skillFiles: null,
    skillFile: null,
    skillFileError: null,
    filter: { skills: '', specs: '' },
    skills: null,
    specs: null,
    doc: null,
    collapsed: {},
    expanded: {},
    drawerOpen: false,
    tocLinks: [],
    /** Estado del diálogo de instalación: { name, plan, result, error, busy }. */
    install: null,
    /** Texto escrito por skill, para que un repintado no borre lo que el usuario escribió. */
    prompts: {},
    /** Agente elegido por skill; por defecto el agente propio del usuario. */
    agents: {},
    /**
     * La ejecución en curso (o la última de esta pestaña):
     * { skillKey, id, agent, prompt, model, phase, lines, next, exitCode, error, ... }.
     * Sólo hay una a la vez en todo el studio, igual que en el server.
     */
    run: null,
    /** Historial de GET /api/skills/runs: { inFlight, runs } (S13). */
    history: null,
    historyError: null,
    /** Run del historial elegido, con la misma forma que un run vivo. */
    selection: null,
    /** Skill del run en curso, para reabrirla sola al recargar la página. */
    reattachKey: null,
    /**
     * Runs cuyo historial el usuario cerró a mano: no se vuelven a abrir solos
     * mientras siga en esa skill (S16). Se limpia al volver a elegir la skill.
     */
    restoreDismissed: {},
    /** Catálogo de modelos por agente, cacheado en la pestaña (S14). */
    models: {},
    modelLoading: {},
    /** Modelo elegido por skill; la clave ausente significa "todavía no eligió". */
    modelText: {},
    /**
     * Qué muestra la columna del agente: los pasos legibles o las líneas
     * crudas numeradas (S18). Las dos vistas leen las mismas líneas.
     */
    rawView: false
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

  /**
   * Un botón de copiar con su propia etiqueta accesible y su texto visible.
   * Lo usan los botones nuevos del panel y de las filas del historial (S17).
   */
  function copyChip(ariaLabel, label, value) {
    return el('button', {
      type: 'button',
      class: 'btn',
      'aria-label': ariaLabel,
      title: ariaLabel,
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

  /* ── Navegación lateral (mobile) ───────────────────────────────────────── */

  /**
   * Debajo de 820px el raíl activo es un drawer fuera de pantalla. Se abre con
   * la hamburguesa y se cierra al navegar, con el velo o con Esc.
   */
  function setDrawer(open, options) {
    state.drawerOpen = open === true;
    if (state.drawerOpen) document.body.dataset.drawer = 'open';
    else delete document.body.dataset.drawer;

    var toggle = q('[data-drawer-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-expanded', state.drawerOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', state.drawerOpen ? 'Cerrar navegación' : 'Abrir navegación');
    }
    var scrim = q('[data-drawer-scrim]');
    if (scrim) scrim.hidden = !state.drawerOpen;

    if (state.drawerOpen) {
      var input = q('[data-search="' + state.view + '"]');
      if (input) input.focus();
    } else if (options && options.restoreFocus && toggle) {
      toggle.focus();
    }
  }

  function closeDrawer(options) {
    if (!state.drawerOpen) return;
    setDrawer(false, options);
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

  /** POST con token: el server exige mismo origen, JSON y el token del documento. */
  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (payload) {
        if (response.ok) return payload;
        var failure = new Error(payload.error || 'La solicitud falló (' + response.status + ')');
        failure.status = response.status;
        throw failure;
      });
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
    var raw = (location.hash || '#/specs').replace(/^#\\/?/, '');
    var parts = raw.split('/').map(function (part) {
      try { return decodeURIComponent(part); } catch (error) { return part; }
    });
    state.view = parts[0] === 'specs' ? 'specs' : 'skills';
    if (state.view === 'skills') {
      if (parts.length >= 4) {
        state.scope = parts[1] === 'project' ? 'project' : 'global';
        state.skillKey = parts.slice(2).join('/');
        // Volver a elegir la skill en la navegación vuelve a ofrecer su último
        // run guardado, aunque antes se haya cerrado el historial (S16).
        state.restoreDismissed = {};
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
    // Elegir algo en la navegación lateral la cierra: en mobile el panel es lo
    // que se viene a ver.
    closeDrawer();
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

  /** Cambia el alcance visible y elige la primera skill del alcance nuevo. */
  function setScope(scope) {
    state.scope = scope === 'project' ? 'project' : 'global';
    state.skillKey = null;
    state.install = null;
    syncScopeButtons();
    var first = state.skills ? visibleSkills(state.skills, state.scope)[0] : null;
    if (first) {
      state.skillKey = first.target + '/' + first.name;
      history.replaceState(null, '', skillHash(first.target, first.name));
    }
    renderSkillList();
    renderSkillDetail();
    syncShell();
  }

  /** El control de alcance refleja el alcance que se está mirando. */
  function syncScopeButtons() {
    qa('[data-scope]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.scope === state.scope ? 'true' : 'false');
    });
  }

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
          : state.scope === 'project'
            ? 'Este proyecto todavía no tiene skills propias. Las globales siguen disponibles.'
            : 'Instalalas con: fwinit skills --global opencode,pi,gentle-shell',
        hint: String(shown.length) + ' de ' + String(report.totals[state.scope]) + ' en este alcance'
      }));
      // Prioridad al proyecto sin esconder lo global: si hay globales, el botón
      // que las muestra vive justo donde el usuario se quedó sin lista.
      if (state.scope === 'project' && !state.filter.skills && report.totals.global > 0) {
        container.appendChild(el('button', {
          type: 'button',
          class: 'btn',
          text: 'Ver las ' + report.totals.global + ' skills globales',
          onclick: function () { setScope('global'); }
        }));
      }
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

  /**
   * La skill de la selección cuando ya no está instalada (S16): se puede leer
   * igual, porque el run guardado no depende del reporte de skills.
   */
  function orphanRunSkill() {
    if (!state.selection || !state.selection.skillKey || !state.skillKey) return null;
    var parts = state.selection.skillKey.split('/');
    var target = parts[0];
    var scope = parts[1];
    var name = parts.slice(2).join('/');
    if (scope !== state.scope) return null;
    if (target + '/' + name !== state.skillKey) return null;
    return { target: target, scope: scope, name: name, dir: '', path: '', files: 0, missing: true };
  }

  /**
   * Detalle mínimo de un run cuya skill ya no está instalada (S16): la salida
   * guardada se ve igual y se avisa que no está, en vez de quedar como texto
   * muerto en el raíl. El aviso va antes del panel, porque explica por qué el
   * botón de ejecutar está apagado (S18).
   */
  function renderOrphanRunDetail(container, skill) {
    container.appendChild(el('p', {
      class: 'run-orphan',
      dataset: { runOrphan: '' },
      text: 'La skill ' + skill.name + ' ya no está instalada: se muestra la salida guardada en .fwinit/studio/runs y no se puede volver a ejecutar desde acá.'
    }));
    container.appendChild(renderRunBlock(skill));
    paintRun(skill);
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
      // Un run huérfano sigue siendo legible: su skill ya no está en el reporte,
      // pero la salida guardada existe y no depende de él (S16).
      var orphan = orphanRunSkill();
      if (orphan) {
        renderOrphanRunDetail(container, orphan);
        return;
      }
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

    // Restaurar antes de dibujar el panel: el último run de la skill aparece de
    // una, terminado o no, sin buscarlo en el raíl (S16).
    restoreHistoricalRun(skill);

    // El panel de ejecución en tres regiones: header, columna del agente con el
    // composer al pie y raíl de estado con el historial de la skill (S18).
    // El nombre de la skill, el agente y el estado viven en su header; la
    // descripción y las acciones secundarias, en el bloque Skill del raíl.
    container.appendChild(renderRunBlock(skill));

    // Instalar en los tres agentes queda como acción secundaria del mismo panel.
    var installPanel = renderInstall(skill);
    if (installPanel) container.appendChild(installPanel);

    // Primero el contenido (es lo que se viene a leer); los metadatos, después.
    container.appendChild(el('section', { class: 'skill-doc', dataset: { skillDoc: '' } }));
    ensureSkillDoc(skill);

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

    // El panel ya está en el documento: recién ahora la salida puede medir scroll.
    paintRun(skill);
  }

  /* ── Ejecutar skill ─────────────────────────────────────────────────────── */

  var RUN_AGENTS = [
    { id: 'opencode', label: 'opencode' },
    { id: 'pi', label: 'Pi' },
    { id: 'gentle-shell', label: 'Gentle Shell' }
  ];
  /** Cada cuánto se pide el estado mientras corre (S11). */
  var RUN_POLL_MS = 900;
  /** Un solo timer de polling por pestaña; el server admite un run a la vez. */
  var runPoll = null;

  function runAgentLabel(id) {
    for (var i = 0; i < RUN_AGENTS.length; i++) {
      if (RUN_AGENTS[i].id === id) return RUN_AGENTS[i].label;
    }
    return id;
  }

  /** La ejecución viva de esta skill, si la hay: la identidad incluye el alcance. */
  function runFor(skill) {
    return state.run && state.run.skillKey === skillKeyOf(skill) ? state.run : null;
  }

  /** El run que muestra el panel: la ejecución del historial elegida o la viva. */
  function viewedRun(skill) {
    return runByKey(skillKeyOf(skill));
  }

  /** El run de una skill por clave, sin necesitar el reporte de skills. */
  function runByKey(key) {
    if (state.selection && state.selection.skillKey === key) return state.selection;
    if (state.run && state.run.skillKey === key) return state.run;
    return null;
  }

  function agentFor(skill) {
    var viewed = viewedRun(skill);
    if (viewed) return viewed.agent;
    // Gentle Shell es el agente propio del usuario; los otros dos quedan a un click.
    return state.agents[skillKeyOf(skill)] || 'gentle-shell';
  }

  function runIsActive(run) {
    return run.phase === 'starting' || run.phase === 'running';
  }

  /** True cuando otra skill tiene una ejecución viva: sólo puede haber una. */
  function runBusyElsewhere(key) {
    return !!(state.run && runIsActive(state.run) && state.run.skillKey !== key);
  }

  function runElapsedText(run) {
    var ms = runIsActive(run) ? Date.now() - run.startedAtMs : run.durationMs;
    var seconds = Math.max(0, Math.round((ms || 0) / 1000));
    if (seconds < 60) return seconds + ' s';
    return Math.floor(seconds / 60) + ' min ' + (seconds % 60) + ' s';
  }

  function runStatusText(run) {
    if (run.phase === 'starting') return 'Preparando la ejecución con ' + runAgentLabel(run.agent) + '…';
    if (run.phase === 'running') return 'Ejecutando con ' + runAgentLabel(run.agent) + '…';
    if (run.phase === 'done') return 'Listo: terminó con código ' + (run.exitCode === null ? '—' : run.exitCode) + ' en ' + runElapsedText(run) + '.';
    if (run.phase === 'cancelled') return 'Cancelada después de ' + runElapsedText(run) + '.';
    if (run.phase === 'interrupted') {
      return 'Se interrumpió: el studio se cerró antes de que terminara y no sigue corriendo.';
    }
    return 'La ejecución falló' + (run.exitCode === null ? '' : ' con código ' + run.exitCode) + '.';
  }

  /** Nombre corto del estado, para el historial y el resumen del panel. */
  function runStateLabel(state) {
    if (state === 'running') return 'en curso';
    if (state === 'done') return 'lista';
    if (state === 'failed') return 'falló';
    if (state === 'cancelled') return 'cancelada';
    if (state === 'interrupted') return 'interrumpida';
    return String(state || '—');
  }

  function runNoteFor(agent) {
    if (agent === 'opencode') {
      return 'opencode no tiene flag de skill: sólo usa las que descubre en ~/.config/opencode/skills o .opencode/skills.';
    }
    return 'A la skill abierta se la pasa como --skill <directorio>, con la raíz del proyecto como cwd.';
  }

  /** Un run vacío; el historial reusa la misma forma para pintarse igual. */
  function emptyRunFor(key, agent, model, prompt, startedAt, phase) {
    return {
      skillKey: key,
      id: null,
      agent: agent,
      model: model || '',
      sessionId: null,
      prompt: prompt || '',
      phase: phase || 'starting',
      lines: [],
      next: 0,
      exitCode: null,
      durationMs: 0,
      error: null,
      truncated: false,
      notes: [],
      command: null,
      startedAtMs: Date.parse(startedAt) > 0 ? Date.parse(startedAt) : Date.now()
    };
  }

  function emptyRun(skill, extra) {
    var key = skillKeyOf(skill);
    var base = emptyRunFor(key, agentFor(skill), '', state.prompts[key] || '', new Date().toISOString());
    Object.keys(extra || {}).forEach(function (name) { base[name] = extra[name]; });
    return base;
  }

  /* ── Panel de ejecución: header, columna del agente y raíl (S18) ─────────── */

  ${RUN_STEPS_SOURCE}

  /** Un dato del header: etiqueta chica arriba, valor mono abajo. */
  function runFact(label, value, attribute) {
    var node = el('span', { class: 'run-fact__v', text: value });
    if (attribute) node.setAttribute(attribute, '');
    return el('div', { class: 'run-fact' }, [
      el('span', { class: 'run-fact__k', text: label }),
      node
    ]);
  }

  /** Nombre corto del estado: lo que dice la etiqueta del header. */
  function runStateShort(phase) {
    if (!phase) return 'sin ejecución';
    if (phase === 'starting' || phase === 'running') return 'ejecutando';
    if (phase === 'done') return 'lista';
    if (phase === 'cancelled') return 'cancelada';
    if (phase === 'interrupted') return 'interrumpida';
    if (phase === 'failed') return 'falló';
    return String(phase);
  }

  /** Tono del estado: siempre acompaña a un texto, nunca va solo. */
  function runStateTone(phase) {
    if (phase === 'starting' || phase === 'running') return 'run';
    if (phase === 'done') return 'ok';
    if (phase === 'cancelled' || phase === 'interrupted') return 'warn';
    if (phase === 'failed') return 'bad';
    return 'idle';
  }

  /** Una duración en el formato corto del header y de las filas. */
  function runOffsetText(ms) {
    var seconds = Math.max(0, Math.round((ms || 0) / 1000));
    if (seconds < 60) return seconds + ' s';
    return Math.floor(seconds / 60) + ' min ' + (seconds % 60) + ' s';
  }

  /** El modelo que se va a usar cuando no hay ninguna ejecución abierta. */
  function idleModelText(agent) {
    var field = q('[data-run-model]');
    var chosen = field && typeof field.value === 'string' ? field.value : '';
    if (chosen) return chosen;
    var report = state.models[agent];
    if (report && report.current) return report.current;
    return '—';
  }

  /**
   * Líneas del run: las que el panel ya tiene o el conteo que informó el
   * historial. Un run recién reenganchado no dice "0 líneas" mientras llega su
   * salida: informa lo que el server ya sabe (S18).
   */
  function runLineCount(run) {
    if (!run) return 0;
    var known = typeof run.lineCount === 'number' ? run.lineCount : 0;
    var loaded = run.lines ? run.lines.length : 0;
    return Math.max(loaded, known);
  }

  /** Caracteres de salida: el único consumo que la salida expone hoy. */
  function runCharCount(lines) {
    var total = 0;
    (lines || []).forEach(function (line) {
      if (line && typeof line.text === 'string') total += line.text.length;
    });
    return total;
  }

  function setText(node, value) {
    if (!node) return;
    var next = value === undefined || value === null ? '' : String(value);
    if (node.textContent === next) return;
    node.textContent = next;
  }

  /**
   * Región 1 — header: skill, agente, estado, modelo, tiempo, pasos, líneas y
   * las dos acciones, en una fila y sin prosa (S18).
   */
  function renderRunHead(skill, run) {
    var agent = run ? run.agent : agentFor(skill);
    var phase = run ? run.phase : null;
    var badge = el('span', {
      class: 'run-badge',
      'data-run-badge': '',
      'data-tone': runStateTone(phase),
      'aria-live': 'polite',
      text: runStateShort(phase)
    });
    return el('header', { class: 'run-head', 'data-run-head': '' }, [
      el('div', { class: 'run-head__id' }, [
        el('h1', { class: 'run-head__skill', title: skill.name, text: skill.name }),
        el('span', { class: 'run-head__sep', 'aria-hidden': 'true', text: '/' }),
        el('span', { class: 'run-head__agent', 'data-run-agent-name': '', text: runAgentLabel(agent) }),
        badge
      ]),
      el('div', { class: 'run-head__facts' }, [
        runFact('Modelo', run ? (run.model || 'default del agente') : idleModelText(agent), 'data-run-fact-model'),
        runFact('Tiempo', run ? runElapsedText(run) : '—', 'data-run-timer'),
        runFact('Pasos', run ? String(stepCount(run.lines)) : '—', 'data-run-fact-steps'),
        runFact('Líneas', run ? String(runLineCount(run)) : '—', 'data-run-fact-lines')
      ]),
      el('div', { class: 'run-head__actions' }, [
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-history-action': '',
          'aria-controls': 'skill-run-history',
          text: 'Historial',
          onclick: function () { focusRunHistory(); }
        }),
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-cancel': '',
          hidden: !(run && runIsActive(run)),
          text: 'Cancelar',
          onclick: function () { cancelRun(skill); }
        })
      ])
    ]);
  }

  /**
   * Una línea del flujo: la prosa va como párrafo y el resto como fila
   * verbo · destino · resultado · tiempo. La fila cruda conserva el texto tal
   * cual lo informó el agente: nada se recorta para que entre.
   */
  function flowNode(line, startMs) {
    var step = stepOfLine(line);
    if (!step) {
      return el('p', { class: 'run-prose', dataset: { kind: 'text' }, text: line.text });
    }
    var tail = '#' + line.n;
    if (line.at && startMs) tail += ' · ' + runOffsetText(line.at - startMs);
    return el('div', { class: 'run-step', dataset: { kind: step.kind } }, [
      el('span', { class: 'run-step__verb', text: step.verb }),
      el('span', { class: 'run-step__text' }, [
        step.target ? el('span', { class: 'run-step__target', title: step.target, text: step.target }) : null,
        step.body ? el('span', { class: 'run-step__result', text: step.body }) : null
      ]),
      el('span', { class: 'run-step__tail', text: tail })
    ]);
  }

  function paintFlow(host, lines, startMs) {
    if (!host || !lines || !lines.length) return;
    lines.forEach(function (line) { host.appendChild(flowNode(line, startMs)); });
  }

  /** Alterna entre los pasos legibles y las líneas crudas numeradas (S18). */
  function toggleRunView() {
    state.rawView = !state.rawView;
    var body = q('[data-run-output]');
    var raw = q('[data-run-raw]');
    var toggle = q('[data-run-view-toggle]');
    if (body) body.hidden = state.rawView;
    if (raw) raw.hidden = !state.rawView;
    if (toggle) {
      toggle.setAttribute('aria-pressed', state.rawView ? 'true' : 'false');
      toggle.textContent = state.rawView ? 'Ver pasos' : 'Líneas crudas';
    }
    var skill = selectedSkill() || orphanRunSkill();
    if (skill) paintRun(skill);
  }

  /** La acción Historial del header lleva al historial de la skill en el raíl. */
  function focusRunHistory() {
    var block = q('#skill-run-history');
    if (!block) return;
    if (block.scrollIntoView) block.scrollIntoView({ block: 'nearest' });
    var first = q('button', block);
    if (first) {
      first.focus();
      return;
    }
    block.setAttribute('tabindex', '-1');
    block.focus();
  }

  /** El composer vive al pie de la columna, donde se lee la salida (S18). */
  function renderRunComposer(skill, run) {
    var key = skillKeyOf(skill);
    var agent = run ? run.agent : agentFor(skill);
    var active = run ? runIsActive(run) : false;
    var missing = skill.missing === true;
    var busyElsewhere = runBusyElsewhere(key);

    var form = el('form', {
      class: 'run-composer',
      'data-run-composer': '',
      onsubmit: function (event) { event.preventDefault(); }
    }, [
      el('div', { class: 'run-composer__row' }, [
        el('label', { class: 'run-composer__label' }, [
          el('span', { class: 'run-composer__k', text: 'Qué querés que haga la skill' }),
          el('textarea', {
            class: 'run__input run-composer__input',
            rows: '2',
            'data-run-prompt': '',
            placeholder: 'Ej.: creá las specs de este proyecto para una app de turnos',
            spellcheck: 'false',
            disabled: active,
            oninput: function (event) {
              state.prompts[key] = event.target.value;
              // El pedido de arriba sigue lo que se está escribiendo: es el
              // mismo dato que va a viajar al run.
              setText(q('[data-run-prompt-text]'), event.target.value ||
                'Todavía no hay pedido: escribí abajo qué querés que haga la skill.');
            }
          })
        ]),
        el('button', {
          type: 'button',
          class: 'btn btn--primary run-composer__go',
          'data-run-start': '',
          disabled: active || busyElsewhere || missing,
          text: 'Ejecutar skill',
          onclick: function () { startRun(skill); }
        })
      ]),
      el('div', { class: 'run-composer__meta' }, [
        el('div', { class: 'run-composer__field' }, [
          el('span', { class: 'run-composer__k', text: 'Agente' }),
          el('div', { class: 'segmented segmented--three', role: 'group', 'aria-label': 'Agente' }, RUN_AGENTS.map(function (option) {
            return el('button', {
              type: 'button',
              'data-run-agent': option.id,
              'aria-pressed': option.id === agent ? 'true' : 'false',
              disabled: active,
              text: option.label,
              onclick: function () { setRunAgent(skill, option.id); }
            });
          }))
        ]),
        // El modelo se elige con un select alimentado por el catálogo real del
        // agente (S14/S15): la primera opción es su default y significa "sin
        // --model". Elegir otro aplica sólo a esta ejecución (S15).
        el('label', { class: 'run-composer__field' }, [
          el('span', { class: 'run-composer__k', text: 'Modelo' }),
          el('select', {
            class: 'run__input run__input--model',
            'data-run-model': '',
            'data-model-agent': agent,
            'aria-label': 'Modelo',
            disabled: active,
            onchange: function (event) {
              state.modelText[key] = event.target.value;
              syncModelNote(agent, q('[data-run-panel]'));
              syncRunPanel();
            }
          })
        ])
      ]),
      // El composer se queda con lo que hace falta para ejecutar; el detalle
      // del catálogo y del comando vive en el raíl (S18).
      el('p', { class: 'run-composer__note', dataset: { runNote: '' }, text: runNoteFor(agent) }),
      el('p', { class: 'run-composer__note', text: 'Un run a la vez · cancelar manda SIGTERM y escala a SIGKILL a los 5 s.' }),
      missing ? el('p', { class: 'run-composer__note', text: 'La skill ya no está instalada: el run guardado se puede leer, pero no volver a ejecutar desde acá.' }) : null
    ]);

    var area = q('[data-run-prompt]', form);
    if (area) area.value = run ? run.prompt : (state.prompts[key] || '');
    fillModelField(q('[data-run-model]', form), agent, desiredModelFor(key));
    return form;
  }

  /**
   * Región 2 — columna del agente: el pedido, la salida como filas y el
   * composer al pie. Las líneas crudas quedan a un click, no se descartan.
   */
  function renderRunStream(skill, run) {
    var key = skillKeyOf(skill);
    var promptText = run && run.prompt ? run.prompt : (state.prompts[key] || '');

    var body = el('div', {
      class: 'run-stream__body',
      'data-run-output': '',
      hidden: state.rawView,
      role: 'log',
      'aria-live': 'polite',
      'aria-label': 'Salida del agente',
      tabindex: '0'
    }, [
      el('div', { class: 'run-prompt', 'data-run-prompt-block': '' }, [
        el('p', { class: 'run-prompt__k', text: 'Lo que pediste' }),
        el('p', {
          class: 'run-prompt__v',
          'data-run-prompt-text': '',
          text: promptText || 'Todavía no hay pedido: escribí abajo qué querés que haga la skill.'
        })
      ]),
      el('div', { class: 'run-flow', 'data-run-flow': '' })
    ]);

    var raw = el('div', {
      class: 'run-stream__raw',
      'data-run-raw': '',
      hidden: !state.rawView,
      tabindex: '0',
      role: 'log',
      'aria-label': 'Líneas crudas de la salida'
    });

    return el('section', { class: 'run-stream', 'data-run-stream': '', 'aria-label': 'Columna del agente' }, [
      el('div', { class: 'run-stream__head' }, [
        el('span', { class: 'run-stream__kicker', text: 'Salida del agente' }),
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-view-toggle': '',
          'aria-pressed': state.rawView ? 'true' : 'false',
          text: state.rawView ? 'Ver pasos' : 'Líneas crudas',
          onclick: function () { toggleRunView(); }
        })
      ]),
      body,
      raw,
      renderRunComposer(skill, run)
    ]);
  }

  /** Un bloque del raíl, con su encabezado y su dato al costado. */
  function runBlock(title, meta, children, attribute) {
    var node = el('section', { class: 'run-block' }, [
      el('div', { class: 'run-block__head' }, [
        el('span', { class: 'run-block__title', text: title }),
        meta ? el('span', { class: 'run-block__meta', text: meta }) : null
      ])
    ]);
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(child);
    });
    if (attribute) node.setAttribute(attribute, '');
    return node;
  }

  /** El id corto del run: el nombre del archivo en .fwinit/studio/runs. */
  function runShortId(run) {
    if (!run || !run.id) return '—';
    var id = String(run.id);
    return id.length > 8 ? id.slice(0, 8) : id;
  }

  /** Estado de la ejecución: la frase completa, el error y el comando exacto. */
  function renderRailStatus(skill, run) {
    var key = skillKeyOf(skill);
    var selecting = !!(state.selection && state.selection.skillKey === key);
    var children = [
      el('p', {
        class: 'run-block__text',
        dataset: { runState: '' },
        text: run ? runStatusText(run) : 'Nada corriendo: escribí el pedido y ejecutá la skill.'
      }),
      el('p', { class: 'run-block__error', dataset: { runError: '' } }),
      // El comando exacto queda plegado: es diagnóstico, no lo primero que se lee.
      el('details', { class: 'run-block__details' }, [
        el('summary', { class: 'run-block__summary', text: 'Comando exacto' }),
        el('p', { class: 'run-block__command', dataset: { runCommand: '' } })
      ])
    ];
    if (selecting) {
      children.push(el('div', { class: 'run-block__history' }, [
        el('p', {
          class: 'run-block__note',
          text: 'Mostrando una ejecución del historial: ' + runStateLabel(run ? run.phase : '') + '. Quedó guardada en .fwinit/studio/runs.'
        }),
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-back': '',
          text: state.run && state.run.skillKey === key ? 'Ver la ejecución en curso' : 'Volver al panel',
          onclick: function () { closeHistoricalRun(); }
        })
      ]));
    }
    return runBlock('Estado', run ? runShortId(run) : '—', children);
  }

  /**
   * Los pasos de herramienta en orden. Se marca cuál es el actual: de los
   * anteriores sólo se sabe que ya pasaron, así que no se los da por hechos.
   */
  function progressSteps(run) {
    if (!run) return [];
    var items = [];
    var lastTool = -1;
    var i;
    for (i = 0; i < run.lines.length; i++) {
      if (run.lines[i].kind === 'tool') lastTool = i;
    }
    for (i = 0; i < run.lines.length; i++) {
      if (run.lines[i].kind !== 'tool') continue;
      var step = stepOfLine(run.lines[i]);
      if (!step) continue;
      items.push({
        label: stepLabel(step),
        state: i === lastTool && runIsActive(run) ? 'active' : 'past'
      });
    }
    return items;
  }

  function renderRailProgress(run) {
    var items = progressSteps(run);
    var children = [];
    if (!items.length) {
      children.push(el('p', { class: 'run-block__text', text: run ? 'Todavía no hay pasos de herramienta.' : 'Sin ejecución.' }));
    } else {
      var list = el('ul', { class: 'run-block__list' });
      // El raíl resume: los últimos pasos, no la salida entera.
      var shown = items.slice(-6);
      shown.forEach(function (item) {
        list.appendChild(el('li', { class: 'run-block__item', dataset: { state: item.state } }, [
          el('span', { class: 'run-block__mark', 'aria-hidden': 'true', text: item.state === 'active' ? '▸' : '·' }),
          el('span', { class: 'run-block__label', text: item.label })
        ]));
      });
      children.push(list);
      if (items.length > shown.length) {
        children.push(el('p', { class: 'run-block__note', text: 'Se muestran los últimos ' + shown.length + ' de ' + items.length + ' pasos.' }));
      }
    }
    var meta = run ? items.length + (items.length === 1 ? ' paso' : ' pasos') : '—';
    return runBlock('Progreso', meta, children, 'data-run-progress');
  }

  function renderRailNow(run) {
    var active = run ? runIsActive(run) : false;
    var activity = run ? currentActivity(run.lines) : '';
    var children = [
      el('p', {
        class: 'run-block__now',
        text: activity || (run ? 'Sin actividad de herramientas todavía.' : 'Sin ejecución.')
      })
    ];
    if (run) {
      children.push(el('p', {
        class: 'run-block__note',
        text: runLineCount(run) + (runLineCount(run) === 1 ? ' línea' : ' líneas') + ' de salida · ' +
          stepCount(run.lines) + (stepCount(run.lines) === 1 ? ' paso' : ' pasos')
      }));
    }
    return runBlock(active ? 'Qué está haciendo ahora' : 'Último paso', run ? runStateShort(run.phase) : '—', children, 'data-run-now');
  }

  function runMetric(label, value) {
    return el('div', { class: 'run-metric' }, [
      el('span', { class: 'run-metric__k', text: label }),
      el('span', { class: 'run-metric__v', text: value })
    ]);
  }

  /**
   * Consumo con lo que el run expone de verdad (S18): líneas, pasos, caracteres
   * de salida y estado. Tokens, costo y caché no tienen fuente acá: se omiten y
   * se dice por qué, en vez de mostrar un número de mentira.
   */
  function renderRailConsumo(run) {
    var children = [
      el('div', { class: 'run-metrics' }, [
        runMetric('Líneas', run ? String(runLineCount(run)) : '—'),
        runMetric('Pasos', run ? String(stepCount(run.lines)) : '—'),
        runMetric('Salida', run ? String(runCharCount(run.lines)) + ' car.' : '—'),
        runMetric('Estado', run ? runStateLabel(run.phase) : '—')
      ])
    ];
    if (run && run.truncated) {
      children.push(el('p', { class: 'run-block__note run-block__note--warn', text: 'Salida truncada: se alcanzó el tope de 2 MB.' }));
    }
    if (run && run.exitCode !== null && run.exitCode !== undefined) {
      children.push(el('p', { class: 'run-block__note', text: 'Código de salida: ' + run.exitCode + '.' }));
    }
    children.push(el('p', { class: 'run-block__note', text: 'El agente no informa tokens ni costo: el studio muestra sólo lo que la salida expone.' }));
    return runBlock('Consumo', run ? runAgentLabel(run.agent) : '—', children, 'data-run-consumo');
  }

  /**
   * El modelo de la ejecución y el estado del catálogo (S15): qué modelo está
   * activo, de dónde salió y que elegir acá no toca la configuración del agente.
   */
  function renderRailModel(run) {
    return runBlock('Modelo', run ? (run.model || 'default') : '—', [
      el('p', { class: 'run-block__text', 'data-model-note': '' })
    ], 'data-run-model-block');
  }

  /** La sesión del run: el id y el comando exacto para retomarla (S17). */
  function renderRailSession() {
    return runBlock('Sesión del agente', null, [
      el('p', { class: 'run-block__text', 'data-run-session-note': '' }),
      el('div', { class: 'run-block__actions', 'data-run-session-actions': '' })
    ], 'data-run-session');
  }

  /** La skill abierta: qué es y las acciones secundarias (instalar, copiar). */
  function renderRailSkill(skill) {
    var actions = el('div', { class: 'run-block__actions' }, [
      canInstall(skill) ? el('button', {
        type: 'button',
        class: 'btn',
        'aria-expanded': state.install && state.install.name === skill.name ? 'true' : 'false',
        'aria-controls': 'install-panel',
        text: 'Instalar en los agentes',
        onclick: function () { openInstall(skill); }
      }) : null,
      skill.path ? copyButton('Copiar ruta', skill.path) : null,
      copyButton('Copiar nombre', skill.name)
    ]);
    return runBlock('Skill', skill.scope === 'global' ? 'global' : 'proyecto', [
      el('p', { class: 'run-block__text', text: skill.description || 'Esta skill no tiene descripción en su frontmatter.' }),
      el('div', { class: 'run-block__badges' }, [
        skill.version ? el('span', { class: 'badge badge--accent', text: 'v' + skill.version }) : null,
        el('span', { class: 'badge badge--muted', text: skill.files + (skill.files === 1 ? ' archivo' : ' archivos') }),
        skill.hasCommand ? el('span', { class: 'badge badge--muted', text: 'command.md' }) : null,
        skill.missing ? el('span', { class: 'badge badge--muted', text: 'no instalada' }) : null
      ]),
      actions
    ], 'data-run-skill');
  }

  /**
   * Región 3 — raíl de estado: progreso, qué está haciendo ahora, consumo,
   * sesión e historial de la skill, todo leído de lo que el run ya expone.
   */
  function renderRunRail(skill, run) {
    return el('aside', {
      class: 'run-rail',
      'data-run-rail': '',
      'aria-label': 'Estado de la ejecución'
    }, [
      renderRailStatus(skill, run),
      renderRailProgress(run),
      renderRailNow(run),
      renderRailConsumo(run),
      renderRailModel(run),
      renderRailSession(),
      renderRailSkill(skill),
      renderSkillRunHistory(skill)
    ]);
  }

  /**
   * El panel de ejecución en tres regiones (S18). El orden del DOM es el orden
   * de lectura —header, columna del agente, raíl— y no se reordena por CSS.
   */
  function renderRunBlock(skill) {
    var key = skillKeyOf(skill);
    var run = viewedRun(skill);
    var dataset = { runPanel: '', runFor: key };
    if (skill.missing === true) dataset.runMissing = 'true';
    var panel = el('div', { class: 'run-panel', id: 'run-panel', dataset: dataset }, [
      renderRunHead(skill, run),
      el('div', { class: 'run-body' }, [
        renderRunStream(skill, run),
        renderRunRail(skill, run)
      ])
    ]);
    // El aviso del catálogo vive en el raíl: se completa cuando llega.
    syncModelNote(run ? run.agent : agentFor(skill), panel);
    return panel;
  }

  /* ── Modelo del agente (S14/S15) ────────────────────────────────────────── */

  ${MODEL_CHOICE_SOURCE}

  /**
   * Pide el catálogo del agente una vez por pestaña y refresca el select.
   *
   * Si el CLI falla, available: false con el motivo deja el select con el
   * default del agente y el modelo activo: el panel no inventa ids de modelo.
   */
  function ensureModelList(agent) {
    if (state.models[agent] || state.modelLoading[agent]) return;
    state.modelLoading[agent] = true;
    fetchJson('/api/skills/models?agent=' + encodeURIComponent(agent)).then(function (report) {
      state.models[agent] = report;
      state.modelLoading[agent] = false;
      syncModelField(agent);
    }, function (error) {
      state.models[agent] = {
        agent: agent,
        available: false,
        models: [],
        current: null,
        currentSource: null,
        error: error && error.message ? error.message : 'No se pudo leer el catálogo.'
      };
      state.modelLoading[agent] = false;
      syncModelField(agent);
    });
  }

  /**
   * Qué modelo mostrar: el del run abierto, si no lo que el usuario ya eligió, y
   * si no null, que significa "preseleccioná el modelo activo" (S15).
   */
  function desiredModelFor(key) {
    var run = runByKey(key);
    if (run && run.model) return run.model;
    if (typeof state.modelText[key] === 'string') return state.modelText[key];
    return null;
  }

  /** Llena el select con el default, el catálogo y el modelo activo (S15). */
  function fillModelField(field, agent, desired) {
    if (!field) return;
    var report = state.models[agent] || null;
    var ids = ((report && report.models) || []).map(function (model) { return model.id; });
    var choice = modelChoice(
      'Default de ' + runAgentLabel(agent) + ' (sin --model)',
      report ? report.current : null,
      ids,
      desired
    );
    field.textContent = '';
    choice.options.forEach(function (option) {
      field.appendChild(el('option', { value: option.value, text: option.label }));
    });
    field.value = choice.value;
  }

  /** Vuelca el catálogo en el select del panel cuando la respuesta llega. */
  function syncModelField(agent) {
    var panel = q('[data-run-panel]');
    if (!panel) return;
    var field = q('[data-run-model]', panel);
    if (field && field.dataset.modelAgent === agent) {
      fillModelField(field, agent, desiredModelFor(panel.dataset.runFor || ''));
    }
    syncModelNote(agent, panel);
    // El catálogo también decide qué modelo muestra el header cuando no hay run.
    syncRunPanel();
  }

  /** True cuando el catálogo trae ese id; el resto se ofrece como opción suelta. */
  function catalogueHas(report, id) {
    return ((report && report.models) || []).some(function (model) { return model.id === id; });
  }

  /**
   * Explica el catálogo, cuál es el modelo activo y de dónde salió, y que elegir
   * otro acá sólo afecta a esta ejecución: el studio no edita la configuración
   * de los agentes (S15).
   */
  function syncModelNote(agent, root) {
    var note = q('[data-model-note]', root);
    if (!note) return;
    var report = state.models[agent] || null;
    var label = runAgentLabel(agent);
    var parts = [];

    if (!report) {
      parts.push('Leyendo el catálogo de ' + label + '…');
    } else if (report.available) {
      parts.push('Catálogo de ' + runAgentLabel(report.source || agent) + ': ' + report.models.length + ' modelos.');
    } else {
      parts.push('No se pudo leer el catálogo (' + (report.error || 'motivo desconocido') +
        '): el select ofrece el default de ' + label + ' y el modelo activo, nada más.');
    }

    if (report) {
      if (report.current) {
        parts.push('Modelo activo de ' + label + ': ' + report.current +
          (report.currentSource ? ' (leído de ' + report.currentSource + ')' : '') + '.');
        if (!catalogueHas(report, report.current)) {
          parts.push('No está en el catálogo, así que se agrega igual como opción.');
        }
      } else {
        parts.push('No se pudo leer el modelo activo de ' + label +
          (report.currentNote ? ': ' + report.currentNote : '.') +
          ' El select arranca en el default del agente.');
      }
    }

    parts.push('Elegir un modelo aplica sólo a esta ejecución: el studio no escribe en la configuración de ' + label + '.');
    note.textContent = parts.join(' ');
  }

  function setRunAgent(skill, agent) {
    state.agents[skillKeyOf(skill)] = agent;
    renderSkillDetail();
  }

  /** Repinta el flujo de pasos y las líneas crudas: se usa al redibujar. */
  function paintRun(skill) {
    var panel = q('[data-run-panel]');
    if (!panel || panel.dataset.runFor !== skillKeyOf(skill)) {
      syncRunPanel();
      return;
    }
    var run = viewedRun(skill);
    var startMs = run ? run.startedAtMs : 0;
    var out = q('[data-run-output]');
    var flow = q('[data-run-flow]');
    var raw = q('[data-run-raw]');

    if (flow) {
      flow.textContent = '';
      if (run && run.lines.length) paintFlow(flow, run.lines, startMs);
      else {
        flow.appendChild(el('p', {
          class: 'run-placeholder',
          dataset: { runPlaceholder: '' },
          text: 'Acá va la salida del agente, paso por paso.'
        }));
      }
    }
    if (raw) {
      raw.textContent = '';
      if (run && run.lines.length) paintLines(raw, run.lines);
      else raw.appendChild(el('p', { class: 'run__placeholder', text: 'Todavía no hay líneas.' }));
    }

    syncRunPanel();
    // El panel ya está en el documento: recién ahora se puede pedir el catálogo.
    var modelField = q('[data-run-model]');
    if (modelField && modelField.dataset.modelAgent) ensureModelList(modelField.dataset.modelAgent);
    // Al repintar se muestra lo último: el usuario acaba de llegar al panel.
    if (!out || out.hidden) return;
    var scroll = function () { out.scrollTop = out.scrollHeight; };
    if (window.requestAnimationFrame) window.requestAnimationFrame(scroll);
    else scroll();
  }

  /**
   * Agrega líneas nuevas sin mover al lector: sólo se pega al fondo si ya
   * estaba abajo, y nunca escribe en el panel de otra skill ni mezcla la
   * salida viva con la de un run del historial.
   */
  function appendRunLines(lines, key) {
    var panel = q('[data-run-panel]');
    if (!panel || !key || panel.dataset.runFor !== key) return;
    if (state.selection && state.selection.skillKey === key) return;
    var run = runByKey(key);
    var startMs = run ? run.startedAtMs : 0;
    var flow = q('[data-run-flow]');
    if (flow && lines && lines.length) {
      var out = q('[data-run-output]');
      var atBottom = out ? out.scrollTop + out.clientHeight >= out.scrollHeight - 8 : false;
      var placeholder = q('[data-run-placeholder]', flow);
      if (placeholder) flow.removeChild(placeholder);
      lines.forEach(function (line) { flow.appendChild(flowNode(line, startMs)); });
      if (out && atBottom && !out.hidden) out.scrollTop = out.scrollHeight;
    }
    // La vista cruda ya trae las líneas anteriores: sólo se le agregan las nuevas.
    var raw = q('[data-run-raw]');
    if (raw && !raw.hidden) paintLines(raw, lines);
  }

  /** Las líneas numeradas tal cual llegaron: la salida que no se descarta. */
  function paintLines(out, lines) {
    if (!lines || !lines.length) return;
    var placeholder = q('[data-run-placeholder]', out);
    if (placeholder) out.removeChild(placeholder);
    var atBottom = out.scrollTop + out.clientHeight >= out.scrollHeight - 8;
    lines.forEach(function (line) {
      out.appendChild(el('div', { class: 'run__line', dataset: { kind: line.kind } }, [
        el('span', { class: 'run__n', text: String(line.n) }),
        el('span', { class: 'run__text', text: line.text })
      ]));
    });
    if (atBottom) out.scrollTop = out.scrollHeight;
  }

  /** Reemplaza un bloque del raíl sólo si su contenido cambió. */
  function replaceNode(selector, node) {
    var current = q(selector);
    if (!current || !current.parentNode || !node) return;
    if (current.isEqualNode && current.isEqualNode(node)) return;
    current.parentNode.replaceChild(node, current);
  }

  /**
   * Refresca header y raíl sin redibujar el detalle entero: es lo que corre en
   * cada vuelta del polling mientras el agente trabaja (S11/S18).
   */
  function syncRunPanel() {
    var panel = q('[data-run-panel]');
    var key = panel ? panel.dataset.runFor : '';
    var run = key ? runByKey(key) : null;
    var selecting = !!(state.selection && key && state.selection.skillKey === key);
    var active = run ? runIsActive(run) : false;
    var missing = !!(panel && panel.dataset.runMissing === 'true');
    var modelField = q('[data-run-model]');
    var agent = modelField && modelField.dataset.modelAgent
      ? modelField.dataset.modelAgent
      : (run ? run.agent : 'gentle-shell');

    // Región 1: el header dice la verdad del run vivo, del restaurado y del vacío.
    setText(q('[data-run-agent-name]'), runAgentLabel(agent));
    var badge = q('[data-run-badge]');
    if (badge) {
      setText(badge, runStateShort(run ? run.phase : null));
      badge.dataset.tone = runStateTone(run ? run.phase : null);
    }
    setText(q('[data-run-fact-model]'), run ? (run.model || 'default del agente') : idleModelText(agent));
    setText(q('[data-run-timer]'), run ? runElapsedText(run) : '—');
    setText(q('[data-run-fact-steps]'), run ? String(stepCount(run.lines)) : '—');
    setText(q('[data-run-fact-lines]'), run ? String(runLineCount(run)) : '—');

    var startBtn = q('[data-run-start]');
    var cancelBtn = q('[data-run-cancel]');
    if (startBtn) startBtn.disabled = active || runBusyElsewhere(key) || missing;
    if (cancelBtn) cancelBtn.hidden = !active || selecting;

    // Región 3: el estado completo, el error y el comando exacto.
    setText(q('[data-run-state]'), run ? runStatusText(run) : 'Nada corriendo: escribí el pedido y ejecutá la skill.');
    setText(q('[data-run-error]'), run && run.error ? '\u2716 ' + run.error : '');
    setText(q('[data-run-command]'), run && run.command
      ? 'Comando: ' + run.command.binary + ' ' + run.command.args.slice(0, -1).join(' ') + ' "…"'
      : '');

    syncRunSession(run);
    replaceNode('[data-run-progress]', renderRailProgress(run));
    replaceNode('[data-run-now]', renderRailNow(run));
    replaceNode('[data-run-consumo]', renderRailConsumo(run));
    // Los bloques del raíl se rehacen: el aviso del catálogo se vuelve a escribir.
    if (panel) syncModelNote(agent, panel);
    // El pedido de arriba es el del run abierto o lo que el usuario está
    // escribiendo: un repintado no puede borrarle lo que ya escribió.
    var typed = key && state.prompts[key] ? state.prompts[key] : '';
    setText(q('[data-run-prompt-text]'), (run && run.prompt) || typed ||
      'Todavía no hay pedido: escribí abajo qué querés que haga la skill.');
  }

  /**
   * La sesión del run en el panel (S17): el id, el comando exacto para
   * retomarla, la copia y —cuando no hay id— el motivo, nunca una sesión
   * inventada. Un run viejo sin sesión se sigue mostrando con su aviso.
   */
  function syncRunSession(run) {
    var note = q('[data-run-session-note]');
    var actions = q('[data-run-session-actions]');
    if (note) note.textContent = run ? sessionNote(run.agent, run.sessionId || null) : '';
    if (!actions) return;
    actions.textContent = '';
    if (!run || !run.sessionId) return;
    actions.appendChild(copyChip('Copiar id de sesión', 'Copiar id de sesión', run.sessionId));
    var resume = sessionResumeCommand(run.agent, run.sessionId);
    if (resume) actions.appendChild(copyChip('Copiar comando para retomar', 'Copiar comando', resume));
  }

  function stopRunPolling() {
    if (!runPoll) return;
    clearInterval(runPoll);
    runPoll = null;
  }

  /** Pide el estado con el cursor since y sigue hasta que el run termina. */
  function pollRun() {
    var run = state.run;
    if (!run || !run.id || run.phase !== 'running') {
      stopRunPolling();
      return;
    }
    var id = run.id;
    fetchJson('/api/skills/run?id=' + encodeURIComponent(id) + '&since=' + run.next).then(function (status) {
      if (!state.run || state.run.id !== id) {
        stopRunPolling();
        return;
      }
      applyRunStatus(status);
    }, function (error) {
      if (!state.run || state.run.id !== id) {
        stopRunPolling();
        return;
      }
      state.run.phase = 'failed';
      state.run.error = error && error.message ? error.message : 'Se cortó la consulta de la ejecución.';
      stopRunPolling();
      syncRunPanel();
    });
  }

  function ensureRunPolling() {
    if (runPoll) return;
    runPoll = setInterval(pollRun, RUN_POLL_MS);
    pollRun();
  }

  /**
   * Aplica un estado del server: agrega sólo las líneas que el panel no tiene
   * y, cuando el run termina, refresca los reportes (una skill puede haber
   * creado specs/ o archivos nuevos).
   */
  function applyRunStatus(status) {
    var run = state.run;
    if (!run || (run.id && run.id !== status.id)) return;
    var cursor = run.next || 0;
    run.id = status.id;
    run.sessionId = status.sessionId || null;
    var fresh = (status.lines || []).filter(function (line) { return line.n > cursor; });
    if (fresh.length) {
      // La hora de llegada sólo se marca en un run vivo: es el tiempo real de
      // esta fila. Un run restaurado no recibe horas inventadas (S18).
      var at = runIsActive(run) ? Date.now() : 0;
      fresh.forEach(function (line) {
        if (at) line.at = at;
        run.lines.push(line);
      });
      appendRunLines(fresh, run.skillKey);
    }
    run.lineCount = run.lines.length;
    run.next = status.next;
    run.phase = status.state;
    run.exitCode = status.exitCode;
    run.durationMs = status.durationMs;
    run.truncated = status.truncated === true;
    if (status.notes && status.notes.length) run.notes = status.notes;
    if (status.command) run.command = status.command;
    syncRunPanel();
    if (run.phase !== 'running') finishRun();
  }

  function finishRun() {
    stopRunPolling();
    refreshReports();
    // El historial acaba de cambiar: el resumen y el estado final se releen.
    refreshRunHistory();
  }

  /**
   * Vuelve a pedir skills y specs sin redibujar el detalle: así un specs/
   * recién creado por la skill aparece en la otra vista y en los contadores.
   */
  function refreshReports() {
    state.skills = null;
    state.specs = null;
    Promise.all([loadSkills(), loadSpecs()]).then(function () {
      renderSkillList();
      renderSpecTree();
      syncShell();
      syncRunPanel();
    }, function () {
      // El reporte se reintenta solo en el próximo cambio de vista.
    });
  }

  function startRun(skill) {
    var key = skillKeyOf(skill);
    var area = q('[data-run-prompt]');
    var prompt = (area ? area.value : state.prompts[key] || '').trim();
    var modelField = q('[data-run-model]');
    var model = (modelField ? modelField.value : state.modelText[key] || '').trim();
    var agent = agentFor(skill);
    // Ejecutar vuelve siempre a la ejecución viva, nunca a una del historial.
    state.selection = null;
    if (!prompt) {
      state.run = emptyRun(skill, {
        agent: agent,
        model: model,
        phase: 'failed',
        error: 'Escribí qué querés que haga la skill antes de ejecutar.'
      });
      syncRunPanel();
      if (area) area.focus();
      return;
    }

    state.prompts[key] = prompt;
    state.modelText[key] = model;
    state.run = emptyRun(skill, { agent: agent, prompt: prompt, model: model });
    renderSkillDetail();

    postJson('/api/skills/run', {
      target: skill.target,
      scope: skill.scope,
      name: skill.name,
      agent: agent,
      prompt: prompt,
      // Vacío = default del agente: el server no pasa el flag (S14).
      model: model,
      token: meta.installToken
    }).then(function (status) {
      if (!state.run) return;
      state.run.id = status.id;
      state.run.model = status.model || '';
      state.run.startedAtMs = Date.parse(status.startedAt) || state.run.startedAtMs;
      state.run.notes = status.notes || [];
      applyRunStatus(status);
      if (state.run && state.run.phase === 'running') ensureRunPolling();
      refreshRunHistory();
    }, function (error) {
      if (!state.run) return;
      state.run.phase = 'failed';
      state.run.error = error && error.message ? error.message : 'No se pudo ejecutar la skill.';
      syncRunPanel();
    });
  }

  function cancelRun(skill) {
    // Cancelar actúa sobre el proceso vivo, aunque el panel muestre historia.
    var key = skillKeyOf(skill);
    var run = state.run && state.run.skillKey === key ? state.run : null;
    if (!run || !run.id) return;
    var cancelBtn = q('[data-run-cancel]');
    if (cancelBtn) cancelBtn.disabled = true;
    postJson('/api/skills/run/cancel', { id: run.id, token: meta.installToken }).then(function (status) {
      if (cancelBtn) cancelBtn.disabled = false;
      applyRunStatus(status);
    }, function (error) {
      if (cancelBtn) cancelBtn.disabled = false;
      if (state.run) state.run.error = error && error.message ? error.message : 'No se pudo cancelar.';
      syncRunPanel();
    });
  }

  /* ── Historial de ejecuciones (S13/S16) ─────────────────────────────────── */

  /** Cuántos runs del historial se listan; el resto sigue en disco. */
  var HISTORY_LIMIT = 20;

  ${RUN_RESTORE_SOURCE}

  ${RUN_SESSION_SOURCE}

  /** True cuando la skill del run sigue instalada en el reporte actual. */
  function skillExistsInReport(ref) {
    if (!state.skills) return true;
    var found = false;
    (state.skills.targets || []).forEach(function (target) {
      if (target.id !== ref.target) return;
      (target.skills || []).forEach(function (skill) {
        if (skill.scope === ref.scope && skill.name === ref.name) found = true;
      });
    });
    return found;
  }

  /**
   * Carga inicial: el historial y, si hay una ejecución en curso, el reenganche.
   * Es lo que antes se perdía al recargar la página (S13).
   */
  function bootRunHistory() {
    fetchJson('/api/skills/runs').then(function (data) {
      state.history = data;
      state.historyError = null;
      renderRunHistory();
      if (data.inFlight) reattachRun(data);
      // Un run terminado también se restaura: recargar no puede dejar el panel
      // vacío cuando la persistencia ya tiene la salida guardada (S16).
      restoreCurrentSkillRun();
      syncSkillRunHistory();
    }, function (error) {
      state.historyError = error;
      renderRunHistory();
    });
  }

  /** Vuelve a pedir el historial sin reenganchar nada (ya hay un run propio). */
  function refreshRunHistory() {
    fetchJson('/api/skills/runs').then(function (data) {
      state.history = data;
      state.historyError = null;
      renderRunHistory();
      syncSkillRunHistory();
    }, function () {
      // Se reintenta solo al recargar: el historial no es crítico para ejecutar.
    });
  }

  /**
   * Restaura el último run de la skill que se está mirando, aunque ya haya
   * terminado (S16). Sólo arma la selección y pide el run guardado con since=0:
   * no arranca proceso, no escribe y no cambia el hash.
   */
  function restoreHistoricalRun(skill) {
    if (!skill) return false;
    var key = skillKeyOf(skill);
    var run = restoreCandidate(state.history, skill, {
      dismissed: state.restoreDismissed[key] === true,
      selected: !!(state.selection && state.selection.skillKey === key),
      live: !!(state.run && state.run.skillKey === key)
    });
    if (!run) return false;
    state.selection = selectionForRun(run);
    state.prompts[key] = run.prompt || '';
    if (run.model) state.modelText[key] = run.model;
    loadHistoricalRun(run);
    return true;
  }

  /** Restaura en el panel ya dibujado cuando el historial llega después (S16). */
  function restoreCurrentSkillRun() {
    if (state.view !== 'skills' || !state.skills || !state.skillKey) return false;
    var skill = selectedSkill();
    if (!restoreHistoricalRun(skill)) return false;
    renderSkillDetail();
    renderRunHistory();
    return true;
  }

  /** La forma de un run del historial que el panel pinta igual que uno vivo. */
  function selectionForRun(summary) {
    var ref = summary.skill;
    var selection = emptyRunFor(
      runRefKey(ref),
      summary.agent,
      summary.model,
      summary.prompt,
      summary.startedAt,
      summary.state
    );
    selection.id = summary.id;
    selection.sessionId = summary.sessionId || null;
    if (typeof summary.lineCount === 'number') selection.lineCount = summary.lineCount;
    selection.exitCode = summary.exitCode;
    selection.truncated = summary.truncated === true;
    selection.summary = summary;
    selection.skillRef = ref;
    return selection;
  }

  /**
   * Se reengancha al run que sigue vivo en el server.
   *
   * La salida se pide con since=0 y se sigue con el cursor que devuelve el
   * server, así ninguna línea se duplica ni se pierde.
   */
  function reattachRun(list) {
    var summary = null;
    (list.runs || []).forEach(function (run) {
      if (run.id === list.inFlight) summary = run;
    });
    if (!summary) return;
    var key = runRefKey(summary.skill);
    state.run = emptyRunFor(
      key,
      summary.agent,
      summary.model,
      summary.prompt,
      summary.startedAt,
      summary.state
    );
    state.run.id = summary.id;
    state.run.sessionId = summary.sessionId || null;
    if (typeof summary.lineCount === 'number') state.run.lineCount = summary.lineCount;
    state.run.notes = [];
    state.prompts[key] = summary.prompt || '';
    if (summary.model) state.modelText[key] = summary.model;
    state.reattachKey = key;
    ensureRunPolling();
    revealReattached();
  }

  /** Abre la skill del run reenganchado si el usuario no vino a otra. */
  function revealReattached() {
    var key = state.reattachKey;
    if (!key || !state.skills || state.skillKey) return;
    var parts = key.split('/');
    state.scope = parts[1] === 'global' ? 'global' : 'project';
    syncScopeButtons();
    state.skillKey = parts[0] + '/' + parts.slice(2).join('/');
    state.reattachKey = null;
    renderSkillList();
    renderSkillDetail();
    syncShell();
  }

  /**
   * La sesión de un run como parte del texto de una fila del historial (S17).
   * Un run anterior a S17 no tiene id: se abre igual, rotulado sin sesión.
   */
  function runSessionRowLabel(run) {
    if (run && run.sessionId) return 'sesión ' + sessionShort(run.sessionId);
    return 'sin sesión';
  }

  /**
   * Una fila del historial: la fila abre el run, y si hay sesión el botón de al
   * lado copia su id completo (S17). Un run sin sesión no ofrece el botón.
   */
  function runHistoryRow(options) {
    var run = options.run;
    var title = run.prompt || run.skill.name;
    if (run.sessionId) title += ' · sesión ' + run.sessionId;
    var row = el('button', {
      type: 'button',
      class: 'row row--run',
      'aria-current': options.selected ? 'true' : 'false',
      title: title,
      dataset: options.dataset,
      onclick: function () { openHistoricalRun(run); }
    }, [
      el('span', { class: 'row__name', text: options.name }),
      el('span', { class: 'row__meta', text: options.meta })
    ]);
    if (!run.sessionId) return row;
    return el('div', { class: 'row__run', dataset: { runRow: run.id } }, [
      row,
      copyChip('Copiar id de sesión', 'Copiar id de sesión', run.sessionId)
    ]);
  }

  /** El historial clicable del raíl: todas las skills, de la más nueva a la vieja. */
  function renderRunHistory() {
    var host = q('[data-run-history]');
    if (!host) return;
    host.textContent = '';
    host.appendChild(el('p', { class: 'rail__title', text: 'Ejecuciones' }));
    if (state.historyError) {
      host.appendChild(el('p', { class: 'row--empty', text: 'No se pudo leer el historial.' }));
      return;
    }
    if (!state.history) {
      host.appendChild(el('p', { class: 'loading', text: 'Leyendo el historial…' }));
      return;
    }
    var runs = (state.history.runs || []).slice(0, HISTORY_LIMIT);
    if (!runs.length) {
      host.appendChild(el('p', { class: 'row--empty', text: 'Todavía no ejecutaste ninguna skill.' }));
      return;
    }
    runs.forEach(function (run) {
      var installed = skillExistsInReport(run.skill);
      var meta = runStateLabel(run.state) + ' · ' + run.agent + ' · ' + fmtDate(run.startedAt) +
        ' · ' + runSessionRowLabel(run);
      var selected = state.selection && state.selection.id === run.id;
      // Un run de una skill desinstalada se abre igual: los archivos no dependen
      // del reporte. El aviso va en el nombre, no en un renglón muerto (S16).
      host.appendChild(runHistoryRow({
        run: run,
        name: run.skill.name + (installed ? '' : ' · no instalada'),
        meta: meta,
        selected: selected,
        dataset: { runId: run.id, runMissing: installed ? null : 'true' }
      }));
    });
  }

  /** Abre un run del historial: su salida completa y su estado final. */
  function openHistoricalRun(summary) {
    var ref = summary.skill;
    var key = runRefKey(ref);
    state.selection = selectionForRun(summary);
    state.prompts[key] = summary.prompt || '';
    state.modelText[key] = summary.model || '';
    state.scope = ref.scope === 'global' ? 'global' : 'project';
    syncScopeButtons();
    state.skillKey = ref.target + '/' + ref.name;
    navigate(skillHash(ref.target, ref.name));
    renderRunHistory();
    loadHistoricalRun(summary);
  }

  function loadHistoricalRun(summary) {
    var id = summary.id;
    fetchJson('/api/skills/run?id=' + encodeURIComponent(id) + '&since=0').then(function (status) {
      if (!state.selection || state.selection.id !== id) return;
      applyHistoricalStatus(state.selection, status);
      renderSkillDetail();
      syncRunPanel();
    }, function (error) {
      if (!state.selection || state.selection.id !== id) return;
      state.selection.error = error && error.message ? error.message : 'No se pudo leer la ejecución.';
      syncRunPanel();
    });
  }

  /** Vuelve del historial a la ejecución viva (o al panel vacío). */
  function closeHistoricalRun() {
    // Cerrar es una decisión del usuario: no reabrir solo en el próximo repintado.
    if (state.selection) state.restoreDismissed[state.selection.skillKey] = true;
    state.selection = null;
    renderSkillDetail();
    renderRunHistory();
  }

  /**
   * Las ejecuciones de esta skill, en el raíl del panel (S16/S18). El raíl de la
   * izquierda sigue mostrando el historial global; acá estado, modelo y fecha de
   * esta skill, y se abre cualquiera con un click.
   */
  function renderSkillRunHistory(skill) {
    var ref = { target: skill.target, scope: skill.scope, name: skill.name };
    var runs = state.history ? runsForSkill(state.history.runs, ref) : [];
    var section = runBlock('Historial', runs.length ? String(runs.length) : '—', [], null);
    section.id = 'skill-run-history';
    section.dataset.skillRuns = runRefKey(ref);

    if (state.historyError) {
      section.appendChild(el('p', { class: 'run-block__error', text: 'No se pudo leer el historial.' }));
      return section;
    }
    if (!state.history) {
      section.appendChild(el('p', { class: 'loading', text: 'Leyendo el historial…' }));
      return section;
    }
    if (!runs.length) {
      section.appendChild(el('p', { class: 'run-block__note', text: 'Esta skill todavía no tiene ejecuciones guardadas.' }));
      return section;
    }
    var list = el('div', { class: 'run__history-list' });
    runs.forEach(function (run) {
      var selected = !!(state.selection && state.selection.id === run.id);
      list.appendChild(runHistoryRow({
        run: run,
        name: runStateLabel(run.state),
        meta: (run.model || 'modelo por defecto') + ' · ' + fmtDate(run.startedAt) +
          ' · ' + runSessionRowLabel(run),
        selected: selected,
        dataset: { runId: run.id }
      }));
    });
    section.appendChild(list);
    return section;
  }

  /** Reemplaza la lista del panel cuando el historial se refresca (S16). */
  function syncSkillRunHistory() {
    var current = q('[data-skill-runs]');
    if (!current || !current.parentNode) return;
    var skill = selectedSkill() || orphanRunSkill();
    if (!skill) return;
    var next = renderSkillRunHistory(skill);
    current.parentNode.replaceChild(next, current);
  }

  /** Un run del disco se pinta con la misma forma que uno vivo. */
  function applyHistoricalStatus(selection, status) {
    selection.id = status.id;
    selection.agent = status.agent;
    selection.model = status.model || '';
    selection.sessionId = status.sessionId || null;
    selection.prompt = status.prompt || selection.prompt;
    selection.phase = status.state;
    selection.exitCode = status.exitCode;
    selection.durationMs = status.durationMs;
    selection.truncated = status.truncated === true;
    selection.notes = status.notes || [];
    selection.command = status.command;
    selection.next = status.next;
    selection.lines = status.lines || [];
    selection.lineCount = selection.lines.length;
  }

  /* ── Instalar skill (acción secundaria) ─────────────────────────────────── */

  /** Lo que el server resolvió al arrancar: qué bundle hay y qué skills trae. */
  function installInfo() {
    return meta.install && typeof meta.install === 'object' ? meta.install : null;
  }

  /**
   * El botón sólo existe cuando el click puede funcionar: hay bundle, hay
   * token y esta skill está en el registro del bundle.
   */
  function canInstall(skill) {
    var info = installInfo();
    if (!info || !info.available || !meta.installToken) return false;
    return (info.skills || []).indexOf(skill.name) !== -1;
  }

  function installStateFor(name) {
    if (!state.install || state.install.name !== name) {
      state.install = { name: name, plan: null, result: null, error: null, busy: false };
    }
    return state.install;
  }

  function installStatusText(current) {
    if (current.result) {
      var failed = current.result.results.filter(function (item) { return item.error; }).length;
      var total = current.result.results.length;
      if (!failed) return 'Listo: la skill quedó copiada en ' + total + ' destinos.';
      if (failed === total) return 'Falló en los ' + total + ' destinos. No se copió nada.';
      return 'Falló en ' + failed + ' de ' + total + ' destinos. Revisá el detalle antes de darlo por hecho.';
    }
    if (current.plan) return 'Nada se escribió todavía. Confirmá para copiar la skill en los tres destinos.';
    if (current.busy) return 'Preparando la instalación…';
    return '';
  }

  function openInstall(skill) {
    var current = installStateFor(skill.name);
    if (current.plan || current.result || current.error) {
      // Un segundo click sobre una instalación ya resuelta la reinicia.
      state.install = { name: skill.name, plan: null, result: null, error: null, busy: false };
      current = state.install;
    }
    current.busy = true;
    current.error = null;
    renderSkillDetail();

    fetchJson('/api/skills/install?name=' + encodeURIComponent(skill.name)).then(function (plan) {
      current.plan = plan;
      current.busy = false;
      renderSkillDetail();
    }, function (error) {
      current.busy = false;
      current.error = error && error.message ? error.message : 'No se pudo preparar la instalación.';
      renderSkillDetail();
    });
  }

  function cancelInstall() {
    state.install = null;
    renderSkillDetail();
  }

  function confirmInstall(skill) {
    var current = installStateFor(skill.name);
    current.busy = true;
    current.error = null;
    renderSkillDetail();

    postJson('/api/skills/install', { name: skill.name, token: meta.installToken }).then(function (result) {
      current.plan = null;
      current.busy = false;
      current.result = result;
      // Los conteos por destino cambian: el reporte cacheado ya no es cierto.
      state.skills = null;
      loadSkills().then(render, function () { render(); });
    }, function (error) {
      current.busy = false;
      current.error = error && error.message ? error.message : 'La instalación falló.';
      renderSkillDetail();
    });
  }

  function renderInstall(skill) {
    var current = state.install && state.install.name === skill.name ? state.install : null;
    if (!current) return null;

    var section = el('section', { class: 'install', id: 'install-panel', dataset: { install: skill.name } }, [
      el('h2', { class: 'install__title', text: 'Instalar en opencode, Pi y Gentle Shell' })
    ]);

    var status = installStatusText(current);
    if (status) {
      section.appendChild(el('p', { class: 'install__status', 'aria-live': 'polite', text: status }));
    }
    if (current.error) {
      section.appendChild(el('p', { class: 'install__error', text: '\u2716 ' + current.error }));
    }

    if (current.plan) {
      section.appendChild(el('div', { class: 'meta' }, (current.plan.destinations || []).map(function (destination) {
        return el('div', { class: 'meta__row', dataset: { destination: destination.target } }, [
          el('span', { class: 'meta__key', text: destination.label }),
          el('span', {
            class: 'meta__value',
            text: shortPath(destination.dir) + (destination.replaces ? ' · reemplaza la que ya está' : ' · nueva')
          })
        ]);
      })));
      (current.plan.warnings || []).forEach(function (warning) {
        section.appendChild(el('p', { class: 'install__note', text: 'Aviso: ' + warning }));
      });
    }

    if (current.result) {
      section.appendChild(el('div', { class: 'meta' }, (current.result.results || []).map(function (item) {
        return el('div', { class: 'meta__row', dataset: { result: item.target } }, [
          el('span', { class: 'meta__key', text: item.label }),
          el('span', {
            class: 'meta__value',
            text: item.error ? '\u2716 ' + item.error : '\u2714 ' + item.copied + ' copiados · ' + shortPath(item.dir)
          })
        ]);
      })));
    }

    if (current.plan) {
      section.appendChild(el('div', { class: 'detail__actions' }, [
        el('button', {
          type: 'button',
          class: 'btn',
          disabled: current.busy,
          text: 'Confirmar instalación',
          onclick: function () { confirmInstall(skill); }
        }),
        el('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: cancelInstall })
      ]));
    } else if (current.result || current.error) {
      section.appendChild(el('div', { class: 'detail__actions' }, [
        el('button', { type: 'button', class: 'btn', text: 'Cerrar', onclick: cancelInstall })
      ]));
    }

    return section;
  }

  /* ── Contenido de la skill ─────────────────────────────────────────────── */

  function skillKeyOf(skill) {
    // El alcance forma parte de la identidad: la misma skill puede estar
    // instalada globalmente y en el proyecto, con contenidos distintos.
    return skill.target + '/' + skill.scope + '/' + skill.name;
  }

  function skillQuery(skill) {
    return 'target=' + encodeURIComponent(skill.target) +
      '&scope=' + encodeURIComponent(skill.scope) +
      '&name=' + encodeURIComponent(skill.name);
  }

  /** Carga el contenido una vez por skill: al cambiar de selección se reinicia. */
  function ensureSkillDoc(skill) {
    var key = skillKeyOf(skill);
    if (state.loadedSkillKey === key) {
      renderSkillDoc(skill);
      return;
    }
    state.loadedSkillKey = key;
    state.skillFiles = null;
    state.skillFile = null;
    state.skillFileError = null;
    renderSkillDoc(skill);
    loadSkillFiles(skill);
  }

  function loadSkillFiles(skill) {
    var key = skillKeyOf(skill);
    fetchJson('/api/skills/files?' + skillQuery(skill)).then(function (list) {
      if (state.loadedSkillKey !== key) return;
      state.skillFiles = list;
      var files = list.files || [];
      var preferred = null;
      for (var i = 0; i < files.length; i++) {
        if (files[i].path === 'SKILL.md') { preferred = files[i]; break; }
      }
      if (!preferred) preferred = files[0] || null;
      if (preferred) loadSkillFile(skill, preferred.path);
      else renderSkillDoc(skill);
    }, function (error) {
      if (state.loadedSkillKey !== key) return;
      state.skillFileError = error;
      renderSkillDoc(skill);
    });
  }

  function loadSkillFile(skill, path) {
    var key = skillKeyOf(skill);
    state.skillFileError = null;
    fetchJson('/api/skills/file?' + skillQuery(skill) + '&path=' + encodeURIComponent(path)).then(function (file) {
      if (state.loadedSkillKey !== key) return;
      state.skillFile = file;
      renderSkillDoc(skill);
    }, function (error) {
      if (state.loadedSkillKey !== key) return;
      state.skillFile = null;
      state.skillFileError = error;
      renderSkillDoc(skill);
    });
  }

  /** Resuelve un enlace relativo contra el archivo abierto dentro de la skill. */
  function resolveRelativePath(basePath, target) {
    var stack = basePath.indexOf('/') === -1 ? [] : basePath.slice(0, basePath.lastIndexOf('/')).split('/');
    target.split('/').forEach(function (segment) {
      if (segment === '' || segment === '.') return;
      if (segment === '..') { stack.pop(); return; }
      stack.push(segment);
    });
    return stack.join('/');
  }

  function renderSkillDoc(skill) {
    var host = q('[data-skill-doc]');
    if (!host) return;
    host.textContent = '';

    if (state.skillFileError) {
      host.appendChild(emptyState({
        title: 'No se pudo leer el contenido',
        text: state.skillFileError.message || 'Error desconocido.',
        hint: 'El archivo está fuera de la carpeta de la skill o no es de texto.'
      }));
      return;
    }
    if (!state.skillFiles) {
      host.appendChild(el('p', { class: 'loading', text: 'Leyendo el contenido de la skill…' }));
      return;
    }

    var files = state.skillFiles.files || [];
    if (!files.length) {
      host.appendChild(el('p', { class: 'empty__hint', text: 'Esta skill no tiene archivos de texto para mostrar.' }));
      return;
    }

    var current = state.skillFile ? state.skillFile.path : null;
    host.appendChild(el('div', { class: 'filelist', role: 'tablist', 'aria-label': 'Archivos de la skill' }, files.map(function (file) {
      return el('button', {
        type: 'button',
        class: 'filelist__item',
        role: 'tab',
        'aria-current': file.path === current ? 'true' : null,
        title: shortPath(state.skillFiles.dir) + '/' + file.path + ' · ' + fmtBytes(file.bytes),
        text: file.path,
        onclick: function () { loadSkillFile(skill, file.path); }
      });
    })));

    if (!state.skillFile) {
      host.appendChild(el('p', { class: 'loading', text: 'Leyendo…' }));
      return;
    }

    if (state.skillFile.html) {
      var article = el('article', { class: 'doc' });
      article.innerHTML = sanitize(state.skillFile.html);
      // El nombre de la skill ya es el título del detalle; el h1 del archivo sobra.
      var duplicate = q('h1', article);
      if (duplicate) duplicate.remove();
      qa('[data-spec-link]', article).forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          var target = link.getAttribute('data-spec-link');
          if (!target) return;
          loadSkillFile(skill, resolveRelativePath(state.skillFile.path, target));
        });
      });
      host.appendChild(article);
    } else {
      host.appendChild(el('pre', { class: 'doc-plain', text: state.skillFile.text }));
    }

    if (state.skillFile.warnings && state.skillFile.warnings.length) {
      var warnings = el('div', { class: 'meta' }, state.skillFile.warnings.map(function (warning) {
        return el('div', { class: 'meta__row' }, [
          el('span', { class: 'meta__key', text: 'Aviso' }),
          el('span', { class: 'meta__value', text: warning })
        ]);
      }));
      host.appendChild(warnings);
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
    // El documento recién se dibuja: esperar el layout antes de marcar la sección.
    if (window.requestAnimationFrame) window.requestAnimationFrame(syncToc);
    else syncToc();
  }

  /**
   * Marca en el índice la sección donde está el lector: la última que cruzó el
   * borde superior del panel. Al llegar al fondo gana la última, para que las
   * secciones cortas finales también queden activas.
   */
  function markToc(links, active) {
    for (var i = 0; i < links.length; i++) {
      if (links[i] === active) links[i].setAttribute('aria-current', 'location');
      else links[i].removeAttribute('aria-current');
    }
  }

  function syncToc() {
    var links = state.tocLinks;
    var pane = q('[data-detail="specs"]');
    if (!links.length || !pane) return;
    // Sin layout todavía no hay posición que medir: no marcar nada y dejar que
    // el próximo render lo resuelva es más honesto que adivinar.
    if (pane.clientHeight === 0) return;
    // Documento que entra completo: no hay "sección actual" por posición, la
    // primera es la única respuesta verdadera (antes se marcaba la última
    // porque scrollTop + clientHeight ya estaba en el fondo).
    if (pane.scrollHeight <= pane.clientHeight + 2) {
      markToc(links, links[0]);
      return;
    }
    var paneTop = pane.getBoundingClientRect().top;
    var atBottom = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2;
    var active = null;
    for (var i = 0; i < links.length; i++) {
      var heading = document.getElementById(links[i].dataset.target);
      if (!heading) continue;
      if (heading.getBoundingClientRect().top - paneTop <= 32) active = links[i];
    }
    if (atBottom) active = links[links.length - 1];
    // Arriba de la primera sección (el título no está en el índice) el lector
    // está por entrar a la primera: marcarla evita un índice "apagado".
    if (!active) active = links[0];
    markToc(links, active);
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
      // El run reenganchado manda: si el usuario recargó mientras el agente
      // trabajaba, lo primero que ve es esa skill con su salida (S13).
      revealReattached();
      // Elegir la primera skill no debe reescribir la URL: si el usuario llegó
      // por un deep link a /specs, el hash ya es la ruta que eligió.
      if (!state.skillKey) {
        var first = visibleSkills(state.skills, state.scope)[0];
        if (first) state.skillKey = first.target + '/' + first.name;
      }
      renderSkillList();
      renderSkillDetail();
      // El historial filtra las skills que existen: recién ahora se sabe.
      renderRunHistory();
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

    var drawerToggle = q('[data-drawer-toggle]');
    if (drawerToggle) {
      drawerToggle.addEventListener('click', function () {
        setDrawer(!state.drawerOpen);
      });
    }

    var scrim = q('[data-drawer-scrim]');
    if (scrim) {
      scrim.addEventListener('click', function () {
        closeDrawer({ restoreFocus: true });
      });
    }

    // Al cruzar a desktop el drawer deja de existir como concepto.
    if (window.matchMedia) {
      var desktop = window.matchMedia('(min-width: 821px)');
      var onViewportChange = function () {
        if (desktop.matches) closeDrawer();
      };
      if (desktop.addEventListener) desktop.addEventListener('change', onViewportChange);
    }

    qa('[data-view]').forEach(function (tab) {
      tab.addEventListener('click', function () { navigate('#/' + tab.dataset.view); });
    });

    qa('[data-scope]').forEach(function (button) {
      button.addEventListener('click', function () { setScope(button.dataset.scope); });
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
      if (event.key === 'Escape' && state.drawerOpen) {
        event.preventDefault();
        closeDrawer({ restoreFocus: true });
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
      if (event.key === '1') { navigate('#/specs'); return; }
      if (event.key === '2') { navigate('#/skills'); return; }
    });

    var pane = q('[data-detail="specs"]');
    if (pane) {
      var pendingSync = false;
      pane.addEventListener('scroll', function () {
        if (pendingSync) return;
        pendingSync = true;
        var run = function () {
          pendingSync = false;
          syncToc();
        };
        if (window.requestAnimationFrame) window.requestAnimationFrame(run);
        else run();
      });
    }

    window.addEventListener('hashchange', route);

    route();
    bootRunHistory();
    bootSkills();
    bootSpecs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
`;
