import {
  syllableWords,
  beginnerSyllableWords,
  pictureWords,
  missingLetterWords,
  sentences,
  WORDS_TO_COMPLETE
} from "../content/words.js";
import {
  loadProgress,
  markMissionDone,
  wasProgressSaved
} from "@shared/progress.js";
import { celebrate, celebrateMissionVictory } from "@shared/celebrate.js";
import { pulseCharacterMood } from "@shared/characterMood.js";
import {
  getMissionStars,
  missionsForGame,
  upcomingMissionsForGame,
  isQrDeepLink
} from "@shared/missions.js";
import {
  getDayKey,
  pickDailyPack,
  shuffleWithRng,
  createDailyRng
} from "@shared/dailySeed.js";

const skyeMood = (mood) => pulseCharacterMood(".skye-brand", mood);

/** Spanish voice preview — slow enough for a new reader. */
const speakSpanish = (text) => {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

const wireSpeakControls = (host, text) => {
  if (!host || !text) {
    return;
  }

  host.querySelectorAll("[data-speak]").forEach((button) => {
    button.addEventListener("click", () => {
      speakSpanish(text);
    });
  });

  const targetWord = host.querySelector("[data-target-word]");
  if (targetWord) {
    targetWord.setAttribute("role", "button");
    targetWord.setAttribute("tabindex", "0");
    targetWord.title = "Toca para escuchar";
    const onSpeak = () => speakSpanish(text);
    targetWord.addEventListener("click", onSpeak);
    targetWord.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSpeak();
      }
    });
  }
};

const SKYE_PICKER_BLURBS = {
  "skye-silabas-l1": "Mira la foto y arma la palabra",
  "skye-oido-l1": "Escucha la sílaba y tócala",
  "skye-palabras-l1": "Lee la palabra de la imagen",
  "skye-frases-l1": "Lee la frase y responde"
};

const otherSyllables = (excludeSyllable) => {
  const pool = [];
  syllableWords.forEach((entry) => {
    entry.syllables.forEach((syllable) => {
      if (syllable !== excludeSyllable && !pool.includes(syllable)) {
        pool.push(syllable);
      }
    });
  });
  return pool;
};

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  const missionId = params.get("mission");
  return {
    missionId,
    activity: params.get("activity") || "silabas",
    level: params.get("level") || "1",
    // Only printed / board QR URLs get qr=1 — Club pickers keep ← Modos
    fromQrScan: isQrDeepLink(params),
    showPicker: !missionId
  };
};

const missionQueryHref = (mission) => {
  const search = new URLSearchParams(mission.query).toString();
  return `?${search}`;
};

const displaySyllableWord = (entry) => entry.syllables.join("");

const renderPicker = (root) => {
  const liveMissions = missionsForGame("reading");
  const soonMissions = upcomingMissionsForGame("reading");

  const liveCards = liveMissions
    .map(
      (mission) => `
      <a class="mode-pick skye-mode-pick" href="${missionQueryHref(mission)}">
        <h2>${mission.emoji} ${mission.label}</h2>
        <p>${SKYE_PICKER_BLURBS[mission.id] || "¡A volar!"}</p>
        <span class="mode-pick__badge">⭐ ${mission.stars}</span>
      </a>`
    )
    .join("");

  const soonCards = soonMissions
    .map(
      (mission) => `
      <div class="mode-pick mode-pick--soon skye-mode-pick" aria-disabled="true">
        <h2>${mission.emoji} ${mission.label}</h2>
        <p>${SKYE_PICKER_BLURBS[mission.id] || "Más adelante"}</p>
        <span class="mode-pick__badge">Pronto</span>
      </div>`
    )
    .join("");

  root.innerHTML = `
    <p class="mode-picker__lead">Elige tu vuelo de lectura</p>
    <div class="mode-picker">
      ${liveCards}
      ${soonCards}
    </div>
  `;
};

const syncNav = (params) => {
  const returnButton = document.getElementById("returnNavButton");
  const clubNavButton = document.getElementById("clubNavButton");

  if (params.showPicker) {
    // Picker: only ← Club (no Modos, no QR)
    if (returnButton) returnButton.hidden = true;
    if (clubNavButton) clubNavButton.hidden = false;
    return;
  }

  // In mission from Club: ← Modos. From QR: no chrome.
  if (returnButton) returnButton.hidden = params.fromQrScan;
  if (clubNavButton) clubNavButton.hidden = true;
};

export const mountReadingGame = (root) => {
  if (!root) return;

  const params = readParams();
  const starPill = document.getElementById("starPill");

  const refreshStars = () => {
    if (starPill) {
      starPill.textContent = `⭐ ${loadProgress().stars}`;
    }
  };

  refreshStars();
  syncNav(params);

  if (params.showPicker) {
    renderPicker(root);
    return;
  }

  const dayKey = getDayKey();
  const random = createDailyRng(params.missionId, dayKey);

  let missionComplete = false;
  let clearedCount = 0;
  let packIndex = 0;

  const syllableSource =
    params.level === "1" ? beginnerSyllableWords : syllableWords;
  const syllablePack = pickDailyPack(
    syllableSource,
    WORDS_TO_COMPLETE,
    `${params.missionId}-silabas`,
    dayKey
  );
  const picturePack = pickDailyPack(
    pictureWords,
    WORDS_TO_COMPLETE,
    `${params.missionId}-palabras`,
    dayKey
  );
  const missingPack = pickDailyPack(
    missingLetterWords,
    WORDS_TO_COMPLETE,
    `${params.missionId}-letra`,
    dayKey
  );
  const sentencePack = pickDailyPack(
    sentences,
    WORDS_TO_COMPLETE,
    `${params.missionId}-frases`,
    dayKey
  );
  const oidoPack = pickDailyPack(
    syllableSource,
    WORDS_TO_COMPLETE,
    `${params.missionId}-oido`,
    dayKey
  );

  const completeMission = () => {
    if (missionComplete || !params.missionId) return false;
    const starsEarned = getMissionStars(params.missionId);
    const next = markMissionDone(params.missionId, starsEarned);
    if (!wasProgressSaved(next)) {
      refreshStars();
      setFeedback("No se pudo guardar. Pide ayuda y vuelve a intentarlo.");
      return false;
    }
    missionComplete = true;
    refreshStars();
    skyeMood("happy");
    celebrateMissionVictory({
      theme: "skye",
      title: "¡MISIÓN CUMPLIDA!",
      subtitle: "¡Volaste alto y leíste como una campeona!",
      starsEarned
    });
    return true;
  };

  const setFeedback = (text, ok = false) => {
    const feedback = root.querySelector("[data-feedback]");
    if (feedback) {
      feedback.textContent = text;
      feedback.className = `feedback${ok ? " feedback-ok" : ""}`;
    }
  };

  const progressLabel = () => `${clearedCount}/${WORDS_TO_COMPLETE}`;

  const onItemCleared = (nextRender) => {
    clearedCount += 1;
    packIndex += 1;
    skyeMood("happy");
    celebrate({ pieceCount: 40 });

    if (clearedCount >= WORDS_TO_COMPLETE) {
      if (!completeMission()) {
        return;
      }
      setFeedback(`¡Misión del día lista! (${progressLabel()}) ✈️`, true);
      root.querySelector("[data-balloons]")?.replaceChildren();
      root.querySelector("[data-choices]")?.replaceChildren();
      const target = root.querySelector("[data-target-word]");
      if (target) {
        target.classList.add("target-word--done");
      }
      return;
    }

    setFeedback(`¡Bien! (${progressLabel()})`, true);
    window.setTimeout(nextRender, 700);
  };

  const paintTargetSyllables = (targetWord, syllables, builtCount) => {
    if (!targetWord) {
      return;
    }

    targetWord.replaceChildren();
    syllables.forEach((syllable, syllableIndex) => {
      const piece = document.createElement("span");
      piece.className = "target-syllable";
      piece.textContent = syllable;

      if (syllableIndex < builtCount) {
        piece.classList.add("target-syllable--done");
      } else if (syllableIndex === builtCount) {
        piece.classList.add("target-syllable--next");
      } else {
        piece.classList.add("target-syllable--later");
      }

      targetWord.appendChild(piece);
    });
  };

  const paintWells = (wellRow, syllables, builtCount) => {
    if (!wellRow) {
      return;
    }
    wellRow.replaceChildren();
    syllables.forEach((syllable, syllableIndex) => {
      const well = document.createElement("span");
      well.className = "well";
      if (syllableIndex < builtCount) {
        well.classList.add("is-in");
        well.textContent = syllable;
      } else {
        well.textContent = "?";
      }
      wellRow.appendChild(well);
    });
  };

  const renderSilabas = () => {
    if (missionComplete || packIndex >= syllablePack.length) {
      return;
    }

    const current = syllablePack[packIndex];
    const word = displaySyllableWord(current);
    let built = [];
    const options = shuffleWithRng([...current.syllables], random);

    root.innerHTML = `
      <p class="prompt-line"><strong>Arma la palabra</strong></p>
      <p class="round-meter">${progressLabel()} de hoy</p>
      <button
        type="button"
        class="picture-speak"
        data-picture-speak
        aria-label="${word}"
      >${current.emoji}</button>
      <div class="well-row" data-wells></div>
      <p class="built-word" data-built-word></p>
      <div class="balloon-row" data-balloons></div>
      <p class="feedback" data-feedback>Toca las sílabas en orden</p>
    `;

    const balloons = root.querySelector("[data-balloons]");
    const wellRow = root.querySelector("[data-wells]");
    const builtWord = root.querySelector("[data-built-word]");
    paintWells(wellRow, current.syllables, 0);
    root.querySelector("[data-picture-speak]")?.addEventListener("click", () => {
      speakSpanish(word);
    });

    options.forEach((syllable, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "balloon";
      button.textContent = syllable;
      button.dataset.index = String(index);
      button.addEventListener("click", () => {
        speakSpanish(syllable);
        const expected = current.syllables[built.length];
        if (syllable !== expected) {
          setFeedback("Casi, otra vez 💫");
          skyeMood("sad");
          return;
        }
        built.push(syllable);
        paintWells(wellRow, current.syllables, built.length);
        skyeMood("happy");
        setFeedback("¡Sí!", true);
        if (built.length === current.syllables.length) {
          if (builtWord) {
            builtWord.textContent = word;
          }
          setFeedback(`¡${word}!`, true);
          window.setTimeout(() => {
            speakSpanish(word);
          }, 350);
          onItemCleared(renderSilabas);
        }
      });
      balloons.appendChild(button);
    });
  };

  const renderOido = () => {
    if (missionComplete || packIndex >= oidoPack.length) {
      return;
    }

    const current = oidoPack[packIndex];
    const word = displaySyllableWord(current);
    let built = [];

    const paintOidoRound = () => {
      const expected = current.syllables[built.length];
      const distractorPool = otherSyllables(expected);
      const distractors = shuffleWithRng(distractorPool, random).slice(0, 2);
      const options = shuffleWithRng([expected, ...distractors], random);

      root.innerHTML = `
        <p class="prompt-line"><strong>¿Cuál sílaba?</strong></p>
        <p class="round-meter">${progressLabel()} de hoy</p>
        <button type="button" class="btn speak-btn" data-hear>
          🔊 Escuchar
        </button>
        <div class="well-row" data-wells></div>
        <p class="built-word" data-built-word></p>
        <div class="balloon-row" data-balloons></div>
        <p class="feedback" data-feedback>Escucha y toca</p>
      `;

      const wellRow = root.querySelector("[data-wells]");
      const balloons = root.querySelector("[data-balloons]");
      const builtWord = root.querySelector("[data-built-word]");
      paintWells(wellRow, current.syllables, built.length);
      speakSpanish(expected);
      root.querySelector("[data-hear]")?.addEventListener("click", () => {
        speakSpanish(expected);
      });

      options.forEach((syllable) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "balloon";
        button.textContent = syllable;
        button.addEventListener("click", () => {
          speakSpanish(syllable);
          if (syllable !== expected) {
            setFeedback("Casi, otra vez 💫");
            skyeMood("sad");
            return;
          }
          built.push(syllable);
          skyeMood("happy");
          setFeedback("¡Sí!", true);
          if (built.length === current.syllables.length) {
            paintWells(wellRow, current.syllables, built.length);
            if (builtWord) {
              builtWord.textContent = word;
            }
            setFeedback(`¡${word}!`, true);
            window.setTimeout(() => {
              speakSpanish(word);
            }, 350);
            onItemCleared(renderOido);
            return;
          }
          paintOidoRound();
        });
        balloons.appendChild(button);
      });
    };

    paintOidoRound();
  };

  const renderPalabras = () => {
    if (missionComplete || packIndex >= picturePack.length) {
      return;
    }

    const current = picturePack[packIndex];
    const distractors = shuffleWithRng(
      pictureWords.filter((entry) => entry.word !== current.word),
      random
    ).slice(0, 2);
    const choices = shuffleWithRng(
      [current.word, ...distractors.map((entry) => entry.word)],
      random
    );

    root.innerHTML = `
      <p class="prompt-line"><strong>¿Qué es?</strong></p>
      <p class="round-meter">${progressLabel()} de hoy</p>
      <div class="big-emoji" aria-hidden="true">${current.emoji}</div>
      <div class="choice-grid" data-choices></div>
      <p class="feedback" data-feedback>Elige la palabra</p>
    `;

    const choiceGrid = root.querySelector("[data-choices]");
    choices.forEach((word) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-btn";
      button.textContent = word;
      button.addEventListener("click", () => {
        if (word === current.word) {
          speakSpanish(current.word);
          onItemCleared(renderPalabras);
        } else {
          skyeMood("sad");
          setFeedback("Casi, otra vez 💫");
        }
      });
      choiceGrid.appendChild(button);
    });
  };

  const renderMissing = () => {
    if (missionComplete || packIndex >= missingPack.length) {
      return;
    }

    const current = missingPack[packIndex];
    const letters = current.word.split("");
    letters[current.holeIndex] = "_";

    root.innerHTML = `
      <p class="prompt-line">
        <strong>Letra que falta</strong>
        <span class="target-word" data-target-word>${current.word}</span>
      </p>
      <button type="button" class="btn speak-btn" data-speak>🔊 Escuchar</button>
      <p class="round-meter">${progressLabel()} de hoy</p>
      <p class="sentence">${letters.join(" ")}</p>
      <div class="choice-grid" data-choices></div>
      <p class="feedback" data-feedback>Elige la letra</p>
    `;

    wireSpeakControls(root, current.word);

    const choiceGrid = root.querySelector("[data-choices]");
    shuffleWithRng([...current.choices], random).forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-btn";
      button.textContent = letter;
      button.addEventListener("click", () => {
        const answer = current.word[current.holeIndex];
        if (letter === answer) {
          root
            .querySelector("[data-target-word]")
            ?.classList.add("target-word--done");
          speakSpanish(current.word);
          onItemCleared(renderMissing);
        } else {
          skyeMood("sad");
          setFeedback("Casi, otra vez 💫");
        }
      });
      choiceGrid.appendChild(button);
    });
  };

  const renderFrases = () => {
    if (missionComplete || packIndex >= sentencePack.length) {
      return;
    }

    const current = sentencePack[packIndex];
    root.innerHTML = `
      <p class="prompt-line"><strong>Lee y responde</strong></p>
      <p class="round-meter">${progressLabel()} de hoy</p>
      <p class="sentence" data-sentence>${current.text}</p>
      <button type="button" class="btn speak-btn" data-speak>🔊 Escuchar</button>
      <p class="question-line">${current.question}</p>
      <div class="choice-grid" data-choices></div>
      <p class="feedback" data-feedback>Toca la respuesta</p>
    `;

    wireSpeakControls(root, current.text);
    const sentenceNode = root.querySelector("[data-sentence]");
    if (sentenceNode) {
      sentenceNode.setAttribute("role", "button");
      sentenceNode.setAttribute("tabindex", "0");
      sentenceNode.title = "Toca para escuchar";
      const onSpeakSentence = () => speakSpanish(current.text);
      sentenceNode.addEventListener("click", onSpeakSentence);
      sentenceNode.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSpeakSentence();
        }
      });
    }

    const choiceGrid = root.querySelector("[data-choices]");
    shuffleWithRng([...current.choices], random).forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-btn";
      button.textContent = choice;
      button.addEventListener("click", () => {
        if (choice === current.answer) {
          speakSpanish(current.answer);
          onItemCleared(renderFrases);
        } else {
          skyeMood("sad");
          setFeedback("Casi, otra vez 💫");
        }
      });
      choiceGrid.appendChild(button);
    });
  };

  if (params.activity === "palabras") {
    renderPalabras();
  } else if (params.activity === "frases") {
    renderFrases();
  } else if (params.activity === "letra") {
    renderMissing();
  } else if (params.activity === "oido") {
    renderOido();
  } else {
    renderSilabas();
  }
};
