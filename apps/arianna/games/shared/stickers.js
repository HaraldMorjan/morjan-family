/**
 * Collectible sticker album — one named sticker per mission (unlocked once ever).
 * Hub shows locked slots so Arianna wants to fill the book.
 */

export const stickerAlbum = [
  {
    id: "rumi-mic",
    missionId: "rumi-step1-l1",
    emoji: "🎤",
    name: "Micrófono de Rumi",
    hint: "Gánalo en Contar de 1",
    rarity: "common"
  },
  {
    id: "rumi-notes",
    missionId: "rumi-step2-l1",
    emoji: "🎶",
    name: "Notas del concierto",
    hint: "Gánalo en Contar de 2",
    rarity: "common"
  },
  {
    id: "rumi-sparkle",
    missionId: "rumi-step3-l1",
    emoji: "✨",
    name: "Brillo de escenario",
    hint: "Gánalo en Contar de 3",
    rarity: "rare"
  },
  {
    id: "skye-wings",
    missionId: "skye-silabas-l1",
    emoji: "✈️",
    name: "Alas de Skye",
    hint: "Gánalo leyendo sílabas",
    rarity: "common"
  },
  {
    id: "skye-ear",
    missionId: "skye-oido-l1",
    emoji: "👂",
    name: "Oreja de Skye",
    hint: "Gánalo en Oído",
    rarity: "common"
  },
  {
    id: "kuromi-bow",
    missionId: "kuromi-match-animals",
    emoji: "🎀",
    name: "Lazo secreto",
    hint: "Gánalo en Animals (match)",
    rarity: "common"
  },
  {
    id: "kuromi-heart",
    missionId: "kuromi-memory-colors",
    emoji: "💜",
    name: "Corazón morado",
    hint: "Gánalo en Colors (memory)",
    rarity: "common"
  },
  {
    id: "kuromi-frame",
    missionId: "kuromi-picture-memory-animals",
    emoji: "🖼️",
    name: "Marco mágico",
    hint: "Gánalo en Pics",
    rarity: "rare"
  },
  {
    id: "kuromi-cookie",
    missionId: "kuromi-spell-food",
    emoji: "🍪",
    name: "Galleta del club",
    hint: "Gánalo en Food (spell)",
    rarity: "common"
  }
];

/** Milestones that make collecting feel like a quest. */
export const albumGoals = [
  { count: 1, label: "¡Primera sticker del álbum!" },
  { count: 3, label: "Coleccionista novata 🌟" },
  { count: 5, label: "Álbum a medio camino" },
  { count: 8, label: "¡Álbum completo! 🏆" }
];

export const getStickerById = (stickerId) =>
  stickerAlbum.find((sticker) => sticker.id === stickerId) ?? null;

export const getStickerForMission = (missionId) =>
  stickerAlbum.find((sticker) => sticker.missionId === missionId) ?? null;

export const countUnlockedInAlbum = (unlockedIds = []) =>
  stickerAlbum.filter((sticker) => unlockedIds.includes(sticker.id)).length;

export const getCurrentAlbumGoal = (unlockedCount) => {
  const nextGoal = albumGoals.find((goal) => unlockedCount < goal.count);
  if (nextGoal) {
    return {
      ...nextGoal,
      remaining: nextGoal.count - unlockedCount,
      complete: false
    };
  }

  const finalGoal = albumGoals[albumGoals.length - 1];
  return { ...finalGoal, remaining: 0, complete: true };
};
