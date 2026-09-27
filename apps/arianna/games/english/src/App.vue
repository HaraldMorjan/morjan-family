<script>
import { computed, onMounted, ref } from "vue";
import { DAILY_WORD_COUNT, MEMORY_PAIR_COUNT, getSet } from "./vocabulary.js";
import {
  loadProgress,
  markMissionDone,
  recordMastery,
  createUniquePicker,
  wasProgressSaved
} from "@shared/progress.js";
import { celebrate, celebrateMissionVictory } from "@shared/celebrate.js";
import {
  getMissionStars,
  missionsForGame,
  isQrDeepLink
} from "@shared/missions.js";
import { getDayKey, pickDailyPack } from "@shared/dailySeed.js";
import { pulseCharacterMood } from "@shared/characterMood.js";

const kuromiMood = (mood) => pulseCharacterMood(".kuromi-brand", mood);

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

const SPEAK_LANG_ENGLISH = "en-US";
const SPEAK_LANG_SPANISH = "es-MX";
const MEMORY_MISS_HOLD_MS = 1500;
const MEMORY_NEXT_ROUND_MS = 2200;

const buildMemoryCue = (word) => {
  if (word.swatch) {
    return { cueType: "swatch", cueValue: word.swatch };
  }
  return { cueType: "emoji", cueValue: word.emoji };
};

const KUROMI_PICKER_BLURBS = {
  "kuromi-match-animals": "Match — elige la palabra en inglés",
  "kuromi-memory-colors": "Memory — inglés ↔ español",
  "kuromi-picture-memory-animals": "Pics — imagen ↔ palabra",
  "kuromi-spell-food": "Spell — ¿cuál es la palabra?"
};

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  const missionId = params.get("mission");
  return {
    missionId,
    mode: params.get("mode") || "match",
    set: params.get("set") || "animals",
    // Only printed / board QR URLs get qr=1 — Club pickers keep ← Modos
    fromQrScan: isQrDeepLink(params),
    showPicker: !missionId
  };
};

const missionQueryHref = (mission) => {
  const search = new URLSearchParams(mission.query).toString();
  return `?${search}`;
};

export default {
  setup() {
    const params = readParams();
    const pickerMissions = missionsForGame("english");
    const words = params.showPicker
      ? []
      : pickDailyPack(
          getSet(params.set),
          DAILY_WORD_COUNT,
          `${params.missionId}-${params.set}`,
          getDayKey()
        );
    const uniqueWordPicker = createUniquePicker(
      words.map((word) => word.id)
    );

    const takeSessionWords = (count) => {
      const pickedIds = uniqueWordPicker.take(count);
      return pickedIds
        .map((wordId) => words.find((word) => word.id === wordId))
        .filter((word) => Boolean(word));
    };
    const stars = ref(loadProgress().stars);
    const feedback = ref("¡Vamos!");
    const missionComplete = ref(false);
    const mode = ref(params.mode);

    const matchWord = ref(null);
    const matchChoices = ref([]);
    const matchCouple = ref("");
    const matchPickedId = ref("");
    const matchLock = ref(false);
    const matchCleared = ref(0);
    const MATCH_NEEDED = 3;

    const memoryCards = ref([]);
    const flipped = ref([]);
    const lockBoard = ref(false);
    const memoryCouple = ref("");

    const spellWord = ref(null);
    const spellChoices = ref([]);
    const spellCleared = ref(0);
    const spellCouple = ref("");
    const stampedWordId = ref("");
    const spellLock = ref(false);
    const SPELL_NEEDED = 3;
    const SPELL_NEXT_ROUND_MS = 2200;

    const speakSequence = (parts) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return;
      }
      window.speechSynthesis.cancel();
      parts.forEach((part) => {
        const utterance = new SpeechSynthesisUtterance(part.text);
        utterance.lang = part.lang;
        window.speechSynthesis.speak(utterance);
      });
    };

    const speak = (text, lang = SPEAK_LANG_ENGLISH) => {
      speakSequence([{ text, lang }]);
    };

    const speakWordCouple = (spanishWord, englishWord) => {
      speakSequence([
        { text: spanishWord, lang: SPEAK_LANG_SPANISH },
        { text: englishWord, lang: SPEAK_LANG_ENGLISH }
      ]);
    };

    const refreshStars = () => {
      stars.value = loadProgress().stars;
    };

    const completeMission = () => {
      if (missionComplete.value || !params.missionId) return;
      const starsEarned = getMissionStars(params.missionId);
      const next = markMissionDone(params.missionId, starsEarned);
      if (!wasProgressSaved(next)) {
        stars.value = loadProgress().stars;
        feedback.value = "No se pudo guardar. Pide ayuda y vuelve a intentarlo.";
        return;
      }
      stars.value = next.stars;
      missionComplete.value = true;
      feedback.value = "¡Club secreto desbloqueado! 🎀";
      kuromiMood("happy");
      celebrateMissionVictory({
        theme: "kuromi",
        title: "¡CLUB DESBLOQUEADO!",
        subtitle: "¡Kuromi está orgullosa de ti!",
        starsEarned
      });
    };

    const startMatch = () => {
      if (missionComplete.value) return;

      const [preferred] = takeSessionWords(1);
      if (!preferred) {
        return;
      }
      matchWord.value = preferred;
      matchChoices.value = shuffle([
        preferred,
        ...shuffle(words.filter((word) => word.id !== preferred.id)).slice(0, 2)
      ]);
      matchCouple.value = "";
      matchPickedId.value = "";
      matchLock.value = false;
      feedback.value = "Toca el animal · elige el inglés";
    };

    const speakMatchPicture = () => {
      if (!matchWord.value) return;
      speakWordCouple(matchWord.value.es, matchWord.value.en);
    };

    const onMatch = (word) => {
      if (matchLock.value || !matchWord.value) return;

      const correct = word.id === matchWord.value.id;
      recordMastery(word.id, correct);
      if (correct) {
        matchLock.value = true;
        matchPickedId.value = word.id;
        matchCouple.value = `${matchWord.value.es} = ${matchWord.value.en}`;
        matchCleared.value += 1;
        feedback.value = "¡Yes!";
        speakWordCouple(matchWord.value.es, matchWord.value.en);
        kuromiMood("happy");
        celebrate({ pieceCount: 35 });

        if (matchCleared.value >= MATCH_NEEDED) {
          completeMission();
          return;
        }

        window.setTimeout(startMatch, MEMORY_NEXT_ROUND_MS);
      } else {
        feedback.value = "Casi, otra vez 💫";
        kuromiMood("sad");
        recordMastery(matchWord.value.id, false);
      }
    };

    const memoryPairType = ref(
      mode.value === "picture-memory" ? "picture" : "text"
    );

    const startMemory = (pairType = memoryPairType.value) => {
      memoryPairType.value = pairType;
      const pairWords = takeSessionWords(MEMORY_PAIR_COUNT);
      if (pairWords.length === 0) {
        return;
      }
      const cards = [];

      pairWords.forEach((word) => {
        const memoryCue = buildMemoryCue(word);
        if (pairType === "picture") {
          cards.push({
            key: `${word.id}-pic`,
            pairId: word.id,
            label: word.emoji,
            kind: "pic",
            face: "emoji",
            englishWord: word.en,
            spanishWord: word.es,
            speakText: word.es,
            speakLang: SPEAK_LANG_SPANISH
          });
          cards.push({
            key: `${word.id}-en`,
            pairId: word.id,
            label: word.en,
            kind: "en",
            face: "word",
            englishWord: word.en,
            spanishWord: word.es,
            speakText: word.en,
            speakLang: SPEAK_LANG_ENGLISH
          });
        } else {
          cards.push({
            key: `${word.id}-en`,
            pairId: word.id,
            label: word.en,
            kind: "en",
            face: "text",
            ...memoryCue,
            englishWord: word.en,
            spanishWord: word.es,
            speakText: word.en,
            speakLang: SPEAK_LANG_ENGLISH
          });
          cards.push({
            key: `${word.id}-es`,
            pairId: word.id,
            label: word.es,
            kind: "es",
            face: "text",
            ...memoryCue,
            englishWord: word.en,
            spanishWord: word.es,
            speakText: word.es,
            speakLang: SPEAK_LANG_SPANISH
          });
        }
      });

      memoryCards.value = shuffle(cards).map((card) => ({
        ...card,
        flipped: false,
        matched: false
      }));
      flipped.value = [];
      memoryCouple.value = "";
      feedback.value =
        pairType === "picture"
          ? "Empareja imagen ↔ inglés"
          : "Empareja inglés ↔ español";
    };

    const onMemoryTap = (card) => {
      if (lockBoard.value || card.flipped) return;

      if (card.matched) {
        speakWordCouple(card.spanishWord, card.englishWord);
        return;
      }

      card.flipped = true;
      if (card.speakText) {
        speak(card.speakText, card.speakLang);
      }
      flipped.value.push(card);

      if (flipped.value.length < 2) return;

      lockBoard.value = true;
      const [firstCard, secondCard] = flipped.value;
      if (firstCard.pairId === secondCard.pairId && firstCard.kind !== secondCard.kind) {
        firstCard.matched = true;
        secondCard.matched = true;
        recordMastery(firstCard.pairId, true);
        memoryCouple.value = `${firstCard.spanishWord} = ${firstCard.englishWord}`;
        feedback.value = "¡Match!";
        speakWordCouple(firstCard.spanishWord, firstCard.englishWord);
        flipped.value = [];
        lockBoard.value = false;
        kuromiMood("happy");
        celebrate({ pieceCount: 30 });
        if (memoryCards.value.every((entry) => entry.matched)) {
          completeMission();
          window.setTimeout(() => startMemory(memoryPairType.value), MEMORY_NEXT_ROUND_MS);
        }
      } else {
        feedback.value = "Casi, otra vez 💫";
        kuromiMood("sad");
        recordMastery(firstCard.pairId, false);
        window.setTimeout(() => {
          firstCard.flipped = false;
          secondCard.flipped = false;
          flipped.value = [];
          lockBoard.value = false;
        }, MEMORY_MISS_HOLD_MS);
      }
    };

    const startSpell = () => {
      if (missionComplete.value) return;

      const [preferred] = takeSessionWords(1);
      if (!preferred) {
        return;
      }
      spellWord.value = preferred;
      spellChoices.value = shuffle([
        preferred,
        ...shuffle(words.filter((word) => word.id !== preferred.id)).slice(
          0,
          2
        )
      ]);
      spellCouple.value = "";
      stampedWordId.value = "";
      spellLock.value = false;
      feedback.value = "Toca la comida · pon el sello";
    };

    const speakSpellFood = () => {
      if (!spellWord.value) return;
      speakWordCouple(spellWord.value.es, spellWord.value.en);
    };

    const onSpellChoice = (word) => {
      if (spellLock.value || missionComplete.value || !spellWord.value) return;

      const correct = word.id === spellWord.value.id;
      recordMastery(word.id, correct);
      if (!correct) {
        feedback.value = "Casi, otra vez 💫";
        kuromiMood("sad");
        recordMastery(spellWord.value.id, false);
        return;
      }

      spellLock.value = true;
      stampedWordId.value = word.id;
      spellCleared.value += 1;
      spellCouple.value = `${spellWord.value.es} = ${spellWord.value.en}`;
      feedback.value = "¡Sello!";
      speakWordCouple(spellWord.value.es, spellWord.value.en);
      kuromiMood("happy");
      celebrate({ pieceCount: 40 });

      if (spellCleared.value >= SPELL_NEEDED) {
        completeMission();
        return;
      }

      window.setTimeout(startSpell, SPELL_NEXT_ROUND_MS);
    };

    onMounted(() => {
      refreshStars();
      if (params.showPicker) {
        return;
      }
      if (mode.value === "memory") startMemory("text");
      else if (mode.value === "picture-memory") startMemory("picture");
      else if (mode.value === "spell") startSpell();
      else startMatch();
    });

    const setName = computed(() => params.set);
    const modeLabel = computed(() => {
      if (mode.value === "picture-memory") return "Pics";
      if (mode.value === "memory") return "Memory";
      if (mode.value === "spell") return "Spell";
      return "Match";
    });

    return {
      stars,
      feedback,
      missionComplete,
      mode,
      setName,
      modeLabel,
      matchWord,
      matchChoices,
      matchCouple,
      matchPickedId,
      matchCleared,
      MATCH_NEEDED,
      speakMatchPicture,
      memoryCards,
      memoryCouple,
      spellWord,
      spellChoices,
      spellCleared,
      spellCouple,
      stampedWordId,
      SPELL_NEEDED,
      onMatch,
      onMemoryTap,
      onSpellChoice,
      speakSpellFood,
      speak,
      fromQrScan: params.fromQrScan,
      showPicker: params.showPicker,
      pickerMissions,
      pickerBlurbs: KUROMI_PICKER_BLURBS,
      missionQueryHref,
      kuromiIconUrl: `${import.meta.env.BASE_URL}kuromi.svg`
    };
  }
};
</script>

<template>
  <div class="kuromi-shell">
    <header class="kuromi-top">
      <div class="kuromi-brand">
        <img
          class="kuromi-icon"
          :src="kuromiIconUrl"
          alt="Kuromi"
          width="140"
          height="140"
        />
        <h1 class="kuromi-title">Club secreto Kuromi</h1>
      </div>
      <div class="star-pill">⭐ {{ stars }}</div>
    </header>

    <section v-if="showPicker" class="kuromi-panel">
      <p class="mode-picker__lead">Elige un juego secreto</p>
      <div class="mode-picker">
        <a
          v-for="mission in pickerMissions"
          :key="mission.id"
          class="mode-pick kuromi-mode-pick"
          :href="missionQueryHref(mission)"
        >
          <h2>{{ mission.emoji }} {{ mission.label }}</h2>
          <p>{{ pickerBlurbs[mission.id] || "English words" }}</p>
          <span class="mode-pick__badge">⭐ {{ mission.stars }}</span>
        </a>
      </div>
      <div class="kuromi-actions">
        <a class="btn" href="/games/">← Club</a>
      </div>
    </section>

    <section v-else class="kuromi-panel">
      <p style="margin: 0; font-weight: 800">
        {{ setName }} · {{ modeLabel }}
      </p>

      <template v-if="mode === 'match' && matchWord">
        <p class="spell-prompt">¿Cómo se dice en inglés?</p>
        <button
          type="button"
          class="spell-food"
          @click="speakMatchPicture"
        >
          <span class="spell-food__emoji">{{ matchWord.emoji }}</span>
        </button>
        <p class="spell-home">Es {{ matchWord.es }}</p>
        <p v-if="matchCouple" class="memory-couple">{{ matchCouple }}</p>
        <div class="choice-grid">
          <button
            v-for="word in matchChoices"
            :key="word.id"
            type="button"
            class="choice-btn"
            :class="{ 'choice-btn--on': matchPickedId === word.id }"
            @click="onMatch(word)"
          >
            {{ word.en }}
          </button>
        </div>
        <p class="round-meter">{{ matchCleared }}/{{ MATCH_NEEDED }}</p>
      </template>

      <template v-else-if="mode === 'memory' || mode === 'picture-memory'">
        <p class="spell-prompt">
          {{
            mode === "picture-memory"
              ? "Imagen ↔ palabra"
              : "Inglés ↔ español"
          }}
        </p>
        <div class="memory-grid">
          <button
            v-for="card in memoryCards"
            :key="card.key"
            type="button"
            class="memory-card"
            :class="{
              flipped: card.flipped,
              matched: card.matched,
              'memory-card--emoji':
                (card.flipped || card.matched) && card.face === 'emoji',
              'memory-card--word':
                (card.flipped || card.matched) && card.face === 'word'
            }"
            @click="onMemoryTap(card)"
          >
            <template v-if="!(card.flipped || card.matched)">?</template>
            <template v-else-if="card.face === 'emoji'">{{ card.label }}</template>
            <template v-else-if="card.face === 'word'">
              <span class="memory-word memory-word--solo">{{ card.label }}</span>
            </template>
            <template v-else>
              <span
                v-if="card.cueType === 'swatch'"
                class="memory-cue memory-cue--swatch"
                :class="{ 'memory-cue--light': card.cueValue === '#ffffff' }"
                :style="{ background: card.cueValue }"
              ></span>
              <span
                v-else-if="card.cueType === 'emoji'"
                class="memory-cue memory-cue--emoji"
              >{{ card.cueValue }}</span>
              <span class="memory-word">{{ card.label }}</span>
            </template>
          </button>
        </div>
        <p v-if="memoryCouple" class="memory-couple">{{ memoryCouple }}</p>
      </template>

      <template v-else-if="mode === 'spell' && spellWord">
        <p class="spell-prompt">Pon el sello secreto</p>
        <button
          type="button"
          class="spell-food"
          @click="speakSpellFood"
        >
          <span class="spell-food__emoji">{{ spellWord.emoji }}</span>
        </button>
        <p class="spell-home">Es {{ spellWord.es }}</p>
        <p v-if="spellCouple" class="memory-couple">{{ spellCouple }}</p>
        <div class="spell-seals">
          <button
            v-for="word in spellChoices"
            :key="word.id"
            type="button"
            class="spell-seal"
            :class="{ 'spell-seal--on': stampedWordId === word.id }"
            @click="onSpellChoice(word)"
          >
            {{ word.en }}
          </button>
        </div>
        <p class="spell-skulls" aria-label="Sellos puestos">
          <span
            v-for="skullIndex in SPELL_NEEDED"
            :key="skullIndex"
          >{{ skullIndex <= spellCleared ? "💀" : "🤍" }}</span>
        </p>
      </template>

      <p
        class="feedback kuromi-feedback"
        :class="{ 'feedback-ok': missionComplete }"
      >
        {{ feedback }}
      </p>

      <div v-if="!fromQrScan" class="kuromi-actions">
        <a class="btn" href="./">← Modos</a>
        <a class="btn" href="/games/qr/">QR</a>
      </div>
    </section>
  </div>
</template>
