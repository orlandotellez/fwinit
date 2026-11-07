import { CLIENT_JS } from './client.js';
import { STUDIO_CSS } from './styles.js';
import { TOKENS_CSS } from './tokens.js';

export interface StudioDocumentOptions {
  version: string;
  projectRoot: string;
  /** Home directory, so the client can shorten absolute paths to `~/…`. */
  home?: string;
}

/**
 * Theme bootstrap, identical in behaviour to the landing page: apply the stored
 * choice before first paint so the studio never flashes the wrong theme.
 */
const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem('fwinit:theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

const ICON = {
  search:
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5 14 14"/></svg>',
  moon:
    '<svg class="icon-moon" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M13.2 9.4A5.6 5.6 0 0 1 6.6 2.8a5.6 5.6 0 1 0 6.6 6.6Z"/></svg>',
  sun:
    '<svg class="icon-sun" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="8" cy="8" r="3.2"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13"/></svg>',
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2316203a'/%3E%3Crect x='0.5' y='0.5' width='31' height='31' fill='none' stroke='%238aa2ff'/%3E%3Ctext x='16' y='22' font-family='monospace' font-size='16' font-weight='700' fill='%238aa2ff' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E";

/** Full HTML document served at `/`. Copy is Spanish: it is the product's language. */
export function renderStudioHtml(options: StudioDocumentOptions): string {
  const meta = JSON.stringify({
    version: options.version,
    projectRoot: options.projectRoot,
    home: options.home ?? '',
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="robots" content="noindex, nofollow" />
<title>fwinit studio</title>
<meta name="description" content="Vista local de las skills instaladas para opencode, pi y Gentle Shell, y de las specs de este proyecto." />
<link rel="icon" href="${FAVICON}" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..600&family=JetBrains+Mono:wght@400;500;600&display=swap" />
<script>${THEME_BOOTSTRAP}</script>
<style>${TOKENS_CSS}</style>
<style>${STUDIO_CSS}</style>
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
<header class="topbar">
  <div class="topbar__inner">
    <a class="brand" href="#/skills" aria-label="fwinit studio, inicio">
      <span class="brand__glyph" aria-hidden="true">S</span>
      <span class="brand__name">fwinit</span>
      <span class="brand__div" aria-hidden="true">/</span>
      <span class="brand__page">studio</span>
    </a>
    <nav class="tabs" aria-label="Secciones">
      <button type="button" class="tab" role="tab" data-view="specs" aria-selected="false">
        Specs <span class="tab__count" data-count="specs">—</span>
      </button>
      <button type="button" class="tab" role="tab" data-view="skills" aria-selected="true">
        Skills <span class="tab__count" data-count="skills">—</span>
      </button>
    </nav>
    <div class="topbar__actions">
      <span class="badge badge--version">v${escapeHtml(options.version)}</span>
      <button type="button" class="btn btn--icon theme-toggle" data-theme-toggle aria-pressed="false" aria-label="Cambiar al tema claro">
        ${ICON.moon}${ICON.sun}
      </button>
    </div>
  </div>
</header>

<main id="main" class="shell">
  <section class="view view--specs" data-view-panel="specs" data-active="false" aria-label="Specs del proyecto">
    <aside class="rail">
      <div class="rail__head">
        <div class="field">
          ${ICON.search}
          <input class="field__input" type="search" data-search="specs" placeholder="Filtrar specs" aria-label="Filtrar specs" autocomplete="off" spellcheck="false" />
          <kbd>/</kbd>
        </div>
      </div>
      <div class="rail__body" data-list="specs">
        <p class="loading">Buscando specs/…</p>
      </div>
    </aside>
    <section class="pane" data-detail="specs">
      <p class="loading">Buscando specs/…</p>
    </section>
    <aside class="toc" data-toc aria-label="En esta página">
      <p class="toc__title">En esta página</p>
      <div class="toc__list" data-toc-list></div>
    </aside>
  </section>

  <section class="view view--skills" data-view-panel="skills" data-active="true" aria-label="Skills instaladas">
    <aside class="rail">
      <div class="rail__head">
        <div class="field">
          ${ICON.search}
          <input class="field__input" type="search" data-search="skills" placeholder="Filtrar skills" aria-label="Filtrar skills" autocomplete="off" spellcheck="false" />
          <kbd>/</kbd>
        </div>
        <div class="segmented" role="group" aria-label="Alcance">
          <button type="button" data-scope="global" aria-pressed="true">Globales</button>
          <button type="button" data-scope="project" aria-pressed="false">Proyecto</button>
        </div>
      </div>
      <div class="rail__body" data-list="skills">
        <p class="loading">Leyendo las skills instaladas…</p>
      </div>
    </aside>
    <section class="pane" data-detail="skills">
      <p class="loading">Leyendo las skills instaladas…</p>
    </section>
  </section>
</main>

<footer class="statusbar">
  <span class="statusbar__dot" aria-hidden="true">●</span>
  <span class="statusbar__item" data-status-root title="">${escapeHtml(options.projectRoot)}</span>
  <span class="statusbar__spacer"></span>
  <span class="statusbar__item" data-status-counts></span>
  <span class="statusbar__item statusbar__hint"><kbd>/</kbd> filtrar · <kbd>1</kbd><kbd>2</kbd> vista · <kbd>t</kbd> tema</span>
</footer>

<script type="application/json" id="studio-meta">${meta}</script>
<script>${CLIENT_JS}</script>
</body>
</html>
`;
}
