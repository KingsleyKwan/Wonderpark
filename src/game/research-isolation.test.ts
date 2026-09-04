import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isStarterBlueprint, startingUnlocked } from "./catalog.ts";

describe("research stays on one park", () => {
  it("startingUnlocked returns a copy, never the shared starter list", () => {
    const a = startingUnlocked();
    const b = startingUnlocked();
    assert.notEqual(a, b);
    a.push("sky-ring");
    assert.equal(b.includes("sky-ring"), false);
    assert.equal(startingUnlocked().includes("sky-ring"), false);
  });

  it("starter rides are not research targets", () => {
    assert.equal(isStarterBlueprint("teacup-tilt"), true);
    assert.equal(isStarterBlueprint("wonder-round"), true);
    assert.equal(isStarterBlueprint("sky-ring"), false);
    assert.equal(isStarterBlueprint("custom-coaster"), false);
  });
});
