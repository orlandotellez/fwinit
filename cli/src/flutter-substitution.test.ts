import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { existsSync } from "fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "fs/promises";
import { tmpdir } from "os";
import { basename, extname, join } from "path";
import { copyTemplate, substituteTemplate } from "./downloader.js";
import { FLUTTER_ORG_DEFAULT } from "./flutter-naming.js";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const FLUTTER_TEMPLATE = join(REPO_ROOT, "templates", "FLUTTER");
const PROJECT_NAME = "mi-app";
const ORG = "ar.miempresa";
const PNG_REL = "android/app/src/main/res/mipmap-mdpi/ic_launcher.png";

// Same extension whitelist as the implementation: only these files are ever
// rewritten, so only these files must be free of the template identity.
const TEXT_EXTENSIONS = new Set([
  ".dart",
  ".arb",
  ".yaml",
  ".yml",
  ".json",
  ".kt",
  ".kts",
  ".gradle",
  ".xml",
  ".plist",
  ".pbxproj",
  ".xcconfig",
  ".xcscheme",
  ".xcsettings",
  ".xcworkspacedata",
  ".storyboard",
  ".xib",
  ".swift",
  ".h",
  ".cpp",
  ".cc",
  ".cmake",
  ".txt",
  ".rc",
  ".properties",
  ".manifest",
  ".md",
  ".html",
  ".gitignore",
  ".metadata",
  ".iml",
  ".sh",
]);

const TEXT_BASENAMES = new Set([
  "Makefile",
  "LICENSE",
  "Podfile",
  ".gitignore",
  ".metadata",
]);

function isTextCandidate(filePath: string): boolean {
  if (TEXT_EXTENSIONS.has(extname(filePath).toLowerCase())) {
    return true;
  }

  return TEXT_BASENAMES.has(basename(filePath));
}

async function collectTextFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (isTextCandidate(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function relativeTo(dir: string, filePath: string): string {
  return filePath.slice(dir.length + 1).split("\\").join("/");
}

async function sha256(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

describe("substituteTemplate(FLUTTER)", () => {
  let dest: string;
  let pngHashBefore: string;

  const read = (relativePath: string): Promise<string> =>
    readFile(join(dest, relativePath), "utf-8");

  beforeAll(async () => {
    dest = await mkdtemp(join(tmpdir(), "fwinit-flutter-"));
    await copyTemplate(FLUTTER_TEMPLATE, dest);
    pngHashBefore = await sha256(join(dest, PNG_REL));
    await substituteTemplate(dest, PROJECT_NAME, "FLUTTER", { org: ORG });
  }, 600_000);

  afterAll(async () => {
    await rm(dest, { recursive: true, force: true });
  }, 60_000);

  test("leaves no template identity token in any text file", async () => {
    const offenders: string[] = [];

    for (const filePath of await collectTextFiles(dest)) {
      const content = await readFile(filePath, "utf-8");
      if (content.includes("fwiflu") || content.includes("mx.apto")) {
        offenders.push(relativeTo(dest, filePath));
      }
    }

    expect(offenders).toEqual([]);
  });

  test("renames the Dart package in pubspec.yaml", async () => {
    expect(await read("pubspec.yaml")).toContain("name: mi_app");
  });

  test("localizes the app title in both ARB files", async () => {
    expect(await read("lib/l10n/arb/app_en.arb")).toContain(
      '"appTitle": "mi-app"'
    );
    expect(await read("lib/l10n/arb/app_es.arb")).toContain(
      '"appTitle": "mi-app"'
    );
  });

  test("localizes the generated English localizations", async () => {
    expect(await read("lib/l10n/gen/app_localizations_en.dart")).toContain(
      "String get appTitle => 'mi-app';"
    );
  });

  test("uses the display name for every app config flavor", async () => {
    const config = await read("lib/core/config/app_config.dart");
    expect(config).toContain("'mi-app'");
    expect(config).toContain("'mi-app (Staging)'");
    expect(config).toContain("'mi-app (Dev)'");
  });

  test("rewrites Dart package imports in lib/main.dart", async () => {
    expect(await read("lib/main.dart")).toContain(
      "import 'package:mi_app/app/app.dart';"
    );
  });

  test("updates the Android namespace and applicationId", async () => {
    const gradle = await read("android/app/build.gradle.kts");
    expect(gradle).toContain('namespace = "ar.miempresa.mi_app"');
    expect(gradle).toContain('applicationId = "ar.miempresa.mi_app"');
  });

  test("moves MainActivity.kt into the new package directory", async () => {
    const moved = join(
      dest,
      "android/app/src/main/kotlin/ar/miempresa/mi_app/MainActivity.kt"
    );
    expect(existsSync(moved)).toBe(true);
    const activity = await readFile(moved, "utf-8");
    // MainActivity.kt es Kotlin: `package a.b.c` sin `;` (el `;` es opcional).
    expect(/^package ar\.miempresa\.mi_app;?$/m.test(activity)).toBe(true);
    expect(existsSync(join(dest, "android/app/src/main/kotlin/mx"))).toBe(false);
  });

  test("keeps GeneratedPluginRegistrant.java in place", async () => {
    const registrant = join(
      dest,
      "android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java"
    );
    expect(existsSync(registrant)).toBe(true);
    expect(await readFile(registrant, "utf-8")).toContain(
      "package io.flutter.plugins;"
    );
  });

  test("updates the Android app label", async () => {
    expect(await read("android/app/src/main/AndroidManifest.xml")).toContain(
      'android:label="mi-app"'
    );
  });

  test("updates the iOS display name", async () => {
    const plist = await read("ios/Runner/Info.plist");
    const occurrences = plist.split("<string>mi-app</string>").length - 1;
    expect(occurrences).toBe(2);
  });

  test("updates the iOS bundle identifier", async () => {
    expect(await read("ios/Runner.xcodeproj/project.pbxproj")).toContain(
      "PRODUCT_BUNDLE_IDENTIFIER = ar.miempresa.mi_app;"
    );
  });

  test("updates the web title and manifest", async () => {
    expect(await read("web/index.html")).toContain("<title>mi-app</title>");

    const manifest = await read("web/manifest.json");
    expect(manifest).toContain('"name": "mi-app"');
    expect(manifest).toContain('"short_name": "mi-app"');
  });

  test("splits display and internal names in Runner.rc", async () => {
    const rc = await read("windows/runner/Runner.rc");
    expect(rc).toContain('VALUE "ProductName", "mi-app" "\\0"');
    expect(rc).toContain('VALUE "InternalName", "mi_app" "\\0"');
    expect(rc).toContain('VALUE "OriginalFilename", "mi_app.exe" "\\0"');
  });

  test("updates the Windows project and binary name", async () => {
    expect(await read("windows/CMakeLists.txt")).toContain(
      "project(mi_app LANGUAGES CXX)"
    );
  });

  test("updates the Linux binary name and application id", async () => {
    const cmake = await read("linux/CMakeLists.txt");
    expect(cmake).toContain('set(BINARY_NAME "mi_app")');
    expect(cmake).toContain('set(APPLICATION_ID "ar.miempresa.mi_app")');
  });

  test("updates the macOS product name and bundle id", async () => {
    const xcconfig = await read("macos/Runner/Configs/AppInfo.xcconfig");
    expect(xcconfig).toContain("PRODUCT_NAME = mi_app");
    expect(xcconfig).toContain(
      "PRODUCT_BUNDLE_IDENTIFIER = ar.miempresa.mi_app"
    );
  });

  test("keeps PNG assets byte-identical", async () => {
    expect(await sha256(join(dest, PNG_REL))).toBe(pngHashBefore);
  });
});

describe("substituteTemplate(FLUTTER) default org", () => {
  test("falls back to FLUTTER_ORG_DEFAULT when org is omitted", async () => {
    const base = await mkdtemp(join(tmpdir(), "fwinit-org-default-"));

    try {
      await mkdir(join(base, "android/app"), { recursive: true });
      await writeFile(
        join(base, "android/app/build.gradle.kts"),
        'namespace = "mx.apto.fwiflu"\napplicationId = "mx.apto.fwiflu"\n'
      );

      await substituteTemplate(base, PROJECT_NAME, "FLUTTER");

      const gradle = await readFile(
        join(base, "android/app/build.gradle.kts"),
        "utf-8"
      );
      expect(gradle).toContain(
        `namespace = "${FLUTTER_ORG_DEFAULT}.mi_app"`
      );
      expect(gradle).toContain(
        `applicationId = "${FLUTTER_ORG_DEFAULT}.mi_app"`
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});

describe("cleanTemplate via copyTemplate", () => {
  test("drops template lock files but keeps pubspec.yaml", async () => {
    const base = await mkdtemp(join(tmpdir(), "fwinit-locks-"));

    try {
      const source = join(base, "source");
      const destination = join(base, "destination");
      await mkdir(source, { recursive: true });
      await mkdir(destination, { recursive: true });

      await writeFile(join(source, "pubspec.lock"), "# pub lock\n");
      await writeFile(join(source, "package-lock.json"), "{}\n");
      await writeFile(join(source, "pubspec.yaml"), "name: fwiflu\n");

      await copyTemplate(source, destination);

      expect(existsSync(join(destination, "pubspec.lock"))).toBe(false);
      expect(existsSync(join(destination, "package-lock.json"))).toBe(false);
      expect(existsSync(join(destination, "pubspec.yaml"))).toBe(true);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
