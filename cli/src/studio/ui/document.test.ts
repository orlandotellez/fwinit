import { describe, expect, test } from "bun:test";
import { renderStudioHtml } from "./document.js";
import { CLIENT_JS } from "./client.js";

/**
 * The studio shell is a string, so what can be pinned here is the contract the
 * browser relies on: the mobile navigation exists in the markup, the initial
 * view is Specs, and the client owns the drawer wiring.
 */
describe("studio document", () => {
  const html = renderStudioHtml({ version: "1.2.3", projectRoot: "/tmp/demo" });

  test("renders the mobile navigation controls", () => {
    expect(html).toContain("data-drawer-toggle");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("data-drawer-scrim");
    expect(html).toContain("nav-bars");
  });

  test("opens on Specs, with the tab and the panel in agreement", () => {
    expect(html).toContain('data-view="specs" aria-selected="true"');
    expect(html).toContain('data-view-panel="specs" data-active="true"');
    expect(html).toContain('data-view-panel="skills" data-active="false"');
  });

  test("the client owns the drawer wiring", () => {
    expect(CLIENT_JS).toContain("function setDrawer(");
    expect(CLIENT_JS).toContain("closeDrawer();");
    expect(CLIENT_JS).toContain("body.dataset.drawer = 'open'");
  });
});
