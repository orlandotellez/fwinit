/**
 * Pure naming helpers for the Flutter template: derive the Dart package name,
 * org/bundle id and package path from the user-typed project name.
 */

export const FLUTTER_ORG_DEFAULT = "com.example";

/** Dart reserved words, declaration keywords and built-in identifiers. */
const DART_KEYWORDS: ReadonlySet<string> = new Set([
  "abstract",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "covariant",
  "default",
  "deferred",
  "do",
  "dynamic",
  "else",
  "enum",
  "export",
  "extends",
  "extension",
  "external",
  "factory",
  "final",
  "finally",
  "for",
  "get",
  "hide",
  "if",
  "implements",
  "import",
  "in",
  "interface",
  "is",
  "late",
  "library",
  "mixin",
  "new",
  "on",
  "operator",
  "part",
  "required",
  "rethrow",
  "return",
  "set",
  "show",
  "static",
  "super",
  "switch",
  "sync",
  "this",
  "throw",
  "try",
  "typedef",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);

/** Packages shipped with the Flutter SDK. */
const FLUTTER_SDK_PACKAGES: ReadonlySet<string> = new Set([
  "flutter",
  "flutter_test",
  "flutter_localizations",
  "flutter_web_plugins",
  "sky_engine",
]);

/** Direct dependencies declared by the Flutter template. */
const TEMPLATE_DEPENDENCIES: ReadonlySet<string> = new Set([
  "cupertino_icons",
  "flutter_riverpod",
  "go_router",
  "dio",
  "freezed_annotation",
  "json_annotation",
  "shared_preferences",
  "flutter_secure_storage",
  "logger",
  "intl",
  "flutter_lints",
  "build_runner",
  "freezed",
  "json_serializable",
  "mocktail",
]);

/** Names that cannot be used as the Dart package name of the generated app. */
const RESERVED_DART_PACKAGE_NAMES: readonly ReadonlySet<string>[] = [
  DART_KEYWORDS,
  FLUTTER_SDK_PACKAGES,
  TEMPLATE_DEPENDENCIES,
];

function isReservedDartPackageName(name: string): boolean {
  return RESERVED_DART_PACKAGE_NAMES.some((reserved) => reserved.has(name));
}

/** snake_case Dart package name derived from the user-typed project name. */
export function toDartPackageName(projectName: string): string {
  let name = projectName.trim().toLowerCase();

  // Every run of separators becomes a single underscore.
  name = name.replace(/[-_.\s]+/g, "_");
  // Anything that is not a valid package-name character is dropped.
  name = name.replace(/[^a-z0-9_]/g, "");
  // Collapse repeated underscores and strip the edges.
  name = name.replace(/_+/g, "_").replace(/^_+|_+$/g, "");

  if (name === "") {
    return "app";
  }

  if (!/^[a-z]/.test(name)) {
    name = `app_${name}`;
  }

  if (isReservedDartPackageName(name)) {
    name = `${name}_app`;
  }

  return name;
}

/** trim + lowercase. */
export function normalizeOrg(org: string): string {
  return org.trim().toLowerCase();
}

/** true only when the ALREADY NORMALIZED value is a valid reverse-domain. */
export function isValidOrg(org: string): boolean {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(org);
}

/** inquirer-style validator: normalize + validate, returns true or the error message. */
export function checkOrg(value: string): true | string {
  if (isValidOrg(normalizeOrg(value))) {
    return true;
  }

  return "Organización inválida. Usá formato reverse-domain en minúsculas, por ejemplo com.example o ar.miempresa";
}

/** `${org}.${dartName}` */
export function buildBundleId(org: string, dartName: string): string {
  return `${org}.${dartName}`;
}

/** "ar.miempresa.mi_app" -> "ar/miempresa/mi_app" */
export function packageToPath(packageId: string): string {
  return packageId.split(".").join("/");
}
