/**
 * Counting sequence helpers for Contar con Rumi.
 */

export const LEVEL_RANGES = {
  1: { min: 1, max: 20 },
  2: { min: 1, max: 50 },
  3: { min: 1, max: 100 }
};

export const normalizeCountingStep = (step) => {
  const numericStep = Number(step);
  return Number.isSafeInteger(numericStep) && numericStep > 0
    ? numericStep
    : 1;
};

export const buildSequence = (step, level = 1) => {
  const range = LEVEL_RANGES[level] || LEVEL_RANGES[1];
  const sequence = [];
  for (let value = step; value <= range.max; value += step) {
    if (value >= range.min) {
      sequence.push(value);
    }
  }
  return sequence;
};

export const pickMissingNumberRound = (step, level = 1, excludeAnswers = []) => {
  const sequence = buildSequence(step, level);
  if (sequence.length < 4) {
    return null;
  }

  const innerValues = sequence.slice(1, sequence.length - 1);
  const unusedValues = innerValues.filter(
    (value) => !excludeAnswers.includes(value)
  );
  const answerPool = unusedValues.length > 0 ? unusedValues : innerValues;
  const answer = answerPool[Math.floor(Math.random() * answerPool.length)];
  const missingIndex = sequence.indexOf(answer);
  const prompt = sequence.map((value, index) =>
    index === missingIndex ? null : value
  );

  const distractors = new Set();
  while (distractors.size < 2) {
    const candidate = answer + step * (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 2));
    if (candidate > 0 && candidate !== answer && !distractors.has(candidate)) {
      distractors.add(candidate);
    }
  }

  const choices = [answer, ...distractors];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temporary = choices[index];
    choices[index] = choices[swapIndex];
    choices[swapIndex] = temporary;
  }

  return { prompt, answer, choices, step, level };
};

export const buildLightPath = (step, level = 1, length = 8) => {
  const sequence = buildSequence(step, level);
  return sequence.slice(0, Math.min(length, sequence.length));
};

export const LIGHT_WINDOW_SIZE = 6;
export const LIGHT_RANGE_MAX = 100;

/** First six multiples — the skip-count chant (2–12 / 3–18). */
export const buildChant = (step, length = LIGHT_WINDOW_SIZE) => {
  const sequence = [];
  for (let index = 0; index < length; index += 1) {
    sequence.push(step * (index + 1));
  }
  return sequence;
};

const shuffleChoices = (values) => {
  const choices = [...values];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temporary = choices[index];
    choices[index] = choices[swapIndex];
    choices[swapIndex] = temporary;
  }
  return choices;
};

/**
 * One missing number between two neighbors, anywhere in 1–100.
 * Next call can pass excludeAnswers so rounds do not repeat.
 */
export const pickMissingNeighbors = (
  step,
  {
    maxValue = LIGHT_RANGE_MAX,
    excludeAnswers = []
  } = {}
) => {
  const chant = step > 1 ? buildChant(step) : null;
  const minAnswer = step * 2;
  const maxAnswer = chant ? chant[chant.length - 2] : maxValue - step;
  const possibleAnswers = [];
  for (let value = minAnswer; value <= maxAnswer; value += step) {
    possibleAnswers.push(value);
  }
  if (possibleAnswers.length === 0) {
    return null;
  }

  const unusedAnswers = possibleAnswers.filter(
    (answerValue) => !excludeAnswers.includes(answerValue)
  );
  const answerPool = unusedAnswers.length > 0 ? unusedAnswers : possibleAnswers;
  const usedDecades = new Set(
    excludeAnswers.map((answerValue) => Math.floor(answerValue / 10))
  );
  const otherDecadeAnswers = answerPool.filter(
    (answerValue) => !usedDecades.has(Math.floor(answerValue / 10))
  );
  const decadePool =
    step > 1
      ? answerPool
      : otherDecadeAnswers.length > 0
        ? otherDecadeAnswers
        : answerPool;
  const answer = decadePool[Math.floor(Math.random() * decadePool.length)];
  const before = answer - step;
  const after = answer + step;

  const distractors = new Set();
  if (step > 1) {
    const onesDown = answer - 1;
    const onesUp = answer + 1;
    const onesTrap = onesDown > 0 && Math.random() > 0.5 ? onesDown : onesUp;
    distractors.add(onesTrap);
    const chantTraps = chant.filter(
      (chantValue) => chantValue !== answer && chantValue !== onesTrap
    );
    distractors.add(
      chantTraps[Math.floor(Math.random() * chantTraps.length)]
    );
  } else {
    while (distractors.size < 2) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const jump = 1 + Math.floor(Math.random() * 2);
      const candidate = answer + step * direction * jump;
      if (
        candidate > 0 &&
        candidate <= maxValue &&
        candidate !== answer &&
        !distractors.has(candidate)
      ) {
        distractors.add(candidate);
      }
    }
  }

  const choices = shuffleChoices([answer, ...distractors]);

  return {
    prompt: [before, null, after],
    before,
    after,
    answer,
    choices,
    step
  };
};

/**
 * Six consecutive counts from a random start in 1–100.
 * Next call can pass excludeStarts so the next window is a different decade.
 */
export const pickLightWindow = (
  step,
  {
    maxValue = LIGHT_RANGE_MAX,
    length = LIGHT_WINDOW_SIZE,
    excludeStarts = []
  } = {}
) => {
  if (step > 1) {
    return buildChant(step, length);
  }

  const lastStart = maxValue - step * (length - 1);
  const possibleStarts = [];
  for (let value = step; value <= lastStart; value += step) {
    possibleStarts.push(value);
  }
  if (possibleStarts.length === 0) {
    return [];
  }

  const unusedStarts = possibleStarts.filter(
    (startValue) => !excludeStarts.includes(startValue)
  );
  const startPool = unusedStarts.length > 0 ? unusedStarts : possibleStarts;
  const usedDecades = new Set(
    excludeStarts.map((startValue) => Math.floor(startValue / 10))
  );
  const otherDecadeStarts = startPool.filter(
    (startValue) => !usedDecades.has(Math.floor(startValue / 10))
  );
  const decadePool =
    otherDecadeStarts.length > 0 ? otherDecadeStarts : startPool;
  const windowStart =
    decadePool[Math.floor(Math.random() * decadePool.length)];
  const sequence = [];
  for (let index = 0; index < length; index += 1) {
    sequence.push(windowStart + step * index);
  }
  return sequence;
};
