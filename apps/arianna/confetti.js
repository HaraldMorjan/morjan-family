(() => {
  const canvas = document.getElementById("confettiCanvas");
  const burstButton = document.getElementById("burstButton");
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (!canvas) {
    return;
  }

  const drawingContext = canvas.getContext("2d");
  if (!drawingContext) {
    return;
  }

  const confettiColors = ["#ff4fa3", "#d91f7a", "#ffb3d9", "#ffd166", "#7dd3fc", "#ffffff"];
  const confettiPieces = [];
  let animationFrameId = 0;
  let canvasWidth = 0;
  let canvasHeight = 0;

  const resizeCanvas = () => {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  };

  const createConfettiPiece = (originX, originY, burstStrength) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = burstStrength * (0.45 + Math.random() * 0.9);

    return {
      x: originX,
      y: originY,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed - burstStrength * 0.35,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      life: 1,
      decay: 0.004 + Math.random() * 0.008,
      shape: Math.random() > 0.45 ? "rect" : "circle"
    };
  };

  const spawnBurst = (pieceCount, originX, originY, burstStrength) => {
    for (let index = 0; index < pieceCount; index += 1) {
      confettiPieces.push(createConfettiPiece(originX, originY, burstStrength));
    }
  };

  const drawConfettiPiece = (piece) => {
    drawingContext.save();
    drawingContext.translate(piece.x, piece.y);
    drawingContext.rotate(piece.rotation);
    drawingContext.globalAlpha = Math.max(piece.life, 0);
    drawingContext.fillStyle = piece.color;

    if (piece.shape === "circle") {
      drawingContext.beginPath();
      drawingContext.arc(0, 0, piece.size * 0.45, 0, Math.PI * 2);
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
  };

  const updateAndDraw = () => {
    drawingContext.clearRect(0, 0, canvasWidth, canvasHeight);

    for (let index = confettiPieces.length - 1; index >= 0; index -= 1) {
      const piece = confettiPieces[index];
      piece.velocityY += 0.12;
      piece.velocityX *= 0.99;
      piece.x += piece.velocityX;
      piece.y += piece.velocityY;
      piece.rotation += piece.rotationSpeed;
      piece.life -= piece.decay;

      if (piece.life <= 0 || piece.y > canvasHeight + 40) {
        confettiPieces.splice(index, 1);
        continue;
      }

      drawConfettiPiece(piece);
    }

    if (confettiPieces.length > 0) {
      animationFrameId = window.requestAnimationFrame(updateAndDraw);
    } else {
      animationFrameId = 0;
    }
  };

  const ensureAnimationRunning = () => {
    if (animationFrameId === 0) {
      animationFrameId = window.requestAnimationFrame(updateAndDraw);
    }
  };

  const celebrate = () => {
    if (prefersReducedMotion) {
      return;
    }

    spawnBurst(90, canvasWidth * 0.5, canvasHeight * 0.35, 14);
    spawnBurst(50, canvasWidth * 0.2, canvasHeight * 0.25, 10);
    spawnBurst(50, canvasWidth * 0.8, canvasHeight * 0.25, 10);
    ensureAnimationRunning();
  };

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  if (burstButton) {
    burstButton.addEventListener("click", () => {
      if (prefersReducedMotion) {
        return;
      }

      spawnBurst(70, canvasWidth * 0.5, canvasHeight * 0.45, 16);
      ensureAnimationRunning();
    });
  }

  celebrate();
})();
