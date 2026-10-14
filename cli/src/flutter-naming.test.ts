import { describe, expect, test } from "bun:test";
import {
  FLUTTER_ORG_DEFAULT,
  buildBundleId,
  checkOrg,
  isValidOrg,
  normalizeOrg,
  packageToPath,
  toDartPackageName,
} from "./flutter-naming.js";

const ORG_ERROR =
  "Organización inválida. Usá formato reverse-domain en minúsculas, por ejemplo com.example o ar.miempresa";

describe("FLUTTER_ORG_DEFAULT", () => {
  test("is the neutral com.example fallback", () => {
    expect(FLUTTER_ORG_DEFAULT).toBe("com.example");
  });
});

describe("toDartPackageName", () => {
  test.each([
    ["mi-app", "mi_app"],
    ["Mi App", "mi_app"],
    ["Mi__App", "mi_app"],
    ["my.app", "my_app"],
    ["_foo_", "foo"],
    ["3d-app", "app_3d_app"],
    ["---", "app"],
    ["   ", "app"],
    ["class", "class_app"],
    ["switch", "switch_app"],
    ["flutter", "flutter_app"],
    ["flutter_test", "flutter_test_app"],
    ["dio", "dio_app"],
    ["Mi-App-2", "mi_app_2"],
  ])("maps %p to %p", (input, expected) => {
    expect(toDartPackageName(input)).toBe(expected);
  });

  test("never produces an empty, digit-leading or keyword name", () => {
    expect(toDartPackageName("")).toBe("app");
    expect(toDartPackageName("0")).toBe("app_0");
    expect(toDartPackageName("if")).toBe("if_app");
    expect(toDartPackageName("json_serializable")).toBe(
      "json_serializable_app",
    );
  });

  test("reserves the template's own dependency names too", () => {
    expect(toDartPackageName("go_router")).toBe("go_router_app");
    expect(toDartPackageName("Flutter Riverpod")).toBe(
      "flutter_riverpod_app",
    );
    expect(toDartPackageName("sky_engine")).toBe("sky_engine_app");
    expect(toDartPackageName("my_app")).toBe("my_app");
  });
});

describe("normalizeOrg", () => {
  test("trims and lowercases", () => {
    expect(normalizeOrg("  AR.MiEmpresa ")).toBe("ar.miempresa");
  });
});

describe("isValidOrg", () => {
  test.each([
    ["com.example", true],
    ["ar.miempresa", true],
    ["com.example_app", true],
    ["com", false],
    ["com.", false],
    [".com", false],
    ["com..example", false],
    ["com.exa-mple", false],
    ["com.3example", false],
    ["com.Example", false],
  ])("validates normalized %p as %p", (value, expected) => {
    expect(isValidOrg(value)).toBe(expected);
  });
});

describe("checkOrg", () => {
  test("accepts a mixed-case org by normalizing first", () => {
    expect(checkOrg("AR.MiEmpresa")).toBe(true);
  });

  test("returns the localized error message for an invalid org", () => {
    expect(checkOrg("com")).toBe(ORG_ERROR);
  });
});

describe("buildBundleId", () => {
  test("joins org and dart package name", () => {
    expect(buildBundleId("ar.miempresa", "mi_app")).toBe(
      "ar.miempresa.mi_app",
    );
  });
});

describe("packageToPath", () => {
  test("turns dot segments into path segments", () => {
    expect(packageToPath("ar.miempresa.mi_app")).toBe("ar/miempresa/mi_app");
  });
});
