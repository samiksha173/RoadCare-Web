/* =========================================================
   RoadCare - reports.js
   Handles:
   - Reading the photo file as a data URL
   - Getting the user's GPS location
   - Saving a report into localStorage (browser storage)
   - Rendering a "Reports Near You" list (used on about.html)
   No existing HTML/CSS is modified by this file — it only
   hooks into elements that already exist on the page.
   ========================================================= */

const ROADCARE_STORAGE_KEY = "roadcare_reports";

/* ---------- Helpers ---------- */

function rcGetAllReports() {
  try {
    const raw = localStorage.getItem(ROADCARE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("RoadCare: could not read stored reports", e);
    return [];
  }
}

function rcSaveReport(report) {
  const all = rcGetAllReports();
  all.unshift(report); // newest first
  localStorage.setItem(ROADCARE_STORAGE_KEY, JSON.stringify(all));
}

function rcFileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function rcGetCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

// Distance between two lat/lng points, in km (Haversine formula)
function rcDistanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ---------- Wiring up report.html ---------- */

function rcInitReportForm() {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const locationInput = document.getElementById("location");
  const locationBtn = document.querySelector(".btn-location");
  let capturedCoords = null;

  // "Use My Location" button
  if (locationBtn) {
    locationBtn.addEventListener("click", async () => {
      locationBtn.disabled = true;
      const originalText = locationBtn.textContent;
      locationBtn.textContent = "Locating...";

      const coords = await rcGetCurrentPosition();
      if (coords) {
        capturedCoords = coords;
        if (locationInput && !locationInput.value.trim()) {
          locationInput.value = `Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}`;
        }
      } else {
        alert("Couldn't get your location. Please allow location access or type it manually.");
      }

      locationBtn.disabled = false;
      locationBtn.textContent = originalText;
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const issueType = document.getElementById("issue-type")?.value || "";
    const description = document.getElementById("description")?.value || "";
    const locationText = locationInput?.value || "";
    const photoFile = document.getElementById("photo")?.files?.[0] || null;
    const severity =
      document.querySelector('input[name="severity"]:checked')?.value || "low";

    // If we don't have GPS coords yet, try to grab them silently on submit
    if (!capturedCoords) {
      capturedCoords = await rcGetCurrentPosition();
    }

    const photoDataUrl = await rcFileToDataURL(photoFile);

    const report = {
      id: Date.now(),
      issueType,
      description,
      locationText,
      coords: capturedCoords, // { lat, lng } or null
      severity,
      photo: photoDataUrl, // base64 image or null
      createdAt: new Date().toISOString(),
    };

    rcSaveReport(report);

    form.reset();
    capturedCoords = null;
    rcShowConfirmation(form);
  });
}

function rcShowConfirmation(form) {
  let banner = document.querySelector(".rc-confirmation");
  if (!banner) {
    banner = document.createElement("p");
    banner.className = "rc-confirmation";
    banner.style.marginTop = "12px";
    banner.style.color = "#1a7f37";
    banner.style.fontWeight = "600";
    form.appendChild(banner);
  }
  banner.textContent = "✅ Report submitted! Thank you for helping improve our roads.";
  setTimeout(() => {
    banner.remove();
  }, 5000);
}

/* ---------- Wiring up about.html (Reports Near You) ---------- */

async function rcInitNearbyReports() {
  const list = document.getElementById("rc-nearby-list");
  const status = document.getElementById("rc-nearby-status");
  if (!list) return; // section not present on this page

  const all = rcGetAllReports();

  if (all.length === 0) {
    if (status) status.textContent = "No reports have been submitted yet.";
    return;
  }

  const myCoords = await rcGetCurrentPosition();

  let reportsToShow = all;

  if (myCoords) {
    reportsToShow = all
      .map((r) => ({ ...r, distanceKm: rcDistanceKm(myCoords, r.coords) }))
      .sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    if (status) status.textContent = "Showing reports sorted by distance from you.";
  } else {
    if (status) status.textContent = "Showing all reports (location access not available).";
  }

  list.innerHTML = "";

  reportsToShow.slice(0, 20).forEach((r) => {
    const item = document.createElement("li");
    item.className = "rc-report-card";

    const distanceLabel =
      r.distanceKm != null ? `${r.distanceKm.toFixed(1)} km away` : "Distance unknown";

    item.innerHTML = `
      ${r.photo ? `<img src="${r.photo}" alt="${r.issueType}" class="rc-report-photo">` : ""}
      <div class="rc-report-body">
        <span class="rc-report-tag rc-tag-${r.severity}">${r.severity}</span>
        <h4>${rcLabelForIssue(r.issueType)}</h4>
        <p>${rcEscapeHtml(r.description)}</p>
        <div class="rc-report-meta">
          <span>📍 ${rcEscapeHtml(r.locationText) || "Location not specified"}</span>
          <span>${distanceLabel}</span>
        </div>
      </div>
    `;
    list.appendChild(item);
  });
}

function rcLabelForIssue(value) {
  const map = {
    pothole: "Pothole",
    "broken-signal": "Broken Traffic Signal",
    "damaged-signage": "Damaged Signage",
    waterlogging: "Waterlogging",
    "broken-footpath": "Broken Footpath",
    other: "Other Issue",
  };
  return map[value] || "Reported Issue";
}

function rcEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

/* ---------- Auto-init on page load ---------- */

document.addEventListener("DOMContentLoaded", () => {
  rcInitReportForm();
  rcInitNearbyReports();
});