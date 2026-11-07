/**
 * Design tokens for the studio, copied value-for-value from
 * `landing-page/src/styles/tokens.css`.
 *
 * The studio is the same design system as the public landing page, so it must
 * not drift from it: same surfaces, same measured contrast ratios, same square
 * corners, same single accent. When the landing page tokens change, change them
 * here in the same commit.
 */
export const TOKENS_CSS = `
:root {
  color-scheme: dark;

  /* Surfaces */
  --base: #07090f;
  --surface: #0b0e16;
  --surface-elevated: #121623;
  --code-bg: #121623;

  /* Text: AA on all three surfaces */
  --text: #eef2f8;
  --text-secondary: #a8b2c4;
  --text-muted: #77839a;

  /* Electric blue accent scale */
  --accent: #8aa2ff;
  --accent-hover: #a6b8ff;
  --accent-active: #6f8ae6;
  --accent-soft: #16203a;
  --accent-soft-hover: #1d2a4d;
  --accent-border: #3d4a7a;

  /* Semantics */
  --success: #4ade80;
  --warning: #fbbf24;
  --error: #f87171;
  --on-accent: #07090f;

  /* Borders */
  --border: #1e2433;
  --border-strong: #2c3446;
  --border-input: #5f6b8a;

  /* Structural lines are dashed by design; control borders stay solid */
  --hairline: 1px dashed var(--border);
  --hairline-strong: 1px dashed var(--border-strong);

  /* Focus */
  --focus-ring: var(--accent);
  --focus-ring-offset: var(--base);

  /* Only two shadows exist */
  --shadow-pop: 0 8px 24px rgb(0 0 0 / 0.28);
  --shadow-header: 0 1px 0 var(--border);

  /* Scrim */
  --scrim: rgb(3 6 12 / 0.6);

  /* Typography */
  --font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI',
    Roboto, sans-serif;
  --font-mono: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace,
    SFMono-Regular, Menlo, Consolas, monospace;

  --text-display: 3.75rem;
  --text-h1: 2.75rem;
  --text-h2: 2.125rem;
  --text-h3: 1.5rem;
  --text-h4: 1.1875rem;
  --text-body: 1.0625rem;
  --text-small: 0.9375rem;
  --text-caption: 0.8125rem;
  --text-code: 0.875rem;

  --leading-display: 1.1;
  --leading-h1: 1.15;
  --leading-h2: 1.2;
  --leading-h3: 1.3;
  --leading-body: 1.6;

  /* Spacing */
  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;
  --space-4xl: 7.5rem;

  /* Radii: square corners everywhere, roles kept for a one-line rollback */
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-pill: 0px;

  /* Layout */
  --container: 1300px;
  --container-pad: 48px;
  --text-column: 800px;
  --hero-column: 560px;
  --header-height: 72px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-reveal: 400ms;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);

  /* Syntax, >= 4.5 on --code-bg in both themes */
  --syn-comment: #77839a;
  --syn-keyword: #a78bfa;
  --syn-string: #86efac;
  --syn-number: #fbbf24;
  --syn-function: #7dd3fc;
  --syn-type: #f0abfc;
  --syn-variable: #e6edf7;
  --syn-tag: #f87171;
  --syn-operator: #9aa5b8;
  --syn-punctuation: #8b95a8;
}

/* Light theme: same roles, measured values. Both blocks are the same theme:
   one answers the system preference when the user has not chosen, the other
   answers the stored choice. Keep them identical. */
[data-theme='light'] {
  color-scheme: light;

  --base: #ffffff;
  --surface: #f7f8fb;
  --surface-elevated: #eef1f7;
  --code-bg: #eef1f7;

  --text: #0d1220;
  --text-secondary: #454f63;
  --text-muted: #5c6678;

  --accent: #3d54d4;
  --accent-hover: #2b3ea8;
  --accent-active: #24337f;
  --accent-soft: #eaeeff;
  --accent-soft-hover: #dde3ff;
  --accent-border: #b9c2ee;

  --success: #166534;
  --warning: #78350f;
  --error: #b91c1c;
  --on-accent: #ffffff;

  --border: #dfe3ec;
  --border-strong: #c3cad8;
  --border-input: #828b9c;

  --shadow-pop: 0 8px 24px rgb(13 18 32 / 0.1);
  --scrim: rgb(13 18 32 / 0.5);

  --syn-comment: #5c6678;
  --syn-keyword: #7c3aed;
  --syn-string: #166534;
  --syn-number: #92400e;
  --syn-function: #0e7490;
  --syn-type: #a21caf;
  --syn-variable: #0d1220;
  --syn-tag: #b91c1c;
  --syn-operator: #5c6678;
  --syn-punctuation: #5c6678;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {
    color-scheme: light;

    --base: #ffffff;
    --surface: #f7f8fb;
    --surface-elevated: #eef1f7;
    --code-bg: #eef1f7;

    --text: #0d1220;
    --text-secondary: #454f63;
    --text-muted: #5c6678;

    --accent: #3d54d4;
    --accent-hover: #2b3ea8;
    --accent-active: #24337f;
    --accent-soft: #eaeeff;
    --accent-soft-hover: #dde3ff;
    --accent-border: #b9c2ee;

    --success: #166534;
    --warning: #78350f;
    --error: #b91c1c;
    --on-accent: #ffffff;

    --border: #dfe3ec;
    --border-strong: #c3cad8;
    --border-input: #828b9c;

    --shadow-pop: 0 8px 24px rgb(13 18 32 / 0.1);
    --scrim: rgb(13 18 32 / 0.5);

    --syn-comment: #5c6678;
    --syn-keyword: #7c3aed;
    --syn-string: #166534;
    --syn-number: #92400e;
    --syn-function: #0e7490;
    --syn-type: #a21caf;
    --syn-variable: #0d1220;
    --syn-tag: #b91c1c;
    --syn-operator: #5c6678;
    --syn-punctuation: #5c6678;
  }
}
`;
