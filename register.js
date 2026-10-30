// =========================================
// CITIZEN REGISTRATION
// Saves the account on the server when it is running; otherwise in this
// browser (see auth-common.js). togglePassword() lives in auth-common.js.
// =========================================

const registerForm = document.getElementById("registerForm");

RC.bindRules("reg-password"); // live password checklist

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();
    RC.showMsg("");

    const name = document.getElementById("reg-name").value.trim().replace(/\s+/g, " ");
    const phoneRaw = document.getElementById("reg-phone").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;
    const confirmPassword = document.getElementById("reg-confirm-password").value;


    // ---------- name ----------
    if (name === "") return RC.fail("Please enter your full name.", "reg-name");
    if (name.length < 3) return RC.fail("Name must contain at least 3 characters.", "reg-name");
    if (!RC.validName(name)) {
        return RC.fail("Name can contain only letters, spaces, dots, hyphens and apostrophes.", "reg-name");
    }

    // ---------- phone ----------
    if (phoneRaw === "") return RC.fail("Please enter your phone number.", "reg-phone");
    const phone = RC.cleanPhone(phoneRaw);
    if (!phone) return RC.fail("Please enter a valid 10-digit phone number.", "reg-phone");

    // ---------- email ----------
    if (email === "") return RC.fail("Please enter your email address.", "reg-email");
    if (!RC.EMAIL_RE.test(email)) return RC.fail("Please enter a valid email address.", "reg-email");

    // ---------- password ----------
    if (password === "") return RC.fail("Please enter your password.", "reg-password");
    const passwordError = RC.passwordError(password);
    if (passwordError) return RC.fail(passwordError, "reg-password");

    if (confirmPassword === "") return RC.fail("Please confirm your password.", "reg-confirm-password");
    if (password !== confirmPassword) {
        return RC.fail("Password and Confirm Password do not match.", "reg-confirm-password");
    }


    const submitBtn = registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const done = () => {
        try { sessionStorage.setItem("roadcarePrefillEmail", email); } catch (e) { }
        RC.showMsg("Account created successfully! Taking you to login...", "success");
        setTimeout(function () { window.location.href = "login.html"; }, 1000);
    };

    const exists = () => {
        try { sessionStorage.setItem("roadcarePrefillEmail", email); } catch (e) { }
        RC.showMsg("This email is already registered. Taking you to login...", "info");
        setTimeout(function () { window.location.href = "login.html"; }, 1200);
    };


    // ---------- 1) server ----------
    const result = await RC.api("POST", "/api/register", { name, phone, email, password });

    if (result) {
        if (result.data.ok) return done();
        if (result.data.error === "exists") return exists();
        submitBtn.disabled = false;
        return RC.fail(result.data.message || "Could not create the account. Please check your details and try again.");
    }

    // ---------- 2) no server: this browser ----------
    const status = await RC.localRegister({ name, phone, email, password });
    if (status === "exists") return exists();
    done();

});
