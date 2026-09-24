import assert from "node:assert/strict";
import test from "node:test";
import { resolveMissionForGame } from "./missions.js";

test("resolves a live mission with its canonical game setup", () => {
  const params = new URLSearchParams(
    "mission=rumi-step2-l1&step=2&level=1&qr=1"
  );

  assert.equal(resolveMissionForGame("counting", params)?.id, "rumi-step2-l1");
});

test("rejects a mission from another game", () => {
  const params = new URLSearchParams(
    "mission=rumi-step3-l1&mode=match&set=animals"
  );

  assert.equal(resolveMissionForGame("english", params), null);
});

test("rejects a mission paired with easier gameplay parameters", () => {
  const params = new URLSearchParams(
    "mission=rumi-step3-l1&step=1&level=1"
  );

  assert.equal(resolveMissionForGame("counting", params), null);
});

test("rejects unknown and parked mission ids", () => {
  const unknown = new URLSearchParams(
    "mission=custom-daily-reward&mode=match&set=animals"
  );
  const parked = new URLSearchParams(
    "mission=skye-frases-l1&activity=frases&level=1"
  );

  assert.equal(resolveMissionForGame("english", unknown), null);
  assert.equal(resolveMissionForGame("reading", parked), null);
});
