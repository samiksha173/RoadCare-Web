/* =========================================================
   RoadCare - sync.js
   Keeps the existing localStorage-based code working, but also
   shares the data through server.js so a report submitted by a
   citizen appears on the constructor dashboard (and constructor
   messages/status appear back on the citizen page).

   Does NOT change reports.js, constructor-reports.js, etc.
   Load it BEFORE the other scripts on:
     report.html, constructor-dashboard.html, constructor-map.html
   If the server isn't running, everything silently falls back to
   normal localStorage behaviour.
   ========================================================= */
(function () {
  const REPORTS_KEY = "roadcare_reports";
  const UPDATES_KEY = "roadcare_report_updates";
  const POLL_MS = 5000;

  const rawSet = Storage.prototype.setItem;
  const rawGet = Storage.prototype.getItem;
  const read = (k, f) => {
    try { return JSON.parse(rawGet.call(localStorage, k)) || f; }
    catch (e) { return f; }
  };
  const api = (method, url, body) =>
    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });

  /* ---------- PUSH: whenever the page saves, send it to the server ---------- */
  let applying = false;

  Storage.prototype.setItem = function (key, value) {
    rawSet.call(this, key, value); // normal behaviour (may throw if storage is full)
    if (this !== localStorage || applying) return;
    if (key === REPORTS_KEY) api("POST", "/api/reports", read(REPORTS_KEY, [])).catch(() => {});
    if (key === UPDATES_KEY) api("PUT", "/api/updates", read(UPDATES_KEY, {})).catch(() => {});
  };

  /* ---------- PULL: fetch the server's data into localStorage ---------- */
  async function pull() {
    try {
      const [serverReports, serverUpdates] = await Promise.all([
        api("GET", "/api/reports"),
        api("GET", "/api/updates"),
      ]);

      const localReports = read(REPORTS_KEY, []);
      const localUpdates = read(UPDATES_KEY, {});

      // reports: server list + anything only this browser has
      const serverIds = new Set(serverReports.map((r) => String(r.id)));
      const localOnly = localReports.filter((r) => !serverIds.has(String(r.id)));
      const mergedReports = [...localOnly, ...serverReports].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)));

      // updates: server is the source of truth, keep local-only ids too
      const mergedUpdates = { ...serverUpdates };
      const localOnlyUpdates = {};
      Object.keys(localUpdates).forEach((id) => {
        if (!(id in serverUpdates)) {
          mergedUpdates[id] = localUpdates[id];
          localOnlyUpdates[id] = localUpdates[id];
        }
      });

      const newR = JSON.stringify(mergedReports);
      const newU = JSON.stringify(mergedUpdates);
      const changed =
        newR !== JSON.stringify(localReports) || newU !== JSON.stringify(localUpdates);

      if (changed) {
        applying = true;
        try {
          rawSet.call(localStorage, REPORTS_KEY, newR);
          rawSet.call(localStorage, UPDATES_KEY, newU);
        } catch (e) {
          console.warn("RoadCare sync: browser storage is full (photos too large?)", e);
        }
        applying = false;
        // tell the page scripts to re-render with the new data
        window.dispatchEvent(new Event("storage"));
      }

      // upload anything the server doesn't have yet
      if (localOnly.length) api("POST", "/api/reports", localOnly).catch(() => {});
      if (Object.keys(localOnlyUpdates).length) api("PUT", "/api/updates", localOnlyUpdates).catch(() => {});
    } catch (e) {
      // server not running / offline: just use localStorage as before
    }
  }

  pull();
  window.addEventListener("load", pull);
  setInterval(pull, POLL_MS);

  /* ---------- Photo compression (report.html) ----------
     Phone photos are several MB each, which overflows the ~5 MB
     browser storage and makes saving fail. Shrink to ~900px JPEG. */
  function compress(file, maxDim, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          resolve(blob
            ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" })
            : file);
        }, "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("photo");
    if (!input) return;
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      if (file.type === "image/jpeg" && file.size < 250000) return; // already small
      const small = await compress(file, 900, 0.7);
      try {
        const dt = new DataTransfer();
        dt.items.add(small);
        input.files = dt.files;
      } catch (e) { /* old browser: keep original file */ }
    });
  });
})();