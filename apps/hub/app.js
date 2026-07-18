(() => {
  const hostLabel = document.getElementById("hostLabel");
  if (!hostLabel) {
    return;
  }
  hostLabel.textContent = window.location.hostname || "local preview";
})();
