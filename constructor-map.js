/* =========================================================
   RoadCare - constructor-map.js
   Plots every citizen report (from roadcare_reports) on an
   OpenStreetMap / Leaflet map. No API key needed.
   Status comes from roadcare_report_updates (set on the
   Constructor Dashboard).
   ========================================================= */
(function () {
  const REPORTS_KEY = "roadcare_reports";
  const UPDATES_KEY = "roadcare_report_updates";

  // Default view: Pimpri-Chinchwad, Pune
  const DEFAULT_CENTER = [18.6298, 73.7997];
  const DEFAULT_ZOOM = 12;

  const LABELS = {
    pothole: "Pothole",
    "broken-signal": "Broken Traffic Signal",
    "damaged-signage": "Damaged Signage",
    waterlogging: "Waterlogging",
    "broken-footpath": "Broken Footpath",
    other: "Other Issue",
  };
  const STATUS = {
    pending: { text: "Pending", cls: "cp-badge-pending" },
    progress: { text: "In Progress", cls: "cp-badge-progress" },
    resolved: { text: "Resolved", cls: "cp-badge-resolved" },
  };

  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } };
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; };

  let map, markerLayer;
  const markersById = {};

  function pinIcon(severity) {
    const sev = ["low", "medium", "high"].includes(severity) ? severity : "low";
    return L.divIcon({
      className: "",
      html: `<div class="cp-pin cp-pin-${sev}"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -22],
    });
  }

  function popupHtml(r, status) {
    const st = STATUS[status];
    return `
      <div class="cp-popup">
        <h4>${LABELS[r.issueType] || "Reported Issue"}</h4>
        <span class="cp-badge ${st.cls}">${st.text}</span>
        ${r.photo ? `<img src="${r.photo}" alt="Issue photo">` : ""}
        <p>${esc(r.description)}</p>
        <p>📍 ${esc(r.locationText) || "Location not specified"}</p>
        <p>Severity: <strong>${esc(r.severity)}</strong></p>
        <p><a href="https://www.google.com/maps?q=${r.coords.lat},${r.coords.lng}" target="_blank" rel="noopener">Open in Google Maps</a></p>
        <p><a href="constructor-dashboard.html">Manage on dashboard →</a></p>
      </div>`;
  }

  function render() {
    const reports = read(REPORTS_KEY, []);
    const updates = read(UPDATES_KEY, {});
    const filter = document.getElementById("cp-status-filter").value;
    const list = document.getElementById("cp-list");
    const count = document.getElementById("cp-count");

    markerLayer.clearLayers();
    Object.keys(markersById).forEach((k) => delete markersById[k]);
    list.innerHTML = "";

    const visible = reports.filter((r) => {
      const status = (updates[r.id] || {}).status || "pending";
      return filter === "all" || status === filter;
    });

    count.textContent = `${visible.length} report${visible.length === 1 ? "" : "s"}`;

    if (!visible.length) {
      list.innerHTML = `<p style="color:#888;font-size:14px;">${reports.length ? "No reports match this filter." : "No reports have been submitted yet."}</p>`;
      return;
    }

    const bounds = [];

    visible.forEach((r) => {
      const status = (updates[r.id] || {}).status || "pending";
      const st = STATUS[status];

      // sidebar item
      const item = document.createElement("div");
      item.className = "cp-item";
      item.innerHTML = `
        <h4>${LABELS[r.issueType] || "Reported Issue"} <span class="cp-badge ${st.cls}">${st.text}</span></h4>
        <small>📍 ${esc(r.locationText) || "Location not specified"}</small>
        <small>${new Date(r.createdAt).toLocaleString()}</small>
        ${r.coords ? "" : `<small class="cp-nocoords">No GPS - not shown on map</small>`}`;
      list.appendChild(item);

      if (!r.coords) return;

      // marker
      const marker = L.marker([r.coords.lat, r.coords.lng], { icon: pinIcon(r.severity) })
        .bindPopup(popupHtml(r, status), { maxWidth: 240 })
        .addTo(markerLayer);
      markersById[r.id] = marker;
      bounds.push([r.coords.lat, r.coords.lng]);

      item.addEventListener("click", () => {
        map.setView([r.coords.lat, r.coords.lng], 16);
        marker.openPopup();
      });
    });

    if (bounds.length === 1) map.setView(bounds[0], 15);
    else if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof L === "undefined") {
      document.getElementById("cp-map").innerHTML =
        "<p style='padding:20px'>Map library could not load. Check your internet connection.</p>";
      return;
    }

    map = L.map("cp-map").setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    render();

    document.getElementById("cp-status-filter").addEventListener("change", render);
    window.addEventListener("storage", render); // live update from other tabs
  });
})();