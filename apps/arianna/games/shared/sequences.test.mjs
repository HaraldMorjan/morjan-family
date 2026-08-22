import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSequence,
  pickMissingNumberRound,
  buildLightPath,
  pickLightWindow,
  pickMissingNeighbors,
  buildChant
} from "./sequences.js";

test("buildSequence counts by step within level range", () => {
  assert.deepEqual(buildSequence(2, 1), [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  assert.equal(buildSequence(3, 1).at(-1), 18);
  assert.equal(buildSequence(1, 3).length, 100);
});

test("pickMissingNumberRound skips answers already used this session", () => {
  const first = pickMissingNumberRound(1, 1);
  const second = pickMissingNumberRound(1, 1, [first.answer]);
  assert.notEqual(second.answer, first.answer);
});

test("pickMissingNumberRound hides one number and offers three choices", () => {
  const round = pickMissingNumberRound(2, 1);
  assert.ok(round);
  assert.equal(round.prompt.filter((value) => value === null).length, 1);
  assert.equal(round.choices.length, 3);
  assert.ok(round.choices.includes(round.answer));
});

test("buildLightPath returns a short ordered path", () => {
  const path = buildLightPath(3, 1, 5);
  assert.deepEqual(path, [3, 6, 9, 12, 15]);
});

test("pickLightWindow is six consecutive counts that stay at or under 100", () => {
  const windowValues = pickLightWindow(1);
  assert.equal(windowValues.length, 6);
  assert.ok(windowValues[0] >= 1);
  assert.ok(windowValues[5] <= 100);
  windowValues.forEach((value, index) => {
    if (index === 0) {
      return;
    }
    assert.equal(value, windowValues[index - 1] + 1);
  });
});

test("pickMissingNeighbors is one hole between two neighbors at or under 100", () => {
  const round = pickMissingNeighbors(1);
  assert.ok(round);
  assert.equal(round.before + 1, round.answer);
  assert.equal(round.answer + 1, round.after);
  assert.ok(round.after <= 100);
  assert.deepEqual(round.prompt, [round.before, null, round.after]);
  assert.equal(round.choices.length, 3);
  assert.ok(round.choices.includes(round.answer));
});

test("pickMissingNeighbors skips a used answer and prefers another decade", () => {
  const firstRound = pickMissingNeighbors(1);
  const secondRound = pickMissingNeighbors(1, {
    excludeAnswers: [firstRound.answer]
  });
  assert.notEqual(secondRound.answer, firstRound.answer);
  assert.notEqual(
    Math.floor(secondRound.answer / 10),
    Math.floor(firstRound.answer / 10)
  );
});

test("pickLightWindow for skip-count stays on the chant", () => {
  assert.deepEqual(pickLightWindow(2), [2, 4, 6, 8, 10, 12]);
  assert.deepEqual(pickLightWindow(3), [3, 6, 9, 12, 15, 18]);
  assert.deepEqual(buildChant(2), [2, 4, 6, 8, 10, 12]);
});

test("pickMissingNeighbors for skip-count stays on the chant and includes a by-1s trap", () => {
  const round = pickMissingNeighbors(2);
  assert.ok(round);
  assert.equal(round.before + 2, round.answer);
  assert.equal(round.answer + 2, round.after);
  assert.ok([4, 6, 8, 10].includes(round.answer));
  const onesTrap = round.choices.find(
    (choice) => choice === round.answer - 1 || choice === round.answer + 1
  );
  assert.ok(onesTrap);
});

test("pickLightWindow skips a used start and prefers another decade", () => {
  const firstWindow = pickLightWindow(1);
  const secondWindow = pickLightWindow(1, {
    excludeStarts: [firstWindow[0]]
  });
  assert.notEqual(secondWindow[0], firstWindow[0]);
  assert.notEqual(
    Math.floor(secondWindow[0] / 10),
    Math.floor(firstWindow[0] / 10)
  );
});
