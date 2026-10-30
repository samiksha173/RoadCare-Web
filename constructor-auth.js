// =========================================
// CONSTRUCTOR AUTH
// Handles both constructor-register.html and constructor-login.html.
// Constructor accounts are stored separately from citizen accounts.
//
// Accounts and sessions live on the RoadCare server (npm start): passwords
// are hashed, the login is a secure cookie, and the access code is checked
// on the server only (it is no longer visible in this file).
// Open the site through the server (http://localhost:3000) to use it.
//
// togglePassword() and the shared validation live in auth-common.js.
// =========================================

const LAST_EMAIL_KEY = "roadcareLastConstructorEmail";
const PREFILL_KEY = "roadcarePrefillEmail";

const NO_SERVER_MSG =
    "Can't reach the RoadCare server. Start it with 'npm start' and open this page from http://localhost:3000.";


// =========================================
// HELPERS
// =========================================

function startSession(profile) {
    localStorage.setItem("roadcareConstructorLoggedIn", "true");
    localStorage.setItem("roadcareConstructorName", profile.name);
    localStorage.setItem("roadcareConstructorEmail", profile.email);
    localStorage.setItem("roadcareConstructorCompany", profile.company || "");
    localStorage.setItem("roadcareConstructorPhone", profile.phone || "");
    localStorage.setItem(LAST_EMAIL_KEY, profile.email);
}

function clearSession() {
    ["roadcareConstructorLoggedIn", "roadcareConstructorName", "roadcareConstructorEmail",
     "roadcareConstructorCompany", "roadcareConstructorPhone"].forEach(k => localStorage.removeItem(k));
}

function goToLogin(email) {
    try { sessionStorage.setItem(PREFILL_KEY, email); } catch (e) { }
    window.location.href = "constructor-login.html";
}

const registerForm = document.getElementById("constructorRegisterForm");
const loginForm = document.getElementById("constructorLoginForm");


// =========================================
// ALREADY LOGGED IN? Skip straight to the dashboard.
// The server is asked, so a stale "logged in" flag from an expired
// session can't bounce you back and forth.
// =========================================

(async function () {
    const me = await RC.api("GET", "/api/constructors/me");
    if (me && me.data.ok) {
        startSession(me.data);
        window.location.replace("constructor-dashboard.html");
    } else if (me) {
        clearSession();
    }
})();


// =========================================
// REGISTRATION
// =========================================

if (registerForm) {

    RC.bindRules("con-reg-password"); // live password checklist

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        RC.showMsg("");

        const name = document.getElementById("con-reg-name").value.trim().replace(/\s+/g, " ");
        const company = document.getElementById("con-reg-company").value.trim();
        const phoneRaw = document.getElementById("con-reg-phone").value.trim();
        const email = document.getElementById("con-reg-email").value.trim().toLowerCase();
        const code = document.getElementById("con-reg-code").value.trim();
        const password = document.getElementById("con-reg-password").value;
        const confirmPassword = document.getElementById("con-reg-confirm-password").value;

        if (!name) return RC.fail("Please enter your full name.", "con-reg-name");
        if (!RC.validName(name)) {
            return RC.fail("Name can contain only letters, spaces, dots, hyphens and apostrophes (at least 3 characters).", "con-reg-name");
        }
        if (company.length < 2) return RC.fail("Please enter your company or department.", "con-reg-company");
        if (!phoneRaw) return RC.fail("Please enter your phone number.", "con-reg-phone");
        const phone = RC.cleanPhone(phoneRaw);
        if (!phone) return RC.fail("Please enter a valid 10-digit phone number.", "con-reg-phone");
        if (!RC.EMAIL_RE.test(email)) return RC.fail("Please enter a valid email address.", "con-reg-email");
        if (!code) return RC.fail("Please enter the access code given by your organization.", "con-reg-code");

        const passwordError = RC.passwordError(password);
        if (passwordError) return RC.fail(passwordError, "con-reg-password");
        if (password !== confirmPassword) return RC.fail("Passwords do not match.", "con-reg-confirm-password");

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const result = await RC.api("POST", "/api/constructors/register",
            { name, company, phone, email, password, code });

        if (!result) {
            submitBtn.disabled = false;
            return RC.fail(NO_SERVER_MSG);
        }

        if (result.data.ok) {
            RC.showMsg("Constructor account created! Taking you to login...", "success");
            setTimeout(() => goToLogin(email), 1000);
            return;
        }

        if (result.data.error === "exists") {
            RC.showMsg("You already have an account with this email. Taking you to login...", "info");
            setTimeout(() => goToLogin(email), 1200);
            return;
        }

        submitBtn.disabled = false;

        if (result.data.error === "bad-code") {
            return RC.fail("Invalid access code. Please check with your organization for the correct code.", "con-reg-code");
        }
        if (result.status === 429) {
            return RC.fail("Too many wrong access codes. Please wait a few minutes and try again.");
        }
        RC.fail(result.data.message || "Could not create the account. Please check your details and try again.");
    });
}


// =========================================
// LOGIN
// =========================================

if (loginForm) {

    // Pre-fill the email: just registered / reset, or last used on this browser
    const emailInput = document.getElementById("con-login-email");
    let prefill = "";
    try { prefill = sessionStorage.getItem(PREFILL_KEY) || ""; sessionStorage.removeItem(PREFILL_KEY); } catch (e) { }
    prefill = prefill || localStorage.getItem(LAST_EMAIL_KEY) || "";
    if (emailInput && prefill) {
        emailInput.value = prefill;
        const pw = document.getElementById("con-login-password");
        if (pw) pw.focus();
    }

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        RC.showMsg("");

        const email = emailInput.value.trim().toLowerCase();
        const password = document.getElementById("con-login-password").value;
        const remember = document.getElementById("con-remember").checked;

        if (!RC.EMAIL_RE.test(email)) return RC.fail("Please enter a valid email address.", "con-login-email");
        if (!password) return RC.fail("Please enter your password.", "con-login-password");

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const result = await RC.api("POST", "/api/constructors/login", { email, password, remember });

        if (!result) {
            submitBtn.disabled = false;
            return RC.fail(NO_SERVER_MSG);
        }

        if (result.status === 429) {
            submitBtn.disabled = false;
            return RC.fail(RC.lockedText(result.data));
        }

        if (result.data.ok) {
            startSession(result.data.profile);
            RC.showMsg("Login successful! Welcome to the Constructor Dashboard.", "success");
            setTimeout(() => { window.location.href = "constructor-dashboard.html"; }, 600);
            return;
        }

        submitBtn.disabled = false;

        if (result.data.error === "no-account") {
            RC.showMsg("No constructor account was found for this email. Redirecting you to registration...", "info");
            setTimeout(() => { window.location.href = "constructor-register.html"; }, 1800);
            return;
        }
        RC.fail("Incorrect email or password. Please try again.", "con-login-password");
    });

    // Forgot password -> code by email -> reset-password.html?role=constructor
    document.getElementById("con-forgot").addEventListener("click", async function (event) {
        event.preventDefault();
        RC.showMsg("");

        const email = emailInput.value.trim().toLowerCase();
        if (!email) return RC.fail("Please enter your email address first, then click 'Forgot password?'.", "con-login-email");
        if (!RC.EMAIL_RE.test(email)) return RC.fail("Please enter a valid email address.", "con-login-email");

        RC.showMsg("Sending the code...", "info");
        const r = await RC.requestReset(email, "constructor");
        if (!r.ok) return RC.fail(r.message);

        try { sessionStorage.setItem("roadcareResetEmail", email); } catch (e) { }
        window.location.href = "reset-password.html?role=constructor&email=" + encodeURIComponent(email);
    });
}
