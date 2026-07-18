(() => {
  const tripGrid = document.getElementById("tripGrid");
  const hostLabel = document.getElementById("hostLabel");
  const galleryDialog = document.getElementById("galleryDialog");
  const galleryTitle = document.getElementById("galleryTitle");
  const galleryStageImage = document.getElementById("galleryStageImage");
  const galleryCounter = document.getElementById("galleryCounter");
  const galleryThumbs = document.getElementById("galleryThumbs");
  const galleryCloseButton = document.getElementById("galleryCloseButton");
  const galleryPreviousButton = document.getElementById("galleryPreviousButton");
  const galleryNextButton = document.getElementById("galleryNextButton");

  if (hostLabel) {
    hostLabel.textContent = window.location.hostname || "local preview";
  }

  if (!tripGrid) {
    return;
  }

  const trips = window.MORJAN_TRIPS || [];
  let activePhotoList = [];
  let activePhotoIndex = 0;

  if (!trips.length) {
    tripGrid.innerHTML =
      '<p class="empty">No trips yet. Add entries in <code>data.js</code>.</p>';
    return;
  }

  const getTripPhotos = (trip) => {
    if (Array.isArray(trip.photos) && trip.photos.length) {
      return trip.photos;
    }
    if (trip.cover) {
      return [trip.cover];
    }
    return [];
  };

  const cardsMarkup = trips
    .map((trip, tripIndex) => {
      const tags = (trip.tags || [])
        .map((tag) => `<li>${escapeHtml(tag)}</li>`)
        .join("");
      const photoList = getTripPhotos(trip);
      const coverSource = trip.cover || photoList[0] || "";
      const photoCount = photoList.length;
      const photoLabel =
        photoCount === 1 ? "1 photo" : `${photoCount} photos`;

      return `
        <article class="trip-card">
          <button
            type="button"
            class="trip-open"
            data-trip-index="${tripIndex}"
            aria-label="Open gallery for ${escapeAttribute(trip.title)}"
          >
            <img
              class="trip-cover"
              src="${escapeAttribute(coverSource)}"
              alt=""
              loading="lazy"
            />
            <span class="photo-count">${escapeHtml(photoLabel)}</span>
          </button>
          <div class="trip-body">
            <p class="trip-dates">${escapeHtml(trip.dates)}</p>
            <h3>${escapeHtml(trip.title)}</h3>
            <p class="trip-place">${escapeHtml(trip.place)}</p>
            <p class="trip-blurb">${escapeHtml(trip.blurb)}</p>
            <ul class="tags">${tags}</ul>
            <button
              type="button"
              class="gallery-trigger"
              data-trip-index="${tripIndex}"
            >
              View gallery
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  tripGrid.innerHTML = cardsMarkup;

  const openGallery = (tripIndex) => {
    const trip = trips[tripIndex];
    if (!trip || !galleryDialog) {
      return;
    }

    activePhotoList = getTripPhotos(trip);
    if (!activePhotoList.length) {
      return;
    }

    activePhotoIndex = 0;
    if (galleryTitle) {
      galleryTitle.textContent = trip.title;
    }
    renderGallery();
    galleryDialog.showModal();
  };

  const renderGallery = () => {
    if (!galleryStageImage || !galleryCounter || !galleryThumbs) {
      return;
    }

    const currentSource = activePhotoList[activePhotoIndex];
    galleryStageImage.src = currentSource;
    galleryStageImage.alt = `Photo ${activePhotoIndex + 1} of ${activePhotoList.length}`;
    galleryCounter.textContent = `${activePhotoIndex + 1} / ${activePhotoList.length}`;

    galleryThumbs.innerHTML = activePhotoList
      .map((photoSource, photoIndex) => {
        const isActive = photoIndex === activePhotoIndex ? " is-active" : "";
        return `
          <button
            type="button"
            class="gallery-thumb${isActive}"
            data-photo-index="${photoIndex}"
            aria-label="Show photo ${photoIndex + 1}"
            aria-current="${photoIndex === activePhotoIndex ? "true" : "false"}"
          >
            <img src="${escapeAttribute(photoSource)}" alt="" loading="lazy" />
          </button>
        `;
      })
      .join("");
  };

  const showPhotoAtIndex = (photoIndex) => {
    if (!activePhotoList.length) {
      return;
    }

    const photoCount = activePhotoList.length;
    activePhotoIndex = (photoIndex + photoCount) % photoCount;
    renderGallery();
  };

  tripGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-trip-index]");
    if (!trigger) {
      return;
    }

    const tripIndex = Number(trigger.dataset.tripIndex);
    if (Number.isNaN(tripIndex)) {
      return;
    }

    openGallery(tripIndex);
  });

  if (galleryCloseButton && galleryDialog) {
    galleryCloseButton.addEventListener("click", () => {
      galleryDialog.close();
    });
  }

  if (galleryPreviousButton) {
    galleryPreviousButton.addEventListener("click", () => {
      showPhotoAtIndex(activePhotoIndex - 1);
    });
  }

  if (galleryNextButton) {
    galleryNextButton.addEventListener("click", () => {
      showPhotoAtIndex(activePhotoIndex + 1);
    });
  }

  if (galleryThumbs) {
    galleryThumbs.addEventListener("click", (event) => {
      const thumbButton = event.target.closest("[data-photo-index]");
      if (!thumbButton) {
        return;
      }

      const photoIndex = Number(thumbButton.dataset.photoIndex);
      if (Number.isNaN(photoIndex)) {
        return;
      }

      showPhotoAtIndex(photoIndex);
    });
  }

  if (galleryDialog) {
    galleryDialog.addEventListener("click", (event) => {
      if (event.target === galleryDialog) {
        galleryDialog.close();
      }
    });

    galleryDialog.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        showPhotoAtIndex(activePhotoIndex - 1);
      }
      if (event.key === "ArrowRight") {
        showPhotoAtIndex(activePhotoIndex + 1);
      }
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }
})();
