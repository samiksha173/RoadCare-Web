// =========================================
// CITIZEN LOGIN
// Uses server.js when it is running (secure session cookie, hashed
// passwords). If the server isn't running, falls back to accounts stored
// in this browser (see auth-common.js).
//
// togglePassword() now lives in auth-common.js.
// =========================================

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");


// =========================================
// ALREADY LOGGED IN? Go straight to the site
// =========================================

(async function () {
    const here = await RC.api("GET", "/api/me");
    if (here && here.data.ok) {
        window.location.replace(RC.safeNext("index.html"));
        return;
    }
    // Server running but not logged in: any old browser-side "logged in" marker is stale
    if (here) {
        localStorage.removeItem("roadcareLoggedIn");
        sessionStorage.removeItem("roadcareLoggedIn");
    } else if (localStorage.getItem("roadcareLoggedIn") === "true" ||
               sessionStorage.getItem("roadcareLoggedIn") === "true") {
        window.location.replace(RC.safeNext("index.html"));
        return;
    }

    // Pre-fill the email after registering or resetting a password
    let prefill = "";
    try { prefill = sessionStorage.getItem("roadcarePrefillEmail") || ""; sessionStorage.removeItem("roadcarePrefillEmail"); } catch (e) { }
    if (prefill) {
        emailInput.value = prefill;
        passwordInput.focus();
    }
})();


// =========================================
// LOGIN
// Only checks that the fields are filled in and the email looks right.
// (Password strength rules belong to registration / reset - checking them
// here used to lock out people whose password was valid at sign-up.)
// =========================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();
    RC.showMsg("");

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const remember = document.getElementById("remember-me").checked;

    if (email === "") return RC.fail("Please enter your email address.", "login-email");
    if (!RC.EMAIL_RE.test(email)) return RC.fail("Please enter a valid email address.", "login-email");
    if (password === "") return RC.fail("Please enter your password.", "login-password");

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    let profile = null;

    const result = await RC.api("POST", "/api/login", { email, password, remember });

    if (result) {
        // ---- server answered ----
        if (result.status === 429) {
            submitBtn.disabled = false;
            return RC.fail(RC.lockedText(result.data));
        }
        if (!result.data.ok) {
            submitBtn.disabled = false;
            if (result.data.error === "no-account") {
                return RC.fail("No account found with this email. Please create an account first.", "login-email");
            }
            return RC.fail("Incorrect email or password. Please try again.", "login-password");
        }
        profile = result.data.profile;

    } else {
        // ---- no server: accounts saved in this browser ----
        const local = await RC.localLogin(email, password);
        if (!local.ok) {
            submitBtn.disabled = false;
            if (local.error === "no-account") {
                return RC.fail("No account found with this email. Please create an account first.", "login-email");
            }
            return RC.fail("Incorrect email or password. Please try again.", "login-password");
        }
        profile = local.profile;
    }

    RC.startCitizenSession(profile, remember);

    RC.showMsg("Login successful! Welcome to RoadCare.", "success");
    setTimeout(function () {
        window.location.href = RC.safeNext("index.html");
    }, 600);

});


// =========================================
// FORGOT PASSWORD
// Sends a 6-digit code to the user's email, then opens reset-password.html
// =========================================

async function forgotPassword(event) {

    event.preventDefault();
    RC.showMsg("");

    const email = emailInput.value.trim().toLowerCase();

    if (email === "") {
        return RC.fail("Please enter your email address first, then click 'Forgot password?'.", "login-email");
    }
    if (!RC.EMAIL_RE.test(email)) {
        return RC.fail("Please enter a valid email address.", "login-email");
    }

    RC.showMsg("Sending the code...", "info");

    const r = await RC.requestReset(email, "citizen");

    if (!r.ok) return RC.fail(r.message);

    if (r.noAccount) {
        return RC.fail("No account found with this email. Please create an account first.", "login-email");
    }

    try { sessionStorage.setItem("roadcareResetEmail", email); } catch (e) { }
    window.location.href = "reset-password.html?email=" + encodeURIComponent(email);
}
