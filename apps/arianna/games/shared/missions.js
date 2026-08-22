/**
 * Canonical mission catalog for the QR board and deep links.
 * Each mission opens one game with a specific setup.
 * `stars` = points shown on the QR tile and awarded on first clear today.
 */

export const PRODUCTION_ORIGIN = "https://arianna.morjan.family";
export const DEFAULT_MISSION_STARS = 8;

export const missions = [
  {
    id: "rumi-step1-l1",
    game: "counting",
    label: "Contar de 1",
    emoji: "🎤",
    stars: 8,
    path: "/games/counting/",
    query: { mission: "rumi-step1-l1", step: "1", level: "1" },
    theme: "rumi"
  },
  {
    id: "rumi-step2-l1",
    game: "counting",
    label: "Contar de 2",
    emoji: "🎶",
    stars: 10,
    path: "/games/counting/",
    query: { mission: "rumi-step2-l1", step: "2", level: "1" },
    theme: "rumi"
  },
  {
    id: "rumi-step3-l1",
    game: "counting",
    label: "Contar de 3",
    emoji: "✨",
    stars: 12,
    path: "/games/counting/",
    query: { mission: "rumi-step3-l1", step: "3", level: "1" },
    theme: "rumi"
  },
  // Skye: sílabas + oído. Palabras / Frases stay parked (laterSkyeMissions).
  {
    id: "skye-silabas-l1",
    game: "reading",
    label: "Sílabas",
    emoji: "✈️",
    stars: 8,
    path: "/games/reading/",
    query: { mission: "skye-silabas-l1", activity: "silabas", level: "1" },
    theme: "skye"
  },
  {
    id: "skye-oido-l1",
    game: "reading",
    label: "Oído",
    emoji: "👂",
    stars: 8,
    path: "/games/reading/",
    query: { mission: "skye-oido-l1", activity: "oido", level: "1" },
    theme: "skye"
  },
  {
    id: "kuromi-match-animals",
    game: "english",
    label: "Animals",
    emoji: "🎀",
    stars: 8,
    path: "/games/english/",
    query: { mission: "kuromi-match-animals", mode: "match", set: "animals" },
    theme: "kuromi"
  },
  {
    id: "kuromi-memory-colors",
    game: "english",
    label: "Colors",
    emoji: "💜",
    stars: 10,
    path: "/games/english/",
    query: { mission: "kuromi-memory-colors", mode: "memory", set: "colors" },
    theme: "kuromi"
  },
  {
    id: "kuromi-picture-memory-animals",
    game: "english",
    label: "Pics",
    emoji: "🖼️",
    stars: 10,
    path: "/games/english/",
    query: {
      mission: "kuromi-picture-memory-animals",
      mode: "picture-memory",
      set: "animals"
    },
    theme: "kuromi"
  },
  {
    id: "kuromi-spell-food",
    game: "english",
    label: "Food",
    emoji: "🍪",
    stars: 8,
    path: "/games/english/",
    // mode=spell = pick the correct word (not letter tiles)
    query: { mission: "kuromi-spell-food", mode: "spell", set: "food" },
    theme: "kuromi"
  }
];

/** Parked until she is ready — not shown on the QR board yet. */
export const laterSkyeMissions = [
  {
    id: "skye-palabras-l1",
    game: "reading",
    label: "Palabras",
    emoji: "🐶",
    stars: 10,
    path: "/games/reading/",
    query: { mission: "skye-palabras-l1", activity: "palabras", level: "1" },
    theme: "skye"
  },
  {
    id: "skye-frases-l1",
    game: "reading",
    label: "Frases",
    emoji: "🌤️",
    stars: 12,
    path: "/games/reading/",
    query: { mission: "skye-frases-l1", activity: "frases", level: "1" },
    theme: "skye"
  }
];

export const getMissionById = (missionId) =>
  missions.find((mission) => mission.id === missionId) ??
  laterSkyeMissions.find((mission) => mission.id === missionId) ??
  null;

/** Missions shown on each game’s selection screen (QR board uses full `missions`). */
export const missionsForGame = (gameId) =>
  missions.filter((mission) => mission.game === gameId);

/** Skye modes not on the QR board yet — shown as “Pronto” on the picker. */
export const upcomingMissionsForGame = (gameId) =>
  laterSkyeMissions.filter((mission) => mission.game === gameId);

export const getMissionStars = (missionId) =>
  getMissionById(missionId)?.stars ?? DEFAULT_MISSION_STARS;

export const buildMissionUrl = (mission, baseOrigin = PRODUCTION_ORIGIN) => {
  const url = new URL(mission.path, baseOrigin);
  Object.entries(mission.query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  // Marks a real QR / board open so games can hide Club chrome (← Modos).
  // Mode pickers use the same mission query without this flag.
  url.searchParams.set("qr", "1");
  return url.toString();
};

/** True only for QR-board / printed-QR deep links — not Club mode pickers. */
export const isQrDeepLink = (searchParams = new URLSearchParams(window.location.search)) =>
  searchParams.get("qr") === "1";
