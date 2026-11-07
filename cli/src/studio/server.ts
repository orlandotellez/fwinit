import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { listSkillFiles, readSkillFile, SkillFileError } from "./skill-files.js";
import { buildSpecsTree, readSpecFile, SpecPathError } from "./specs.js";
import { discoverSkills } from "./skills.js";
import type { SkillFileRef, StudioOpenOptions, StudioServer } from "./types.js";
import { renderStudioHtml } from "./ui/document.js";
import { openBrowser } from "./open-browser.js";

/** Loopback only: the studio exposes local files and must never leave the host. */
const HOST = "127.0.0.1";

/**
 * Nombres que puede decir el header `Host` (con o sin puerto).
 *
 * El studio sirve el disco local: un `Host` ajeno es el paso previo de un
 * ataque de DNS rebinding, así que se rechaza antes de rutear.
 */
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * `true` cuando el `Host` pedido es loopback y, si trae puerto, es el nuestro.
 * `Host: 127.0.0.1:1234` y `Host: 127.0.0.1` son válidos; `evil.example` no.
 */
function isAllowedHost(header: string | undefined, port: number): boolean {
  if (typeof header !== "string") return false;
  const value = header.trim().toLowerCase();
  if (value === "") return false;

  // `[::1]:1234` es el único caso con `:` adentro del host.
  if (value.startsWith("[")) {
    const close = value.indexOf("]");
    if (close === -1) return false;
    const hostname = value.slice(0, close + 1);
    const rest = value.slice(close + 1);
    if (!LOOPBACK_HOSTNAMES.has(hostname)) return false;
    if (rest === "") return true;
    return rest.startsWith(":") && rest.slice(1) !== "" && rest.slice(1) === String(port);
  }

  const colon = value.lastIndexOf(":");
  const hostname = colon === -1 ? value : value.slice(0, colon);
  if (!LOOPBACK_HOSTNAMES.has(hostname)) return false;
  if (colon === -1) return true;
  const requestedPort = value.slice(colon + 1);
  return requestedPort !== "" && requestedPort === String(port);
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  // Everything is inline by design: one document, one stylesheet, one script.
  // Only the font files are remote, and only from Google Fonts.
  "Content-Security-Policy": [
    "default-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "img-src data:",
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "script-src 'unsafe-inline'",
    "connect-src 'self'",
  ].join("; "),
};

const SPEC_ERROR_STATUS: Record<string, number> = {
  invalid: 400,
  outside: 403,
  missing: 404,
  unsupported: 415,
};

/** `SkillFileError` usa los mismos cuatro códigos, así que mapea igual. */
const SKILL_ERROR_STATUS = SPEC_ERROR_STATUS;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function sendText(response: ServerResponse, status: number, text: string): void {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  response.end(text);
}

/**
 * Starts the studio HTTP server on loopback.
 *
 * Every route is read-only and derived from disk on each request, so installing
 * a skill or editing a spec is visible on reload without restarting the CLI.
 */
export async function startStudio(options: StudioOpenOptions = {}): Promise<StudioServer> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const version = options.version ?? "0.0.0";
  const home = options.home;
  // El puerto sólo se conoce después de `listen`; el handler lo lee de acá (con
  // `request.socket.localPort` como respaldo) para validar el header `Host`.
  let listeningPort = options.port ?? 0;

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      if (response.headersSent) {
        response.end();
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`fwinit studio: ${message}\n`);
      sendJson(response, 500, { error: "No se pudo completar la solicitud." });
    });
  });

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD");
      sendJson(response, 405, { error: "Método no permitido." });
      return;
    }

    const hostPort = listeningPort || request.socket.localPort || 0;
    if (!isAllowedHost(request.headers.host, hostPort)) {
      sendJson(response, 403, { error: "Host no permitido." });
      return;
    }

    const url = new URL(request.url ?? "/", `http://${HOST}`);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      // `/%` y compañía: pedido malformado, no un fallo del server.
      sendJson(response, 400, { error: "Ruta inválida." });
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      sendHtml(
        response,
        renderStudioHtml({
          version,
          projectRoot,
          home: home ?? process.env.HOME ?? "",
        })
      );
      return;
    }

    if (pathname === "/health") {
      sendJson(response, 200, { ok: true, projectRoot });
      return;
    }

    if (pathname === "/api/meta") {
      sendJson(response, 200, {
        version,
        projectRoot,
        home: home ?? process.env.HOME ?? "",
        platform: process.platform,
      });
      return;
    }

    if (pathname === "/api/skills") {
      sendJson(response, 200, await discoverSkills({ projectRoot, home }));
      return;
    }

    if (pathname === "/api/skills/files" || pathname === "/api/skills/file") {
      const wantsFile = pathname === "/api/skills/file";
      const target = url.searchParams.get("target");
      const scope = url.searchParams.get("scope");
      const name = url.searchParams.get("name");
      if (!target || !scope || !name) {
        sendJson(response, 400, { error: "Faltan los parámetros target, scope y name." });
        return;
      }
      // La validación real de target/scope/name vive en `skill-files.ts`: el
      // cast sólo evita duplicar acá la lista de valores válidos.
      const ref: SkillFileRef = {
        target: target as SkillFileRef["target"],
        scope: scope as SkillFileRef["scope"],
        name,
      };
      const relativePath = wantsFile ? url.searchParams.get("path") : null;
      if (wantsFile && !relativePath) {
        sendJson(response, 400, { error: "Falta el parámetro path." });
        return;
      }

      try {
        const context = { projectRoot, home };
        sendJson(
          response,
          200,
          wantsFile
            ? await readSkillFile(context, ref, relativePath as string)
            : await listSkillFiles(context, ref)
        );
      } catch (error) {
        if (error instanceof SkillFileError) {
          sendJson(response, SKILL_ERROR_STATUS[error.code] ?? 400, {
            error: error.message,
            code: error.code,
          });
          return;
        }
        throw error;
      }
      return;
    }

    if (pathname === "/api/specs") {
      sendJson(response, 200, await buildSpecsTree(projectRoot));
      return;
    }

    if (pathname === "/api/specs/file") {
      const relativePath = url.searchParams.get("path");
      if (!relativePath) {
        sendJson(response, 400, { error: "Falta el parámetro path." });
        return;
      }
      const specsRoot = join(projectRoot, "specs");
      try {
        const file = await readSpecFile({ specsRoot, projectRoot }, relativePath);
        sendJson(response, 200, file);
      } catch (error) {
        if (error instanceof SpecPathError) {
          sendJson(response, SPEC_ERROR_STATUS[error.code] ?? 400, {
            error: error.message,
            code: error.code,
          });
          return;
        }
        throw error;
      }
      return;
    }

    sendText(response, 404, "Not found");
  }

  await new Promise<void>((resolveListen, rejectListen) => {
    const onError = (error: Error): void => {
      server.off("listening", onListening);
      rejectListen(error);
    };
    const onListening = (): void => {
      server.off("error", onError);
      resolveListen();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(options.port ?? 0, HOST);
  });

  const address = server.address() as AddressInfo | null;
  const port = address?.port ?? 0;
  listeningPort = port;
  const url = `http://${HOST}:${port}`;

  const opened = options.open === false ? false : openBrowser(url);
  // A failed opener is not an error: the CLI prints the URL and keeps serving.
  void opened;

  return {
    address: { url, host: HOST, port },
    close: () =>
      new Promise<void>((resolveClose) => {
        server.close(() => resolveClose());
        // Keep-alive sockets would otherwise hold the process open for minutes.
        server.closeAllConnections?.();
      }),
  };
}
