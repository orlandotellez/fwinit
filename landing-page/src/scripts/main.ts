const THEME_KEY = 'fwinit:theme';
const LAYER_PARAM = 'capa';

let started = false;

function init(): void {
  if (started) return;
  started = true;

  initHeader();
  initTheme();
  initMobileNav();
  initTabs();
  initCopy();
  initAccordion();
  initTemplateFilter();
  initScrollSpy();
  initReveal();
  initDemo();
}

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  let queued = false;
  const update = (): void => {
    header.toggleAttribute('data-scrolled', window.scrollY > 40);
    queued = false;
  };
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  document.addEventListener('scroll', onScroll, { passive: true });
  update();
}

function currentTheme(): 'light' | 'dark' {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function syncThemeToggles(): void {
  const theme = currentTheme();
  for (const toggle of document.querySelectorAll<HTMLElement>('[data-theme-toggle]')) {
    toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    toggle.setAttribute(
      'aria-label',
      theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro',
    );
  }
}

function initTheme(): void {
  syncThemeToggles();

  document.addEventListener('click', (event) => {
    const toggle = (event.target as Element | null)?.closest<HTMLElement>('[data-theme-toggle]');
    if (!toggle) return;

    const next = currentTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
    }
    syncThemeToggles();
  });

  const media = window.matchMedia('(prefers-color-scheme: light)');
  media.addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) syncThemeToggles();
  });
}

function initMobileNav(): void {
  const toggle = document.querySelector<HTMLElement>('[data-nav-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-nav-panel]');
  if (!toggle || !panel) return;

  let lastFocused: HTMLElement | null = null;
  const isOpen = (): boolean => toggle.getAttribute('aria-expanded') === 'true';
  const focusable = (): HTMLElement[] =>
    Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));

  const open = (): void => {
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Cerrar menú');
    document.body.style.overflow = 'hidden';
    focusable()[0]?.focus();
  };

  const close = (restore = true): void => {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menú');
    document.body.style.overflow = '';
    if (!restore) return;
    const target = lastFocused && lastFocused !== document.body ? lastFocused : toggle;
    target.focus();
  };

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target) return;

    if (target.closest('[data-nav-toggle]')) {
      if (isOpen()) close();
      else open();
      return;
    }

    if (!isOpen()) return;
    if (target.closest('[data-nav-mobile]')) {
      close(false);
      return;
    }
    if (!panel.contains(target)) close(false);
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusable();
    if (items.length === 0) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const desktop = window.matchMedia('(min-width: 901px)');
  desktop.addEventListener('change', (event) => {
    if (event.matches && isOpen()) close(false);
  });
}

function tabGroups(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-tabs-group]'));
}

function preferenceKey(key: string): string {
  return `fwinit:${key}`;
}

function applyTabInGroup(group: HTMLElement, id: string): void {
  const tabs = Array.from(group.querySelectorAll<HTMLElement>('[role="tab"][data-tab]'));
  if (!tabs.some((tab) => tab.dataset.tab === id)) return;

  for (const tab of tabs) {
    const selected = tab.dataset.tab === id;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
  }
  for (const tabPanel of group.querySelectorAll<HTMLElement>('[data-tabpanel]')) {
    tabPanel.hidden = tabPanel.dataset.tabpanel !== id;
  }
}

function applyTab(group: HTMLElement, id: string): void {
  const key = group.getAttribute('data-tabs-key');
  if (!key) {
    applyTabInGroup(group, id);
    return;
  }

  for (const sibling of document.querySelectorAll<HTMLElement>(
    `[data-tabs-group][data-tabs-key="${key}"]`,
  )) {
    applyTabInGroup(sibling, id);
  }
  try {
    localStorage.setItem(preferenceKey(key), id);
  } catch {
  }
}

function initTabs(): void {
  const groups = tabGroups();
  if (groups.length === 0) return;

  for (const group of groups) {
    const key = group.getAttribute('data-tabs-key');
    if (!key) continue;
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(preferenceKey(key));
    } catch {
      stored = null;
    }
    if (stored) applyTabInGroup(group, stored);
  }

  document.addEventListener('click', (event) => {
    const tab = (event.target as Element | null)?.closest<HTMLElement>('[role="tab"][data-tab]');
    const id = tab?.dataset.tab;
    const group = tab?.closest<HTMLElement>('[data-tabs-group]');
    if (!id || !group) return;
    applyTab(group, id);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    const tab = (event.target as Element | null)?.closest<HTMLElement>('[role="tab"][data-tab]');
    const group = tab?.closest<HTMLElement>('[data-tabs-group]');
    if (!tab || !group) return;

    const list = Array.from(
      group.querySelectorAll<HTMLElement>('[role="tab"][data-tab]'),
    );
    const index = list.indexOf(tab);
    if (index === -1) return;

    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : list.length - 1;
    const next = list[(index + step) % list.length];
    next?.focus();
    if (next?.dataset.tab) applyTab(group, next.dataset.tab);
  });
}

function copyValue(button: HTMLElement): string {
  const explicit = button.getAttribute('data-copy-value');
  if (explicit) return explicit;

  const scope = button.closest('[data-copy-scope]');
  const source =
    scope?.querySelector('[data-code-value]') ?? button.closest('[data-code-value]');
  return source?.getAttribute('data-code-value') ?? '';
}

function initCopy(): void {
  const announcer = document.querySelector<HTMLElement>('[data-announcer]');
  const announce = (message: string): void => {
    if (announcer) announcer.textContent = message;
  };
  const timers = new WeakMap<HTMLElement, number>();

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLElement>('[data-copy]');
    if (!button) return;

    const value = copyValue(button).trim();
    if (!value) return;

    const label = button.querySelector<HTMLElement>('[data-copy-label]');

    const confirm = (): void => {
      button.setAttribute('data-copied', '');
      if (label) label.textContent = '¡Copiado!';
      announce('Comando copiado');
      const previous = timers.get(button);
      if (previous) window.clearTimeout(previous);
      timers.set(
        button,
        window.setTimeout(() => {
          button.removeAttribute('data-copied');
          if (label) label.textContent = 'Copiar';
        }, 2000),
      );
    };

    if (!navigator.clipboard?.writeText) {
      announce('Este navegador no permite copiar automáticamente');
      return;
    }

    navigator.clipboard.writeText(value).then(confirm, () => {
      announce('No se pudo copiar el comando');
    });
  });
}

function initAccordion(): void {
  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-accordion-trigger]',
    );
    if (!trigger) return;

    const panelId = trigger.getAttribute('aria-controls');
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const group = trigger.closest('[data-accordion]');
    const willOpen = trigger.getAttribute('aria-expanded') !== 'true';

    if (willOpen && group?.hasAttribute('data-exclusive')) {
      for (const other of group.querySelectorAll<HTMLElement>('[data-accordion-trigger]')) {
        if (other === trigger) continue;
        other.setAttribute('aria-expanded', 'false');
        const otherPanelId = other.getAttribute('aria-controls');
        const otherPanel = otherPanelId ? document.getElementById(otherPanelId) : null;
        if (otherPanel) otherPanel.hidden = true;
      }
    }

    trigger.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    panel.hidden = !willOpen;
  });
}

const LAYERS = ['all', 'backend', 'frontend'] as const;
type LayerFilter = (typeof LAYERS)[number];

function isLayerFilter(value: string | null): value is LayerFilter {
  return value !== null && (LAYERS as readonly string[]).includes(value);
}

function initTemplateFilter(): void {
  const grid = document.querySelector<HTMLElement>('[data-tpl-grid]');
  const chips = Array.from(document.querySelectorAll<HTMLElement>('[data-filter-layer]'));
  const counter = document.querySelector<HTMLElement>('[data-tpl-count]');
  if (!grid || chips.length === 0) return;

  const items = Array.from(grid.querySelectorAll<HTMLElement>('[data-tpl-item]')).map((item) => ({
    item,
    layer: item.querySelector('[data-tpl-card]')?.getAttribute('data-layer') ?? '',
  }));

  const apply = (layer: LayerFilter, syncUrl: boolean): void => {
    let visible = 0;
    for (const entry of items) {
      const show = layer === 'all' || entry.layer === layer;
      entry.item.hidden = !show;
      if (show) visible += 1;
    }

    for (const chip of chips) {
      chip.setAttribute('aria-pressed', chip.dataset.filterLayer === layer ? 'true' : 'false');
    }

    if (counter) {
      const suffix = layer === 'all' ? '' : ` de ${layer}`;
      counter.textContent = `${visible} ${visible === 1 ? 'plantilla' : 'plantillas'}${suffix}`;
    }

    if (!syncUrl) return;
    const url = new URL(window.location.href);
    if (layer === 'all') url.searchParams.delete(LAYER_PARAM);
    else url.searchParams.set(LAYER_PARAM, layer);
    window.history.replaceState({}, '', url);
  };

  const fromUrl = new URL(window.location.href).searchParams.get(LAYER_PARAM);
  apply(isLayerFilter(fromUrl) ? fromUrl : 'all', false);

  document.addEventListener('click', (event) => {
    const chip = (event.target as Element | null)?.closest<HTMLElement>('[data-filter-layer]');
    const value = chip?.dataset.filterLayer ?? null;
    if (!isLayerFilter(value)) return;
    apply(value, true);
  });

  window.addEventListener('popstate', () => {
    const value = new URL(window.location.href).searchParams.get(LAYER_PARAM);
    apply(isLayerFilter(value) ? value : 'all', false);
  });
}

function initScrollSpy(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]'));
  if (links.length === 0) return;

  const sections: { id: string; element: Element }[] = [];
  for (const link of links) {
    const hash = link.getAttribute('href');
    if (!hash?.startsWith('#') || hash.length < 2) continue;
    const id = hash.slice(1);
    if (sections.some((entry) => entry.id === id)) continue;
    const element = document.getElementById(id);
    if (element) sections.push({ id, element });
  }
  if (sections.length === 0) return;

  const mark = (id: string | null): void => {
    for (const link of links) {
      if (id !== null && link.getAttribute('href') === `#${id}`) {
        link.setAttribute('data-active', '');
      } else {
        link.removeAttribute('data-active');
      }
    }
  };

  let queued = false;
  const update = (): void => {
    queued = false;
    const line = window.scrollY + window.innerHeight * 0.35;
    let current: string | null = null;
    for (const entry of sections) {
      if (entry.element.getBoundingClientRect().top + window.scrollY <= line) {
        current = entry.id;
      }
    }
    mark(current);
  };
  const onScroll = (): void => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  };

  document.addEventListener('scroll', onScroll, { passive: true });
  update();
}

type DemoLine = {
  line: HTMLElement;
  text: string;
  answer: HTMLElement | null;
};

function initDemo(): void {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  for (const demo of Array.from(document.querySelectorAll<HTMLElement>('[data-demo]'))) {
    const lines = Array.from(demo.querySelectorAll<HTMLElement>('[data-demo-line]'));
    if (lines.length === 0) continue;

    const term = demo.closest<HTMLElement>('.term');
    const panel = demo.closest<HTMLElement>('[data-tabpanel]');
    const replay = term?.querySelector<HTMLElement>('[data-demo-replay]') ?? null;

    let token = 0;
    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => window.setTimeout(resolve, ms));

    const entries: DemoLine[] = lines.map((line) => ({
      line,
      text: line.querySelector<HTMLElement>('[data-demo-text]')?.textContent ?? '',
      answer: line.querySelector<HTMLElement>('[data-demo-answer]'),
    }));

    const paintFinal = (): void => {
      for (const menu of Array.from(demo.querySelectorAll('.demo-menu'))) menu.remove();

      for (const entry of entries) {
        entry.line.style.visibility = '';
        entry.line.removeAttribute('data-demo-typing');
        const target = entry.line.querySelector<HTMLElement>('[data-demo-text]');
        if (target) target.textContent = entry.text;
        if (entry.answer) entry.answer.style.visibility = '';
      }
      demo.style.minHeight = '';
    };

    const typeText = async (
      target: HTMLElement,
      text: string,
      myToken: number,
    ): Promise<boolean> => {
      target.textContent = '';
      const speed = text.length > 40 ? 16 : 32;
      for (let index = 1; index <= text.length; index += 1) {
        if (myToken !== token) return false;
        target.textContent = text.slice(0, index);
        await sleep(speed);
      }
      return true;
    };

    const showMenu = async (line: HTMLElement, menuId: string, myToken: number): Promise<void> => {
      if (myToken !== token) return;

      const template = document.getElementById(menuId);
      if (!(template instanceof HTMLTemplateElement)) return;

      const clone = template.content.firstElementChild?.cloneNode(true);
      if (!(clone instanceof HTMLElement)) return;

      line.after(clone);
      clone.style.top = `${line.offsetTop + line.offsetHeight}px`;

      const choices = Array.from(clone.querySelectorAll<HTMLElement>('.demo-menu__item'));
      for (const choice of choices) choice.style.visibility = 'hidden';

      try {
        for (const choice of choices) {
          if (myToken !== token) return;
          choice.style.visibility = '';
          await sleep(110);
        }
        await sleep(850);
      } finally {
        clone.remove();
      }
    };

    const play = async (): Promise<void> => {
      token += 1;
      const myToken = token;
      if (replay) replay.hidden = false;

      paintFinal();
      demo.style.minHeight = `${demo.offsetHeight}px`;

      for (const entry of entries) {
        entry.line.style.visibility = 'hidden';
        if (entry.answer) entry.answer.style.visibility = 'hidden';
      }

      for (const entry of entries) {
        if (myToken !== token) return;

        const kind = entry.line.dataset.demoKind;
        entry.line.style.visibility = '';
        const target = entry.line.querySelector<HTMLElement>('[data-demo-text]');

        if (target && (kind === 'type' || kind === 'prompt')) {
          entry.line.setAttribute('data-demo-typing', '');
          const typed = await typeText(target, entry.text, myToken);
          entry.line.removeAttribute('data-demo-typing');
          if (!typed) return;
          await sleep(kind === 'type' ? 420 : 220);

          const menuId = entry.line.dataset.demoMenu;
          if (menuId) await showMenu(entry.line, menuId, myToken);
          if (myToken !== token) return;
        }

        if (entry.answer) {
          entry.answer.style.visibility = '';
          await sleep(340);
        } else {
          await sleep(kind === 'type' ? 260 : 380);
        }
      }

      if (myToken !== token) return;
      demo.style.minHeight = '';
    };

    document.addEventListener('click', (event) => {
      const button = (event.target as Element | null)?.closest('[data-demo-replay]');
      if (!button || !term?.contains(button)) return;
      void play();
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      token += 1;
      paintFinal();
    });

    const start = (): void => {
      if (reducedMotion.matches) {
        paintFinal();
        if (replay) replay.hidden = true;
        return;
      }
      if (panel?.hidden) return;
      void play();
    };

    if (!('IntersectionObserver' in window)) {
      start();
      continue;
    }

    const observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          start();
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(demo);
  }
}

function initReveal(): void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
  if (nodes.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    for (const node of nodes) node.setAttribute('data-revealed', '');
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-revealed', '');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0, rootMargin: '0px 0px -40px 0px' },
  );

  for (const node of nodes) observer.observe(node);
}

init();
