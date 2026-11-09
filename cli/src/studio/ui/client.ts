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
    /** Catálogo de modelos por agente, cacheado en la pestaña (S14). */
    models: {},
    modelLoading: {},
    /** Modelo escrito por skill, para que un repintado no lo borre. */
    modelText: {}
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
        canInstall(skill) ? el('button', {
          type: 'button',
          class: 'btn',
          'aria-expanded': state.install && state.install.name === skill.name ? 'true' : 'false',
          'aria-controls': 'install-panel',
          text: 'Instalar en los agentes',
          onclick: function () { openInstall(skill); }
        }) : null,
        copyButton('Copiar ruta', skill.path),
        copyButton('Copiar nombre', skill.name),
        skill.version ? el('span', { class: 'badge badge--accent', text: 'v' + skill.version }) : null,
        el('span', { class: 'badge badge--muted', text: skill.files + (skill.files === 1 ? ' archivo' : ' archivos') }),
        skill.hasCommand ? el('span', { class: 'badge badge--muted', text: 'command.md' }) : null
      ])
    ]));

    // Ejecutar es la acción principal (S9): input, agente, botón y salida viva.
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

  /** El bloque de ejecución: input, agente, modelo, ejecutar / cancelar y salida viva. */
  function renderRunBlock(skill) {
    var key = skillKeyOf(skill);
    var run = viewedRun(skill);
    var agent = run ? run.agent : agentFor(skill);
    var active = run ? runIsActive(run) : false;
    var historical = !!(state.selection && state.selection.skillKey === key);
    // Un solo run a la vez: si corre en otra skill, Ejecutar queda apagado.
    var busyElsewhere = runBusyElsewhere(key);
    var model = (run && run.model) || state.modelText[key] || '';

    var section = el('section', {
      class: 'install install--run',
      id: 'run-panel',
      dataset: { runPanel: '', runFor: key }
    }, [
      el('h2', { class: 'install__title', text: 'Ejecutar skill' }),
      el('p', { class: 'install__note', text: 'La skill hace su trabajo con el agente que elijas, en la raíz del proyecto y con permiso para escribir archivos.' }),
      historical ? el('div', { class: 'run__history' }, [
        el('p', { class: 'install__note', text: 'Mostrando una ejecución del historial: ' + runStateLabel(run ? run.phase : '') + '. Quedó guardada en .fwinit/studio/runs.' }),
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-back': '',
          text: state.run && state.run.skillKey === key ? 'Ver la ejecución en curso' : 'Volver al panel',
          onclick: function () { closeHistoricalRun(); }
        })
      ]) : null,
      el('label', { class: 'run__field' }, [
        el('span', { class: 'meta__key', text: 'Qué querés que haga' }),
        el('textarea', {
          class: 'run__input',
          rows: '3',
          'data-run-prompt': '',
          placeholder: 'Ej.: creá las specs de este proyecto para una app de turnos',
          spellcheck: 'false',
          disabled: active,
          oninput: function (event) { state.prompts[key] = event.target.value; }
        })
      ]),
      el('div', { class: 'run__row' }, [
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
      // El modelo es texto libre respaldado por el catálogo del CLI (S14):
      // vacío significa "el default del agente" y no se pasa el flag.
      el('label', { class: 'run__field' }, [
        el('span', { class: 'meta__key', text: 'Modelo (opcional)' }),
        el('input', {
          class: 'run__input run__input--model',
          type: 'text',
          'data-run-model': '',
          list: 'run-models-' + agent,
          placeholder: 'Default de ' + runAgentLabel(agent),
          autocomplete: 'off',
          spellcheck: 'false',
          disabled: active,
          oninput: function (event) { state.modelText[key] = event.target.value; }
        })
      ]),
      el('datalist', { id: 'run-models-' + agent, dataset: { runModels: agent } }),
      el('p', { class: 'install__note', dataset: { modelNote: '' } }),
      el('p', { class: 'install__note', dataset: { runNote: '' }, text: runNoteFor(agent) }),
      el('div', { class: 'detail__actions' }, [
        el('button', {
          type: 'button',
          class: 'btn btn--primary',
          'data-run-start': '',
          disabled: active || busyElsewhere,
          text: 'Ejecutar skill',
          onclick: function () { startRun(skill); }
        }),
        el('button', {
          type: 'button',
          class: 'btn',
          'data-run-cancel': '',
          hidden: !active,
          text: 'Cancelar',
          onclick: function () { cancelRun(skill); }
        }),
        el('span', { class: 'run__timer', dataset: { runTimer: '' } })
      ]),
      el('p', { class: 'install__status', dataset: { runState: '' }, 'aria-live': 'polite' }),
      el('p', { class: 'install__error', dataset: { runError: '' } }),
      el('p', { class: 'install__note', dataset: { runCommand: '' } }),
      el('div', { class: 'run__output', dataset: { runOutput: '' }, tabindex: '0', role: 'log', 'aria-live': 'polite' })
    ]);

    var area = q('[data-run-prompt]', section);
    if (area) area.value = run ? run.prompt : (state.prompts[key] || '');
    var modelInput = q('[data-run-model]', section);
    if (modelInput) modelInput.value = model;
    return section;
  }

  /* ── Catálogo de modelos (S14) ──────────────────────────────────────────── */

  /**
   * Pide el catálogo del agente una vez por pestaña y refresca el campo.
   *
   * Si el CLI falla, available: false con el motivo deja el campo como texto
   * libre: el panel no inventa ids de modelo que el agente no conoce.
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
        error: error && error.message ? error.message : 'No se pudo leer el catálogo.'
      };
      state.modelLoading[agent] = false;
      syncModelField(agent);
    });
  }

  /** Vuelca el catálogo en el datalist del panel y explica su estado. */
  function syncModelField(agent) {
    var list = q('[data-run-models="' + agent + '"]');
    var note = q('[data-model-note]');
    var report = state.models[agent] || null;

    if (list) {
      list.textContent = '';
      ((report && report.models) || []).forEach(function (model) {
        list.appendChild(el('option', { value: model.id, label: model.model }));
      });
    }
    if (!note) return;
    if (!report) {
      note.textContent = 'Leyendo el catálogo de ' + runAgentLabel(agent) + '…';
      return;
    }
    if (report.available) {
      note.textContent = 'Catálogo de ' + runAgentLabel(report.source || agent) + ': ' +
        report.models.length + ' modelos. Si lo dejás vacío, el agente usa su default.';
      return;
    }
    note.textContent = 'No se pudo leer el catálogo (' + (report.error || 'motivo desconocido') +
      '). Escribí el modelo a mano o dejalo vacío para usar el default.';
  }

  function setRunAgent(skill, agent) {
    state.agents[skillKeyOf(skill)] = agent;
    renderSkillDetail();
  }

  /** Repinta la salida completa: se usa cuando el panel se vuelve a dibujar. */
  function paintRun(skill) {
    var out = q('[data-run-output]');
    var panel = q('[data-run-panel]');
    if (!out) return;
    out.textContent = '';
    var run = viewedRun(skill);
    if (!panel || panel.dataset.runFor !== skillKeyOf(skill)) {
      syncRunPanel();
      return;
    }
    if (run && run.lines.length) paintLines(out, run.lines);
    else {
      out.appendChild(el('p', { class: 'run__placeholder', dataset: { runPlaceholder: '' }, text: 'Acá va la salida del agente, línea por línea.' }));
    }
    syncRunPanel();
    // El panel ya está en el documento: recién ahora se puede llenar el catálogo.
    var dataList = q('[data-run-models]');
    if (dataList && dataList.dataset.runModels) ensureModelList(dataList.dataset.runModels);
    // Al repintar se muestra lo último: el usuario acaba de llegar al panel.
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
    var out = q('[data-run-output]');
    var panel = q('[data-run-panel]');
    if (!out || !panel || !key || panel.dataset.runFor !== key) return;
    if (state.selection && state.selection.skillKey === key) return;
    paintLines(out, lines);
  }

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

  /** Refresca los textos y botones del panel sin redibujar el detalle entero. */
  function syncRunPanel() {
    var panel = q('[data-run-panel]');
    var key = panel ? panel.dataset.runFor : '';
    var stateEl = q('[data-run-state]');
    var errorEl = q('[data-run-error]');
    var timerEl = q('[data-run-timer]');
    var commandEl = q('[data-run-command]');
    var startBtn = q('[data-run-start]');
    var cancelBtn = q('[data-run-cancel]');
    var backBtn = q('[data-run-back]');
    var run = key ? runByKey(key) : null;
    var selecting = !!(state.selection && key && state.selection.skillKey === key);

    if (backBtn) backBtn.hidden = !selecting;

    if (!run) {
      if (stateEl) stateEl.textContent = '';
      if (errorEl) errorEl.textContent = '';
      if (timerEl) timerEl.textContent = '';
      if (commandEl) commandEl.textContent = '';
      if (startBtn) startBtn.disabled = runBusyElsewhere(key);
      if (cancelBtn) cancelBtn.hidden = true;
      return;
    }

    var active = runIsActive(run);
    if (stateEl) stateEl.textContent = runStatusText(run);
    if (errorEl) errorEl.textContent = run.error ? '\u2716 ' + run.error : '';
    if (timerEl) timerEl.textContent = active ? runElapsedText(run) : '';
    if (commandEl) {
      commandEl.textContent = run.command
        ? 'Comando: ' + run.command.binary + ' ' + run.command.args.slice(0, -1).join(' ') + ' "…"'
        : '';
    }
    if (startBtn) startBtn.disabled = active || runBusyElsewhere(key);
    if (cancelBtn) cancelBtn.hidden = !active || selecting;
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
    var fresh = (status.lines || []).filter(function (line) { return line.n > cursor; });
    if (fresh.length) {
      fresh.forEach(function (line) { run.lines.push(line); });
      appendRunLines(fresh, run.skillKey);
    }
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

  /* ── Historial de ejecuciones (S13) ─────────────────────────────────────── */

  /** Cuántos runs del historial se listan; el resto sigue en disco. */
  var HISTORY_LIMIT = 20;

  function skillKeyFromRef(ref) {
    return ref.target + '/' + ref.scope + '/' + ref.name;
  }

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
    }, function () {
      // Se reintenta solo al recargar: el historial no es crítico para ejecutar.
    });
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
    var key = skillKeyFromRef(summary.skill);
    state.run = emptyRunFor(
      key,
      summary.agent,
      summary.model,
      summary.prompt,
      summary.startedAt,
      summary.state
    );
    state.run.id = summary.id;
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
      var meta = runStateLabel(run.state) + ' · ' + run.agent + ' · ' + fmtDate(run.startedAt);
      if (!skillExistsInReport(run.skill)) {
        // Una skill desinstalada no se puede abrir: se dice, no se esconde.
        host.appendChild(el('p', { class: 'row--empty', text: run.skill.name + ' (ya no está instalada) · ' + meta }));
        return;
      }
      var selected = state.selection && state.selection.id === run.id;
      host.appendChild(el('button', {
        type: 'button',
        class: 'row row--run',
        'aria-current': selected ? 'true' : 'false',
        title: run.prompt || run.skill.name,
        dataset: { runId: run.id },
        onclick: function () { openHistoricalRun(run); }
      }, [
        el('span', { class: 'row__name', text: run.skill.name }),
        el('span', { class: 'row__meta', text: meta })
      ]));
    });
  }

  /** Abre un run del historial: su salida completa y su estado final. */
  function openHistoricalRun(summary) {
    var ref = summary.skill;
    var key = skillKeyFromRef(ref);
    var selection = emptyRunFor(
      key,
      summary.agent,
      summary.model,
      summary.prompt,
      summary.startedAt,
      summary.state
    );
    selection.id = summary.id;
    selection.exitCode = summary.exitCode;
    selection.truncated = summary.truncated === true;
    selection.summary = summary;
    state.selection = selection;
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
    state.selection = null;
    renderSkillDetail();
    renderRunHistory();
  }

  /** Un run del disco se pinta con la misma forma que uno vivo. */
  function applyHistoricalStatus(selection, status) {
    selection.id = status.id;
    selection.agent = status.agent;
    selection.model = status.model || '';
    selection.prompt = status.prompt || selection.prompt;
    selection.phase = status.state;
    selection.exitCode = status.exitCode;
    selection.durationMs = status.durationMs;
    selection.truncated = status.truncated === true;
    selection.notes = status.notes || [];
    selection.command = status.command;
    selection.next = status.next;
    selection.lines = status.lines || [];
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
