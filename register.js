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
// REGISTRATION FORM
// =========================================

document
    .getElementById("registerForm")
    .addEventListener("submit", function(event) {

        event.preventDefault();


        // =========================================
        // GET INPUT VALUES
        // =========================================

        const name = document
            .getElementById("reg-name")
            .value
            .trim();

        const phone = document
            .getElementById("reg-phone")
            .value
            .trim();

        const email = document
            .getElementById("reg-email")
            .value
            .trim();

        const password = document
            .getElementById("reg-password")
            .value;

        const confirmPassword = document
            .getElementById("reg-confirm-password")
            .value;


        // =========================================
        // NAME VALIDATION
        // =========================================

        if (name === "") {

            alert("Please enter your full name.");

            document
                .getElementById("reg-name")
                .focus();

            return;
        }


        if (name.length < 3) {

            alert("Name must contain at least 3 characters.");

            document
                .getElementById("reg-name")
                .focus();

            return;
        }


        // =========================================
        // PHONE VALIDATION
        // =========================================

        if (phone === "") {

            alert("Please enter your phone number.");

            document
                .getElementById("reg-phone")
                .focus();

            return;
        }


        // Remove spaces, +, -, brackets for checking
        const cleanPhone =
            phone.replace(/[\s\-()+]/g, "");


        if (!/^\d{10}$/.test(cleanPhone)) {

            alert("Please enter a valid 10-digit phone number.");

            document
                .getElementById("reg-phone")
                .focus();

            return;
        }


        // =========================================
        // EMAIL VALIDATION
        // =========================================

        if (email === "") {

            alert("Please enter your email address.");

            document
                .getElementById("reg-email")
                .focus();

            return;
        }


        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!emailPattern.test(email)) {

            alert("Please enter a valid email address.");

            document
                .getElementById("reg-email")
                .focus();

            return;
        }


        // =========================================
        // PASSWORD VALIDATION
        // =========================================

        if (password === "") {

            alert("Please enter your password.");

            document
                .getElementById("reg-password")
                .focus();

            return;
        }


        // Minimum 8 characters
        if (password.length < 8) {

            alert(
                "Password must be at least 8 characters long."
            );

            document
                .getElementById("reg-password")
                .focus();

            return;
        }


        // At least one uppercase
        if (!/[A-Z]/.test(password)) {

            alert(
                "Password must contain at least one uppercase letter."
            );

            document
                .getElementById("reg-password")
                .focus();

            return;
        }


        // At least one lowercase
        if (!/[a-z]/.test(password)) {

            alert(
                "Password must contain at least one lowercase letter."
            );

            document
                .getElementById("reg-password")
                .focus();

            return;
        }


        // At least one number
        if (!/[0-9]/.test(password)) {

            alert(
                "Password must contain at least one number."
            );

            document
                .getElementById("reg-password")
                .focus();

            return;
        }


        // =========================================
        // CONFIRM PASSWORD
        // =========================================

        if (confirmPassword === "") {

            alert("Please confirm your password.");

            document
                .getElementById("reg-confirm-password")
                .focus();

            return;
        }


        if (password !== confirmPassword) {

            alert(
                "Password and Confirm Password do not match."
            );

            document
                .getElementById("reg-confirm-password")
                .focus();

            return;
        }


        // =========================================
        // CHECK IF EMAIL ALREADY EXISTS
        // =========================================

        const existingUser =
            localStorage.getItem("roadcareUser");


        if (existingUser) {

            const user =
                JSON.parse(existingUser);


            if (
                user.email.toLowerCase() ===
                email.toLowerCase()
            ) {

                alert(
                    "This email is already registered. Please login."
                );

                window.location.href = "login.html";

                return;
            }
        }


        // =========================================
        // CREATE USER OBJECT
        // =========================================

        const user = {

            name: name,

            phone: cleanPhone,

            email: email,

            password: password

        };


        // =========================================
        // SAVE USER
        // =========================================

        localStorage.setItem(
            "roadcareUser",
            JSON.stringify(user)
        );


        // =========================================
        // LOGIN STATUS
        // =========================================

        localStorage.setItem(
            "roadcareLoggedIn",
            "false"
        );


        // =========================================
        // SUCCESS
        // =========================================

        alert(
            "Account created successfully! Please login."
        );


        // =========================================
        // GO TO LOGIN PAGE
        // =========================================

        window.location.href = "login.html";

    });