# RoadCare – login / registration fixes

## Bugs fixed
1. Citizen could register, then never log in – login demanded a special symbol, registration didn't. Login now only checks the fields are filled; password rules apply when creating/resetting a password (same everywhere: 8+ chars, upper, lower, number, symbol).
2. Login rejected names with dots/digits/apostrophes that registration accepted. One shared name rule now.
3. Registering a 2nd person overwrote the 1st account (one account per browser). Now many accounts.
4. Email case (Ravi@x.com vs ravi@x.com) caused "incorrect password". Emails are lower-cased everywhere.
5. Sign out wiped ALL browser storage (account + reports). It now removes only the sign-in markers.
6. nav-avatar.js had a syntax bug (first function never invoked correctly), so the navbar always showed a fake "User". Rewritten: real name/email when signed in, Login link when not. Profile/Settings redirect to login if signed out.
7. "Remember me" did nothing – now controls cookie/session lifetime.
8. Passwords were stored in plain text – now scrypt-hashed on the server (salted SHA-256 in the browser-only fallback).
9. Constructor access code was visible in browser JS and anyone could set roadcareConstructorLoggedIn=true in the console. Code is now checked only in server.js; sessions are httpOnly JWT cookies (the unused jsonwebtoken / cookie-parser packages are now used); constructor pages and PUT /api/updates need a constructor session.
10. Constructor logout left the server session alive; /api/me and /api/logout (called by the navbar) didn't exist; "Login.html" links (case-sensitive on Linux hosts).
11. Forgot-password code was stored in the browser (readable by anyone) – now created/checked on the server, hashed, 15 min expiry, 5 tries, 1 email/minute.

## Added
- Constructor: "Forgot password?", "Keep me signed in", phone/company validation, live password checklist.
- Citizen register: live password checklist; phone accepts +91 / 0 prefixes.
- Inline messages instead of alert() pop-ups.
- Lock-out after repeated wrong passwords (HTTP 429).
- ?next= redirect back to the page you came from.
- Email field on reset-password.html (works for both roles: ?role=constructor).

## Files
New: auth-common.js
Changed: server.js, login.html/js, register.html/js, reset-password.html, constructor-login.html, constructor-register.html, constructor-auth.js, constructor-nav.js, constructor-dashboard.js, nav-avatar.js, auth.css, and the Login.html link in 6 pages.

## Notes
- Run: npm start, open http://localhost:3000. Existing constructor account(s) in roadcare-data.json keep working.
- Constructors now REQUIRE the server (no localStorage fallback – that fallback is what exposed the code).
- Citizens still work without the server (Live Server) via a browser-only fallback; old single accounts migrate automatically.
- Reset e-mails go through FormSubmit (first time per address, click "Activate" in its email). If sending fails the code is printed in the server terminal.
- Production: set JWT_SECRET, CONSTRUCTOR_ACCESS_CODE, COOKIE_SECURE=true and use HTTPS. Add .jwt-secret to .gitignore.
