(() => {
  const hostLabel = document.getElementById("hostLabel");
  const qrHost = document.getElementById("qrcode");

  if (hostLabel) {
    hostLabel.textContent = window.location.hostname || "local preview";
  }

  if (!qrHost || typeof QRCode === "undefined") {
    return;
  }

  const qrTarget = `${window.location.origin}/confetti.html`;

  qrHost.innerHTML = "";
  new QRCode(qrHost, {
    text: qrTarget,
    width: 180,
    height: 180,
    colorDark: "#d91f7a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
})();
