export type TemplateRuntime = "node" | "bun" | "dotnet";

export type TemplateLayer = "backend" | "frontend";

export interface Template {
  name: string;
  alias: string[];
  description: string;
  folder: string;
  runtime: TemplateRuntime;
  layer: TemplateLayer;
}

export const TEMPLATES: Template[] = [
  {
    name: "ASP.NET",
    alias: ["aspnet", "dotnet", "csharp"],
    description: "API REST con ASP.NET Core, Clean Architecture y C#",
    folder: "ASPNET",
    runtime: "dotnet",
    layer: "backend",
  },
  {
    name: "Express",
    alias: ["express"],
    description: "API REST con Express, Prisma, TypeScript y Bun",
    folder: "EXPRESS",
    runtime: "bun",
    layer: "backend",
  },
  {
    name: "Fastify",
    alias: ["fastify"],
    description: "API REST con Fastify, Prisma, TypeScript y Bun",
    folder: "FASTIFY",
    runtime: "bun",
    layer: "backend",
  },
  {
    name: "Node.js Vanilla",
    alias: ["nodejs", "vanilla", "node"],
    description: "API con Node.js puro, Prisma, TypeScript y tsx",
    folder: "NODEJS-VANILLA",
    runtime: "node",
    layer: "backend",
  },
  {
    name: "Astro",
    alias: ["astro"],
    description: "Landing estática con Astro 7 y TypeScript",
    folder: "ASTRO",
    runtime: "node",
    layer: "frontend",
  },
  {
    name: "Tauri",
    alias: ["tauri"],
    description: "Dashboard de escritorio con React, Vite y Tauri 2",
    folder: "TAURI",
    runtime: "node",
    layer: "frontend",
  },
  {
    name: "React Native",
    alias: ["react-native", "rn", "expo"],
    description: "App móvil con React Native, Expo y TypeScript",
    folder: "REACT-NATIVE",
    runtime: "node",
    layer: "frontend",
  },
];

export function getTemplatesByLayer(layer: TemplateLayer): Template[] {
  return TEMPLATES.filter((t) => t.layer === layer);
}

export function findTemplate(input: string): Template | undefined {
  const normalized = input.toLowerCase().trim();
  return TEMPLATES.find(
    (t) =>
      t.folder.toLowerCase() === normalized ||
      t.alias.includes(normalized)
  );
}