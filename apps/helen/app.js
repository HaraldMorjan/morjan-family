(() => {
  const hostLabel = document.getElementById("hostLabel");
  if (hostLabel) {
    hostLabel.textContent = window.location.hostname || "local preview";
  }
})();
