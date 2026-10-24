const cliVersion = typeof __FWINIT_VERSION__ === 'string' ? __FWINIT_VERSION__ : 'dev';

export const site = {
  name: 'fwinit',
  tagline: 'Scaffolding full stack que ya viene con criterio.',
  description:
    'CLI open source para crear proyectos full stack desde plantillas reales: backend, frontend, base de datos y skills de agentes incluidos.',
  version: cliVersion,
  license: 'MIT',
  repo: import.meta.env.PUBLIC_GITHUB_REPO ?? 'orlandotellez/fwinit',
  repoUrl: `https://github.com/${import.meta.env.PUBLIC_GITHUB_REPO ?? 'orlandotellez/fwinit'}`,
  installCommand: 'pnpm add -g fwinit',
} as const;

export const nav = [
  { href: '#plantillas', label: 'Plantillas' },
  { href: '#comandos', label: 'Comandos' },
  { href: '#skills', label: 'Skills' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#faq', label: 'FAQ' },
] as const;

export const packageManagers = [
  { id: 'pnpm', label: 'pnpm', command: 'pnpm add -g fwinit' },
  { id: 'npm', label: 'npm', command: 'npm install -g fwinit' },
  { id: 'bun', label: 'bun', command: 'bun add -g fwinit' },
] as const;

export const facts = {
  templates: 8,
  backends: 4,
  frontends: 4,
  runtimes: 4,
  skills: 3,
  designStyles: 6,
  agentDirs: 3,
  globalTargets: 4,
} as const;

export const stackChips = [
  { label: 'Bun', icon: 'bun' },
  { label: 'Node.js', icon: 'node' },
  { label: '.NET 10', icon: 'dotnet' },
  { label: 'Flutter', icon: 'flutter' },
  { label: 'Express', icon: 'express' },
  { label: 'Fastify', icon: 'fastify' },
  { label: 'PostgreSQL', icon: 'postgres' },
  { label: 'Prisma', icon: 'prisma' },
  { label: 'Drizzle ORM', icon: 'drizzle' },
  { label: 'EF Core', icon: 'dotnet' },
] as const;
