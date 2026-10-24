
export interface AgentSkill {
  name: string;
  command: string;
  summary: string;
  output: string;
}

export const agentSkills: AgentSkill[] = [
  {
    name: 'create-prompt',
    command: '/create-prompt',
    summary:
      'Detalla tu idea antes de generar las specs: toma una descripción suelta y la convierte en un prompt módulo por módulo.',
    output: 'Escribe specs/prompt.md con pantallas, reglas, endpoints y modelo de datos. Lo que tu idea no define queda marcado [PENDIENTE].',
  },
  {
    name: 'create-specs',
    command: '/create-specs',
    summary:
      'Genera la carpeta specs/ de un proyecto nuevo, dividida por capas, con las tareas listas para implementar.',
    output: 'specs/backend/, specs/db/ y specs/frontend/, cada uno con su checklist de tasks. Si el repo ya tiene historia de git, rutea solo a create-specs-from-code.',
  },
  {
    name: 'create-specs-from-code',
    command: '/create-specs-from-code',
    summary:
      'Documenta un proyecto que ya existe leyendo el código real, sin inventar nada.',
    output: 'Cada entidad, endpoint, pantalla y tabla queda con su path, y tasks/ lista la deuda: tests faltantes, validación ausente, endpoints sin auth.',
  },
];

export interface DesignStyle {
  name: string;
  summary: string;
  page: boolean;
}

export const designStyles: DesignStyle[] = [
  {
    name: 'dark-luxury',
    summary: 'Oscuro premium: negro cálido, acento metálico y grano.',
    page: true,
  },
  {
    name: 'docs-starship',
    summary: 'Docs y catálogos técnicos: negro azulado, un acento, doble tema.',
    page: true,
  },
  {
    name: 'glassmorphism',
    summary: 'Paneles translúcidos con blur y fondos aurora.',
    page: true,
  },
  {
    name: 'minimal-light',
    summary: 'Blanco limpio, whitespace generoso y tipografía editorial.',
    page: true,
  },
  {
    name: 'neo-brutalist',
    summary: 'Colores saturados, bordes negros y sombras duras.',
    page: true,
  },
  {
    name: 'minimal-dashboard',
    summary: 'UI densa para paneles admin, POS y back-office. No es un estilo de página.',
    page: false,
  },
];

export const globalTargets = [
  { id: 'opencode', label: 'OpenCode', path: '~/.config/opencode' },
  { id: 'pi', label: 'Pi', path: '~/.pi/agent' },
  { id: 'gentle-shell', label: 'Gentle Shell', path: '~/.gentle-shell/agent' },
  { id: 'agents', label: 'Agent Skills', path: '~/.agents/skills' },
] as const;

export const agentDirs = [
  { id: '.opencode/', label: 'OpenCode' },
  { id: '.pi/', label: 'Pi y Gentle Shell' },
  { id: '.agents/', label: 'Agent Skills y Freebuff' },
] as const;

export const catalog = {
  name: 'ui-ux-pro-max',
  command: '/design-ui-ux-pro-max',
  counts: [
    { value: 79, label: 'estilos' },
    { value: 192, label: 'paletas' },
    { value: 74, label: 'pares tipográficos' },
    { value: 119, label: 'guidelines de UX' },
    { value: 25, label: 'tipos de gráfico' },
    { value: 22, label: 'stacks' },
  ],
} as const;
