/**
 * Spanish sílabas she is studying now:
 * M (ma me mi mo mu), P, S, L, T — plus vowels.
 * Open CV–CV only. No n, d, r, c, g, v, ch, z, ll, clusters.
 *
 * Bank: 16 words (master this list).
 * Today: 3 words (WORDS_TO_COMPLETE).
 * Palabras / Frases stay on the same family so they match when unlocked.
 */
export const WORDS_TO_COMPLETE = 3;

export const STUDIED_CONSONANTS = ["m", "p", "s", "l", "t"];

export const syllableWords = [
  { id: "mama", syllables: ["ma", "má"], emoji: "👩" },
  { id: "papa", syllables: ["pa", "pá"], emoji: "👨" },
  { id: "mapa", syllables: ["ma", "pa"], emoji: "🗺️" },
  { id: "mesa", syllables: ["me", "sa"], emoji: "🪑" },
  { id: "sopa", syllables: ["so", "pa"], emoji: "🍲" },
  { id: "sapo", syllables: ["sa", "po"], emoji: "🐸" },
  { id: "pato", syllables: ["pa", "to"], emoji: "🦆" },
  { id: "pala", syllables: ["pa", "la"], emoji: "🥄" },
  { id: "pelo", syllables: ["pe", "lo"], emoji: "💇" },
  { id: "tapa", syllables: ["ta", "pa"], emoji: "🫙" },
  { id: "lata", syllables: ["la", "ta"], emoji: "🥫" },
  { id: "moto", syllables: ["mo", "to"], emoji: "🏍️" },
  { id: "lupa", syllables: ["lu", "pa"], emoji: "🔍" },
  { id: "piso", syllables: ["pi", "so"], emoji: "🪜" },
  { id: "masa", syllables: ["ma", "sa"], emoji: "🍞" },
  { id: "puma", syllables: ["pu", "ma"], emoji: "🐆" }
];

export const pictureWords = [
  { id: "mama", word: "mamá", emoji: "👩" },
  { id: "papa", word: "papá", emoji: "👨" },
  { id: "mapa", word: "mapa", emoji: "🗺️" },
  { id: "mesa", word: "mesa", emoji: "🪑" },
  { id: "sopa", word: "sopa", emoji: "🍲" },
  { id: "sapo", word: "sapo", emoji: "🐸" },
  { id: "pato", word: "pato", emoji: "🦆" },
  { id: "pala", word: "pala", emoji: "🥄" },
  { id: "moto", word: "moto", emoji: "🏍️" },
  { id: "lupa", word: "lupa", emoji: "🔍" },
  { id: "lata", word: "lata", emoji: "🥫" },
  { id: "puma", word: "puma", emoji: "🐆" }
];

export const missingLetterWords = [
  { id: "mapa-a", word: "mapa", holeIndex: 1, choices: ["a", "e", "i"] },
  { id: "mesa-e", word: "mesa", holeIndex: 1, choices: ["e", "a", "i"] },
  { id: "sopa-o", word: "sopa", holeIndex: 1, choices: ["o", "a", "u"] },
  { id: "pato-a", word: "pato", holeIndex: 1, choices: ["a", "o", "u"] },
  { id: "pala-a", word: "pala", holeIndex: 1, choices: ["a", "e", "o"] },
  { id: "tapa-a", word: "tapa", holeIndex: 1, choices: ["a", "e", "i"] },
  { id: "lata-a", word: "lata", holeIndex: 1, choices: ["a", "e", "o"] },
  { id: "moto-o", word: "moto", holeIndex: 1, choices: ["o", "a", "u"] }
];

export const sentences = [
  {
    id: "mama-sopa",
    text: "Mamá toma sopa.",
    question: "¿Quién toma sopa?",
    answer: "mamá",
    choices: ["mamá", "papá", "pato"]
  },
  {
    id: "pato-sopa",
    text: "El pato toma sopa.",
    question: "¿Quién toma sopa?",
    answer: "pato",
    choices: ["pato", "sapo", "puma"]
  },
  {
    id: "papa-moto",
    text: "Papá va en moto.",
    question: "¿Quién va en moto?",
    answer: "papá",
    choices: ["papá", "mamá", "sapo"]
  },
  {
    id: "sapo-mesa",
    text: "El sapo está en la mesa.",
    question: "¿Dónde está el sapo?",
    answer: "mesa",
    choices: ["mesa", "moto", "lata"]
  }
];

/**
 * Beginner sílabas: short words only (1–2 pieces).
 * Deduped by display form so the bank has no repeats.
 */
const seenBeginner = new Set();
export const beginnerSyllableWords = syllableWords.filter((entry) => {
  if (entry.syllables.length > 2) {
    return false;
  }
  const key = entry.syllables.join("").toLowerCase();
  if (seenBeginner.has(key)) {
    return false;
  }
  seenBeginner.add(key);
  return true;
});
