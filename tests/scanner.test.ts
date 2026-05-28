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
      const archiveRoot = path.join(projectRoot, "docs", "09-PLANNING", "TASKS", "archived-task");
      fs.mkdirSync(archiveRoot, { recursive: true });
      fs.writeFileSync(path.join(archiveRoot, "task_plan.md"), [
        "# Archived Task",
        "",
        "Public fixture task.",
        "",
        "## Task Tombstone",
        "",
        "| Field | Value |",
        "| --- | --- |",
        "| State | archived |",
        "| Reason | release closeout |",
        "| Archived By | Release Manager <release@example.invalid> |",
        "| Archived At | 2026-05-28T10:10:10.000Z |",
        "| Review Confirmed By | Release Reviewer |",
        "| Review Confirmed At | 2026-05-28T09:59:00.000Z |",
        "| Review Confirmation ID | HRC-20260528095900 |",
        "| Release Package | coding-agent-harness/governance/releases/1.0.5/INDEX.md |",
        "| Retention Bucket | release:1.0.5 |",
        ""
      ].join("\n"));
      fs.writeFileSync(path.join(archiveRoot, "progress.md"), "status: done\n");
      fs.writeFileSync(path.join(archiveRoot, "review.md"), "approved: no open P0 or P1 findings.\n");

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
      const archived = snapshot.tasks.find((task) => task.taskKey === "archived-task");
      expect(archived?.archiveState).toBe("archived");
      expect(archived?.archiveBucket).toBe("release:1.0.5");
      expect(archived?.archivedBy).toBe("Release Manager <release@example.invalid>");
      expect(archived?.reviewConfirmedBy).toBe("Release Reviewer");
      expect(archived?.reviewConfirmationId).toBe("HRC-20260528095900");
      expect(archived?.releasePackage).toBe("coding-agent-harness/governance/releases/1.0.5/INDEX.md");
      expect(archived?.queues).toEqual(["archived"]);
      expect(snapshot.portfolio.queueCounts.archived).toBe(1);
      expect(snapshot.queues.some((item) => item.queue === "archived" && item.taskKey === "archived-task")).toBe(true);
    } finally {
      fs.rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
