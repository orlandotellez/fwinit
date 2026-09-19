export type Layer = "backend" | "frontend";

export interface TemplateInfo {
  name: string;
  layer: Layer;
  runtime: string;
  description: string;
}

/**
 * Catálogo real de templates de fwinit.
 * Ejemplo de dato estático: reemplazalo por un GET a tu API cuando
 * conectes el dashboard a un backend.
 */
export const FWINIT_TEMPLATES: TemplateInfo[] = [
  { name: "ASP.NET", layer: "backend", runtime: "dotnet", description: "API REST con ASP.NET Core, Clean Architecture y C#" },
  { name: "Express", layer: "backend", runtime: "bun", description: "API REST con Express, Prisma, TypeScript y Bun" },
  { name: "Fastify", layer: "backend", runtime: "bun", description: "API REST con Fastify, Prisma, TypeScript y Bun" },
  { name: "Node.js Vanilla", layer: "backend", runtime: "node", description: "API con Node.js puro, Prisma, TypeScript y tsx" },
  { name: "Astro", layer: "frontend", runtime: "node", description: "Landing estática con Astro 7 y TypeScript" },
  { name: "Tauri", layer: "frontend", runtime: "node", description: "Dashboard de escritorio con React, Vite y Tauri 2" },
  { name: "React Native", layer: "frontend", runtime: "node", description: "App móvil con React Native, Expo y TypeScript" },
];

export const backendCount = FWINIT_TEMPLATES.filter((t) => t.layer === "backend").length;
export const frontendCount = FWINIT_TEMPLATES.filter((t) => t.layer === "frontend").length;