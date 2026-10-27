/* =========================================================
   RoadCare - citizen-messages.js
   Shows submitted reports + status + constructor messages
   on report.html. Injects its own section, no HTML edits.
   ========================================================= */
(function () {
  const REPORTS_KEY = "roadcare_reports";
  const UPDATES_KEY = "roadcare_report_updates";

  const LABELS = {
    pothole: "Pothole",
    "broken-signal": "Broken Traffic Signal",
    "damaged-signage": "Damaged Signage",
    waterlogging: "Waterlogging",
    "broken-footpath": "Broken Footpath",
    other: "Other Issue",
  };
  const STATUS = {
    pending: { text: "⏳ Pending", color: "#FB8C00" },
    progress: { text: "🚧 In Progress", color: "#0288D1" },
    resolved: { text: "✅ Resolved", color: "#4CAF50" },
  };

  const read = (k, f) => { try { return JSON.parse(localStorage.getItem(k)) || f; } catch (e) { return f; } };
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; };

  const style = document.createElement("style");
  style.textContent = `
    .cm-section{margin-top:28px}
    .cm-card{background:#fff;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.08);padding:14px 16px;margin-top:14px}
    .cm-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .cm-head h4{margin:0}
    .cm-status{color:#fff;font-size:12px;font-weight:600;padding:3px 10px;border-radius:20px}
    .cm-meta{font-size:13px;color:#555;margin:6px 0}
    .cm-reply{background:#E1F5FE;border-left:4px solid #29B6F6;border-radius:8px;padding:8px 12px;margin-top:8px;font-size:14px;color:#222}
    .cm-reply small{display:block;color:#666;margin-bottom:2px}
    .cm-none{font-size:13px;color:#888;font-style:italic;margin-top:6px}
  `;
  document.head.appendChild(style);

  function render() {
    const box = document.getElementById("cm-list");
    if (!box) return;
    const reports = read(REPORTS_KEY, []);
    const updates = read(UPDATES_KEY, {});

    if (!reports.length) { box.innerHTML = `<p class="cm-none">You haven't submitted any reports yet.</p>`; return; }

    box.innerHTML = reports.map((r) => {
      const u = updates[r.id] || { status: "pending", messages: [] };
      const st = STATUS[u.status || "pending"];
      const msgs = (u.messages || []).map((m) =>
        `<div class="cm-reply"><small>💬 ${esc(m.by)} · ${new Date(m.at).toLocaleString()}</small>${esc(m.text)}</div>`).join("");
      return `
        <div class="cm-card">
          <div class="cm-head">
            <h4>${LABELS[r.issueType] || "Reported Issue"}</h4>
            <span class="cm-status" style="background:${st.color}">${st.text}</span>
          </div>
          <div class="cm-meta">📍 ${esc(r.locationText) || "Location not specified"} · ${new Date(r.createdAt).toLocaleDateString()}</div>
          <div>${esc(r.description)}</div>
          ${msgs || `<p class="cm-none">No message from the constructor yet.</p>`}
        </div>`;
    }).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector("main.container");
    if (!main) return;

    const sec = document.createElement("section");
    sec.className = "cm-section";
    sec.innerHTML = `<h3>Your Reports &amp; Updates</h3><div id="cm-list"></div>`;
    main.appendChild(sec);
    render();

    // refresh after a new report is submitted (reports.js saves it first)
    const form = document.querySelector(".contact-form");
    if (form) form.addEventListener("submit", () => setTimeout(render, 800));

    // live update when the constructor replies (other tab)
    window.addEventListener("storage", render);
  });
})();