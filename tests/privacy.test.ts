import { describe, expect, it } from "vitest";
import { createSyntheticPortfolio } from "../src/fixtures/portfolio";
import { assertIndexSafePayload, containsRawPrivatePayload } from "../src/model/harnessGui";

describe("privacy redaction", () => {
  it("keeps global portfolio payload index-safe", () => {
    const snapshot = createSyntheticPortfolio(15);
    expect(containsRawPrivatePayload(snapshot)).toBe(false);
    expect(() => assertIndexSafePayload(snapshot)).not.toThrow();
  });

  it("rejects raw private markdown markers in global payloads", () => {
    expect(() =>
      assertIndexSafePayload({
        content: "Task Contract: harness-task/v1\n## 步骤\nPRIVATE:.harness-private raw"
      })
    ).toThrow(/raw private content/);
  });
});
