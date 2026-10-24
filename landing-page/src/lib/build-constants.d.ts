
declare const process: {
  env: Record<string, string | undefined>;
  cwd(): string;
};

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf-8'): string;
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
}

declare const __FWINIT_VERSION__: string;
