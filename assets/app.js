const ELECTIONS = [
  { id: "2011-06-MV", label: "June 2011" },
  { id: "2015-06-MV", label: "June 2015" },
  { id: "2015-11-MV", label: "November 2015" },
  { id: "2018-06-MV", label: "June 2018" },
  { id: "2023-05-14-MV", label: "May 2023" },
];

const PARTY_LABELS = {
  akp: "AKP",
  chp: "CHP",
  mhp: "MHP",
};

const COLORS = [
  "#cde2fb",
  "#b7d3f6",
  "#9ec5f4",
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#104281",
  "#0d366b",
];

const MASK_COLOR = "#d8d5cd";
const NO_DATA_COLOR = "#f4f2ed";
const SUPPORT_FLOOR = 0.05;

let currentParty = "akp";
let currentElectionIndex = 4;
let geoLayer;
let selectedLayer;

const map = L.map("map", {
  zoomControl: true,
  minZoom: 5,
  maxZoom: 11,
}).setView([39.0, 35.2], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const partySelect = document.getElementById("partySelect");
const electionSlider = document.getElementById("electionSlider");
const electionLabel = document.getElementById("electionLabel");
const details = document.getElementById("details");

function activeElection() {
  return ELECTIONS[currentElectionIndex];
}

function metric(feature) {
  const values = feature.properties.values || {};
  const byElection = values[activeElection().id] || {};
  return byElection[currentParty] || null;
}

function colorForCv(cv) {
  if (cv === null || cv === undefined || Number.isNaN(cv)) {
    return NO_DATA_COLOR;
  }
  const clamped = Math.max(0, Math.min(0.6, cv));
  const idx = Math.min(COLORS.length - 1, Math.floor((clamped / 0.6) * COLORS.length));
  return COLORS[idx];
}

function styleFeature(feature) {
  const m = metric(feature);
  const fill = !m ? NO_DATA_COLOR : m.masked ? MASK_COLOR : colorForCv(m.cv);
  return {
    color: "#fcfcfb",
    weight: 0.65,
    opacity: 1,
    fillColor: fill,
    fillOpacity: 0.86,
  };
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return Math.round(value).toLocaleString("en-US");
}

function formatCv(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "n/a";
  }
  return value.toFixed(3);
}

function districtTitle(props) {
  const province = props.province || "Unknown province";
  return `${province} / ${props.district}`;
}

function tooltipHtml(feature) {
  const m = metric(feature);
  const props = feature.properties;
  if (!m) {
    return `<strong>${districtTitle(props)}</strong><br>No data for ${PARTY_LABELS[currentParty]}, ${activeElection().label}`;
  }
  const masked = m.masked ? "<br><em>Masked: party support under 5%</em>" : "";
  return `<strong>${districtTitle(props)}</strong><br>${PARTY_LABELS[currentParty]} ${activeElection().label}<br>CV: ${formatCv(m.cv)} | Share: ${formatPercent(m.mean_share)}${masked}`;
}

function detailsHtml(feature) {
  const m = metric(feature);
  const props = feature.properties;
  if (!m) {
    return `
      <h2>${districtTitle(props)}</h2>
      <p>No derived value is available for ${PARTY_LABELS[currentParty]} in ${activeElection().label}.</p>
    `;
  }
  const maskNote = m.masked
    ? `<p>This district is masked on the map because ${PARTY_LABELS[currentParty]} mean support is below ${(SUPPORT_FLOOR * 100).toFixed(0)}%.</p>`
    : "";
  return `
    <h2>${districtTitle(props)}</h2>
    <p>${PARTY_LABELS[currentParty]} in ${activeElection().label}. District values aggregate mahalle-level within-box dispersion.</p>
    <div class="metric-grid">
      <div class="metric"><span>Within-mahalle CV</span><strong>${formatCv(m.cv)}</strong></div>
      <div class="metric"><span>Mean party share</span><strong>${formatPercent(m.mean_share)}</strong></div>
      <div class="metric"><span>Registered voters</span><strong>${formatNumber(m.registered_voters)}</strong></div>
      <div class="metric"><span>Mahalles included</span><strong>${formatNumber(m.mahalle_count)}</strong></div>
    </div>
    ${maskNote}
  `;
}

function setSelected(layer) {
  if (selectedLayer && geoLayer) {
    geoLayer.resetStyle(selectedLayer);
  }
  selectedLayer = layer;
  selectedLayer.setStyle({ color: "#111111", weight: 2.2, fillOpacity: 0.92 });
  details.innerHTML = detailsHtml(layer.feature);
}

function bindFeature(feature, layer) {
  layer.bindTooltip(tooltipHtml(feature), { sticky: true });
  layer.on({
    mouseover: () => {
      if (layer !== selectedLayer) {
        layer.setStyle({ weight: 1.5, color: "#52514e" });
      }
      layer.setTooltipContent(tooltipHtml(feature));
    },
    mouseout: () => {
      if (layer !== selectedLayer) {
        geoLayer.resetStyle(layer);
      }
    },
    click: () => setSelected(layer),
  });
}

function refreshMap() {
  electionLabel.value = activeElection().label;
  if (!geoLayer) {
    return;
  }
  selectedLayer = null;
  geoLayer.setStyle(styleFeature);
  details.innerHTML = `
    <h2>${PARTY_LABELS[currentParty]} - ${activeElection().label}</h2>
    <p>Click a district to inspect CV, mean party share, registered voters, and mahalle count.</p>
  `;
}

partySelect.addEventListener("change", (event) => {
  currentParty = event.target.value;
  refreshMap();
});

electionSlider.addEventListener("input", (event) => {
  currentElectionIndex = Number(event.target.value);
  refreshMap();
});

fetch("assets/district_cv.geojson")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load map data: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    geoLayer = L.geoJSON(data, {
      style: styleFeature,
      onEachFeature: bindFeature,
    }).addTo(map);
    map.fitBounds(geoLayer.getBounds(), { padding: [18, 18] });
    refreshMap();
  })
  .catch((error) => {
    details.innerHTML = `<h2>Map data failed to load</h2><p>${error.message}</p>`;
  });
