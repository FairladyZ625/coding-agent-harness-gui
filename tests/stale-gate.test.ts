import { describe, expect, it } from "vitest";
import { staleReviewFixture } from "../src/fixtures/portfolio";

describe("stale review confirmation gate", () => {
  it("does not allow stale review confirmation", () => {
    const stale = staleReviewFixture();
    expect(stale.reviewGate.canConfirm).toBe(false);
    expect(stale.staleState).toBe("stale");
  });
});
