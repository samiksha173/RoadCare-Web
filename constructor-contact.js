/* =========================================================
   RoadCare - constructor-contact.js
   Pre-fills the logged-in constructor's name/email and saves
   messages to localStorage (key: roadcare_constructor_contacts).
   Swap the save step for a real API/email service later.
   ========================================================= */
(function () {
  const KEY = "roadcare_constructor_contacts";

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const esc = (s) => { const d = document.createElement("div"); d.textContent = s == null ? "" : s; return d.innerHTML; };

  function renderSent(email) {
    const box = document.getElementById("cp-sent-list");
    if (!box) return;
    const mine = read().filter((m) => m.email === email);
    if (!mine.length) { box.innerHTML = ""; return; }
    box.innerHTML = "<strong>Your recent messages</strong>" + mine.slice(0, 5).map((m) =>
      `<div><small>${esc(m.subject)} · ${new Date(m.at).toLocaleString()}</small>${esc(m.message)}</div>`).join("");
  }

  document.addEventListener("DOMContentLoaded", () => {
    const name = localStorage.getItem("roadcareConstructorName") || "";
    const email = localStorage.getItem("roadcareConstructorEmail") || "";

    document.getElementById("cp-name").value = name;
    document.getElementById("cp-email").value = email;
    renderSent(email);

    document.getElementById("cpContactForm").addEventListener("submit", (e) => {
      e.preventDefault();

      const subject = document.getElementById("cp-subject").value;
      const message = document.getElementById("cp-message").value.trim();
      if (!subject || !message) { alert("Please choose a subject and write a message."); return; }

      const all = read();
      all.unshift({
        id: Date.now(),
        name,
        email,
        company: localStorage.getItem("roadcareConstructorCompany") || "",
        subject,
        message,
        at: new Date().toISOString(),
      });
      localStorage.setItem(KEY, JSON.stringify(all));

      e.target.reset();
      document.getElementById("cp-name").value = name;
      document.getElementById("cp-email").value = email;

      const ok = document.getElementById("cp-success");
      ok.textContent = "✅ Message sent! The RoadCare team will get back to you.";
      ok.hidden = false;
      setTimeout(() => { ok.hidden = true; }, 5000);

      renderSent(email);
    });
  });
})();