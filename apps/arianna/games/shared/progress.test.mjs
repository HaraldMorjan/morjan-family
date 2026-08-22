import assert from "node:assert/strict";
import test from "node:test";
import {
  addStars,
  spendStars,
  markMissionDone,
  isMissionDone,
  pickReviewItems,
  createUniquePicker,
  loadProgress,
  saveProgress
} from "./progress.js";

const memoryStore = new Map();

const installMemoryStorage = () => {
  globalThis.localStorage = {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, value) => {
      memoryStore.set(key, String(value));
    },
    removeItem: (key) => {
      memoryStore.delete(key);
    }
  };
};

test("star wallet adds and spends correctly", () => {
  memoryStore.clear();
  installMemoryStorage();
  saveProgress({
    version: 1,
    stars: 0,
    stickers: [],
    streak: { lastDay: null, count: 0 },
    mastery: {},
    missions: {}
  });

  const richer = addStars(40);
  assert.equal(richer.stars, 40);

  const spent = spendStars(30);
  assert.equal(spent.ok, true);
  assert.equal(spent.state.stars, 10);

  const tooMuch = spendStars(999);
  assert.equal(tooMuch.ok, false);
});

test("markMissionDone sets green flag and awards stars once", () => {
  memoryStore.clear();
  installMemoryStorage();
  saveProgress({
    version: 1,
    stars: 0,
    stickers: [],
    streak: { lastDay: null, count: 0 },
    mastery: {},
    missions: {}
  });

  const first = markMissionDone("rumi-step1-l1", 8);
  assert.equal(isMissionDone("rumi-step1-l1", first), true);
  assert.equal(first.stars, 8);
  assert.ok(first.stickers.includes("rumi-mic"));

  const second = markMissionDone("rumi-step1-l1", 8);
  assert.equal(second.stars, 12);
  assert.equal(second.stickers.filter((id) => id === "rumi-mic").length, 1);
});

test("pickReviewItems prefers weaker words", () => {
  memoryStore.clear();
  installMemoryStorage();
  const state = {
    version: 1,
    stars: 0,
    stickers: [],
    streak: { lastDay: null, count: 0 },
    mastery: {
      weak: { correct: 0, wrong: 4, strength: 0 },
      strong: { correct: 5, wrong: 0, strength: 5 }
    },
    missions: {}
  };
  saveProgress(state);

  const picked = pickReviewItems(["strong", "weak"], 1, loadProgress());
  assert.equal(picked[0], "weak");
});

test("createUniquePicker does not repeat until the deck is empty", () => {
  const picker = createUniquePicker(["bread", "milk", "egg"]);
  const firstPass = [
    picker.take(1)[0],
    picker.take(1)[0],
    picker.take(1)[0]
  ];
  assert.equal(new Set(firstPass).size, 3);
});
