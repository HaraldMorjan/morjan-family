/**
 * Daily seeded RNG — same mission gets a fresh pack each calendar day
 * so Arianna practices understanding, not memorizing yesterday’s order.
 */

export const getDayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hashString = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Mulberry32 — deterministic PRNG from a seed. */
export const createDailyRng = (missionId, dayKey = getDayKey()) => {
  let state = hashString(`${dayKey}::${missionId}`);
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffleWithRng = (values, random = Math.random) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const temporary = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temporary;
  }
  return copy;
};

/**
 * Pick a unique daily pack (order shuffled). Replays the same pack
 * for the same missionId on the same day.
 */
export const pickDailyPack = (items, count, missionId, dayKey = getDayKey()) => {
  const random = createDailyRng(missionId, dayKey);
  const shuffled = shuffleWithRng(items, random);
  const size = Math.min(count, shuffled.length);
  return shuffled.slice(0, size);
};
