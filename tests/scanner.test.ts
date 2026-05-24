import { describe, expect, it } from "vitest";
import { buildPortfolio, defaultProjects } from "../src/server/scanner";
import { assertIndexSafePayload, validatePortfolioSnapshot } from "../src/model/harnessGui";

describe("local scanner", () => {
  it("builds an index-safe portfolio from the default project", async () => {
    const snapshot = await buildPortfolio(defaultProjects());
    expect(snapshot.projects.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.tasks.length).toBeGreaterThan(0);
    expect(validatePortfolioSnapshot(snapshot)).toEqual([]);
    expect(() => assertIndexSafePayload(snapshot)).not.toThrow();
    expect(JSON.stringify(snapshot)).not.toContain(".harness-private");
    expect(snapshot.tasks.every((task) => task.title === task.taskKey)).toBe(true);
  });
});
