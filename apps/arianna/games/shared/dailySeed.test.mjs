import assert from "node:assert/strict";
import test from "node:test";
import { createDailyRng, pickDailyPack, getDayKey } from "./dailySeed.js";

test("same day + mission yields the same pack", () => {
  const items = ["a", "b", "c", "d", "e", "f"];
  const first = pickDailyPack(items, 4, "skye-silabas-l1", "2026-07-26");
  const second = pickDailyPack(items, 4, "skye-silabas-l1", "2026-07-26");
  assert.deepEqual(first, second);
  assert.equal(first.length, 4);
});

test("different days yield different order or selection", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const monday = pickDailyPack(items, 5, "skye-silabas-l1", "2026-07-26");
  const tuesday = pickDailyPack(items, 5, "skye-silabas-l1", "2026-07-27");
  assert.notDeepEqual(monday, tuesday);
});

test("createDailyRng is deterministic", () => {
  const first = createDailyRng("mission-a", "2026-07-26");
  const second = createDailyRng("mission-a", "2026-07-26");
  assert.equal(first(), second());
  assert.equal(typeof getDayKey(), "string");
});
