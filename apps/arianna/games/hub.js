import {
  loadProgress,
  setFavoriteSticker,
  spendStars
} from "./shared/progress.js";
import { prizeCatalog } from "./shared/prizes.js";
import { celebrate } from "./shared/celebrate.js";
import {
  stickerAlbum,
  getStickerById,
  countUnlockedInAlbum,
  getCurrentAlbumGoal
} from "./shared/stickers.js";

const starPill = document.getElementById("starPill");
const streakLine = document.getElementById("streakLine");
const stickerGrid = document.getElementById("stickerGrid");
const prizeShelf = document.getElementById("prizeShelf");
const albumProgress = document.getElementById("albumProgress");
const albumGoal = document.getElementById("albumGoal");
const albumFavorite = document.getElementById("albumFavorite");
const pendingRedemptionTimers = new Set();

const cancelPendingRedemptions = () => {
  pendingRedemptionTimers.forEach((timerId) => window.clearTimeout(timerId));
  pendingRedemptionTimers.clear();
};

const render = () => {
  cancelPendingRedemptions();
  const progress = loadProgress();
  const unlockedCount = countUnlockedInAlbum(progress.stickers);
  const goal = getCurrentAlbumGoal(unlockedCount);

  if (starPill) {
    starPill.textContent = `⭐ ${progress.stars}`;
  }

  if (streakLine) {
    streakLine.textContent = `Días seguidos: ${progress.streak.count}`;
  }

  if (albumProgress) {
    albumProgress.textContent = `${unlockedCount} / ${stickerAlbum.length}`;
  }

  if (albumGoal) {
    albumGoal.textContent = goal.complete
      ? goal.label
      : `Meta: ${goal.label} (faltan ${goal.remaining})`;
  }

  if (albumFavorite) {
    const favorite = getStickerById(progress.favoriteSticker);
    if (favorite && progress.stickers.includes(favorite.id)) {
      albumFavorite.hidden = false;
      albumFavorite.innerHTML = `
        <span class="album-favorite__emoji" aria-hidden="true">${favorite.emoji}</span>
        <span class="album-favorite__label">Favorita: <strong>${favorite.name}</strong></span>
      `;
    } else {
      albumFavorite.hidden = true;
      albumFavorite.innerHTML = "";
    }
  }

  if (stickerGrid) {
    stickerGrid.innerHTML = "";
    stickerAlbum.forEach((sticker) => {
      const unlocked = progress.stickers.includes(sticker.id);
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = `sticker${unlocked ? " sticker--unlocked" : " sticker--locked"}${
        progress.favoriteSticker === sticker.id ? " sticker--favorite" : ""
      }${sticker.rarity === "rare" ? " sticker--rare" : ""}`;
      slot.title = unlocked ? sticker.name : sticker.hint;
      slot.setAttribute(
        "aria-label",
        unlocked
          ? `${sticker.name}. Toca para poner de favorita.`
          : `Bloqueada. ${sticker.hint}`
      );
      slot.innerHTML = unlocked
        ? `<span class="sticker__emoji">${sticker.emoji}</span><span class="sticker__name">${sticker.name}</span>`
        : `<span class="sticker__lock" aria-hidden="true">?</span><span class="sticker__hint">${sticker.hint}</span>`;

      slot.addEventListener("click", () => {
        if (!unlocked) {
          celebrate({ pieceCount: 12 });
          return;
        }
        setFavoriteSticker(sticker.id);
        celebrate({ pieceCount: 55 });
        render();
      });

      stickerGrid.appendChild(slot);
    });
  }

  if (prizeShelf) {
    prizeShelf.innerHTML = "";
    prizeCatalog.forEach((prize) => {
      const row = document.createElement("div");
      row.className = "prize-row";
      if (progress.stars < prize.cost) {
        row.classList.add("prize-locked");
      }

      const info = document.createElement("div");
      info.innerHTML = `<strong>${prize.emoji} ${prize.label}</strong><br/><span>${prize.cost} ⭐</span>`;

      const redeemButton = document.createElement("button");
      redeemButton.className = "btn prize-redeem";
      redeemButton.type = "button";
      redeemButton.textContent = "Canjear";
      redeemButton.disabled = progress.stars < prize.cost;
      redeemButton.dataset.prizeId = prize.id;

      let holdTimerId = 0;
      const clearHold = () => {
        window.clearTimeout(holdTimerId);
        pendingRedemptionTimers.delete(holdTimerId);
        holdTimerId = 0;
        redeemButton.textContent = "Canjear";
      };

      redeemButton.addEventListener("pointerdown", () => {
        if (redeemButton.disabled) return;
        redeemButton.textContent = "Sigue…";
        const timerId = window.setTimeout(() => {
          pendingRedemptionTimers.delete(timerId);
          if (holdTimerId === timerId) {
            holdTimerId = 0;
          }
          const result = spendStars(prize.cost);
          if (!result.ok) {
            clearHold();
            return;
          }
          celebrate({ pieceCount: 90 });
          showCoupon(prize);
          render();
          clearHold();
        }, 900);
        holdTimerId = timerId;
        pendingRedemptionTimers.add(timerId);
      });

      ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
        redeemButton.addEventListener(eventName, clearHold);
      });

      row.appendChild(info);
      row.appendChild(redeemButton);
      prizeShelf.appendChild(row);
    });
  }
};

const showCoupon = (prize) => {
  let coupon = document.getElementById("prizeCoupon");
  if (!coupon) {
    coupon = document.createElement("div");
    coupon.id = "prizeCoupon";
    coupon.className = "coupon";
    coupon.innerHTML = `
      <div class="coupon-card">
        <h3>¡Premio!</h3>
        <p id="couponText"></p>
        <button type="button" class="btn btn-primary" id="couponClose">OK</button>
      </div>
    `;
    document.body.appendChild(coupon);
    coupon.querySelector("#couponClose").addEventListener("click", () => {
      coupon.hidden = true;
    });
  }

  coupon.querySelector("#couponText").textContent =
    `${prize.emoji} ${prize.label}`;
  coupon.hidden = false;
};

render();
