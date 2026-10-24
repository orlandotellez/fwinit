
export type Layer = 'backend' | 'frontend';

export interface Template {
  name: string;
  alias: string;
  layer: Layer;
  runtime: string;
  description: string;
  stack: string;
  tags: string[];
  folder: string;
  command: string;
  note?: string;
}

export const templates: Template[] = [
  {
    name: 'ASP.NET Core',
    alias: 'aspnet',
    layer: 'backend',
    runtime: '.NET 10',
    description: 'API REST con ASP.NET Core, Clean Architecture y C#.',
    stack: 'EF Core 10 + PostgreSQL',
    tags: ['csharp', 'clean-architecture', 'ef-core'],
    folder: 'ASPNET',
    command: 'fwinit aspnet mi-app',
    note: 'Controllers, validators, middleware y permisos por atributo.',
  },
  {
    name: 'Express',
    alias: 'express',
    layer: 'backend',
    runtime: 'Bun',
    description: 'API REST con Express 5, Prisma, TypeScript y Bun.',
    stack: 'Prisma 6 + PostgreSQL',
    tags: ['express', 'prisma', 'jwt', 'zod'],
    folder: 'EXPRESS',
    command: 'fwinit express mi-api',
    note: 'Auth con JWT, bcrypt, helmet, rate limit y logging con pino.',
  },
  {
    name: 'Fastify',
    alias: 'fastify',
    layer: 'backend',
    runtime: 'Bun',
    description: 'API REST con Fastify 5, Drizzle ORM, PostgreSQL y TypeScript.',
    stack: 'Drizzle ORM + PostgreSQL',
    tags: ['fastify', 'drizzle', 'postgresql', 'zod'],
    folder: 'FASTIFY',
    command: 'fwinit fastify mi-api',
    note: 'Migraciones y studio con drizzle-kit, más seed incluido.',
  },
  {
    name: 'Node.js Vanilla',
    alias: 'nodejs',
    layer: 'backend',
    runtime: 'Node.js',
    description: 'API con Node.js puro, Prisma, TypeScript y tsx.',
    stack: 'Prisma 6 + PostgreSQL (y Redis)',
    tags: ['nodejs', 'prisma', 'tsx', 'ioredis'],
    folder: 'NODEJS-VANILLA',
    command: 'fwinit nodejs mi-api',
    note: 'Módulos de auth, usuarios, productos, inventario y ventas.',
  },
  {
    name: 'Astro',
    alias: 'astro',
    layer: 'frontend',
    runtime: 'Node.js',
    description: 'Landing estática con Astro 7 y TypeScript.',
    stack: 'HTML estático, cero JS de runtime',
    tags: ['astro', 'ssg', 'landing'],
    folder: 'ASTRO',
    command: 'fwinit astro mi-landing',
    note: 'Secciones, tokens de diseño y SEO ya configurados.',
  },
  {
    name: 'Tauri',
    alias: 'tauri',
    layer: 'frontend',
    runtime: 'Node.js',
    description: 'Dashboard de escritorio con React 19, Vite y Tauri 2.',
    stack: 'App nativa de escritorio',
    tags: ['tauri', 'react', 'vite', 'desktop'],
    folder: 'TAURI',
    command: 'fwinit tauri mi-dashboard',
    note: 'Contexto, páginas, componentes y estilos listos.',
  },
  {
    name: 'React Native',
    alias: 'react-native',
    layer: 'frontend',
    runtime: 'Node.js',
    description: 'App móvil con React Native, Expo SDK 54 y TypeScript.',
    stack: 'Expo Router + tabs',
    tags: ['react-native', 'expo', 'expo-router'],
    folder: 'REACT-NATIVE',
    command: 'fwinit react-native mi-app',
    note: 'Corre en Android, iOS y web con el mismo código.',
  },
  {
    name: 'Flutter',
    alias: 'flutter',
    layer: 'frontend',
    runtime: 'Flutter',
    description: 'App multiplataforma con Flutter, Clean Architecture y Riverpod.',
    stack: 'Design system dual claro/oscuro + l10n',
    tags: ['flutter', 'dart', 'riverpod'],
    folder: 'FLUTTER',
    command: 'fwinit flutter mi-app',
    note: 'Pide la organización reverse-domain para el bundle id (-o).',
  },
];

export const layerLabels: Record<Layer, string> = {
  backend: 'Backend',
  frontend: 'Frontend',
};

export function countByLayer(layer: Layer | 'all'): number {
  if (layer === 'all') return templates.length;
  return templates.filter((t) => t.layer === layer).length;
}
