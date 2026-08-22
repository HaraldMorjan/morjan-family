import {
  missions,
  buildMissionUrl,
  PRODUCTION_ORIGIN
} from "../shared/missions.js";
import { loadProgress, isMissionDone } from "../shared/progress.js";

const missionGrid = document.getElementById("missionGrid");
const starPill = document.getElementById("starPill");
const printButton = document.getElementById("printButton");

const isLocalHost = () => {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
};

const resolveBaseOrigin = () =>
  isLocalHost() ? window.location.origin : PRODUCTION_ORIGIN;

const renderBoard = () => {
  const progress = loadProgress();
  if (starPill) {
    starPill.textContent = `⭐ ${progress.stars}`;
  }

  if (!missionGrid) {
    return;
  }

  missionGrid.innerHTML = "";
  const baseOrigin = resolveBaseOrigin();

  missions.forEach((mission) => {
    const done = isMissionDone(mission.id, progress);
    const missionUrl = buildMissionUrl(mission, baseOrigin);

    const tile = document.createElement("article");
    tile.className = `mission-tile${done ? " mission-tile--done" : ""}`;
    tile.dataset.missionId = mission.id;

    const emoji = document.createElement("div");
    emoji.className = "mission-emoji";
    emoji.textContent = mission.emoji;

    const label = document.createElement("p");
    label.className = "mission-label";
    label.textContent = mission.label;

    const points = document.createElement("p");
    points.className = "mission-points";
    points.textContent = `⭐ ${mission.stars ?? 8}`;

    const qrHost = document.createElement("div");
    qrHost.className = "mission-qr";
    qrHost.setAttribute("aria-label", `QR para ${mission.label}`);

    const openLink = document.createElement("a");
    openLink.className = "open-link";
    openLink.href = missionUrl;
    openLink.textContent = "Abrir";

    tile.appendChild(emoji);
    tile.appendChild(label);
    tile.appendChild(points);
    tile.appendChild(qrHost);
    tile.appendChild(openLink);
    missionGrid.appendChild(tile);

    if (typeof QRCode !== "undefined") {
      new QRCode(qrHost, {
        text: missionUrl,
        width: 140,
        height: 140,
        colorDark: done ? "#15803d" : "#d91f7a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  });
};

if (printButton) {
  printButton.addEventListener("click", () => {
    window.print();
  });
}

renderBoard();
