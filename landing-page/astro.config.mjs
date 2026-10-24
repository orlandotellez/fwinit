// @ts-check
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'astro/config';

const site = process.env.PUBLIC_SITE_URL;

if (!site) {
  throw new Error(
    [
      'Falta PUBLIC_SITE_URL.',
      '',
      'La landing la usa para el canonical, los tags OG y el sitemap, así que el',
      'build no puede seguir con un placeholder. Definila antes de compilar:',
      '',
      '  PUBLIC_SITE_URL=https://tu-dominio.example npm run build',
      '',
      'En desarrollo copiá `.env.example` a `.env` (Astro lee ese archivo solo).',
    ].join('\n'),
  );
}

function readCliVersion() {
  for (const candidate of ['../cli/package.json', 'cli/package.json']) {
    try {
      const pkg = JSON.parse(readFileSync(resolve(process.cwd(), candidate), 'utf-8'));
      if (typeof pkg.version === 'string') return pkg.version;
    } catch {
    }
  }
  return 'dev';
}

export default defineConfig({
  site,
  output: 'static',
  devToolbar: { enabled: false },
  build: { format: 'directory' },
  vite: {
    define: {
      __FWINIT_VERSION__: JSON.stringify(readCliVersion()),
    },
  },
});
