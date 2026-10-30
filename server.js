/* =========================================================
   RoadCare - server.js
   Small backend so reports submitted by a citizen show up on
   the constructor dashboard from ANY browser or device.
   - Stores everything in roadcare-data.json (next to this file)
   - Also serves your HTML/CSS/JS files, so every page uses the
     same address (fixes the "different origin" localStorage problem)

   Run:   npm install
          npm start
   Open:  http://localhost:3000/report.html
   ========================================================= */
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "roadcare-data.json");

// Code a constructor must enter to register. It now lives ONLY here (it is no
// longer in the browser files). Change it here or set CONSTRUCTOR_ACCESS_CODE.
const CONSTRUCTOR_ACCESS_CODE = process.env.CONSTRUCTOR_ACCESS_CODE || "PCMC-ROADS-2026";

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      reports: d.reports || [],
      updates: d.updates || {},
      constructors: d.constructors || [],
      users: d.users || [],     // citizen accounts
      resets: d.resets || {},   // pending password-reset codes (hashed)
    };
  } catch (e) {
    return { reports: [], updates: {}, constructors: [], users: [], resets: {} };
  }
}
function save(db) {
  // write to a temp file first so a crash can never leave a half-written database
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
}

/* ---------- Session secret (kept in .jwt-secret, or set JWT_SECRET) ---------- */
function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const f = path.join(__dirname, ".jwt-secret");
  try {
    return fs.readFileSync(f, "utf8").trim();
  } catch (e) {
    const s = crypto.randomBytes(48).toString("hex");
    try { fs.writeFileSync(f, s, { mode: 0o600 }); } catch (err) { /* read-only disk: secret lasts until restart */ }
    return s;
  }
}
const JWT_SECRET = loadSecret();

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// Don't serve server-side files over HTTP
app.use((req, res, next) => {
  if (/^\/(server\.js|package(-lock)?\.json|roadcare-data\.json(\.tmp)?|\.jwt-secret)$/i.test(req.path)) {
    return res.status(404).end();
  }
  next();
});

/* ---------- Reports ---------- */
app.get("/api/reports", (req, res) => res.json(load().reports));

// Accepts one report or an array; adds only the ones it doesn't have yet
app.post("/api/reports", (req, res) => {
  const incoming = Array.isArray(req.body) ? req.body : [req.body];
  const db = load();
  const ids = new Set(db.reports.map((r) => String(r.id)));
  incoming.forEach((r) => {
    if (r && r.id != null && !ids.has(String(r.id))) {
      db.reports.push(r);
      ids.add(String(r.id));
    }
  });
  db.reports.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  save(db);
  res.json(db.reports);
});

/* ---------- Status + constructor messages ---------- */
app.get("/api/updates", (req, res) => res.json(load().updates));

// Only a signed-in constructor may change report status / send messages
app.put("/api/updates", requireConstructor, (req, res) => {
  const db = load();
  db.updates = { ...db.updates, ...(req.body || {}) };
  save(db);
  res.json(db.updates);
});

/* =========================================================
   ACCOUNTS & SESSIONS
   - Citizens and constructors have separate accounts and separate
     login cookies (rc_citizen / rc_constructor), so one browser can
     be signed in as both without them interfering.
   - Passwords are hashed with scrypt. The cookie is an httpOnly JWT,
     so page scripts can't read or forge it.
   - The constructor access code is checked here only (it is no longer
     sent to the browser).
   ========================================================= */
const COOKIE = { citizen: "rc_citizen", constructor: "rc_constructor" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 24 * 60 * 60 * 1000;

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function newCredentials(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: hashPassword(password, salt) };
}

function passwordMatches(acct, password) {
  const given = Buffer.from(hashPassword(String(password || ""), acct.salt), "hex");
  const stored = Buffer.from(acct.hash, "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

const normEmail = (e) => String(e || "").trim().toLowerCase();

/* ----- validation (same rules as the pages use) ----- */
function validName(n) {
  return /^[\p{L}][\p{L} .'\-]{2,59}$/u.test(n);
}
function cleanPhone(p) {
  let d = String(p || "").replace(/[\s\-()+.]/g, "");
  if (/^91\d{10}$/.test(d)) d = d.slice(2);
  else if (/^0\d{10}$/.test(d)) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}
function passwordError(p) {
  p = String(p || "");
  if (p.length < 8) return "Password must contain at least 8 characters.";
  if (p.length > 128) return "Password is too long (max 128 characters).";
  if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter.";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(p)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9\s]/.test(p)) return "Password must contain at least one special symbol.";
  return null;
}
function sameSecret(a, b) {
  const h = (x) => crypto.createHash("sha256").update(String(x)).digest();
  return crypto.timingSafeEqual(h(a), h(b));
}

/* ----- brute-force protection (in memory, per IP + email) ----- */
const tries = new Map();
function lockedFor(key, max) {
  const t = tries.get(key);
  if (!t || Date.now() > t.reset) return 0;
  return t.count >= max ? Math.ceil((t.reset - Date.now()) / 1000) : 0;
}
function hit(key, windowMs) {
  let t = tries.get(key);
  if (!t || Date.now() > t.reset) t = { count: 0, reset: Date.now() + windowMs };
  t.count++;
  tries.set(key, t);
}
setInterval(() => {
  const now = Date.now();
  tries.forEach((t, k) => { if (now > t.reset) tries.delete(k); });
}, 10 * 60 * 1000).unref();

/* ----- sessions ----- */
function startSession(req, res, role, email, remember) {
  const days = remember ? 30 : 7;
  const token = jwt.sign({ sub: email, role }, JWT_SECRET, { expiresIn: days + "d" });
  const opts = {
    httpOnly: true,
    sameSite: "lax",
    secure: !!req.secure || process.env.COOKIE_SECURE === "true",
  };
  if (remember) opts.maxAge = days * DAY; // otherwise: browser-session cookie
  res.cookie(COOKIE[role], token, opts);
}

function sessionAccount(req, role) {
  const token = req.cookies && req.cookies[COOKIE[role]];
  if (!token) return null;
  try {
    const p = jwt.verify(token, JWT_SECRET);
    if (p.role !== role) return null;
    const db = load();
    const list = role === "constructor" ? db.constructors : db.users;
    return list.find((a) => a.email === p.sub) || null;
  } catch (e) {
    return null;
  }
}

function requireConstructor(req, res, next) {
  const acct = sessionAccount(req, "constructor");
  if (!acct) return res.status(401).json({ ok: false, error: "not-logged-in" });
  req.account = acct;
  next();
}

const profileOf = (a, role) =>
  role === "constructor"
    ? { name: a.name, company: a.company, phone: a.phone, email: a.email }
    : { name: a.name, phone: a.phone, email: a.email };

function login(role) {
  return (req, res) => {
    const { email, password, remember } = req.body || {};
    const key = `login:${role}:${req.ip}:${normEmail(email)}`;
    const wait = lockedFor(key, 8);
    if (wait) return res.status(429).json({ ok: false, error: "locked", retryAfter: wait });

    const db = load();
    const list = role === "constructor" ? db.constructors : db.users;
    const acct = list.find((c) => c.email === normEmail(email));
    if (!acct) return res.status(404).json({ ok: false, error: "no-account" });

    if (!passwordMatches(acct, password)) {
      hit(key, 15 * 60 * 1000);
      return res.status(401).json({ ok: false, error: "bad-password" });
    }
    tries.delete(key);
    startSession(req, res, role, acct.email, !!remember);
    res.json({ ok: true, profile: profileOf(acct, role) });
  };
}

/* ---------- Citizen accounts ---------- */
app.post("/api/register", (req, res) => {
  const { name, phone, email, password } = req.body || {};
  const n = String(name || "").trim();
  const ph = cleanPhone(phone);
  const em = normEmail(email);
  if (!validName(n)) return res.status(400).json({ ok: false, error: "bad-name" });
  if (!ph) return res.status(400).json({ ok: false, error: "bad-phone" });
  if (!EMAIL_RE.test(em)) return res.status(400).json({ ok: false, error: "bad-email" });
  const pe = passwordError(password);
  if (pe) return res.status(400).json({ ok: false, error: "bad-password-rule", message: pe });

  const db = load();
  if (db.users.some((u) => u.email === em)) {
    return res.status(409).json({ ok: false, error: "exists" });
  }
  db.users.push({ name: n, phone: ph, email: em, ...newCredentials(String(password)), createdAt: new Date().toISOString() });
  save(db);
  res.json({ ok: true });
});

app.post("/api/login", login("citizen"));

app.get("/api/me", (req, res) => {
  const a = sessionAccount(req, "citizen");
  if (!a) return res.status(401).json({ ok: false, error: "not-logged-in" });
  res.json({ ok: true, ...profileOf(a, "citizen") });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE.citizen);
  res.json({ ok: true });
});

/* ---------- Constructor accounts ---------- */
app.post("/api/constructors/register", (req, res) => {
  const { name, company, phone, email, password, code } = req.body || {};
  const n = String(name || "").trim();
  const co = String(company || "").trim();
  const ph = cleanPhone(phone);
  const em = normEmail(email);
  if (!validName(n)) return res.status(400).json({ ok: false, error: "bad-name" });
  if (co.length < 2 || co.length > 100) return res.status(400).json({ ok: false, error: "bad-company" });
  if (!ph) return res.status(400).json({ ok: false, error: "bad-phone" });
  if (!EMAIL_RE.test(em)) return res.status(400).json({ ok: false, error: "bad-email" });

  const key = `code:${req.ip}`;
  if (lockedFor(key, 10)) return res.status(429).json({ ok: false, error: "locked" });
  if (!sameSecret(code || "", CONSTRUCTOR_ACCESS_CODE)) {
    hit(key, 15 * 60 * 1000);
    return res.status(403).json({ ok: false, error: "bad-code" });
  }
  const pe = passwordError(password);
  if (pe) return res.status(400).json({ ok: false, error: "bad-password-rule", message: pe });

  const db = load();
  if (db.constructors.some((c) => c.email === em)) {
    return res.status(409).json({ ok: false, error: "exists" });
  }
  db.constructors.push({ name: n, company: co, phone: ph, email: em, ...newCredentials(String(password)), createdAt: new Date().toISOString() });
  save(db);
  res.json({ ok: true });
});

app.post("/api/constructors/login", login("constructor"));

app.get("/api/constructors/me", (req, res) => {
  const a = sessionAccount(req, "constructor");
  if (!a) return res.status(401).json({ ok: false, error: "not-logged-in" });
  res.json({ ok: true, ...profileOf(a, "constructor") });
});

app.post("/api/constructors/logout", (req, res) => {
  res.clearCookie(COOKIE.constructor);
  res.json({ ok: true });
});

// Constructor pages can only be opened while signed in as a constructor
app.use((req, res, next) => {
  if (/^\/constructor-(dashboard|map|contact)\.html$/i.test(req.path) && !sessionAccount(req, "constructor")) {
    return res.redirect("/constructor-login.html");
  }
  next();
});

/* ---------- Forgot / reset password (both roles) ----------
   The 6-digit code is created and checked HERE, so it never reaches the
   browser. It is emailed through FormSubmit (no key needed; the first time
   you use an address, click "Activate" in the email FormSubmit sends).
   If sending fails, the code is printed in this terminal. */
async function sendResetEmail(to, name, code) {
  try {
    const r = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(to), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: "RoadCare - Your password reset code",
        _template: "box",
        _captcha: "false",
        Name: name || "User",
        Message: "Your RoadCare password reset code is: " + code + "  (valid for 15 minutes)",
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && (j.success === true || j.success === "true")) return true;
    throw new Error(j.message || "HTTP " + r.status);
  } catch (e) {
    console.warn(`[reset] Could not email ${to} (${e.message}). Code for testing: ${code}`);
    return false;
  }
}

const resetCodeHash = (code, key) =>
  crypto.createHash("sha256").update(`${code}:${key}:${JWT_SECRET}`).digest("hex");

const roleOf = (r) => (r === "constructor" ? "constructor" : "citizen");

app.post("/api/password/forgot", (req, res) => {
  const role = roleOf(req.body && req.body.role);
  const email = normEmail(req.body && req.body.email);
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: "bad-email" });

  const rl = `forgot:${req.ip}`;
  if (lockedFor(rl, 6)) return res.status(429).json({ ok: false, error: "locked" });
  hit(rl, 15 * 60 * 1000);

  const db = load();
  const acct = (role === "constructor" ? db.constructors : db.users).find((a) => a.email === email);
  const key = `${role}:${email}`;

  if (acct) {
    const prev = db.resets[key];
    if (!(prev && Date.now() - prev.sent < 60 * 1000)) { // 1 email per minute
      const code = String(crypto.randomInt(100000, 1000000));
      db.resets[key] = { hash: resetCodeHash(code, key), expires: Date.now() + 15 * 60 * 1000, attempts: 0, sent: Date.now() };
      save(db);
      sendResetEmail(email, acct.name, code);
    }
  }
  // Same answer whether or not the account exists
  res.json({ ok: true });
});

app.post("/api/password/reset", (req, res) => {
  const role = roleOf(req.body && req.body.role);
  const email = normEmail(req.body && req.body.email);
  const code = String((req.body && req.body.code) || "").replace(/\D/g, "");
  const password = String((req.body && req.body.password) || "");
  const key = `${role}:${email}`;

  const db = load();
  const r = db.resets[key];
  if (!r || Date.now() > r.expires) {
    if (r) { delete db.resets[key]; save(db); }
    return res.status(400).json({ ok: false, error: "expired" });
  }
  const pe = passwordError(password);
  if (pe) return res.status(400).json({ ok: false, error: "bad-password-rule", message: pe });

  const given = Buffer.from(resetCodeHash(code, key), "hex");
  const stored = Buffer.from(r.hash, "hex");
  if (code.length !== 6 || !crypto.timingSafeEqual(given, stored)) {
    r.attempts = (r.attempts || 0) + 1;
    if (r.attempts >= 5) {
      delete db.resets[key];
      save(db);
      return res.status(429).json({ ok: false, error: "too-many" });
    }
    save(db);
    return res.status(400).json({ ok: false, error: "bad-code", attemptsLeft: 5 - r.attempts });
  }

  const acct = (role === "constructor" ? db.constructors : db.users).find((a) => a.email === email);
  if (!acct) return res.status(400).json({ ok: false, error: "expired" });
  Object.assign(acct, newCredentials(password));
  delete db.resets[key]; // a code works once
  save(db);
  res.json({ ok: true });
});

/* ---------- Your website files ---------- */
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`RoadCare running at http://localhost:${PORT}`);
  console.log(`  Citizen:      http://localhost:${PORT}/report.html`);
  console.log(`  Constructor:  http://localhost:${PORT}/constructor-dashboard.html`);
  console.log(`  Login:        http://localhost:${PORT}/welcome.html`);
});