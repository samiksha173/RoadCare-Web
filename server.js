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

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "roadcare-data.json");

// Same code as in constructor-auth.js. Change it in BOTH places (or set the
// CONSTRUCTOR_ACCESS_CODE environment variable for the server).
const CONSTRUCTOR_ACCESS_CODE = process.env.CONSTRUCTOR_ACCESS_CODE || "PCMC-ROADS-2026";

function load() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return { reports: d.reports || [], updates: d.updates || {}, constructors: d.constructors || [] };
  } catch (e) {
    return { reports: [], updates: {}, constructors: [] };
  }
}
function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}

app.use(express.json({ limit: "50mb" }));

// Don't serve server-side files over HTTP
app.use((req, res, next) => {
  if (/^\/(server\.js|package(-lock)?\.json|roadcare-data\.json)$/i.test(req.path)) {
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

app.put("/api/updates", (req, res) => {
  const db = load();
  db.updates = { ...db.updates, ...(req.body || {}) };
  save(db);
  res.json(db.updates);
});

/* ---------- Constructor accounts ---------- */
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

app.post("/api/constructors/register", (req, res) => {
  const { name, company, phone, email, password, code } = req.body || {};
  if (!name || !company || !phone || !email || !password) {
    return res.status(400).json({ ok: false, error: "missing" });
  }
  if (code !== CONSTRUCTOR_ACCESS_CODE) {
    return res.status(403).json({ ok: false, error: "bad-code" });
  }
  const db = load();
  const key = String(email).trim().toLowerCase();
  if (db.constructors.some((c) => c.email === key)) {
    return res.status(409).json({ ok: false, error: "exists" });
  }
  const salt = crypto.randomBytes(16).toString("hex");
  db.constructors.push({
    name: String(name).trim(),
    company: String(company).trim(),
    phone: String(phone).trim(),
    email: key,
    salt,
    hash: hashPassword(String(password), salt),
  });
  save(db);
  res.json({ ok: true });
});

app.post("/api/constructors/login", (req, res) => {
  const { email, password } = req.body || {};
  const db = load();
  const acct = db.constructors.find((c) => c.email === String(email || "").trim().toLowerCase());
  if (!acct) return res.status(404).json({ ok: false, error: "no-account" });

  const given = Buffer.from(hashPassword(String(password || ""), acct.salt), "hex");
  const stored = Buffer.from(acct.hash, "hex");
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return res.status(401).json({ ok: false, error: "bad-password" });
  }
  res.json({ ok: true, profile: { name: acct.name, company: acct.company, phone: acct.phone, email: acct.email } });
});

/* ---------- Your website files ---------- */
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`RoadCare running at http://localhost:${PORT}`);
  console.log(`  Citizen:      http://localhost:${PORT}/report.html`);
  console.log(`  Constructor:  http://localhost:${PORT}/constructor-dashboard.html`);
});