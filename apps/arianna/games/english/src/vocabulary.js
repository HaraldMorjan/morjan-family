/**
 * Starter English for a 4-year-old mouth / 5-year-old just starting to read.
 * Concrete, already known in Spanish, short English (1–2 syllables).
 *
 * Bank: 8 words per set (master this list for weeks — do not grow it yet).
 * Daily pack: 6 of those 8 (today’s focus).
 * Memory board: 3 pairs (6 cards).
 */
export const WORDS_PER_SET = 8;
export const DAILY_WORD_COUNT = 6;
export const MEMORY_PAIR_COUNT = 3;

export const vocabularySets = {
  animals: [
    { id: "cat", en: "cat", es: "gato", emoji: "🐱" },
    { id: "dog", en: "dog", es: "perro", emoji: "🐶" },
    { id: "fish", en: "fish", es: "pez", emoji: "🐟" },
    { id: "bird", en: "bird", es: "pájaro", emoji: "🐦" },
    { id: "duck", en: "duck", es: "pato", emoji: "🦆" },
    { id: "cow", en: "cow", es: "vaca", emoji: "🐄" },
    { id: "pig", en: "pig", es: "cerdo", emoji: "🐷" },
    { id: "bear", en: "bear", es: "oso", emoji: "🐻" }
  ],
  colors: [
    { id: "red", en: "red", es: "rojo", emoji: "🔴", swatch: "#ef4444" },
    { id: "blue", en: "blue", es: "azul", emoji: "🔵", swatch: "#3b82f6" },
    { id: "yellow", en: "yellow", es: "amarillo", emoji: "🟡", swatch: "#facc15" },
    { id: "green", en: "green", es: "verde", emoji: "🟢", swatch: "#22c55e" },
    { id: "pink", en: "pink", es: "rosa", emoji: "💗", swatch: "#f472b6" },
    { id: "purple", en: "purple", es: "morado", emoji: "💜", swatch: "#7c3aed" },
    { id: "black", en: "black", es: "negro", emoji: "⚫", swatch: "#111827" },
    { id: "white", en: "white", es: "blanco", emoji: "⚪", swatch: "#ffffff" }
  ],
  food: [
    { id: "apple", en: "apple", es: "manzana", emoji: "🍎" },
    { id: "milk", en: "milk", es: "leche", emoji: "🥛" },
    { id: "bread", en: "bread", es: "pan", emoji: "🍞" },
    { id: "egg", en: "egg", es: "huevo", emoji: "🥚" },
    { id: "cake", en: "cake", es: "pastel", emoji: "🍰" },
    { id: "water", en: "water", es: "agua", emoji: "💧" },
    { id: "cookie", en: "cookie", es: "galleta", emoji: "🍪" },
    { id: "juice", en: "juice", es: "jugo", emoji: "🧃" },
    { id: "pancakes", en: "pancakes", es: "panqueques", emoji: "🥞" }
  ]
};

export const getSet = (setName) =>
  vocabularySets[setName] || vocabularySets.animals;
