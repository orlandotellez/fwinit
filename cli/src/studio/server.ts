import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { applyInstall, buildInstallPlan, InstallError, resolveInstallInfo } from "./install.js";
import { isRunAgent, isRunScope, RunError, RunManager, type RunErrorCode } from "./run.js";
import { listSkillFiles, readSkillFile, SkillFileError } from "./skill-files.js";
import { buildSpecsTree, readSpecFile, SpecPathError } from "./specs.js";
import { discoverSkills } from "./skills.js";
import type {
  SkillFileRef,
  StudioInstallInfo,
  StudioOpenOptions,
  StudioServer,
} from "./types.js";
import { renderStudioHtml } from "./ui/document.js";
import { openBrowser } from "./open-browser.js";

/** Loopback only: the studio exposes local files and must never leave the host. */
const HOST = "127.0.0.1";

/** The one route that writes. Everything else stays read-only. */
const INSTALL_PATH = "/api/skills/install";

/** Ejecución de una skill: iniciar, consultar por cursor y cancelar (S11/S12). */
const RUN_PATH = "/api/skills/run";
const RUN_CANCEL_PATH = "/api/skills/run/cancel";

/**
 * Largest body the install route accepts. The payload is `{name, token}`; a
 * bigger body is not a bigger install, it is someone else talking.
 */
const MAX_BODY_BYTES = 4096;

/**
 * Un prompt de usuario no es una instalación: puede ser un párrafo largo, pero
 * tampoco es excusa para aceptar un cuerpo sin techo.
 */
const MAX_RUN_BODY_BYTES = 64 * 1024;

/** Status que corresponde a cada error de ejecución. */
const RUN_ERROR_STATUS: Record<RunErrorCode, number> = {
  invalid: 400,
  busy: 409,
  "skill-missing": 404,
  "not-discoverable": 409,
  unknown: 404,
};

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

/** Reads the request body as JSON, bounded by `maxBytes`. */
async function readJsonBody(request: IncomingMessage, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > maxBytes) {
      throw new RequestError(413, "Cuerpo demasiado grande.");
    }
    chunks.push(buffer);
  }
  if (size === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    throw new RequestError(400, "JSON inválido.");
  }
}

/** A request problem that maps straight to a status code. */
class RequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

/**
 * `true` only for a request the studio's own document made.
 *
 * A page on any other origin can still POST to a loopback port, so `Origin`
 * must be [scheme `http`, one of the loopback hostnames the server answers on,
 * and our exact port] — and the accepted hostnames are the same set
 * `isAllowedHost` allows, so opening the studio as `http://localhost:<port>`
 * works exactly like `http://127.0.0.1:<port>`. When the browser sends no
 * `Origin`, its `Sec-Fetch-Site` must say same-origin. Neither header can be
 * forged by a remote page.
 */
function isSameOrigin(request: IncomingMessage, port: number): boolean {
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin.trim() !== "") {
    let parsed: URL;
    try {
      parsed = new URL(origin.trim());
    } catch {
      return false;
    }
    if (parsed.protocol !== "http:") return false;
    // El puerto tiene que ser el nuestro: `http://localhost` a secas no es
    // este servidor, aunque el nombre sea loopback.
    const host = parsed.host.toLowerCase();
    return isOurLoopbackHost(host, port);
  }
  const site = request.headers["sec-fetch-site"];
  return typeof site === "string" && site.trim().toLowerCase() === "same-origin";
}

/** `127.0.0.1:<port>` (and its loopback aliases) for the port we listen on. */
function isOurLoopbackHost(host: string, port: number): boolean {
  if (port <= 0) return false;
  return (
    host === `127.0.0.1:${port}` ||
    host === `localhost:${port}` ||
    host === `[::1]:${port}`
  );
}

/**
 * Starts the studio HTTP server on loopback.
 *
 * Reads are derived from disk on each request, so installing a skill or editing
 * a spec is visible on reload without restarting the CLI. The single write —
 * `POST /api/skills/install` — requires the token rendered into the document
 * plus a same-origin request, and it only ever copies bundle skills into the
 * three agent homes.
 */
export async function startStudio(options: StudioOpenOptions = {}): Promise<StudioServer> {
  const projectRoot = resolve(options.projectRoot ?? process.cwd());
  const version = options.version ?? "0.0.0";
  const home = options.home;
  // El bundle y sus skills se resuelven una vez: son del paquete que corre el
  // studio, no del proyecto abierto, y no cambian mientras el server vive.
  const install: StudioInstallInfo = await resolveInstallInfo(options.bundleRoot);
  const installContext = { projectRoot, home, bundleRoot: options.bundleRoot };
  // Token por arranque: lo lleva el documento y sólo con él se puede escribir.
  // Una página de otro origen puede postear a loopback, pero no leer este token.
  const installToken = randomBytes(16).toString("hex");
  const expectToken = Buffer.from(installToken);
  // El puerto sólo se conoce después de `listen`; el handler lo lee de acá (con
  // `request.socket.localPort` como respaldo) para validar el header `Host`.
  let listeningPort = options.port ?? 0;

  // Un solo run a la vez: el manager es el dueño de los procesos hijos y de su
  // salida numerada (S11/S12). Los binarios son inyectables para los tests.
  const runs = new RunManager({
    projectRoot,
    home,
    agentBinaries: options.agentBinaries,
    maxOutputBytes: options.runMaxOutputBytes,
    cancelGraceMs: options.runCancelGraceMs,
  });

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

  /** `true` when `value` is the token issued for this server start. */
  function tokenMatches(value: unknown): boolean {
    if (typeof value !== "string" || value.length !== installToken.length) return false;
    try {
      return timingSafeEqual(Buffer.from(value), expectToken);
    } catch {
      return false;
    }
  }

  /**
   * Las guardas compartidas por toda escritura del studio (S6.3/S12).
   *
   * Mismo origen, `application/json` y el token del documento, en ese orden:
   * un pedido que falla cualquiera de las tres se rechaza sin tocar nada y
   * devuelve null. El token vive sólo acá, así que ninguna ruta lo reimplementa.
   */
  async function readGuardedJson(
    request: IncomingMessage,
    response: ServerResponse,
    hostPort: number,
    maxBytes: number = MAX_BODY_BYTES
  ): Promise<Record<string, unknown> | null> {
    if (!isSameOrigin(request, hostPort)) {
      sendJson(response, 403, { error: "Origen no permitido." });
      return null;
    }
    const contentType = String(request.headers["content-type"] ?? "");
    if (!/^application\/json\b/i.test(contentType)) {
      sendJson(response, 415, { error: "Se esperaba un cuerpo application/json." });
      return null;
    }

    let body: unknown;
    try {
      body = await readJsonBody(request, maxBytes);
    } catch (error) {
      if (error instanceof RequestError) {
        sendJson(response, error.status, { error: error.message });
        return null;
      }
      throw error;
    }

    const payload =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    if (!tokenMatches(payload.token)) {
      sendJson(response, 403, { error: "Token inválido." });
      return null;
    }
    return payload;
  }

  /** Traduce un `RunError` a su status, sin filtrar el mensaje del producto. */
  function sendRunError(response: ServerResponse, error: RunError): void {
    sendJson(response, RUN_ERROR_STATUS[error.code] ?? 400, {
      error: error.message,
      code: error.code,
    });
  }

  /**
   * The only write in the studio.
   *
   * Four gates run before the filesystem is touched: same origin, JSON content
   * type, the per-start token, and a name inside the bundle. A request that
   * fails any of them is rejected with nothing written.
   */
  async function handleInstallPost(
    request: IncomingMessage,
    response: ServerResponse,
    hostPort: number
  ): Promise<void> {
    const payload = await readGuardedJson(request, response, hostPort);
    if (!payload) return;

    if (typeof payload.name !== "string" || payload.name.trim() === "") {
      sendJson(response, 400, { error: "Falta el parámetro name." });
      return;
    }

    try {
      const result = await applyInstall(installContext, payload.name.trim());
      sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof InstallError) {
        sendJson(response, error.code === "unknown" ? 400 : 409, {
          error: error.message,
          code: error.code,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Arranca una ejecución (S11/S12).
   *
   * El cliente manda `{target, scope, name, agent, prompt}`: nunca una ruta. El
   * directorio de la skill y el `cwd` los resuelve el server.
   */
  async function handleRunStart(
    request: IncomingMessage,
    response: ServerResponse,
    hostPort: number
  ): Promise<void> {
    const payload = await readGuardedJson(request, response, hostPort, MAX_RUN_BODY_BYTES);
    if (!payload) return;

    const agent = payload.agent;
    if (!isRunAgent(agent)) {
      sendJson(response, 400, { error: "Falta el parámetro agent (opencode, pi o gentle-shell)." });
      return;
    }
    const target = payload.target;
    const scope = payload.scope;
    const name = payload.name;
    if (
      !isRunAgent(target) ||
      !isRunScope(scope) ||
      typeof name !== "string" ||
      name.trim() === ""
    ) {
      sendJson(response, 400, { error: "Faltan los parámetros target, scope y name." });
      return;
    }

    try {
      const status = await runs.start({
        agent,
        skill: { target, scope, name: name.trim() },
        prompt: typeof payload.prompt === "string" ? payload.prompt : "",
      });
      sendJson(response, 200, status);
    } catch (error) {
      if (error instanceof RunError) {
        sendRunError(response, error);
        return;
      }
      throw error;
    }
  }

  /** Cancela la ejecución en curso: SIGTERM y escalada a SIGKILL a los 5 s. */
  async function handleRunCancel(
    request: IncomingMessage,
    response: ServerResponse,
    hostPort: number
  ): Promise<void> {
    const payload = await readGuardedJson(request, response, hostPort);
    if (!payload) return;

    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    if (id === "") {
      sendJson(response, 400, { error: "Falta el parámetro id." });
      return;
    }

    const status = await runs.cancel(id);
    if (!status) {
      sendJson(response, 404, { error: "No hay una ejecución con ese id.", code: "unknown" });
      return;
    }
    sendJson(response, 200, status);
  }

  /** Estado de una ejecución con las líneas que siguen al cursor `since`. */
  function handleRunGet(url: URL, pathname: string, response: ServerResponse): void {
    // El id viaja en la ruta (`/api/skills/run/<id>`) o en el query (`?id=`).
    const fromPath = pathname.startsWith(`${RUN_PATH}/`)
      ? pathname.slice(RUN_PATH.length + 1)
      : "";
    const id = (fromPath || url.searchParams.get("id") || "").trim();
    if (id === "") {
      sendJson(response, 400, { error: "Falta el parámetro id." });
      return;
    }
    const sinceRaw = url.searchParams.get("since") ?? "0";
    const since = Number.parseInt(sinceRaw, 10);
    if (!Number.isFinite(since) || since < 0) {
      sendJson(response, 400, { error: "El parámetro since debe ser un número entero." });
      return;
    }

    const status = runs.poll(id, since);
    if (!status) {
      sendJson(response, 404, { error: "No hay una ejecución con ese id.", code: "unknown" });
      return;
    }
    sendJson(response, 200, status);
  }

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const method = request.method ?? "GET";

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

    const isRead = method === "GET" || method === "HEAD";
    const isInstallRoute = pathname === INSTALL_PATH;
    const isCancelRoute = pathname === RUN_CANCEL_PATH;
    const isRunStatusRoute = pathname === RUN_PATH || pathname.startsWith(`${RUN_PATH}/`);
    // Sólo estas rutas tienen POST; el resto sigue siendo GET/HEAD y 405.
    const isWriteRoute = isInstallRoute || pathname === RUN_PATH || isCancelRoute;
    // Cancelar no tiene lectura: GET y HEAD ahí también son 405.
    const allowed = isCancelRoute
      ? method === "POST"
      : isRead || (isWriteRoute && method === "POST");
    if (!allowed) {
      const allow = isCancelRoute
        ? "POST"
        : isWriteRoute || isRunStatusRoute
          ? "GET, HEAD, POST"
          : "GET, HEAD";
      response.setHeader("Allow", allow);
      sendJson(response, 405, { error: "Método no permitido." });
      return;
    }

    if (pathname === "/" || pathname === "/index.html") {
      sendHtml(
        response,
        renderStudioHtml({
          version,
          projectRoot,
          home: home ?? process.env.HOME ?? "",
          install,
          installToken,
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
        // Sin token: el token viaja en el documento, no en un GET reutilizable.
        install,
      });
      return;
    }

    if (pathname === INSTALL_PATH) {
      if (method === "POST") {
        await handleInstallPost(request, response, hostPort);
        return;
      }
      const name = url.searchParams.get("name");
      if (!name) {
        sendJson(response, 400, { error: "Falta el parámetro name." });
        return;
      }
      try {
        sendJson(response, 200, await buildInstallPlan(installContext, name));
      } catch (error) {
        if (error instanceof InstallError) {
          sendJson(response, error.code === "unknown" ? 400 : 409, {
            error: error.message,
            code: error.code,
          });
          return;
        }
        throw error;
      }
      return;
    }

    if (pathname === RUN_CANCEL_PATH) {
      await handleRunCancel(request, response, hostPort);
      return;
    }

    if (pathname === RUN_PATH || pathname.startsWith(`${RUN_PATH}/`)) {
      if (method === "POST") {
        await handleRunStart(request, response, hostPort);
        return;
      }
      handleRunGet(url, pathname, response);
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
    close: () => {
      // Cerrar el server mata el run en curso (S12): no queda un agente
      // escribiendo en el proyecto después de que el usuario cerró la vista.
      runs.dispose();
      return new Promise<void>((resolveClose) => {
        server.close(() => resolveClose());
        // Keep-alive sockets would otherwise hold the process open for minutes.
        server.closeAllConnections?.();
      });
    },
  };
}
