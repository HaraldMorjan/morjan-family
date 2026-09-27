import { getDayKey } from "./dailySeed.js";
import { getStickerForMission } from "./stickers.js";

/** Map old `mission-<id>-YYYY-MM-DD` stickers onto the named album slots. */
const migrateLegacyStickers = (stickerIds = []) => {
  const nextIds = new Set(stickerIds);
  stickerIds.forEach((stickerId) => {
    const match = /^mission-(.+?)-\d{4}-\d{2}-\d{2}$/.exec(stickerId);
    if (!match) {
      return;
    }
    const albumSticker = getStickerForMission(match[1]);
    if (albumSticker) {
      nextIds.add(albumSticker.id);
    }
  });
  return [...nextIds];
};

const STORAGE_KEY = "arianna-learning-club-v1";
const failedSaves = new WeakSet();
const DEFAULT_STATE = {
  version: 1,
  stars: 0,
  stickers: [],
  favoriteSticker: null,
  streak: { lastDay: null, count: 0 },
  mastery: {},
  missions: {}
};

const cloneDefaultState = () => ({
  version: DEFAULT_STATE.version,
  stars: 0,
  stickers: [],
  favoriteSticker: null,
  streak: { lastDay: null, count: 0 },
  mastery: {},
  missions: {}
});

export const loadProgress = () => {
  if (typeof localStorage === "undefined") {
    return cloneDefaultState();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaultState(),
      ...parsed,
      streak: { ...cloneDefaultState().streak, ...(parsed.streak || {}) },
      mastery: { ...(parsed.mastery || {}) },
      missions: { ...(parsed.missions || {}) },
      stickers: migrateLegacyStickers(
        Array.isArray(parsed.stickers) ? parsed.stickers : []
      ),
      favoriteSticker:
        typeof parsed.favoriteSticker === "string"
          ? parsed.favoriteSticker
          : null
    };
  } catch (parseError) {
    return cloneDefaultState();
  }
};

export const saveProgress = (state) => {
  if (typeof localStorage === "undefined") {
    failedSaves.add(state);
    return state;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    failedSaves.delete(state);
  } catch (saveError) {
    failedSaves.add(state);
  }

  return state;
};

export const wasProgressSaved = (state) =>
  Boolean(state) && !failedSaves.has(state);

const todayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const yesterdayKey = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const touchStreak = (state = loadProgress()) => {
  const today = todayKey();
  const nextState = { ...state, streak: { ...state.streak } };

  if (nextState.streak.lastDay === today) {
    return saveProgress(nextState);
  }

  if (nextState.streak.lastDay === yesterdayKey()) {
    nextState.streak.count += 1;
  } else {
    nextState.streak.count = 1;
  }

  nextState.streak.lastDay = today;
  return saveProgress(nextState);
};

export const addStars = (amount, state = loadProgress()) => {
  const nextState = touchStreak({
    ...state,
    stars: Math.max(0, (state.stars || 0) + amount)
  });
  return nextState;
};

export const spendStars = (amount, state = loadProgress()) => {
  if ((state.stars || 0) < amount) {
    return { ok: false, state };
  }

  const nextState = saveProgress({
    ...state,
    stars: state.stars - amount
  });
  if (!wasProgressSaved(nextState)) {
    return { ok: false, state, reason: "storage-unavailable" };
  }
  return { ok: true, state: nextState };
};

export const unlockSticker = (stickerId, state = loadProgress()) => {
  if (state.stickers.includes(stickerId)) {
    return state;
  }

  return saveProgress({
    ...state,
    stickers: [...state.stickers, stickerId]
  });
};

/** Green for today only — missions refresh each calendar day. */
export const isMissionDone = (missionId, state = loadProgress()) => {
  const entry = state.missions?.[missionId];
  if (!entry?.done) {
    return false;
  }
  const today = getDayKey();
  if (entry.day && entry.day !== today) {
    return false;
  }
  // Legacy entries without day count as done only on the same UTC date stamp
  if (!entry.day && entry.at) {
    const doneDay = getDayKey(new Date(entry.at));
    return doneDay === today;
  }
  return Boolean(entry.day === today);
};

export const markMissionDone = (missionId, starsEarned = 5, state = loadProgress()) => {
  const alreadyDone = isMissionDone(missionId, state);
  const today = getDayKey();
  let nextState = {
    ...state,
    missions: {
      ...state.missions,
      [missionId]: {
        done: true,
        at: new Date().toISOString(),
        day: today
      }
    }
  };

  if (!alreadyDone) {
    nextState = addStars(starsEarned, nextState);
    const albumSticker = getStickerForMission(missionId);
    if (albumSticker) {
      nextState = unlockSticker(albumSticker.id, nextState);
    }
  } else {
    nextState = addStars(Math.max(1, Math.floor(starsEarned / 2)), nextState);
  }

  return saveProgress(nextState);
};

export const setFavoriteSticker = (stickerId, state = loadProgress()) => {
  if (stickerId && !state.stickers.includes(stickerId)) {
    return state;
  }

  return saveProgress({
    ...state,
    favoriteSticker: stickerId || null
  });
};

export const getMastery = (itemId, state = loadProgress()) =>
  state.mastery[itemId] || { correct: 0, wrong: 0, strength: 0 };

export const recordMastery = (itemId, wasCorrect, state = loadProgress()) => {
  const current = getMastery(itemId, state);
  const correct = current.correct + (wasCorrect ? 1 : 0);
  const wrong = current.wrong + (wasCorrect ? 0 : 1);
  const strength = Math.max(
    0,
    Math.min(5, current.strength + (wasCorrect ? 1 : -1))
  );

  return saveProgress({
    ...state,
    mastery: {
      ...state.mastery,
      [itemId]: { correct, wrong, strength }
    }
  });
};

export const pickReviewItems = (itemIds, limit = 4, state = loadProgress()) => {
  const scored = itemIds.map((itemId) => {
    const mastery = getMastery(itemId, state);
    const weakness = mastery.wrong * 2 - mastery.strength + Math.random();
    return { itemId, weakness };
  });

  scored.sort((left, right) => right.weakness - left.weakness);
  return scored.slice(0, limit).map((entry) => entry.itemId);
};

/**
 * One mission session: do not repeat an id until every id has been shown.
 * Then the deck reshuffles (encore), still preferring weaker items.
 */
export const createUniquePicker = (itemIds) => {
  const catalogIds = [...itemIds];
  let unusedIds = [...catalogIds];

  const take = (count = 1, state = loadProgress()) => {
    if (catalogIds.length === 0 || count < 1) {
      return [];
    }

    const needed = Math.min(count, catalogIds.length);
    if (unusedIds.length < needed) {
      unusedIds = [...catalogIds];
    }

    const pickedIds = pickReviewItems(unusedIds, needed, state);
    unusedIds = unusedIds.filter((itemId) => !pickedIds.includes(itemId));
    return pickedIds;
  };

  return { take };
};

export const resetMissions = (state = loadProgress()) =>
  saveProgress({
    ...state,
    missions: {}
  });
