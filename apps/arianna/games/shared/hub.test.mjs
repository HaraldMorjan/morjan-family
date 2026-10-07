import assert from "node:assert/strict";
import test from "node:test";

class FakeElement {
  constructor(tagName, registerId) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.classList = { add() {} };
    this._innerHTML = "";
    this._id = "";
    this.registerId = registerId;
  }

  set id(value) {
    this._id = value;
    this.registerId(value, this);
  }

  get id() {
    return this._id;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(eventName, listener) {
    const listeners = this.listeners.get(eventName) || [];
    listeners.push(listener);
    this.listeners.set(eventName, listeners);
  }

  dispatch(eventName) {
    (this.listeners.get(eventName) || []).forEach((listener) => listener());
  }

  setAttribute() {}
}

const installBrowserFakes = () => {
  const elementsById = new Map();
  const registerId = (id, element) => {
    if (id) elementsById.set(id, element);
  };
  const createElement = (tagName) => new FakeElement(tagName, registerId);

  ["starPill", "streakLine", "stickerGrid", "prizeShelf", "albumProgress", "albumGoal", "albumFavorite"]
    .forEach((id) => {
      const element = createElement("div");
      element.id = id;
    });

  globalThis.document = {
    createElement,
    getElementById: (id) => elementsById.get(id) || null,
    body: createElement("body"),
    head: createElement("head")
  };

  const timers = new Map();
  let nextTimerId = 1;
  globalThis.window = {
    innerWidth: 1024,
    innerHeight: 768,
    matchMedia: () => ({ matches: true }),
    setTimeout(callback) {
      const timerId = nextTimerId;
      nextTimerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    }
  };

  let progress = {
    version: 1,
    stars: 200,
    stickers: ["rumi-mic"],
    favoriteSticker: null,
    streak: { lastDay: null, count: 0 },
    mastery: {},
    missions: {}
  };
  globalThis.localStorage = {
    getItem: () => JSON.stringify(progress),
    setItem: (_key, value) => {
      progress = JSON.parse(value);
    }
  };

  return { elementsById, timers, getProgress: () => progress };
};

test("rerendering the hub cancels a pending prize redemption", async () => {
  const browser = installBrowserFakes();
  await import(`../hub.js?test=${Date.now()}`);

  const prizeShelf = browser.elementsById.get("prizeShelf");
  const heldRedeemButton = prizeShelf.children[0].children[1];
  heldRedeemButton.dispatch("pointerdown");
  assert.equal(browser.timers.size, 1);

  const stickerGrid = browser.elementsById.get("stickerGrid");
  stickerGrid.children[0].dispatch("click");

  assert.equal(browser.timers.size, 0);
  assert.equal(browser.getProgress().stars, 200);
});
