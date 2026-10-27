// =========================================
// CONSTRUCTOR AUTH
// Handles both constructor-register.html and constructor-login.html
// Stores accounts separately from citizen accounts so the two never mix.
//
// HOW ACCOUNTS ARE STORED
// - When the Node server (server.js) is running, accounts are saved
//   there (passwords hashed). Register ONCE and you can log in from any
//   browser / port / device that opens the site through the server.
// - If the server isn't running (e.g. plain Live Server), it falls back
//   to this browser's localStorage, like before.
//
// NOTE: still demo-grade auth (shared access code as the "who's allowed"
// gate). Swap for a real backend before this goes anywhere public.
// =========================================

const CONSTRUCTORS_KEY = "roadcareConstructors";
const LAST_EMAIL_KEY = "roadcareLastConstructorEmail";
const PREFILL_KEY = "roadcarePrefillEmail";

// Must match CONSTRUCTOR_ACCESS_CODE in server.js
// Example org using this code: Pimpri-Chinchwad Municipal Corporation
// (PCMC) - Roads Department.
const CONSTRUCTOR_ACCESS_CODE = "PCMC-ROADS-2026";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// =========================================
// SHOW / HIDE PASSWORD
// =========================================

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        btn.textContent = "🙈";
    } else {
        input.type = "password";
        btn.textContent = "👁️";
    }
}


// =========================================
// HELPERS
// =========================================

function getConstructors() {
    const raw = localStorage.getItem(CONSTRUCTORS_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveConstructors(list) {
    localStorage.setItem(CONSTRUCTORS_KEY, JSON.stringify(list));
}

function isValidPassword(password) {
    if (password.length < 8) return "Password must contain at least 8 characters.";
    if (!/[A-Za-z]/.test(password)) return "Password must contain at least one letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]';`~]/.test(password)) return "Password must contain at least one special symbol.";
    return null;
}

const sameEmail = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// Talks to server.js. Returns { status, data } or null if the server
// isn't available (Live Server, offline, file://, etc.)
async function serverCall(path, body) {
    try {
        const res = await fetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const type = res.headers.get("content-type") || "";
        if (!type.includes("application/json")) return null;
        return { status: res.status, data: await res.json() };
    } catch (e) {
        return null;
    }
}

function startSession(profile) {
    localStorage.setItem("roadcareConstructorLoggedIn", "true");
    localStorage.setItem("roadcareConstructorName", profile.name);
    localStorage.setItem("roadcareConstructorEmail", profile.email);
    localStorage.setItem("roadcareConstructorCompany", profile.company || "");
    localStorage.setItem("roadcareConstructorPhone", profile.phone || "");
    localStorage.setItem(LAST_EMAIL_KEY, profile.email);
}

function goToLogin(email) {
    try { sessionStorage.setItem(PREFILL_KEY, email); } catch (e) { }
    window.location.href = "constructor-login.html";
}


// =========================================
// ALREADY LOGGED IN? Skip straight to the dashboard
// =========================================

const registerForm = document.getElementById("constructorRegisterForm");
const loginForm = document.getElementById("constructorLoginForm");

if ((registerForm || loginForm) &&
    localStorage.getItem("roadcareConstructorLoggedIn") === "true") {
    window.location.replace("constructor-dashboard.html");
}


// =========================================
// REGISTRATION
// =========================================

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("con-reg-name").value.trim();
        const company = document.getElementById("con-reg-company").value.trim();
        const phone = document.getElementById("con-reg-phone").value.trim();
        const email = document.getElementById("con-reg-email").value.trim();
        const code = document.getElementById("con-reg-code").value.trim();
        const password = document.getElementById("con-reg-password").value;
        const confirmPassword = document.getElementById("con-reg-confirm-password").value;

        if (!name || !/^[A-Za-z ]+$/.test(name)) {
            alert("Please enter a valid name (letters only).");
            return;
        }

        if (!company) {
            alert("Please enter your company or department.");
            return;
        }

        if (!phone) {
            alert("Please enter your phone number.");
            return;
        }

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (code !== CONSTRUCTOR_ACCESS_CODE) {
            alert("Invalid access code. Please check with your organization for the correct code.");
            return;
        }

        const passwordError = isValidPassword(password);
        if (passwordError) {
            alert(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        const submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        // 1) Server first
        const result = await serverCall("/api/constructors/register",
            { name, company, phone, email, password, code });

        if (result) {
            if (result.data.ok) {
                alert("Constructor account created! You can now log in.");
                goToLogin(email);
                return;
            }
            if (result.data.error === "exists") {
                alert("You already have an account with this email. Please log in instead.");
                goToLogin(email);
                return;
            }
            if (result.data.error === "bad-code") {
                alert("Invalid access code. Please check with your organization for the correct code.");
            } else {
                alert("Could not create the account. Please try again.");
            }
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        // 2) Fallback: this browser's localStorage
        const constructors = getConstructors();

        if (constructors.some(c => sameEmail(c.email, email))) {
            alert("You already have an account with this email. Please log in instead.");
            goToLogin(email);
            return;
        }

        constructors.push({ name, company, phone, email, password });
        saveConstructors(constructors);

        alert("Constructor account created! You can now log in.");
        goToLogin(email);
    });
}


// =========================================
// LOGIN
// =========================================

if (loginForm) {

    // Pre-fill the email: just registered, or last used on this browser
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

        const email = document.getElementById("con-login-email").value.trim();
        const password = document.getElementById("con-login-password").value;

        if (!emailPattern.test(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        if (!password) {
            alert("Please enter your password.");
            return;
        }

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const finish = (profile) => {
            startSession(profile);
            alert("Login successful! Welcome to the Constructor Dashboard.");
            window.location.href = "constructor-dashboard.html";
        };

        const noAccount = () => {
            if (submitBtn) submitBtn.disabled = false;
            if (confirm("No constructor account was found for this email.\n\nWould you like to register now?")) {
                window.location.href = "constructor-register.html";
            }
        };

        // 1) Server first
        let result = await serverCall("/api/constructors/login", { email, password });

        if (result) {
            // Account was created earlier in this browser only? Move it to the server.
            if (!result.data.ok && result.data.error === "no-account") {
                const local = getConstructors().find(c => sameEmail(c.email, email) && c.password === password);
                if (local) {
                    await serverCall("/api/constructors/register", {
                        name: local.name, company: local.company, phone: local.phone,
                        email: local.email, password: local.password, code: CONSTRUCTOR_ACCESS_CODE
                    });
                    result = await serverCall("/api/constructors/login", { email, password });
                }
            }

            if (result && result.data.ok) {
                finish(result.data.profile);
                return;
            }
            if (result && result.data.error === "no-account") {
                noAccount();
                return;
            }
            alert("Incorrect password. Please try again.");
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        // 2) Fallback: this browser's localStorage
        const constructors = getConstructors();
        const account = constructors.find(c => sameEmail(c.email, email));

        if (!account) {
            noAccount();
            return;
        }

        if (account.password !== password) {
            alert("Incorrect password. Please try again.");
            if (submitBtn) submitBtn.disabled = false;
            return;
        }

        finish(account);
    });
}