import { describe, expect, it } from "vitest";
import { freshReviewFixture, staleReviewFixture } from "../src/fixtures/portfolio";
import { buildTaskActions, filterActionsForPalette, matchesActionShortcut } from "../src/model/actions";

describe("action model", () => {
  it("normalizes task actions for buttons and command palette", () => {
    const actions = buildTaskActions(freshReviewFixture());
    const confirm = actions.find((action) => action.id === "review-confirm");

    expect(confirm).toMatchObject({ status: "preview-only", shortcut: "mod+enter" });
    expect(filterActionsForPalette(actions, "confirm").map((action) => action.id)).toEqual(["review-confirm"]);
  });

  it("marks stale review confirmations as disabled with a reason", () => {
    const actions = buildTaskActions(staleReviewFixture());
    const confirm = actions.find((action) => action.id === "review-confirm");

    expect(confirm).toMatchObject({ status: "stale", enabled: false });
    expect(confirm?.reason).toMatch(/refresh/i);
  });

  it("matches modifier shortcuts including shift and enter", () => {
    expect(matchesActionShortcut("mod+shift+c", { key: "C", mod: true, shift: true })).toBe(true);
    expect(matchesActionShortcut("mod+shift+c", { key: "c", mod: true, shift: false })).toBe(false);
    expect(matchesActionShortcut("mod+enter", { key: "Enter", mod: true, shift: false })).toBe(true);
  });
});
