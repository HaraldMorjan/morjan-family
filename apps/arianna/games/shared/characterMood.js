/**
 * Short happy/sad reactions on character header portraits.
 * Same raster art — CSS mood classes only (faces are not editable layers).
 */

const MOOD_DURATION_MS = 900;
const MOOD_CLASSES = ["character-mood--happy", "character-mood--sad"];

const moodTimers = new WeakMap();

const clearMoodClasses = (element) => {
  MOOD_CLASSES.forEach((className) => {
    element.classList.remove(className);
  });
};

/**
 * @param {Element | null} element
 * @param {"happy" | "sad" | "idle"} mood
 */
export const setCharacterMood = (element, mood) => {
  if (!element) {
    return;
  }

  const existingTimerId = moodTimers.get(element);
  if (existingTimerId) {
    window.clearTimeout(existingTimerId);
    moodTimers.delete(element);
  }

  clearMoodClasses(element);

  if (mood === "idle") {
    return;
  }

  if (mood !== "happy" && mood !== "sad") {
    return;
  }

  element.classList.add(`character-mood--${mood}`);

  const timerId = window.setTimeout(() => {
    clearMoodClasses(element);
    moodTimers.delete(element);
  }, MOOD_DURATION_MS);

  moodTimers.set(element, timerId);
};

/** Convenience: query and pulse mood on the first matching icon. */
export const pulseCharacterMood = (selector, mood) => {
  if (typeof document === "undefined") {
    return;
  }
  setCharacterMood(document.querySelector(selector), mood);
};
