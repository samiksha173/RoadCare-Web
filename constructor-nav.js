
/* =========================================================
   RoadCare - constructor-nav.js
   Shared by constructor-map.html and constructor-contact.html
   - Redirects to login if the constructor isn't logged in
   - Fills avatar / dropdown with the logged-in constructor
   - Handles dropdown open/close and sign out
   ========================================================= */
(function () {
  if (localStorage.getItem("roadcareConstructorLoggedIn") !== "true") {
    window.location.href = "constructor-login.html";
    return;
  }

  const name = localStorage.getItem("roadcareConstructorName") || "Constructor";
  const email = localStorage.getItem("roadcareConstructorEmail") || "";

  document.addEventListener("DOMContentLoaded", () => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("cdAvatarInitial", name.charAt(0).toUpperCase());
    set("cdDdName", name);
    set("cdDdEmail", email);

    const btn = document.getElementById("cdAvatarBtn");
    const menu = document.getElementById("cdAvatarDropdown");
    if (btn && menu) {
      const toggle = (open) => {
        menu.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
      };
      btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(menu.hidden); });
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(menu.hidden); }
      });
      document.addEventListener("click", (e) => { if (!menu.contains(e.target)) toggle(false); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
    }

    const logout = document.getElementById("cd-logout-btn");
    if (logout) {
      logout.addEventListener("click", async () => {
        logout.disabled = true;
        // end the server session too, otherwise the login page would sign you straight back in
        try { await fetch("/api/constructors/logout", { method: "POST", credentials: "same-origin" }); } catch (e) { }
        ["roadcareConstructorLoggedIn", "roadcareConstructorName", "roadcareConstructorEmail",
         "roadcareConstructorCompany", "roadcareConstructorPhone"].forEach((k) => localStorage.removeItem(k));
        window.location.href = "constructor-login.html";
      });
    }
  });
})();