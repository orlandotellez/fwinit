import { spawn, spawnSync } from "node:child_process";

/**
 * Opens a URL in the user's default browser without blocking the CLI.
 *
 * A local GUI is a convenience, never a requirement: when no opener exists
 * (headless shell, container, minimal distro) the caller still prints the URL
 * and the studio keeps serving. The return value means "an opener process was
 * launched", not "a browser opened": spawning is asynchronous, so a missing
 * binary surfaces later as ENOENT and still returns `true` on Linux/macOS.
 * Only a synchronous launch failure (e.g. the Windows `cmd` path) returns
 * `false`. Nothing here throws.
 */
export function openBrowser(url: string): boolean {
  const platform = process.platform;

  if (platform === "darwin") {
    return trySpawn("open", [url]);
  }

  if (platform === "win32") {
    // `start` is a cmd builtin; the empty title argument keeps a quoted URL
    // from being parsed as the window title.
    const result = spawnSync("cmd", ["/c", "start", '""', url], {
      stdio: "ignore",
      windowsHide: true,
    });
    return !result.error && result.status === 0;
  }

  // Linux and BSD: prefer the freedesktop opener, then the historical names.
  for (const command of ["xdg-open", "gio", "sensible-browser", "x-www-browser"]) {
    const args = command === "gio" ? ["open", url] : [url];
    if (trySpawn(command, args)) return true;
  }

  const configured = process.env.BROWSER?.trim();
  if (configured) return trySpawn(configured, [url]);

  return false;
}

/**
 * Launches `command` detached and reports only that the launch was attempted:
 * ENOENT arrives asynchronously, so a missing opener still returns `true`.
 * The caller must not treat the result as proof a browser window exists.
 */
function trySpawn(command: string, args: string[]): boolean {
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
    // ENOENT arrives asynchronously; a missing opener must not crash the studio.
    child.on("error", () => {});
    child.unref();
    return true;
  } catch {
    return false;
  }
}
