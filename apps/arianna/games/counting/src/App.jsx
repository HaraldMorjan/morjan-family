import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildLightPath,
  normalizeCountingStep,
  pickLightWindow,
  pickMissingNeighbors
} from "@shared/sequences.js";
import {
  loadProgress,
  markMissionDone,
  isMissionDone
} from "@shared/progress.js";
import { celebrate, celebrateMissionVictory } from "@shared/celebrate.js";
import {
  getMissionStars,
  missionsForGame,
  isQrDeepLink
} from "@shared/missions.js";
import { pulseCharacterMood } from "@shared/characterMood.js";

const rumiMood = (mood) => pulseCharacterMood(".rumi-brand", mood);

const MISSING_ROUNDS_NEEDED = 5;
const LUCES_ROUNDS_NEEDED = 2;
const SPEAK_LANG_SPANISH = "es-MX";
const ONES_WORDS = [
  "",
  "uno",
  "dos",
  "tres",
  "cuatro",
  "cinco",
  "seis",
  "siete",
  "ocho",
  "nueve"
];
const TEENS_WORDS = [
  "diez",
  "once",
  "doce",
  "trece",
  "catorce",
  "quince",
  "dieciséis",
  "diecisiete",
  "dieciocho",
  "diecinueve"
];
const TENS_WORDS = [
  "",
  "",
  "veinte",
  "treinta",
  "cuarenta",
  "cincuenta",
  "sesenta",
  "setenta",
  "ochenta",
  "noventa"
];
const TWENTIES_WORDS = [
  "veintiuno",
  "veintidós",
  "veintitrés",
  "veinticuatro",
  "veinticinco",
  "veintiséis",
  "veintisiete",
  "veintiocho",
  "veintinueve"
];

const toSpanishNumber = (value) => {
  if (value === 100) {
    return "cien";
  }
  if (value === 0) {
    return "cero";
  }
  if (value < 10) {
    return ONES_WORDS[value];
  }
  if (value < 20) {
    return TEENS_WORDS[value - 10];
  }
  if (value < 30) {
    if (value === 20) {
      return "veinte";
    }
    return TWENTIES_WORDS[value - 21];
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (ones === 0) {
    return TENS_WORDS[tens];
  }
  return `${TENS_WORDS[tens]} y ${ONES_WORDS[ones]}`;
};

const speakSpanishText = (text) => {
  if (!window.speechSynthesis) {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = SPEAK_LANG_SPANISH;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

const speakSpanishNumber = (value) => {
  speakSpanishText(toSpanishNumber(value));
};

const RHYTHM_HITS_NEEDED = 8;
/** Parked for now — only Luces + Falta count toward green. */
const RHYTHM_ENABLED = false;
const TABS_NEEDED = RHYTHM_ENABLED ? 3 : 2;

const RUMI_PICKER_BLURBS = {
  "rumi-step1-l1": "Luces y números de 1 en 1",
  "rumi-step2-l1": "Luces y números de 2 en 2",
  "rumi-step3-l1": "Luces y números de 3 en 3"
};

const RHYTHM_DIFFICULTY = {
  easy: { label: "Fácil", hint: "lento", intervalMs: 1800 },
  medium: { label: "Medio", hint: "normal", intervalMs: 1100 },
  fast: { label: "Rápido", hint: "rápido", intervalMs: 700 }
};

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  const missionId = params.get("mission");
  return {
    missionId,
    step: normalizeCountingStep(params.get("step") || 1),
    level: Number(params.get("level") || "1") || 1,
    // Only printed / board QR URLs get qr=1 — Club pickers keep ← Modos
    fromQrScan: isQrDeepLink(params),
    showPicker: !missionId
  };
};

const missionQueryHref = (mission) => {
  const search = new URLSearchParams(mission.query).toString();
  return `?${search}`;
};

const shuffle = (values) => {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temporary = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temporary;
  }
  return copy;
};

const emptyTabs = () => ({
  path: false,
  missing: false,
  rhythm: false
});

const App = () => {
  const params = useMemo(() => readParams(), []);
  const pickerMissions = useMemo(() => missionsForGame("counting"), []);
  const [mode, setMode] = useState("path");
  const [tabsDone, setTabsDone] = useState(emptyTabs);
  const [feedback, setFeedback] = useState("¡Toca las luces en orden!");
  const [stars, setStars] = useState(() => loadProgress().stars);
  const [missionComplete, setMissionComplete] = useState(false);

  const [pathTarget, setPathTarget] = useState([]);
  const [pathDone, setPathDone] = useState([]);
  const [pathButtons, setPathButtons] = useState([]);
  const [pathCleared, setPathCleared] = useState(0);
  const [pathHop, setPathHop] = useState(null);

  const [missingRound, setMissingRound] = useState(null);
  const [missingCorrect, setMissingCorrect] = useState(0);
  const [missingRevealed, setMissingRevealed] = useState(false);

  const [rhythmIndex, setRhythmIndex] = useState(0);
  const [rhythmSeq, setRhythmSeq] = useState([]);
  const [rhythmButtons, setRhythmButtons] = useState([]);
  const [rhythmHits, setRhythmHits] = useState(0);
  const [rhythmDifficulty, setRhythmDifficulty] = useState("easy");
  const usedMissingAnswers = useRef([]);
  const usedWindowStarts = useRef([]);
  const pathHopTimerId = useRef(null);

  const clearPathHopTimer = () => {
    if (pathHopTimerId.current) {
      window.clearTimeout(pathHopTimerId.current);
      pathHopTimerId.current = null;
    }
  };

  const nextMissingRound = () => {
    const round = pickMissingNeighbors(params.step, {
      excludeAnswers: usedMissingAnswers.current
    });
    if (round) {
      usedMissingAnswers.current = [
        ...usedMissingAnswers.current,
        round.answer
      ];
    }
    return round;
  };

  const tabsCompletedCount =
    Number(tabsDone.path) +
    Number(tabsDone.missing) +
    (RHYTHM_ENABLED ? Number(tabsDone.rhythm) : 0);
  const allTabsDone =
    tabsDone.path &&
    tabsDone.missing &&
    (RHYTHM_ENABLED ? tabsDone.rhythm : true);

  const markTabDone = (tabKey) => {
    setTabsDone((current) => {
      if (current[tabKey]) {
        return current;
      }
      return { ...current, [tabKey]: true };
    });
  };

  const resetPath = () => {
    const sequence = pickLightWindow(params.step, {
      excludeStarts: usedWindowStarts.current
    });
    if (sequence.length > 0) {
      usedWindowStarts.current = [...usedWindowStarts.current, sequence[0]];
    }
    clearPathHopTimer();
    setPathHop(null);
    setPathTarget(sequence);
    setPathDone([]);
    setPathButtons(shuffle(sequence));
    if (!tabsDone.path) {
      setFeedback("¡Toca las luces en orden!");
    }
  };

  const resetMissing = () => {
    setMissingRevealed(false);
    setMissingRound(nextMissingRound());
    if (!tabsDone.missing) {
      setFeedback(
        `¿Qué número falta? (${missingCorrect}/${MISSING_ROUNDS_NEEDED})`
      );
    }
  };

  const resetRhythm = () => {
    const sequence = buildLightPath(params.step, params.level, 10);
    setRhythmSeq(sequence);
    setRhythmButtons(shuffle([...new Set(sequence)]).slice(0, 8));
    setRhythmIndex(0);
    if (!tabsDone.rhythm) {
      setFeedback("Sigue el ritmo: toca el número que brilla");
    }
  };

  useEffect(() => {
    usedMissingAnswers.current = [];
    usedWindowStarts.current = [];
    setPathCleared(0);
    resetPath();
    setMissingCorrect(0);
    setMissingRevealed(false);
    setMissingRound(nextMissingRound());
    setRhythmHits(0);
    resetRhythm();
    setFeedback("¡Toca las luces en orden!");
  }, [params.step, params.level]);

  useEffect(() => {
    if (mode !== "rhythm" || rhythmSeq.length === 0 || tabsDone.rhythm) {
      return undefined;
    }

    const intervalMs = RHYTHM_DIFFICULTY[rhythmDifficulty].intervalMs;
    const timerId = window.setInterval(() => {
      setRhythmIndex((current) => (current + 1) % rhythmSeq.length);
    }, intervalMs);

    return () => window.clearInterval(timerId);
  }, [mode, rhythmSeq, rhythmDifficulty, tabsDone.rhythm]);

  useEffect(() => {
    if (params.showPicker || !params.missionId || !allTabsDone || missionComplete) {
      return;
    }

    const currentProgress = loadProgress();
    if (isMissionDone(params.missionId, currentProgress)) {
      setMissionComplete(true);
      setStars(currentProgress.stars);
      setFeedback("¡Encore! Luces y Falta listas 🎤");
      return;
    }

    const starsEarned = getMissionStars(params.missionId);
    const next = markMissionDone(params.missionId, starsEarned);
    setStars(next.stars);
    setMissionComplete(true);
    setFeedback("¡Encore! Luces y Falta listas 🎤");
    rumiMood("happy");
    celebrateMissionVictory({
      theme: "rumi",
      title: "¡ENCORE!",
      subtitle: "Luces y Falta — ¡lo rompiste todo!",
      starsEarned
    });
  }, [allTabsDone, missionComplete, params.missionId]);

  const onPathTap = (value) => {
    if (tabsDone.path) {
      setFeedback(
        tabsDone.missing
          ? "Luces listo ✓"
          : "Luces listo ✓ — sigue con Falta"
      );
      return;
    }

    if (pathDone.includes(value)) {
      return;
    }

    const expected = pathTarget[pathDone.length];
    if (value !== expected) {
      setFeedback("Casi, otra vez 💫");
      rumiMood("sad");
      speakSpanishNumber(expected);
      return;
    }

    const nextDone = [...pathDone, value];
    setPathDone(nextDone);
    setFeedback("¡Sí!");
    rumiMood("happy");
    speakSpanishNumber(value);

    if (params.step > 1) {
      if (pathDone.length === 0) {
        setPathHop({
          left: value,
          addend: params.step,
          result: null
        });
      } else {
        setPathHop({
          left: pathDone[pathDone.length - 1],
          addend: params.step,
          result: value
        });
        clearPathHopTimer();
        if (nextDone.length < pathTarget.length) {
          pathHopTimerId.current = window.setTimeout(() => {
            setPathHop({
              left: value,
              addend: params.step,
              result: null
            });
            pathHopTimerId.current = null;
          }, 900);
        }
      }
    }

    if (nextDone.length === pathTarget.length) {
      const nextCleared = pathCleared + 1;
      setPathCleared(nextCleared);
      if (nextCleared >= LUCES_ROUNDS_NEEDED) {
        markTabDone("path");
        setFeedback("¡Luces completo! ✓");
        rumiMood("happy");
        celebrate({ pieceCount: 50 });
        window.setTimeout(() => {
          setMode("missing");
          if (!tabsDone.missing) {
            setFeedback(
              `¿Qué número falta? (0/${MISSING_ROUNDS_NEEDED})`
            );
          }
        }, 700);
        return;
      }

      setFeedback("¡Otra década!");
      celebrate({ pieceCount: 35 });
      window.setTimeout(() => {
        resetPath();
      }, 700);
    }
  };

  const onMissingChoice = (value) => {
    if (tabsDone.missing) {
      setFeedback(
        tabsDone.path ? "Falta listo ✓" : "Falta listo ✓ — sigue con Luces"
      );
      speakSpanishNumber(value);
      return;
    }

    if (!missingRound || missingRevealed) return;

    speakSpanishNumber(value);

    if (value === missingRound.answer) {
      const nextCorrect = missingCorrect + 1;
      setMissingCorrect(nextCorrect);
      setMissingRevealed(true);
      rumiMood("happy");
      celebrate({ pieceCount: 35 });

      if (nextCorrect >= MISSING_ROUNDS_NEEDED) {
        markTabDone("missing");
        setFeedback("¡Falta completo! ✓");
        rumiMood("happy");
        return;
      }

      setFeedback(`¡Correcto! (${nextCorrect}/${MISSING_ROUNDS_NEEDED})`);
      window.setTimeout(() => {
        setMissingRevealed(false);
        setMissingRound(nextMissingRound());
      }, 900);
      return;
    }

    rumiMood("sad");
    setFeedback(
      `Casi, otra vez 💫 (${missingCorrect}/${MISSING_ROUNDS_NEEDED})`
    );
  };

  const onRhythmTap = (value) => {
    if (tabsDone.rhythm) {
      setFeedback("Ritmo listo ✓ — sigue con Luces o Falta");
      return;
    }

    const expected = rhythmSeq[rhythmIndex];
    if (value === expected) {
      const nextHits = rhythmHits + 1;
      setRhythmHits(nextHits);
      rumiMood("happy");
      if (nextHits >= RHYTHM_HITS_NEEDED) {
        markTabDone("rhythm");
        setFeedback("¡Ritmo completo! ✓");
        celebrate({ pieceCount: 50 });
        return;
      }
      setFeedback(`¡Al ritmo! (${nextHits}/${RHYTHM_HITS_NEEDED})`);
      return;
    }

    rumiMood("sad");
    setFeedback(
      `Casi, otra vez 💫 (${rhythmHits}/${RHYTHM_HITS_NEEDED})`
    );
  };

  const tabClass = (tabKey, isActive) => {
    const parts = [];
    if (isActive) parts.push("active");
    if (tabsDone[tabKey]) parts.push("done");
    return parts.join(" ");
  };

  if (params.showPicker) {
    return (
      <div className="rumi-shell">
        <header className="rumi-top">
          <div className="rumi-brand">
            <img
              className="rumi-icon"
              src={`${import.meta.env.BASE_URL}rumi.svg`}
              alt="Rumi"
              width="140"
              height="140"
            />
            <h1 className="rumi-title">Contar con Rumi</h1>
          </div>
          <div className="star-pill">⭐ {stars}</div>
        </header>

        <div className="rumi-stage">
          <p className="mode-picker__lead">Elige cómo quieres contar hoy</p>
          <div className="mode-picker">
            {pickerMissions.map((mission) => (
              <a
                key={mission.id}
                className="mode-pick rumi-mode-pick"
                href={missionQueryHref(mission)}
              >
                <h2>
                  {mission.emoji} {mission.label}
                </h2>
                <p>{RUMI_PICKER_BLURBS[mission.id] || "¡Al ritmo del concierto!"}</p>
                <span className="mode-pick__badge">⭐ {mission.stars}</span>
              </a>
            ))}
          </div>
          <div className="rumi-actions">
            <a className="btn" href="/games/">
              ← Club
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rumi-shell">
      <header className="rumi-top">
        <div className="rumi-brand">
          <img
            className="rumi-icon"
            src={`${import.meta.env.BASE_URL}rumi.svg`}
            alt="Rumi"
            width="140"
            height="140"
          />
          <h1 className="rumi-title">Contar con Rumi</h1>
        </div>
        <div className="star-pill">⭐ {stars}</div>
      </header>

      <div className="rumi-stage">
        <p style={{ margin: 0, fontWeight: 800 }}>
          De {params.step} en {params.step} · Nivel {params.level}
        </p>
        <p className="rumi-progress-label">
          Tareas {tabsCompletedCount}/{TABS_NEEDED}
          {tabsDone.path ? " · Luces✓" : ""}
          {tabsDone.missing ? " · Falta✓" : ""}
          {RHYTHM_ENABLED && tabsDone.rhythm ? " · Ritmo✓" : ""}
        </p>
        <div className="aplausometro" aria-label="Progreso de tareas">
          <span
            style={{
              width: `${(tabsCompletedCount / TABS_NEEDED) * 100}%`
            }}
          />
        </div>

        <div className="mode-tabs">
          <button
            type="button"
            className={tabClass("path", mode === "path")}
            onClick={() => {
              setMode("path");
              if (!tabsDone.path) {
                setFeedback("¡Toca las luces en orden!");
              }
            }}
          >
            Luces{tabsDone.path ? " ✓" : ""}
          </button>
          <button
            type="button"
            className={tabClass("missing", mode === "missing")}
            onClick={() => {
              setMode("missing");
              if (!tabsDone.missing) {
                setFeedback("¿Qué número falta?");
              }
            }}
          >
            Falta{tabsDone.missing ? " ✓" : ""}
          </button>
          {RHYTHM_ENABLED && (
            <button
              type="button"
              className={tabClass("rhythm", mode === "rhythm")}
              onClick={() => setMode("rhythm")}
            >
              Ritmo{tabsDone.rhythm ? " ✓" : ""}
            </button>
          )}
        </div>

        {mode === "path" && (
          <>
            {params.step === 1 && pathTarget.length > 0 && !tabsDone.path && (
              <p className="path-range" aria-label={`De ${pathTarget[0]} a ${pathTarget[pathTarget.length - 1]}`}>
                <span className="path-range__start">{pathTarget[0]}</span>
                <span className="path-range__dash">→</span>
                <span className="path-range__end">{pathTarget[pathTarget.length - 1]}</span>
              </p>
            )}
            {params.step > 1 && !tabsDone.path && (
              <p className="path-hop">
                {pathHop
                  ? <>
                      <span>{pathHop.left}</span>
                      <span className="path-hop__sign">+</span>
                      <span>{pathHop.addend}</span>
                      <span className="path-hop__sign">=</span>
                      <span
                        className={
                          pathHop.result === null
                            ? "path-hop__hole"
                            : "path-hop__result"
                        }
                      >
                        {pathHop.result === null ? "¿?" : pathHop.result}
                      </span>
                    </>
                  : <>Toca el <span className="path-hop__start">{pathTarget[0]}</span></>}
              </p>
            )}
            <p className="rumi-round-count">
              {tabsDone.path
                ? "Completado"
                : pathTarget.length > 0
                  ? `${pathDone.length}/${pathTarget.length} · ${Math.min(pathCleared + 1, LUCES_ROUNDS_NEEDED)}/${LUCES_ROUNDS_NEEDED}`
                  : ""}
            </p>
            <div className="path-grid">
              {pathButtons.map((value) => (
                <button
                  key={`${pathCleared}-${value}`}
                  type="button"
                  className={`path-light${pathDone.includes(value) ? " done" : ""}`}
                  onClick={() => onPathTap(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "missing" && missingRound && (
          <>
            <p className="rumi-round-count">
              {tabsDone.missing
                ? "Completado"
                : `${missingCorrect}/${MISSING_ROUNDS_NEEDED}`}
            </p>
            <div className="falta-neighbors">
              <button
                type="button"
                className="falta-neighbor"
                onClick={() => speakSpanishNumber(missingRound.before)}
              >
                {missingRound.before}
              </button>
              <button
                type="button"
                className={`falta-neighbor falta-neighbor--hole${
                  missingRevealed || tabsDone.missing ? " is-in" : ""
                }`}
                onClick={() => {
                  if (missingRevealed || tabsDone.missing) {
                    speakSpanishNumber(missingRound.answer);
                    return;
                  }
                  speakSpanishText("¿qué número falta?");
                }}
              >
                {missingRevealed || tabsDone.missing
                  ? missingRound.answer
                  : "?"}
              </button>
              <button
                type="button"
                className="falta-neighbor"
                onClick={() => speakSpanishNumber(missingRound.after)}
              >
                {missingRound.after}
              </button>
            </div>
            {!tabsDone.missing && (
              <div className="choice-grid">
                {missingRound.choices.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className="choice-btn"
                    onClick={() => onMissingChoice(choice)}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {RHYTHM_ENABLED && mode === "rhythm" && (
          <>
            <div className="difficulty-row" role="group" aria-label="Dificultad">
              {Object.entries(RHYTHM_DIFFICULTY).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={`difficulty-btn${
                    rhythmDifficulty === key ? " active" : ""
                  }`}
                  disabled={tabsDone.rhythm}
                  onClick={() => {
                    setRhythmDifficulty(key);
                    setRhythmHits(0);
                    setFeedback(
                      `Ritmo ${config.label} (${config.hint}) — ${RHYTHM_HITS_NEEDED} aciertos`
                    );
                  }}
                >
                  {config.label}
                </button>
              ))}
            </div>
            <p className="rumi-round-count">
              {tabsDone.rhythm
                ? "Completado"
                : `${rhythmHits}/${RHYTHM_HITS_NEEDED} · ${RHYTHM_DIFFICULTY[rhythmDifficulty].label}`}
            </p>
            <div className="prompt-numbers">
              {rhythmSeq.map((value, index) => (
                <span
                  key={`${value}-${index}`}
                  style={{
                    outline:
                      !tabsDone.rhythm && index === rhythmIndex
                        ? "3px solid #fbbf24"
                        : "none",
                    transform:
                      !tabsDone.rhythm && index === rhythmIndex
                        ? "scale(1.08)"
                        : "none"
                  }}
                >
                  {value}
                </span>
              ))}
            </div>
            {!tabsDone.rhythm && (
              <div className="path-grid">
                {rhythmButtons.map((value) => (
                  <button
                    key={`r-${value}`}
                    type="button"
                    className="path-light"
                    onClick={() => onRhythmTap(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <p className="rumi-feedback">{feedback}</p>
        {missionComplete && (
          <p className="rumi-feedback" style={{ color: "#86efac" }}>
            ✓ Misión marcada en verde en el tablero QR
          </p>
        )}

        {!params.fromQrScan && (
          <div className="rumi-actions">
            <a className="btn" href="./">
              ← Modos
            </a>
            <a className="btn" href="/games/qr/">
              QR
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
