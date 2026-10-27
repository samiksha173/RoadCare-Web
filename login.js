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
// LOGIN VALIDATION
// =========================================

document.getElementById("loginForm").addEventListener("submit", function(event) {

    event.preventDefault();


    // =========================================
    // GET INPUT VALUES
    // =========================================

    const email = document
        .getElementById("login-email")
        .value
        .trim();

    const password = document
        .getElementById("login-password")
        .value;


    // =========================================
    // EMAIL VALIDATION
    // =========================================

    if (email === "") {

        alert("Please enter your email address.");

        document
            .getElementById("login-email")
            .focus();

        return;
    }


    // Email must contain @ and .
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        alert("Please enter a valid email address containing @ and a domain.");

        document
            .getElementById("login-email")
            .focus();

        return;
    }


    // =========================================
    // PASSWORD EMPTY CHECK
    // =========================================

    if (password === "") {

        alert("Please enter your password.");

        document
            .getElementById("login-password")
            .focus();

        return;
    }


    // =========================================
    // PASSWORD LENGTH
    // Minimum 8 characters
    // =========================================

    if (password.length < 8) {

        alert("Password must contain at least 8 characters.");

        document
            .getElementById("login-password")
            .focus();

        return;
    }


    // =========================================
    // PASSWORD MUST CONTAIN LETTER
    // =========================================

    const letter = /[A-Za-z]/;

    if (!letter.test(password)) {

        alert("Password must contain at least one letter.");

        document
            .getElementById("login-password")
            .focus();

        return;
    }


    // =========================================
    // PASSWORD MUST CONTAIN NUMBER
    // =========================================

    const number = /[0-9]/;

    if (!number.test(password)) {

        alert("Password must contain at least one number.");

        document
            .getElementById("login-password")
            .focus();

        return;
    }


    // =========================================
    // PASSWORD MUST CONTAIN SYMBOL
    // =========================================

    const symbol = /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\]';`~]/;

    if (!symbol.test(password)) {

        alert("Password must contain at least one special symbol.");

        document
            .getElementById("login-password")
            .focus();

        return;
    }


    // =========================================
    // GET REGISTERED USER
    // =========================================

    const savedUser = localStorage.getItem("roadcareUser");


    if (!savedUser) {

        alert(
            "No account found. Please create an account first."
        );

        return;
    }


    // =========================================
    // CONVERT SAVED DATA
    // =========================================

    const user = JSON.parse(savedUser);


    // =========================================
    // CHECK REGISTERED NAME
    // =========================================

    if (user.name) {

        const namePattern = /^[A-Za-z ]+$/;

        if (!namePattern.test(user.name)) {

            alert(
                "Invalid registered name. Name must contain letters only."
            );

            return;
        }
    }


    // =========================================
    // CHECK EMAIL AND PASSWORD
    // =========================================

    if (
        email !== user.email ||
        password !== user.password
    ) {

        alert(
            "Incorrect email or password. Please try again."
        );

        return;
    }


    // =========================================
    // LOGIN SUCCESS
    // =========================================

    localStorage.setItem(
        "roadcareLoggedIn",
        "true"
    );


    localStorage.setItem(
        "roadcareUserName",
        user.name
    );


    // =========================================
    // SUCCESS MESSAGE
    // =========================================

    alert(
        "Login successful! Welcome to RoadCare."
    );


    // =========================================
    // GO TO HOME PAGE
    // =========================================

    window.location.href = "index.html";

});



// =========================================
// FORGOT PASSWORD (NEW)
// Sends a 6-digit code to the user's email
// No key needed - uses FormSubmit (formsubmit.co)
// First time only: click "Activate Form" in the email
// =========================================

async function forgotPassword(event) {

    event.preventDefault();

    const email = document
        .getElementById("login-email")
        .value
        .trim();


    // Email must be typed first
    if (email === "") {

        alert("Please enter your email address first, then click 'Forgot password?'.");

        document
            .getElementById("login-email")
            .focus();

        return;
    }


    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        alert("Please enter a valid email address.");

        return;
    }


    // Check that the account exists
    const savedUser = localStorage.getItem("roadcareUser");

    if (!savedUser) {

        alert("No account found. Please create an account first.");

        return;
    }

    const user = JSON.parse(savedUser);

    if (email !== user.email) {

        alert("No account found with this email.");

        return;
    }


    // Create a 6-digit code that is valid for 15 minutes
    const code = String(
        crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000
    );

    localStorage.setItem(
        "roadcareResetCode",
        JSON.stringify({
            code: code,
            email: email,
            expires: Date.now() + 15 * 60 * 1000,
            attempts: 0
        })
    );


    // Send the email
    try {

        const response = await fetch(
            "https://formsubmit.co/ajax/" + encodeURIComponent(email),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    _subject: "RoadCare - Your password reset code",
                    _template: "box",
                    _captcha: "false",
                    Name: user.name || "User",
                    Message: "Your RoadCare password reset code is: " + code +
                             "  (valid for 15 minutes)"
                })
            }
        );

        const result = await response.json();

        if (response.ok && (result.success === true || result.success === "true")) {

            alert("A 6-digit code has been sent to your email. Enter it on the next page.");

            // Open the reset page (same browser, no link needed)
            window.location.href = "reset-password.html";

        } else {

            localStorage.removeItem("roadcareResetCode");

            alert("Could not send the email: " + (result.message || "Unknown error"));
        }

    } catch (error) {

        console.error(error);

        localStorage.removeItem("roadcareResetCode");

        alert("Could not send the email. Check your internet connection.");
    }
}