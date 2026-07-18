(() => {
  const tripGrid = document.getElementById("tripGrid");
  const hostLabel = document.getElementById("hostLabel");

  if (hostLabel) {
    hostLabel.textContent = window.location.hostname || "local preview";
  }

  if (!tripGrid) {
    return;
  }

  const trips = window.MORJAN_TRIPS || [];

  if (!trips.length) {
    tripGrid.innerHTML =
      '<p class="empty">No trips yet. Add entries in <code>data.js</code>.</p>';
    return;
  }

  const cardsMarkup = trips
    .map((trip) => {
      const tags = (trip.tags || [])
        .map((tag) => `<li>${escapeHtml(tag)}</li>`)
        .join("");

      return `
        <article class="trip-card">
          <img
            class="trip-cover"
            src="${escapeAttribute(trip.cover)}"
            alt="${escapeAttribute(trip.title)}"
            loading="lazy"
          />
          <div class="trip-body">
            <p class="trip-dates">${escapeHtml(trip.dates)}</p>
            <h3>${escapeHtml(trip.title)}</h3>
            <p class="trip-place">${escapeHtml(trip.place)}</p>
            <p class="trip-blurb">${escapeHtml(trip.blurb)}</p>
            <ul class="tags">${tags}</ul>
          </div>
        </article>
      `;
    })
    .join("");

  tripGrid.innerHTML = cardsMarkup;

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
