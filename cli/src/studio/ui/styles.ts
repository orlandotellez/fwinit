/**
 * Studio layout and components.
 *
 * Rules inherited from the landing page, restated so they are not broken by
 * accident: square corners, hairline dashed separators, one accent, mono only
 * for identifiers/paths/labels, hover changes colour and border only, and
 * `--text-caption` is the floor for any text size.
 */
export const STUDIO_CSS = `
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  height: 100%;
}

body {
  min-height: 100%;
  height: 100%;
  /* Marco de app: el documento no scrollea nunca, scrollean los paneles.
     Sin esto el rail mide lo que mide su contenido y al bajar queda el fondo
     desnudo debajo de la barra lateral. */
  overflow: hidden;
  background-color: var(--base);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-small);
  line-height: var(--leading-body);
  font-synthesis-weight: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  transition:
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;
}

svg {
  display: block;
  flex: none;
}

a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
  transition: color var(--duration-fast) ease;
}

a:hover {
  color: var(--accent-hover);
}

a:not(:hover) {
  text-decoration-color: var(--accent-border);
}

button,
input {
  font: inherit;
  color: inherit;
}

button {
  background: none;
  border: 0;
  cursor: pointer;
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

::selection {
  background: var(--accent-soft);
  color: var(--text);
}

.skip {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 60;
  background: var(--surface-elevated);
  border: 1px solid var(--accent-border);
  padding: var(--space-2xs) var(--space-xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.skip:focus {
  left: var(--space-sm);
  top: var(--space-2xs);
}

/* ── Top bar ─────────────────────────────────────────────────────────────── */
.topbar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 50;
  height: var(--header-height);
  background: var(--base);
  border-bottom: var(--hairline-strong);
}

.topbar__inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-md);
  height: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--container-pad);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  color: var(--text);
  text-decoration: none;
  font-family: var(--font-mono);
  font-size: var(--text-small);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.brand:hover {
  color: var(--text);
}

.brand__glyph {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: var(--text-caption);
  font-weight: 700;
}

.brand__div {
  color: var(--text-muted);
  font-weight: 400;
}

.brand__page {
  color: var(--accent);
  font-weight: 500;
}

.tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  height: 100%;
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  height: 100%;
  color: var(--text-secondary);
  font-size: var(--text-small);
  font-weight: 500;
  transition: color var(--duration-fast) ease;
}

.tab::after {
  content: '';
  position: absolute;
  inset: auto 0 0 0;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--duration-base) var(--ease-out);
}

.tab:hover {
  color: var(--text);
}

.tab[aria-selected='true'] {
  color: var(--text);
}

.tab[aria-selected='true']::after {
  transform: scaleX(1);
}

.tab__count {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.tab[aria-selected='true'] .tab__count {
  color: var(--accent);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  padding: 0.125rem var(--space-2xs);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  line-height: 1.5;
  white-space: nowrap;
}

.badge--version {
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px solid var(--border);
}

.badge--accent {
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
}

.badge--muted {
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-3xs) var(--space-2xs);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: var(--text-caption);
  transition:
    color var(--duration-fast) ease,
    border-color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.btn:hover {
  color: var(--text);
  border-color: var(--accent-border);
  background: var(--surface-elevated);
}

.btn--icon {
  width: 34px;
  height: 34px;
  padding: 0;
  justify-content: center;
}

.btn[data-copied='true'] {
  color: var(--success);
  border-color: var(--success);
}

/* Navegación lateral en mobile: el botón y el velo sólo existen debajo de 820px. */
.nav-toggle {
  display: none;
}

.nav-bars {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 16px;
  height: 16px;
}

.nav-bars span {
  display: block;
  height: 2px;
  background: currentColor;
}

.drawer-scrim {
  display: none;
}

.theme-toggle .icon-sun {
  display: none;
}

[data-theme='light'] .theme-toggle .icon-sun {
  display: block;
}

[data-theme='light'] .theme-toggle .icon-moon {
  display: none;
}

/* ── Shell ───────────────────────────────────────────────────────────────── */
.shell {
  padding-top: var(--header-height);
  padding-bottom: 36px;
  margin-inline: auto;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
}

.view {
  display: none;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-inline: var(--hairline);
}

.view[data-active='true'] {
  display: grid;
}

/* minmax(0, 1fr) en las filas es lo que deja que el panel scrollee por
   dentro en lugar de estirar la página. */
.view--skills {
  grid-template-columns: 320px minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.view--specs {
  grid-template-columns: 300px minmax(0, 1fr) 216px;
  grid-template-rows: minmax(0, 1fr);
}

.rail,
.pane,
.toc {
  min-height: 0;
  /* El grid mide la fila a la altura del marco; sin esto el panel toma la
     altura de su contenido y desborda el área, que queda recortada. */
  height: 100%;
}

.rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: var(--hairline-strong);
  background: var(--surface);
}
.rail__head {
  display: grid;
  gap: var(--space-2xs);
  padding: var(--space-sm);
  border-bottom: var(--hairline-strong);
}

.rail__body {
  overflow-y: auto;
  padding: var(--space-2xs) 0 var(--space-lg);
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.rail__body::-webkit-scrollbar {
  width: 10px;
}

.rail__body::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border: 3px solid var(--surface);
}

.field {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: 0.375rem var(--space-2xs);
  background: var(--base);
  border: 1px solid var(--border);
  color: var(--text-muted);
  transition: border-color var(--duration-fast) ease;
}

.field:focus-within {
  border-color: var(--border-input);
}

.field__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: none;
  color: var(--text);
  font-size: var(--text-small);
}

.field__input::placeholder {
  color: var(--text-muted);
}

.field kbd {
  flex: none;
  padding: 0 0.25rem;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  line-height: 1.4;
}

.segmented {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--border);
}

.segmented button {
  padding: 0.25rem var(--space-2xs);
  color: var(--text-secondary);
  background: var(--base);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.02em;
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.segmented button + button {
  border-left: 1px solid var(--border);
}

.segmented button:hover {
  color: var(--text);
}

.segmented button[aria-pressed='true'] {
  color: var(--accent);
  background: var(--accent-soft);
}

/* ── Rail groups and rows ────────────────────────────────────────────────── */
.group {
  margin-top: var(--space-2xs);
}

.group__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2xs);
  width: 100%;
  padding: var(--space-3xs) var(--space-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: left;
}

.group__head:hover {
  color: var(--text-secondary);
}

.group__count {
  margin-left: auto;
  color: var(--text-muted);
  letter-spacing: 0;
}

.group__path {
  padding: 0 var(--space-sm) var(--space-3xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.row {
  display: grid;
  gap: 0.125rem;
  width: 100%;
  padding: var(--space-3xs) var(--space-sm);
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  text-align: left;
  transition:
    color var(--duration-fast) ease,
    background-color var(--duration-fast) ease,
    border-color var(--duration-fast) ease;
}

.row:hover {
  color: var(--text);
  background: var(--surface-elevated);
}

.row[aria-current='true'] {
  color: var(--text);
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.row__name {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__meta {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row--dir .row__name {
  color: var(--text-secondary);
}

.row--file[aria-current='true'] .row__name {
  color: var(--accent);
}

.row--empty {
  padding: var(--space-2xs) var(--space-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  border-left: 2px dashed var(--border);
  margin-left: var(--space-sm);
}

.tree {
  display: grid;
}

.tree__children {
  padding-left: var(--space-xs);
  border-left: var(--hairline);
  margin-left: var(--space-sm);
}

.tree__toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
}

.tree__chevron {
  transition: transform var(--duration-fast) ease;
  color: var(--text-muted);
}

.tree__chevron[data-open='true'] {
  transform: rotate(90deg);
}

/* ── Panes ───────────────────────────────────────────────────────────────── */
.pane {
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-lg) var(--space-xl) var(--space-2xl);
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.pane::-webkit-scrollbar {
  width: 10px;
}

.pane::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border: 3px solid var(--base);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  margin-bottom: var(--space-2xs);
  padding: 0.125rem var(--space-2xs);
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.detail__title {
  font-family: var(--font-mono);
  font-size: clamp(1.5rem, 2.6vw, var(--text-h2));
  font-weight: 600;
  line-height: var(--leading-h2);
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.detail__lede {
  max-width: 68ch;
  margin-top: var(--space-2xs);
  color: var(--text-secondary);
  font-size: var(--text-body);
}

.detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  margin-top: var(--space-sm);
}

.meta {
  display: grid;
  margin-top: var(--space-lg);
  border-top: var(--hairline-strong);
}

.meta__row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  gap: var(--space-sm);
  align-items: baseline;
  padding: var(--space-2xs) 0;
  border-bottom: var(--hairline);
}

.meta__key {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.meta__value {
  min-width: 0;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow-wrap: anywhere;
}

.meta__value--strong {
  color: var(--text);
}

/* ── Implementar skill ───────────────────────────────────────────────────── */
.install {
  margin-top: var(--space-lg);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background: var(--accent-soft);
}

.install__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.install__status {
  margin: var(--space-2xs) 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.install__note {
  margin: var(--space-3xs) 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.install__error {
  margin: var(--space-2xs) 0 0;
  color: var(--error);
  font-size: 0.82rem;
}

/* ── Contenido de la skill ───────────────────────────────────────────────── */
.skill-doc {
  margin-top: var(--space-lg);
  padding-top: var(--space-sm);
  border-top: var(--hairline-strong);
}

.filelist {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3xs);
  margin-bottom: var(--space-md);
}

.filelist__item {
  max-width: 24ch;
  padding: 0.125rem var(--space-2xs);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color var(--duration-fast) ease,
    border-color var(--duration-fast) ease,
    background-color var(--duration-fast) ease;
}

.filelist__item:hover {
  color: var(--text);
  border-color: var(--accent-border);
}

.filelist__item[aria-current] {
  background: var(--accent-soft);
  border-color: var(--accent-border);
  color: var(--accent);
}

.doc-plain {
  overflow-x: auto;
  padding: var(--space-sm);
  background: var(--code-bg);
  border: 1px solid var(--border);
  color: var(--syn-variable);
  font-family: var(--font-mono);
  font-size: var(--text-code);
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* ── Document ────────────────────────────────────────────────────────────── */
/* El centrado va en la columna de lectura, no en el panel: con margin auto en
   el panel, el panel se encoge a su contenido y deja de ocupar su columna. */
.pane[data-detail='skills'] > * {
  max-width: 880px;
  margin-inline: auto;
}

.doc-head {
  max-width: 880px;
  margin-inline: auto;
  padding-bottom: var(--space-sm);
  border-bottom: var(--hairline-strong);
  margin-bottom: var(--space-md);
}

.doc-head__path {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow-wrap: anywhere;
}

.doc-head__title {
  margin-top: var(--space-3xs);
  font-size: clamp(1.5rem, 2.6vw, var(--text-h2));
  font-weight: 600;
  line-height: var(--leading-h2);
  letter-spacing: -0.02em;
}

.doc-head__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs) var(--space-xs);
  margin-top: var(--space-2xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.doc {
  max-width: 880px;
  margin-inline: auto;
  color: var(--text-secondary);
  font-size: var(--text-body);
  line-height: var(--leading-body);
}

.doc > * + * {
  margin-top: var(--space-sm);
}

.doc h1,
.doc h2,
.doc h3,
.doc h4,
.doc h5,
.doc h6 {
  color: var(--text);
  font-weight: 600;
  scroll-margin-top: calc(var(--header-height) + var(--space-md));
  text-wrap: balance;
}

.doc h1 {
  margin-top: var(--space-lg);
  font-size: var(--text-h3);
  line-height: var(--leading-h3);
  letter-spacing: -0.015em;
}

.doc h2 {
  margin-top: var(--space-lg);
  padding-top: var(--space-2xs);
  border-top: var(--hairline);
  font-size: var(--text-h4);
  line-height: var(--leading-h3);
}

.doc h3 {
  margin-top: var(--space-md);
  font-size: var(--text-body);
  color: var(--text);
}

.doc h4,
.doc h5,
.doc h6 {
  margin-top: var(--space-sm);
  font-size: var(--text-small);
  color: var(--text-secondary);
}

.doc strong {
  color: var(--text);
  font-weight: 600;
}

.doc em {
  font-style: italic;
}

.doc del {
  color: var(--text-muted);
}

.doc a {
  text-decoration-style: dashed;
}

.doc ul,
.doc ol {
  padding-left: 1.35em;
}

.doc li + li {
  margin-top: 0.25em;
}

.doc li > ul,
.doc li > ol {
  margin-top: 0.25em;
}

.doc li::marker {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

/* Las listas de tareas ya traen su propio control: el bullet sobra. */
.doc li:has(> input[type='checkbox']) {
  list-style: none;
  margin-left: -1.15em;
}

.doc input[type='checkbox'] {
  appearance: none;
  width: 13px;
  height: 13px;
  margin-right: 0.5em;
  border: 1px solid var(--border-input);
  vertical-align: -1px;
}

.doc input[type='checkbox'][checked] {
  background: var(--accent);
  border-color: var(--accent);
}

.doc blockquote {
  padding: var(--space-2xs) var(--space-sm);
  border-left: 2px solid var(--accent-border);
  background: var(--surface);
  color: var(--text-secondary);
}

.doc blockquote p + p {
  margin-top: var(--space-2xs);
}

.doc hr {
  height: 0;
  border: 0;
  border-top: var(--hairline-strong);
}

.doc code {
  padding: 0.125em 0.375em;
  background: var(--accent-soft);
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 0.86em;
}

.doc pre {
  overflow-x: auto;
  padding: var(--space-xs) var(--space-sm);
  background: var(--code-bg);
  border: 1px solid var(--border);
  scrollbar-width: thin;
}

.doc pre code {
  padding: 0;
  background: none;
  color: var(--syn-variable);
  font-size: var(--text-code);
  line-height: 1.55;
}

.doc table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-small);
}

.doc th,
.doc td {
  padding: var(--space-3xs) var(--space-2xs);
  border: 1px solid var(--border);
  text-align: left;
  vertical-align: top;
}

.doc th {
  background: var(--surface);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.02em;
  font-weight: 500;
}

.doc td {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.doc .md-img {
  display: inline-flex;
  padding: 0 var(--space-3xs);
  border: 1px dashed var(--border-strong);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

/* ── Table of contents ───────────────────────────────────────────────────── */
.toc {
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-lg) var(--space-sm);
  border-left: var(--hairline-strong);
  background: var(--surface);
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.toc__title {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.toc__list {
  display: grid;
  gap: 0.125rem;
  margin-top: var(--space-2xs);
}

.toc__link {
  display: block;
  padding: 0.125rem var(--space-2xs);
  border-left: 2px solid transparent;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    color var(--duration-fast) ease,
    border-color var(--duration-fast) ease;
}

.toc__link:hover {
  color: var(--text);
  border-left-color: var(--border-strong);
}

/* Sección donde está el lector: misma señal que la fila activa del raíl. */
.toc__link[aria-current] {
  color: var(--accent);
  background: var(--accent-soft);
  border-left-color: var(--accent);
}

.toc__link[data-level='3'] {
  padding-left: var(--space-sm);
  color: var(--text-muted);
}

.toc__link[data-level='4'],
.toc__link[data-level='5'],
.toc__link[data-level='6'] {
  display: none;
}

/* ── States ──────────────────────────────────────────────────────────────── */
.empty {
  display: grid;
  gap: var(--space-2xs);
  max-width: 560px;
  margin: var(--space-2xl) auto;
  padding: var(--space-lg);
  border: var(--hairline-strong);
  background: var(--surface);
  text-align: center;
}

.empty__title {
  color: var(--text);
  font-size: var(--text-h4);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.empty__text {
  color: var(--text-secondary);
  font-size: var(--text-small);
}

.empty__path {
  margin-top: var(--space-2xs);
  padding: var(--space-2xs);
  background: var(--base);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  overflow-wrap: anywhere;
}

.empty__hint {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.loading {
  padding: var(--space-lg) var(--space-sm);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

/* ── Status bar ──────────────────────────────────────────────────────────── */
.statusbar {
  position: fixed;
  inset: auto 0 0 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  height: 36px;
  padding-inline: var(--container-pad);
  background: var(--base);
  border-top: var(--hairline-strong);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.statusbar__item {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.statusbar__spacer {
  flex: 1;
}

.statusbar__dot {
  color: var(--success);
  animation: pulse 2.4s ease-in-out infinite;
}

.statusbar kbd {
  padding: 0 0.25rem;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

/* ── Responsive: the landing page collapses the same way ─────────────────── */
@media (max-width: 1100px) {
  .view--specs {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .toc {
    display: none;
  }
}

@media (max-width: 820px) {
  .shell {
    padding-inline: 0;
  }

  .topbar__inner,
  .statusbar {
    padding-inline: var(--space-sm);
  }

  .brand__div,
  .brand__page {
    display: none;
  }

  .nav-toggle {
    display: inline-flex;
  }

  /* Una sola fila: el panel ocupa todo el ancho y el raíl pasa a ser la
     navegación lateral, fuera de pantalla hasta que se abre. */
  .view--skills,
  .view--specs {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
  }

  .rail {
    position: fixed;
    top: var(--header-height);
    bottom: 36px;
    left: 0;
    width: min(86vw, 340px);
    z-index: 45;
    transform: translateX(-100%);
    transition: transform var(--duration-base) var(--ease-out);
    border-right: var(--hairline-strong);
    border-bottom: 0;
    box-shadow: var(--shadow-pop);
  }

  body[data-drawer='open'] .view[data-active='true'] .rail {
    transform: translateX(0);
  }

  body[data-drawer='open'] .drawer-scrim {
    display: block;
    position: fixed;
    inset: var(--header-height) 0 36px 0;
    z-index: 44;
    background: var(--scrim);
  }

  .pane {
    padding: var(--space-md) var(--space-sm) var(--space-xl);
  }

  .statusbar__hint {
    display: none;
  }
}

/* Pantallas muy angostas: los contadores y la versión le dejan el lugar a la
   navegación. */
@media (max-width: 430px) {
  .tab__count,
  .badge--version,
  .statusbar [data-status-counts] {
    display: none;
  }

  .tabs {
    gap: var(--space-sm);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
