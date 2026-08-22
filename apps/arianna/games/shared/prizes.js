/**
 * Starter prize catalog — redefine later.
 * Cost is in stars from the shared wallet.
 */

export const prizeCatalog = [
  { id: "helado", label: "Un helado con papá", cost: 50, emoji: "🍦" },
  { id: "parque", label: "Tarde en el parque", cost: 120, emoji: "🎡" },
  { id: "cuento", label: "Un cuento extra", cost: 30, emoji: "📖" },
  { id: "pelicula", label: "Película en familia", cost: 80, emoji: "🎬" }
];

export const getPrizeById = (prizeId) =>
  prizeCatalog.find((prize) => prize.id === prizeId) ?? null;
