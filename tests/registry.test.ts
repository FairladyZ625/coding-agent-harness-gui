import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addProjectEntry,
  loadRegistryFromFile,
  removeProjectEntry,
  sanitizeRegistry,
  saveRegistryToFile,
  setProjectEnabled
} from "../src/server/registry";

let tempDir = "";
let registryPath = "";

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gui-registry-"));
  registryPath = path.join(tempDir, "projects.json");
});

afterEach(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("project registry", () => {
  it("adds, toggles, removes, and persists project entries", () => {
    const first = addProjectEntry([], path.join(tempDir, "Alpha Harness"));
    expect(first).toMatchObject([{ id: "alpha-harness", displayName: "Alpha Harness", enabled: true }]);

    const disabled = setProjectEnabled(first, "alpha-harness", false);
    expect(disabled[0].enabled).toBe(false);

    saveRegistryToFile(registryPath, disabled);
    expect(loadRegistryFromFile(registryPath, []).at(0)?.enabled).toBe(false);

    const removed = removeProjectEntry(disabled, "alpha-harness");
    expect(removed).toEqual([]);
  });

  it("returns a sanitized view without absolute local paths", () => {
    const projects = addProjectEntry([], path.join(tempDir, "Private Harness"));
    const sanitized = sanitizeRegistry(projects);

    expect(sanitized[0].path).toBe("project:private-harness");
    expect(JSON.stringify(sanitized)).not.toContain(tempDir);
    expect(sanitized[0].dataClass).toBe("index-safe");
  });
});
