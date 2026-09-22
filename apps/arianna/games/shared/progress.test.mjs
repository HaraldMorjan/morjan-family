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

const installMemoryLockManager = () => {
  const previousDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  );
  let queue = Promise.resolve();
  const request = (_name, operation) => {
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { locks: { request } }
  });

  return () => {
    if (previousDescriptor) {
      Object.defineProperty(globalThis, "navigator", previousDescriptor);
    } else {
      delete globalThis.navigator;
    }
  };
};

test("star wallet adds and spends correctly", async () => {
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

  const spent = await spendStars(30);
  assert.equal(spent.ok, true);
  assert.equal(spent.state.stars, 10);

  const tooMuch = await spendStars(999);
  assert.equal(tooMuch.ok, false);
});

test("markMissionDone sets green flag and awards stars once", async () => {
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

  const first = await markMissionDone("rumi-step1-l1", 8);
  assert.equal(isMissionDone("rumi-step1-l1", first), true);
  assert.equal(first.stars, 8);
  assert.ok(first.stickers.includes("rumi-mic"));

  const second = await markMissionDone("rumi-step1-l1", 8);
  assert.equal(second.stars, 12);
  assert.equal(second.stickers.filter((id) => id === "rumi-mic").length, 1);
});

test("concurrent mission writes preserve both completions", async (context) => {
  memoryStore.clear();
  installMemoryStorage();
  context.after(installMemoryLockManager());
  const staleState = loadProgress();

  await Promise.all([
    markMissionDone("rumi-step1-l1", 8, staleState),
    markMissionDone("skye-silabas-l1", 8, staleState)
  ]);

  const saved = loadProgress();
  assert.equal(isMissionDone("rumi-step1-l1", saved), true);
  assert.equal(isMissionDone("skye-silabas-l1", saved), true);
  assert.equal(saved.stars, 16);
  assert.ok(saved.stickers.includes("rumi-mic"));
  assert.ok(saved.stickers.includes("skye-wings"));
});

test("concurrent redemptions cannot spend one balance twice", async (context) => {
  memoryStore.clear();
  installMemoryStorage();
  context.after(installMemoryLockManager());
  saveProgress({
    version: 1,
    stars: 50,
    stickers: [],
    streak: { lastDay: null, count: 0 },
    mastery: {},
    missions: {}
  });
  const staleState = loadProgress();

  const results = await Promise.all([
    spendStars(50, staleState),
    spendStars(50, staleState)
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(loadProgress().stars, 0);
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
