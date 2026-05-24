import { describe, expect, it } from "vitest";
import { clampPanelSize, defaultUiPreferences, mergeUiPreferences, serializeUiPreferences } from "../src/model/uiPreferences";

describe("ui preferences", () => {
  it("persists layout preferences with bounded panel sizes", () => {
    const next = mergeUiPreferences(defaultUiPreferences, {
      leftCollapsed: true,
      rightCollapsed: true,
      queuePanelWidth: 9999,
      workspacePanelWidth: 120
    });

    expect(next.leftCollapsed).toBe(true);
    expect(next.rightCollapsed).toBe(true);
    expect(next.queuePanelWidth).toBe(520);
    expect(next.workspacePanelWidth).toBe(520);
  });

  it("serializes only stable preference fields", () => {
    const serialized = serializeUiPreferences({ ...defaultUiPreferences, lastSelectedTaskKey: "task-1" });
    expect(JSON.parse(serialized)).toMatchObject({ schemaVersion: "harness-gui-ui-preferences/v1", lastSelectedTaskKey: "task-1" });
  });

  it("clamps invalid panel sizes", () => {
    expect(clampPanelSize(Number.NaN, 280, 520)).toBe(320);
    expect(clampPanelSize(200, 280, 520)).toBe(280);
    expect(clampPanelSize(800, 280, 520)).toBe(520);
  });
});
