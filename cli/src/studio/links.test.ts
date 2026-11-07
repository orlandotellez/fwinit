/**
 * Guards for the two invariants the browser only notices in production:
 *
 * - every `data-spec-link` served for a nested spec is a path from the specs
 *   root that the server can serve again (S3), not a path relative to the
 *   document that the client would re-resolve into a 404;
 * - the studio listens on loopback only and never answers on an external
 *   interface (S6), which `address.host` alone cannot prove because it echoes
 *   the constant the server passed to `listen`.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import { readSpecFile } from "./specs.js";
import { startStudio } from "./server.js";
import type { SpecsRoots, StudioServer } from "./types.js";

const cleaned: string[] = [];

async function makeDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  cleaned.push(dir);
  return dir;
}

async function seedProject(): Promise<string> {
  const root = await makeDir("fwinit-studio-links-");
  await mkdir(join(root, "specs", "docs"), { recursive: true });
  await mkdir(join(root, "specs", "modules", "backend"), { recursive: true });
  await writeFile(
    join(root, "specs", "docs", "01-a.md"),
    "# A\n\n[B](../modules/backend/README.md)\n\n[C](./02-b.md)\n",
    "utf8"
  );
  await writeFile(join(root, "specs", "docs", "02-b.md"), "# B\n", "utf8");
  await writeFile(
    join(root, "specs", "modules", "backend", "README.md"),
    "# Backend\n",
    "utf8"
  );
  return root;
}

function extractSpecLinks(html: string): string[] {
  const targets: string[] = [];
  for (const match of html.matchAll(/data-spec-link="([^"]*)"/g)) {
    targets.push(match[1] ?? "");
  }
  return targets;
}

/** Non-internal IPv4 addresses: the ones a wildcard bind would expose. */
function externalIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = String(entry.family);
      if (family !== "IPv4" && family !== "4") continue;
      if (entry.internal) continue;
      addresses.push(entry.address);
    }
  }
  return addresses;
}

/** Resolves true when a TCP connection to host:port succeeds within a second. */
function canConnect(host: string, port: number): Promise<boolean> {
  return new Promise<boolean>((resolveConnect) => {
    const socket = connect({ host, port });
    let settled = false;
    const finish = (connected: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Destroyed either way: a leaked socket would keep the process alive.
      socket.destroy();
      resolveConnect(connected);
    };
    const timer = setTimeout(() => finish(false), 1000);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

describe("internal spec links", () => {
  test("cada data-spec-link es un path desde specs/ que el server puede servir", async () => {
    const root = await seedProject();
    const roots: SpecsRoots = { specsRoot: join(root, "specs"), projectRoot: root };

    const file = await readSpecFile(roots, "docs/01-a.md");

    expect(extractSpecLinks(file.html)).toEqual([
      "modules/backend/README.md",
      "docs/02-b.md",
    ]);

    // El guard real: el HTML servido sólo contiene targets servibles. Si vuelve
    // a quedar relativo al documento, `readSpecFile` falla con 'missing'.
    for (const target of extractSpecLinks(file.html)) {
      const linked = await readSpecFile(roots, target);
      expect(linked.path).toBe(target);
    }
  });
});

describe("loopback bind", () => {
  let studio: StudioServer;
  let projectRoot: string;
  let home: string;

  beforeAll(async () => {
    projectRoot = await seedProject();
    home = await makeDir("fwinit-studio-links-home-");
    studio = await startStudio({ port: 0, projectRoot, home, open: false });
  });

  afterAll(async () => {
    await studio?.close();
    await Promise.all(cleaned.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  test(
    "no acepta conexiones entrantes en direcciones IPv4 no internas",
    async () => {
      const external = externalIPv4Addresses();
      if (external.length === 0) {
        // Sin interfaz externa no hay nada que probar por TCP: queda el contrato.
        expect(studio.address.host).toBe("127.0.0.1");
        return;
      }
      for (const address of external) {
        expect(await canConnect(address, studio.address.port)).toBe(false);
      }
    },
    15_000
  );
});
