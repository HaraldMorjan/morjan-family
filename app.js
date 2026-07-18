(() => {
  const spaceLabel = document.getElementById("spaceLabel");
  const leadText = document.getElementById("leadText");
  const hostLabel = document.getElementById("hostLabel");

  if (!spaceLabel || !leadText || !hostLabel) {
    return;
  }

  const hostname = window.location.hostname.toLowerCase();
  const labelsByHost = {
    "morjan.family": {
      space: "Family hub",
      lead: "The Morjan family home on the web is under construction."
    },
    "www.morjan.family": {
      space: "Family hub",
      lead: "The Morjan family home on the web is under construction."
    },
    "helen.morjan.family": {
      space: "Helen",
      lead: "Helen’s space is under construction."
    },
    "harald.morjan.family": {
      space: "Harald",
      lead: "Harald’s space is under construction."
    },
    "katy.morjan.family": {
      space: "Katy",
      lead: "Katy’s space is under construction."
    },
    "arianna.morjan.family": {
      space: "Arianna",
      lead: "Arianna’s space is under construction."
    },
    "trips.morjan.family": {
      space: "Trips",
      lead: "Family trips is under construction."
    }
  };

  const fallback = {
    space: "Family space",
    lead: "This corner of the family web is under construction."
  };

  const content = labelsByHost[hostname] || fallback;

  spaceLabel.textContent = content.space;
  leadText.textContent = content.lead;
  hostLabel.textContent = hostname || "local preview";
  document.title = `${content.space} · Morjan`;
})();
