/* =========================================================
   RoadCare - constructor-reports.js
   Shows citizen reports on the Constructor Dashboard with
   location, lets the constructor change status and send a
   message back to the citizen.
   Reads reports saved by reports.js (key: roadcare_reports)
   and stores status + messages separately in
   roadcare_report_updates, so report data is never changed.
   ========================================================= */
(function () {
  const REPORTS_KEY = "roadcare_reports";
  const UPDATES_KEY = "roadcare_report_updates"; // { [reportId]: { status, messages: [] } }

  const LABELS = {
    pothole: "Pothole",
    "broken-signal": "Broken Traffic Signal",
    "damaged-signage": "Damaged Signage",
    waterlogging: "Waterlogging",
    "broken-footpath": "Broken Footpath",
    other: "Other Issue",
  };
  const STATUS = {
    pending: { text: "Pending", cls: "cd-badge-pending" },
    progress: { text: "In Progress", cls: "cd-badge-progress" },
    resolved: { text: "Resolved", cls: "cd-badge-resolved" },
  };

  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; }
    catch (e) { return fallback; }
  };
  const getReports = () => read(REPORTS_KEY, []);
  const getUpdates = () => read(UPDATES_KEY, {});
  const saveUpdates = (u) => localStorage.setItem(UPDATES_KEY, JSON.stringify(u));

  const esc = (s) => {
    const d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
  };

  // inject styles so no existing CSS file needs editing
  const style = document.createElement("style");
  style.textContent = `
    .crp-card{background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08);
      padding:16px;margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap;border-left:5px solid #29B6F6}
    .crp-photo{width:160px;height:120px;object-fit:cover;border-radius:8px}
    .crp-body{flex:1;min-width:240px}
    .crp-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
    .crp-head h4{margin:0;font-size:17px}
    .crp-tag,.crp-status{font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px;color:#fff}
    .crp-tag.low{background:#4CAF50}.crp-tag.medium{background:#FB8C00}.crp-tag.high{background:#E53935}
    .crp-status.cd-badge-pending{background:#FB8C00}
    .crp-status.cd-badge-progress{background:#0288D1}
    .crp-status.cd-badge-resolved{background:#4CAF50}
    .crp-meta{font-size:13px;color:#555;margin:6px 0}
    .crp-meta a{color:#0288D1;font-weight:600;text-decoration:none}
    .crp-controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center}
    .crp-controls select{padding:6px 8px;border-radius:6px;border:1px solid #ccc}
    .crp-msg-box{width:100%;margin-top:10px}
    .crp-msg-box textarea{width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #ccc;font-family:inherit}
    .crp-send{margin-top:6px;background:#0288D1;color:#fff;border:0;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:600}
    .crp-thread{margin-top:10px;font-size:13px}
    .crp-thread div{background:#E1F5FE;border-radius:8px;padding:6px 10px;margin-top:4px}
    .crp-thread small{color:#666;display:block}
  `;
  document.head.appendChild(style);

  /* ---------- Visible status bar (so no console is needed) ---------- */
  let serverState = "checking";
  fetch("/api/reports")
    .then((r) => { serverState = r.ok ? "ok" : "down"; })
    .catch(() => { serverState = "down"; })
    .finally(() => diag());

  function diag(count) {
    const list = document.getElementById("cd-report-list");
    if (!list) return;
    let el = document.getElementById("crp-diag");
    if (!el) {
      el = document.createElement("div");
      el.id = "crp-diag";
      const anchor = document.getElementById("cd-empty") || list;
      anchor.parentNode.insertBefore(el, anchor);
    }
    if (count === undefined) count = getReports().length;

    let msg, bg, color;
    if (location.protocol === "file:") {
      msg = "⚠ This page was opened as a file (file://). Run <b>npm start</b> and open <b>http://localhost:3000/constructor-dashboard.html</b> instead.";
      bg = "#FFEBEE"; color = "#B71C1C";
    } else if (serverState === "down") {
      msg = "⚠ Server not reachable, so reports from other browsers can't arrive. Run <b>npm start</b> in your project folder and open this page through <b>http://localhost:3000</b>.";
      bg = "#FFF3E0"; color = "#E65100";
    } else if (serverState === "ok") {
      msg = "✔ Connected to the RoadCare server.";
      bg = "#E8F5E9"; color = "#1B5E20";
    } else {
      msg = "Checking server...";
      bg = "#E1F5FE"; color = "#01579B";
    }
    el.style.cssText = `background:${bg};color:${color};padding:10px 16px;border-radius:12px;margin-bottom:16px;font-size:13.5px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.12)`;
    el.innerHTML = `${msg} <span style="font-weight:500;opacity:.85">· Reports in this browser: ${count} · Address: ${location.origin}</span>`;
  }

  function render() {
    const list = document.getElementById("cd-report-list");
    const empty = document.getElementById("cd-empty");
    if (!list) return;

    const reports = getReports();
    const updates = getUpdates();
    const filter = (document.getElementById("cd-filter") || {}).value || "all";
    console.log("RoadCare constructor-reports: found", reports.length, "report(s) in localStorage");
    diag(reports.length);

    // stats
    const counts = { pending: 0, progress: 0, resolved: 0 };
    reports.forEach((r) => counts[(updates[r.id] || {}).status || "pending"]++);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("cd-stat-total", reports.length);
    set("cd-stat-pending", counts.pending);
    set("cd-stat-progress", counts.progress);
    set("cd-stat-resolved", counts.resolved);

    const visible = reports.filter((r) => {
      const st = (updates[r.id] || {}).status || "pending";
      return filter === "all" || STATUS[st].cls === filter;
    });

    list.innerHTML = "";
    if (empty) {
      empty.hidden = visible.length > 0;
      empty.textContent = reports.length ? "No reports match this filter." : "No reports have been submitted yet.";
    }

    visible.forEach((r) => {
      const u = updates[r.id] || { status: "pending", messages: [] };
      const st = STATUS[u.status || "pending"];
      const mapLink = r.coords
        ? `<a href="https://www.google.com/maps?q=${r.coords.lat},${r.coords.lng}" target="_blank" rel="noopener">🗺️ View on Google Maps</a>`
        : "";

      const card = document.createElement("div");
      card.className = "crp-card";
      card.dataset.id = r.id;
      card.innerHTML = `
        ${r.photo ? `<img class="crp-photo" src="${r.photo}" alt="Issue photo">` : ""}
        <div class="crp-body">
          <div class="crp-head">
            <h4>${LABELS[r.issueType] || "Reported Issue"}</h4>
            <span class="crp-tag ${esc(r.severity)}">${esc(r.severity)}</span>
            <span class="crp-status ${st.cls}">${st.text}</span>
          </div>
          <p style="margin:4px 0">${esc(r.description)}</p>
          <div class="crp-meta">📍 ${esc(r.locationText) || "Location not specified"} ${mapLink}</div>
          <div class="crp-meta">🕒 ${new Date(r.createdAt).toLocaleString()}</div>

          <div class="crp-controls">
            <label>Status:</label>
            <select class="crp-status-select">
              ${Object.keys(STATUS).map((k) =>
                `<option value="${k}" ${k === (u.status || "pending") ? "selected" : ""}>${STATUS[k].text}</option>`).join("")}
            </select>
          </div>

          <div class="crp-msg-box">
            <textarea rows="2" placeholder="Write a message to the citizen..."></textarea>
            <button type="button" class="crp-send">Send Message</button>
          </div>

          <div class="crp-thread">
            ${(u.messages || []).map((m) =>
              `<div><small>${esc(m.by)} · ${new Date(m.at).toLocaleString()}</small>${esc(m.text)}</div>`).join("")}
          </div>
        </div>`;
      list.appendChild(card);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();

    const list = document.getElementById("cd-report-list");
    const filterEl = document.getElementById("cd-filter");
    if (filterEl) filterEl.addEventListener("change", render);

    // status change
    list.addEventListener("change", (e) => {
      if (!e.target.classList.contains("crp-status-select")) return;
      const id = e.target.closest(".crp-card").dataset.id;
      const updates = getUpdates();
      updates[id] = updates[id] || { status: "pending", messages: [] };
      updates[id].status = e.target.value;
      saveUpdates(updates);
      render();
    });

    // send message
    list.addEventListener("click", (e) => {
      if (!e.target.classList.contains("crp-send")) return;
      const card = e.target.closest(".crp-card");
      const ta = card.querySelector("textarea");
      const text = ta.value.trim();
      if (!text) { alert("Please type a message first."); return; }

      const id = card.dataset.id;
      const updates = getUpdates();
      updates[id] = updates[id] || { status: "pending", messages: [] };
      const name = localStorage.getItem("roadcareConstructorName") || "Constructor";
      const company = localStorage.getItem("roadcareConstructorCompany");
      updates[id].messages.push({
        text,
        by: company ? `${name} (${company})` : name,
        at: new Date().toISOString(),
      });
      saveUpdates(updates);
      render();
    });

    // live refresh when a citizen submits in another tab
    window.addEventListener("storage", render);

    // If constructor-dashboard.js (or anything else) draws its own content
    // into the list after us, replace it with our cards.
    if (list) {
      new MutationObserver(() => {
        if (list.querySelector(":scope > :not(.crp-card)")) render();
      }).observe(list, { childList: true });
    }

    // Re-render once everything else has finished loading, in case
    // another script reset the stats or list in the meantime.
    window.addEventListener("load", () => setTimeout(render, 200));
  });
})();