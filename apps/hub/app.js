(() => {
  const hostLabel = document.getElementById("hostLabel");
  const shootingSky = document.getElementById("shootingSky");
  const celestial = document.getElementById("celestial");
  const leadText = document.getElementById("leadText");
  const skySunButton = document.getElementById("skySunButton");
  const skyMoonButton = document.getElementById("skyMoonButton");
  const skyAutoButton = document.getElementById("skyAutoButton");
  const documentBody = document.body;

  const dayStartHour = 6;
  const dayEndHour = 18;
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let shootingStarsActive = false;
  let shootingStarsTimerId = 0;
  let selectionMode = "auto";
  let currentDaytime = false;

  if (hostLabel) {
    hostLabel.textContent = window.location.hostname || "local preview";
  }

  const isDaytimeByClock = (date = new Date()) => {
    const currentHour = date.getHours();
    return currentHour >= dayStartHour && currentHour < dayEndHour;
  };

  const updateSwitchButtons = () => {
    if (!skySunButton || !skyMoonButton || !skyAutoButton) {
      return;
    }

    const autoSelected = selectionMode === "auto";
    skyAutoButton.setAttribute("aria-pressed", autoSelected ? "true" : "false");
    skySunButton.setAttribute(
      "aria-pressed",
      !autoSelected && currentDaytime ? "true" : "false"
    );
    skyMoonButton.setAttribute(
      "aria-pressed",
      !autoSelected && !currentDaytime ? "true" : "false"
    );
  };

  const applySkyMode = (daytime) => {
    currentDaytime = daytime;
    const modeName = daytime ? "sun" : "moon";

    documentBody.classList.toggle("theme-day", daytime);
    documentBody.classList.toggle("theme-night", !daytime);

    if (celestial) {
      celestial.dataset.mode = modeName;
    }

    if (leadText) {
      leadText.textContent = daytime
        ? "Our family under the sun — tap a name to visit."
        : "Our family in the night sky — tap a name to visit.";
    }

    if (daytime) {
      stopShootingStars();
    } else if (!prefersReducedMotion) {
      startShootingStars();
    }

    updateSwitchButtons();
  };

  const resolveAndApplySkyMode = () => {
    if (selectionMode === "auto") {
      applySkyMode(isDaytimeByClock());
      return;
    }

    applySkyMode(selectionMode === "sun");
  };

  const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

  const pickSpawn = () => {
    const sideRoll = Math.random();

    if (sideRoll < 0.25) {
      return {
        left: randomBetween(-8, 70),
        top: randomBetween(-6, 8),
        angle: randomBetween(25, 55),
        travelX: `${randomBetween(28, 55)}vw`,
        travelY: `${randomBetween(22, 48)}vh`
      };
    }

    if (sideRoll < 0.5) {
      return {
        left: randomBetween(30, 105),
        top: randomBetween(-6, 10),
        angle: randomBetween(120, 155),
        travelX: `${randomBetween(-55, -28)}vw`,
        travelY: `${randomBetween(22, 48)}vh`
      };
    }

    if (sideRoll < 0.75) {
      return {
        left: randomBetween(-10, 6),
        top: randomBetween(8, 70),
        angle: randomBetween(10, 40),
        travelX: `${randomBetween(35, 65)}vw`,
        travelY: `${randomBetween(10, 40)}vh`
      };
    }

    return {
      left: randomBetween(94, 108),
      top: randomBetween(8, 70),
      angle: randomBetween(140, 170),
      travelX: `${randomBetween(-65, -35)}vw`,
      travelY: `${randomBetween(10, 40)}vh`
    };
  };

  const spawnShootingStar = () => {
    if (!shootingSky || !shootingStarsActive) {
      return;
    }

    const spawn = pickSpawn();
    const shootingStar = document.createElement("span");
    shootingStar.className = "shooting-star";
    shootingStar.style.left = `${spawn.left}%`;
    shootingStar.style.top = `${spawn.top}%`;
    shootingStar.style.setProperty("--angle", `${spawn.angle}deg`);
    shootingStar.style.setProperty("--travel-x", spawn.travelX);
    shootingStar.style.setProperty("--travel-y", spawn.travelY);
    shootingStar.style.setProperty(
      "--duration",
      `${randomBetween(0.75, 1.45)}s`
    );
    shootingStar.style.setProperty(
      "--length",
      `${randomBetween(70, 130)}px`
    );

    shootingSky.appendChild(shootingStar);

    window.setTimeout(() => {
      shootingStar.remove();
    }, 1600);
  };

  const scheduleNextShootingStar = () => {
    if (!shootingStarsActive) {
      return;
    }

    const delayMs = randomBetween(900, 3200);
    shootingStarsTimerId = window.setTimeout(() => {
      spawnShootingStar();
      if (Math.random() < 0.22) {
        window.setTimeout(spawnShootingStar, randomBetween(120, 380));
      }
      scheduleNextShootingStar();
    }, delayMs);
  };

  const startShootingStars = () => {
    if (shootingStarsActive || !shootingSky) {
      return;
    }

    shootingStarsActive = true;
    window.setTimeout(spawnShootingStar, randomBetween(400, 1200));
    scheduleNextShootingStar();
  };

  const stopShootingStars = () => {
    shootingStarsActive = false;
    window.clearTimeout(shootingStarsTimerId);
    if (shootingSky) {
      shootingSky.innerHTML = "";
    }
  };

  if (skySunButton) {
    skySunButton.addEventListener("click", () => {
      selectionMode = "sun";
      resolveAndApplySkyMode();
    });
  }

  if (skyMoonButton) {
    skyMoonButton.addEventListener("click", () => {
      selectionMode = "moon";
      resolveAndApplySkyMode();
    });
  }

  if (skyAutoButton) {
    skyAutoButton.addEventListener("click", () => {
      selectionMode = "auto";
      resolveAndApplySkyMode();
    });
  }

  resolveAndApplySkyMode();
  window.setInterval(() => {
    if (selectionMode === "auto") {
      resolveAndApplySkyMode();
    }
  }, 60 * 1000);
})();
