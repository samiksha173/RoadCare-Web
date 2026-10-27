// =========================================
// CONSTRUCTOR DASHBOARD
// Shows every report citizens have submitted via report.html.
//
// IMPORTANT - READ THIS IF THE LIST SHOWS EMPTY:
// This file doesn't know for certain what key report.js/reports.js saves
// reports under, so it tries a short list of likely names below. Open
// reports.js, find the localStorage key it writes to, and add it to
// REPORTS_KEY_CANDIDATES if it isn't already there.
// =========================================

(function () {

    // ---- Auth guard ----
    if (localStorage.getItem("roadcareConstructorLoggedIn") !== "true") {
        window.location.href = "constructor-login.html";
        return;
    }

    const constructorName = localStorage.getItem("roadcareConstructorName") || "Constructor";
    const constructorEmail = localStorage.getItem("roadcareConstructorEmail") || "";
    const constructorCompany = localStorage.getItem("roadcareConstructorCompany") || "Not provided";
    const constructorPhone = localStorage.getItem("roadcareConstructorPhone") || "Not provided";

    document.getElementById("cdDdName").textContent = constructorName;
    document.getElementById("cdDdEmail").textContent = constructorEmail;
    document.getElementById("cdAvatarInitial").textContent = constructorName.trim().charAt(0).toUpperCase() || "C";

    // Constructor info card
    document.getElementById("cd-info-name").textContent = constructorName;
    document.getElementById("cd-info-company").textContent = constructorCompany;
    document.getElementById("cd-info-phone").textContent = constructorPhone;
    document.getElementById("cd-info-email").textContent = constructorEmail || "Not provided";
    document.getElementById("cdProfileAvatar").textContent = constructorName.trim().charAt(0).toUpperCase() || "C";

    // ---- Avatar dropdown open/close ----
    const avatarBtn = document.getElementById("cdAvatarBtn");
    const avatarDropdown = document.getElementById("cdAvatarDropdown");

    function closeDropdown() {
        avatarDropdown.hidden = true;
        avatarBtn.setAttribute("aria-expanded", "false");
    }

    function toggleDropdown() {
        const isOpen = !avatarDropdown.hidden;
        avatarDropdown.hidden = isOpen;
        avatarBtn.setAttribute("aria-expanded", String(!isOpen));
    }

    avatarBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleDropdown();
    });

    avatarBtn.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleDropdown();
        }
    });

    document.addEventListener("click", function (e) {
        if (!avatarDropdown.hidden && !avatarDropdown.contains(e.target) && e.target !== avatarBtn) {
            closeDropdown();
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeDropdown();
    });

    // ---- Locate where reports actually live ----
    const REPORTS_KEY_CANDIDATES = [
        "roadcareReports",
        "roadcare_reports",
        "reports",
        "roadcareReportList"
    ];

    function findReportsKey() {
        for (const key of REPORTS_KEY_CANDIDATES) {
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    if (Array.isArray(JSON.parse(raw))) return key;
                } catch (e) { /* not this one */ }
            }
        }
        return REPORTS_KEY_CANDIDATES[0];
    }

    const REPORTS_KEY = findReportsKey();

    function loadReports() {
        const raw = localStorage.getItem(REPORTS_KEY);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveReports(reports) {
        localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
    }

    // ---- Read a value under any of several possible field names ----
    function field(report, ...names) {
        for (const n of names) {
            if (report[n] !== undefined && report[n] !== null && report[n] !== "") {
                return report[n];
            }
        }
        return "";
    }

    function getStatus(report) {
        return field(report, "status") || "Pending";
    }

    function statusClass(status) {
        const s = String(status).toLowerCase();
        if (s.includes("resolv") || s.includes("fixed") || s.includes("complete")) return "cd-badge-resolved";
        if (s.includes("progress")) return "cd-badge-progress";
        return "cd-badge-pending";
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, m => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        }[m]));
    }

    // ---- DOM refs ----
    const listEl = document.getElementById("cd-report-list");
    const emptyEl = document.getElementById("cd-empty");
    const filterEl = document.getElementById("cd-filter");
    const statTotal = document.getElementById("cd-stat-total");
    const statPending = document.getElementById("cd-stat-pending");
    const statProgress = document.getElementById("cd-stat-progress");
    const statResolved = document.getElementById("cd-stat-resolved");

    let reports = loadReports();

    function updateStats() {
        statTotal.textContent = reports.length;
        statPending.textContent = reports.filter(r => statusClass(getStatus(r)) === "cd-badge-pending").length;
        statProgress.textContent = reports.filter(r => statusClass(getStatus(r)) === "cd-badge-progress").length;
        statResolved.textContent = reports.filter(r => statusClass(getStatus(r)) === "cd-badge-resolved").length;
    }

    function render() {
        const filterVal = filterEl.value;
        listEl.innerHTML = "";

        const visible = reports.filter(r => filterVal === "all" || statusClass(getStatus(r)) === filterVal);

        if (reports.length === 0) {
            emptyEl.hidden = false;
            emptyEl.textContent = "No reports have been submitted yet.";
        } else if (visible.length === 0) {
            emptyEl.hidden = false;
            emptyEl.textContent = "No reports match this filter.";
        } else {
            emptyEl.hidden = true;
        }

        visible.forEach((report) => {
            const realIndex = reports.indexOf(report);

            const title = field(report, "title", "issueType", "type", "category") || "Untitled report";
            const description = field(report, "description", "details", "notes");
            const lat = field(report, "lat", "latitude");
            const lng = field(report, "lng", "longitude");
            const location = field(report, "location", "address") ||
                (lat && lng ? `${lat}, ${lng}` : "Location not provided");
            const date = field(report, "date", "createdAt", "timestamp", "submittedAt");
            const photo = field(report, "photo", "image", "imageUrl", "photoUrl");
            const reporter = field(report, "reporterName", "name", "userName") || "Anonymous";
            const status = getStatus(report);

            const card = document.createElement("article");
            card.className = "cd-report-card";

            card.innerHTML = `
                <div class="cd-report-head">
                    <h3>${escapeHtml(title)}</h3>
                    <span class="cd-badge ${statusClass(status)}">${escapeHtml(status)}</span>
                </div>
                ${photo ? `<img class="cd-report-photo" src="${escapeHtml(photo)}" alt="Report photo">` : ""}
                <p class="cd-report-desc">${escapeHtml(description || "No description provided.")}</p>
                <div class="cd-report-meta">
                    <span>📍 ${escapeHtml(location)}</span>
                    ${date ? `<span>🗓️ ${escapeHtml(String(date))}</span>` : ""}
                    <span>👤 ${escapeHtml(reporter)}</span>
                </div>
                <label class="cd-status-label">
                    Update status
                    <select class="cd-status-select" data-index="${realIndex}">
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                    </select>
                </label>
            `;

            const select = card.querySelector(".cd-status-select");
            select.value = ["Pending", "In Progress", "Resolved"].includes(status) ? status : "Pending";
            select.addEventListener("change", function () {
                const idx = Number(this.dataset.index);
                reports[idx].status = this.value;
                saveReports(reports);
                updateStats();
                render();
            });

            listEl.appendChild(card);
        });
    }

    filterEl.addEventListener("change", render);

    document.getElementById("cd-logout-btn").addEventListener("click", function () {
        localStorage.removeItem("roadcareConstructorLoggedIn");
        localStorage.removeItem("roadcareConstructorName");
        localStorage.removeItem("roadcareConstructorEmail");
        window.location.href = "constructor-login.html";
    });

    updateStats();
    render();

})();