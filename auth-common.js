/* =========================================================
   RoadCare - auth-common.js
   Shared by every login / register / reset page (citizen + constructor):
   one set of validation rules, one way to talk to server.js, and
   the browser-only fallback for citizens when the server isn't running.
   ========================================================= */
(function () {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ---------- show / hide password (used by the inline onclick) ---------- */
  window.togglePassword = function (inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁️";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  };

  /* ---------- validation ---------- */
  function validName(n) {
    return /^[\p{L}][\p{L} .'\-]{2,59}$/u.test(n);
  }
  // Accepts 9876543210, +91 98765 43210, 098765-43210 ... returns 10 digits or null
  function cleanPhone(p) {
    let d = String(p || "").replace(/[\s\-()+.]/g, "");
    if (/^91\d{10}$/.test(d)) d = d.slice(2);
    else if (/^0\d{10}$/.test(d)) d = d.slice(1);
    return /^\d{10}$/.test(d) ? d : null;
  }
  function passwordChecks(p) {
    p = String(p || "");
    return {
      length: p.length >= 8,
      lower: /[a-z]/.test(p),
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      symbol: /[^A-Za-z0-9\s]/.test(p),
    };
  }
  function passwordError(p) {
    const c = passwordChecks(p);
    if (!c.length) return "Password must contain at least 8 characters.";
    if (!c.upper) return "Password must contain at least one uppercase letter.";
    if (!c.lower) return "Password must contain at least one lowercase letter.";
    if (!c.number) return "Password must contain at least one number.";
    if (!c.symbol) return "Password must contain at least one special symbol.";
    if (String(p).length > 128) return "Password is too long (max 128 characters).";
    return null;
  }

  /* live checklist: <ul id="rule-list"> with li#rule-length/upper/lower/number/symbol */
  function bindRules(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const update = () => {
      const c = passwordChecks(input.value);
      Object.keys(c).forEach((k) => {
        const li = document.getElementById("rule-" + k);
        if (li) li.className = c[k] ? "ok" : "";
      });
    };
    input.addEventListener("input", update);
    update();
  }

  /* ---------- inline message (replaces alert pop-ups) ---------- */
  function showMsg(text, type) {
    let box = document.getElementById("auth-msg");
    if (!box) return;
    box.textContent = text || "";
    box.className = "auth-msg" + (text ? " " + (type || "error") : "");
    if (text) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  function fail(text, inputId) {
    showMsg(text, "error");
    const el = inputId && document.getElementById(inputId);
    if (el) el.focus();
    return false;
  }

  /* ---------- server calls: returns {status, data} or null if no server ---------- */
  async function api(method, path, body) {
    try {
      const res = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const type = res.headers.get("content-type") || "";
      if (!type.includes("application/json")) return null; // e.g. Live Server answering 404/405
      return { status: res.status, data: await res.json() };
    } catch (e) {
      return null;
    }
  }

  function lockedText(data) {
    const m = Math.max(1, Math.ceil((data.retryAfter || 60) / 60));
    return "Too many attempts. Please wait about " + m + " minute" + (m > 1 ? "s" : "") + " and try again.";
  }

  /* ---------- only follow same-site "next" links ---------- */
  function safeNext(fallback) {
    const n = new URLSearchParams(location.search).get("next") || "";
    return /^[A-Za-z0-9_\-]+\.html(\?[^\s]*)?$/.test(n) ? n : fallback;
  }

  /* =========================================================
     BROWSER-ONLY FALLBACK (citizens, when server.js isn't running)
     Accounts live in this browser's localStorage, passwords are salted
     and hashed (never stored as plain text). Several accounts per browser.
     ========================================================= */
  const USERS_KEY = "roadcareUsers";
  const LEGACY_KEY = "roadcareUser"; // old single-account format (plain password)

  function readJSON(k, f) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; }
    catch (e) { return f; }
  }
  function localUsers() {
    const list = readJSON(USERS_KEY, []);
    const legacy = readJSON(LEGACY_KEY, null);
    if (legacy && legacy.email && !list.some((u) => u.email === String(legacy.email).toLowerCase())) {
      list.push({ name: legacy.name, phone: legacy.phone, email: String(legacy.email).toLowerCase(), plain: legacy.password });
    }
    return list;
  }
  function saveLocalUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
    localStorage.removeItem(LEGACY_KEY); // legacy account was merged into the list above
  }
  async function sha(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return null; // very old browser / non-secure page: caller stores plain text
  }
  async function localCredentials(password) {
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(12))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const hash = await sha(salt + password);
    return hash ? { salt, hash } : { plain: password };
  }
  async function localPasswordOk(u, password) {
    if (u.plain !== undefined) return u.plain === password;
    return (await sha(u.salt + password)) === u.hash;
  }
  async function localRegister(user) {
    const list = localUsers();
    if (list.some((u) => u.email === user.email)) return "exists";
    list.push({ name: user.name, phone: user.phone, email: user.email, ...(await localCredentials(user.password)) });
    saveLocalUsers(list);
    return "ok";
  }
  // returns {ok, profile} | {error: "no-account"|"bad-password"}
  async function localLogin(email, password) {
    const list = localUsers();
    const u = list.find((x) => x.email === email);
    if (!u) return { error: "no-account" };
    if (!(await localPasswordOk(u, password))) return { error: "bad-password" };
    if (u.plain !== undefined) { // upgrade an old plain-text account to a hashed one
      delete u.plain;
      Object.assign(u, await localCredentials(password));
      saveLocalUsers(list);
    }
    return { ok: true, profile: { name: u.name, phone: u.phone, email: u.email } };
  }
  async function localSetPassword(email, password) {
    const list = localUsers();
    const u = list.find((x) => x.email === email);
    if (!u) return false;
    delete u.plain;
    Object.assign(u, await localCredentials(password));
    saveLocalUsers(list);
    return true;
  }

  /* ---------- "logged in" markers the rest of the site reads ---------- */
  function startCitizenSession(profile, remember) {
    const store = remember ? localStorage : sessionStorage;
    localStorage.removeItem("roadcareLoggedIn");
    sessionStorage.removeItem("roadcareLoggedIn");
    store.setItem("roadcareLoggedIn", "true");
    localStorage.setItem("roadcareUserName", profile.name);
    localStorage.setItem("roadcareUserEmail", profile.email);
    // Navbar + profile page read rc_profile. Keep the saved photo/city only
    // if it belongs to the same person, otherwise start fresh for this user.
    const old = readJSON("rc_profile", {});
    const same = old.email && old.email.toLowerCase() === profile.email;
    localStorage.setItem("rc_profile", JSON.stringify(
      same ? { ...old, name: profile.name, phone: profile.phone || old.phone }
           : { name: profile.name, email: profile.email, phone: profile.phone || "" }
    ));
  }

  /* =========================================================
     FORGOT PASSWORD (both roles)
     Server running -> code is created/checked on the server.
     No server (citizens only) -> old browser-only flow via FormSubmit.
     ========================================================= */
  const RESET_KEY = "roadcareResetCode";

  async function requestReset(email, role) {
    const r = await api("POST", "/api/password/forgot", { email, role });
    if (r) {
      if (r.status === 429) return { ok: false, message: "Too many requests. Please wait a few minutes and try again." };
      if (!r.data.ok) return { ok: false, message: "Please enter a valid email address." };
      return { ok: true, mode: "server" };
    }
    if (role === "constructor") {
      return { ok: false, message: "The RoadCare server isn't running. Start it with 'npm start' and open the site from http://localhost:3000." };
    }

    // --- browser-only fallback ---
    const user = localUsers().find((u) => u.email === email);
    if (!user) return { ok: true, mode: "local", noAccount: true };
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
    localStorage.setItem(RESET_KEY, JSON.stringify({ code, email, expires: Date.now() + 15 * 60 * 1000, attempts: 0 }));
    try {
      const res = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(email), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: "RoadCare - Your password reset code",
          _template: "box",
          _captcha: "false",
          Name: user.name || "User",
          Message: "Your RoadCare password reset code is: " + code + "  (valid for 15 minutes)",
        }),
      });
      const j = await res.json();
      if (res.ok && (j.success === true || j.success === "true")) return { ok: true, mode: "local" };
      localStorage.removeItem(RESET_KEY);
      return { ok: false, message: "Could not send the email: " + (j.message || "Unknown error") };
    } catch (e) {
      localStorage.removeItem(RESET_KEY);
      return { ok: false, message: "Could not send the email. Check your internet connection." };
    }
  }

  // returns {ok:true} | {ok:false, message, restart?:true}
  async function completeReset(email, role, code, password) {
    const r = await api("POST", "/api/password/reset", { email, role, code, password });
    if (r) {
      if (r.data.ok) return { ok: true };
      const e = r.data.error;
      if (e === "expired") return { ok: false, restart: true, message: "That code has expired or was never requested. Please request a new one." };
      if (e === "too-many") return { ok: false, restart: true, message: "Too many wrong attempts. Please request a new code." };
      if (e === "bad-code") return { ok: false, message: "Incorrect code. Use the code from your NEWEST email. Attempts left: " + r.data.attemptsLeft };
      return { ok: false, message: r.data.message || "Could not reset the password. Please try again." };
    }
    if (role === "constructor") {
      return { ok: false, message: "The RoadCare server isn't running. Start it with 'npm start'." };
    }

    // --- browser-only fallback ---
    const d = readJSON(RESET_KEY, null);
    if (!d || Date.now() > d.expires || d.email !== email) {
      localStorage.removeItem(RESET_KEY);
      return { ok: false, restart: true, message: "That code has expired or was never requested. Please request a new one." };
    }
    if (code !== String(d.code)) {
      d.attempts = (d.attempts || 0) + 1;
      if (d.attempts >= 5) {
        localStorage.removeItem(RESET_KEY);
        return { ok: false, restart: true, message: "Too many wrong attempts. Please request a new code." };
      }
      localStorage.setItem(RESET_KEY, JSON.stringify(d));
      return { ok: false, message: "Incorrect code. Use the code from your NEWEST email. Attempts left: " + (5 - d.attempts) };
    }
    if (!(await localSetPassword(email, password))) {
      return { ok: false, message: "Account not found in this browser. Please create an account first." };
    }
    localStorage.removeItem(RESET_KEY);
    return { ok: true };
  }

  window.RC = {
    EMAIL_RE, validName, cleanPhone, passwordChecks, passwordError, bindRules,
    showMsg, fail, api, lockedText, safeNext,
    localRegister, localLogin, startCitizenSession,
    requestReset, completeReset,
  };
})();
