import { describe, expect, it } from "vitest";
import { createSyntheticPortfolio, freshReviewFixture, staleReviewFixture } from "../src/fixtures/portfolio";
import { validatePortfolioSnapshot } from "../src/model/harnessGui";

describe("harness-gui/v1 schema fixtures", () => {
  it("validates the 15-project synthetic portfolio", () => {
    const snapshot = createSyntheticPortfolio(15);
    expect(snapshot.projects).toHaveLength(15);
    expect(snapshot.portfolio.taskCount).toBeGreaterThanOrEqual(45);
    expect(validatePortfolioSnapshot(snapshot)).toEqual([]);
  });

  it("covers fresh and stale review fixtures", () => {
    expect(freshReviewFixture().reviewGate.canConfirm).toBe(true);
    expect(staleReviewFixture().reviewGate.canConfirm).toBe(false);
  });
});
