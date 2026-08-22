/**
 * Kid celebrations — small bursts + big mission-victory takeover.
 */

const celebrateColors = [
  "#ff4fa3",
  "#d91f7a",
  "#ffb3d9",
  "#ffd166",
  "#7dd3fc",
  "#bbf7d0",
  "#ffffff",
  "#a78bfa",
  "#fbbf24"
];

const themeStyles = {
  rumi: {
    glow: "#f472b6",
    title: "#fce7f3",
    panel: "linear-gradient(160deg, #4c1d95, #9d174d 55%, #db2777)",
    emoji: "🎤"
  },
  skye: {
    glow: "#fb7185",
    title: "#fff1f2",
    panel: "linear-gradient(160deg, #0ea5e9, #f472b6 60%, #fb7185)",
    emoji: "✈️"
  },
  kuromi: {
    glow: "#c084fc",
    title: "#faf5ff",
    panel: "linear-gradient(160deg, #1e1b4b, #6d28d9 50%, #db2777)",
    emoji: "🎀"
  },
  pink: {
    glow: "#ff4fa3",
    title: "#fff0f7",
    panel: "linear-gradient(160deg, #db2777, #f472b6)",
    emoji: "⭐"
  }
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ensureCelebrateStyles = () => {
  if (typeof document === "undefined") return;
  if (document.getElementById("celebrateStyles")) return;

  const styleTag = document.createElement("style");
  styleTag.id = "celebrateStyles";
  styleTag.textContent = `
    #celebrateCanvas {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9998;
    }
    .mission-victory {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      padding: 1.25rem;
      background: rgba(15, 10, 30, 0.72);
      animation: victory-fade 0.35s ease both;
    }
    .mission-victory[hidden] { display: none !important; }
    .mission-victory__card {
      width: min(22rem, 100%);
      padding: 1.75rem 1.35rem 1.4rem;
      border-radius: 1.75rem;
      border: 4px solid #fff;
      text-align: center;
      box-shadow:
        0 0 0 6px rgba(255, 255, 255, 0.15),
        0 20px 50px rgba(0, 0, 0, 0.45),
        0 0 80px var(--victory-glow, #ff4fa3);
      animation: victory-pop 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
      color: #fff;
    }
    .mission-victory__rays {
      position: absolute;
      inset: -40%;
      background: conic-gradient(from 0deg, transparent 0 8%, rgba(255,255,255,0.18) 8% 12%, transparent 12% 20%);
      animation: victory-spin 8s linear infinite;
      pointer-events: none;
      opacity: 0.55;
    }
    .mission-victory__emoji {
      font-size: clamp(3.5rem, 16vw, 5rem);
      line-height: 1;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,0.35));
      animation: victory-bounce 0.9s ease infinite alternate;
    }
    .mission-victory__eyebrow {
      margin: 0.75rem 0 0.25rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-size: 0.85rem;
      opacity: 0.9;
    }
    .mission-victory__title {
      margin: 0;
      font-family: "Baloo 2", "Comic Sans MS", cursive;
      font-size: clamp(2.1rem, 9vw, 2.9rem);
      line-height: 0.95;
      color: var(--victory-title, #fff);
      text-shadow: 0 0 24px var(--victory-glow, #ff4fa3);
    }
    .mission-victory__subtitle {
      margin: 0.75rem 0 0;
      font-weight: 800;
      font-size: 1.15rem;
      line-height: 1.3;
    }
    .mission-victory__stars {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 1rem;
      padding: 0.55rem 1rem;
      border-radius: 999px;
      background: #fff7ed;
      border: 3px solid #f59e0b;
      color: #78350f;
      font-weight: 800;
      font-size: 1.35rem;
      animation: victory-star 0.7s ease 0.2s both;
    }
    .mission-victory__hint {
      margin: 0.85rem 0 0;
      font-weight: 700;
      font-size: 0.95rem;
      opacity: 0.92;
    }
    .mission-victory__btn {
      margin-top: 1.15rem;
      min-height: 64px;
      min-width: 70%;
      padding: 0.75rem 1.25rem;
      border: 0;
      border-radius: 1rem;
      background: #fff;
      color: #831843;
      font-family: inherit;
      font-weight: 800;
      font-size: 1.2rem;
      cursor: pointer;
      box-shadow: 0 6px 0 rgba(0,0,0,0.2);
    }
    .mission-victory__btn:active {
      transform: translateY(3px);
      box-shadow: 0 3px 0 rgba(0,0,0,0.2);
    }
    @keyframes victory-fade {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes victory-pop {
      from { opacity: 0; transform: scale(0.55) translateY(24px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes victory-bounce {
      from { transform: translateY(0) scale(1); }
      to { transform: translateY(-10px) scale(1.08); }
    }
    @keyframes victory-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes victory-star {
      from { opacity: 0; transform: scale(0.6); }
      to { opacity: 1; transform: scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .mission-victory,
      .mission-victory__card,
      .mission-victory__emoji,
      .mission-victory__rays,
      .mission-victory__stars {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(styleTag);
};

const playVictoryFanfare = () => {
  if (typeof window === "undefined") return;
  if (prefersReducedMotion()) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const startAt = audioContext.currentTime + 0.02;

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gainNode.gain.setValueAtTime(0.0001, startAt + index * 0.12);
      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        startAt + index * 0.12 + 0.04
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + index * 0.12 + 0.35
      );
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(startAt + index * 0.12);
      oscillator.stop(startAt + index * 0.12 + 0.4);
    });

    window.setTimeout(() => {
      audioContext.close().catch((closeError) => {
        void closeError;
      });
    }, 1200);
  } catch (audioError) {
    void audioError;
  }
};

export const celebrate = (options = {}) => {
  const {
    pieceCount = 70,
    originX = typeof window !== "undefined" ? window.innerWidth * 0.5 : 0,
    originY = typeof window !== "undefined" ? window.innerHeight * 0.35 : 0
  } = options;

  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  ensureCelebrateStyles();

  if (prefersReducedMotion()) {
    return;
  }

  let canvas = document.getElementById("celebrateCanvas");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "celebrateCanvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
  }

  const drawingContext = canvas.getContext("2d");
  if (!drawingContext) {
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  for (let index = 0; index < pieceCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 8 + Math.random() * 12;
    pieces.push({
      x: originX + (Math.random() - 0.5) * 80,
      y: originY + (Math.random() - 0.5) * 40,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - 8,
      size: 7 + Math.random() * 10,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      color: celebrateColors[Math.floor(Math.random() * celebrateColors.length)],
      life: 1,
      decay: 0.006 + Math.random() * 0.008
    });
  }

  const tick = () => {
    drawingContext.clearRect(0, 0, canvas.width, canvas.height);

    for (let index = pieces.length - 1; index >= 0; index -= 1) {
      const piece = pieces[index];
      piece.velocityY += 0.18;
      piece.x += piece.velocityX;
      piece.y += piece.velocityY;
      piece.rotation += piece.rotationSpeed;
      piece.life -= piece.decay;

      if (piece.life <= 0) {
        pieces.splice(index, 1);
        continue;
      }

      drawingContext.save();
      drawingContext.translate(piece.x, piece.y);
      drawingContext.rotate(piece.rotation);
      drawingContext.globalAlpha = Math.max(piece.life, 0);
      drawingContext.fillStyle = piece.color;
      if (Math.random() > 0.55) {
        drawingContext.beginPath();
        drawingContext.arc(0, 0, piece.size * 0.4, 0, Math.PI * 2);
        drawingContext.fill();
      } else {
        drawingContext.fillRect(
          -piece.size * 0.5,
          -piece.size * 0.25,
          piece.size,
          piece.size * 0.5
        );
      }
      drawingContext.restore();
    }

    if (pieces.length > 0) {
      window.requestAnimationFrame(tick);
    } else {
      drawingContext.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  window.requestAnimationFrame(tick);
};

/**
 * Full-screen victory for finishing a mission — big, loud (visual), unmissable.
 */
export const celebrateMissionVictory = (options = {}) => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  ensureCelebrateStyles();

  const {
    title = "¡MISIÓN CUMPLIDA!",
    subtitle = "¡Lo lograste como una campeona!",
    starsEarned = 8,
    theme = "pink",
    hint = "Tu QR ya está en verde hoy ✨"
  } = options;

  const themeConfig = themeStyles[theme] || themeStyles.pink;

  celebrate({
    pieceCount: prefersReducedMotion() ? 0 : 160,
    originX: window.innerWidth * 0.5,
    originY: window.innerHeight * 0.3
  });

  window.setTimeout(() => {
    celebrate({
      pieceCount: prefersReducedMotion() ? 0 : 90,
      originX: window.innerWidth * 0.2,
      originY: window.innerHeight * 0.25
    });
    celebrate({
      pieceCount: prefersReducedMotion() ? 0 : 90,
      originX: window.innerWidth * 0.8,
      originY: window.innerHeight * 0.25
    });
  }, 220);

  playVictoryFanfare();

  let overlay = document.getElementById("missionVictory");
  if (overlay) {
    overlay.remove();
  }

  overlay = document.createElement("div");
  overlay.id = "missionVictory";
  overlay.className = "mission-victory";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "missionVictoryTitle");

  overlay.innerHTML = `
    <div class="mission-victory__card" style="background:${themeConfig.panel};--victory-glow:${themeConfig.glow};--victory-title:${themeConfig.title};position:relative;overflow:hidden;">
      <div class="mission-victory__rays" aria-hidden="true"></div>
      <div style="position:relative;z-index:1;">
        <div class="mission-victory__emoji" aria-hidden="true">${themeConfig.emoji}</div>
        <p class="mission-victory__eyebrow">Desafío superado</p>
        <h2 class="mission-victory__title" id="missionVictoryTitle">${title}</h2>
        <p class="mission-victory__subtitle">${subtitle}</p>
        <div class="mission-victory__stars">${
          starsEarned > 0
            ? `⭐ +${starsEarned} estrellas`
            : "⭐ ¡Campeona del día!"
        }</div>
        <p class="mission-victory__hint">${hint}</p>
        <button type="button" class="mission-victory__btn" id="missionVictoryClose">¡Genial!</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeOverlay = () => {
    overlay.remove();
  };

  overlay
    .querySelector("#missionVictoryClose")
    ?.addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });
};
