import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPortfolio } from "../src/server/scanner";
import { assertIndexSafePayload, validatePortfolioSnapshot } from "../src/model/harnessGui";

describe("local scanner", () => {
  it("builds an index-safe portfolio from a public docs project", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "harness-gui-scanner-"));
    try {
      const taskRoot = path.join(projectRoot, "docs", "09-PLANNING", "TASKS", "sample-task");
      fs.mkdirSync(taskRoot, { recursive: true });
      fs.writeFileSync(path.join(taskRoot, "task_plan.md"), "# Sample Task\n\nPublic fixture task.\n");
      fs.writeFileSync(path.join(taskRoot, "progress.md"), "status: active\n\nLesson candidate noted.\n");
      fs.writeFileSync(path.join(taskRoot, "review.md"), "approved: no open P0 or P1 findings.\n");

      const snapshot = await buildPortfolio([
        {
          id: "fixture-project",
          displayName: "Fixture Project",
          path: projectRoot
        }
      ]);

      expect(snapshot.projects.length).toBeGreaterThanOrEqual(1);
      expect(snapshot.tasks.length).toBeGreaterThan(0);
      expect(validatePortfolioSnapshot(snapshot)).toEqual([]);
      expect(() => assertIndexSafePayload(snapshot)).not.toThrow();
      expect(JSON.stringify(snapshot)).not.toContain(".harness-private");
      expect(snapshot.tasks.every((task) => task.title === task.taskKey)).toBe(true);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
