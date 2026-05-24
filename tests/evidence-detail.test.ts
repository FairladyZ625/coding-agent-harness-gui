import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTaskDetail, getTaskMaterial, scanProject } from "../src/server/scanner";
import { assertIndexSafePayload, containsRawPrivatePayload } from "../src/model/harnessGui";

let projectRoot = "";
let taskDir = "";

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gui-project-"));
  taskDir = path.join(projectRoot, ".harness-private", "docs", "09-PLANNING", "TASKS", "2026-05-24-private-task");
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, "task_plan.md"), "# Private Task\n\nTask Contract: harness-task/v1\n\n## 步骤\n\nDo private work.\n");
  fs.writeFileSync(path.join(taskDir, "progress.md"), "# Progress\n\n## 状态：in_progress\n");
  fs.writeFileSync(path.join(taskDir, "review.md"), "# Review\n\nNo open P0/P1.\n");
  fs.writeFileSync(path.join(taskDir, "findings.md"), "# Findings\n\nPRIVATE:.harness-private raw finding marker.\n");
});

afterEach(() => {
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

describe("targeted evidence detail", () => {
  it("keeps global scan payload index-safe while detail exposes scoped materials", async () => {
    const project = { id: "private-project", displayName: "Private Project", path: projectRoot };
    const scan = await scanProject(project);

    expect(() => assertIndexSafePayload(scan.tasks)).not.toThrow();
    expect(JSON.stringify(scan.tasks)).not.toContain(projectRoot);

    const detail = await getTaskDetail([project], "private-project", "2026-05-24-private-task");
    expect(detail?.materials.map((material) => material.name)).toContain("task_plan.md");
    expect(JSON.stringify(detail)).not.toContain(projectRoot);
  });

  it("returns a redacted material snippet only for the requested task material", async () => {
    const project = { id: "private-project", displayName: "Private Project", path: projectRoot };
    const material = await getTaskMaterial([project], "private-project", "2026-05-24-private-task", "findings.md");

    expect(material?.name).toBe("findings.md");
    expect(material?.snippet).toContain("[redacted-private-marker]");
    expect(containsRawPrivatePayload(material)).toBe(false);
  });
});
