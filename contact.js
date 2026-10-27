// =========================================
// CONTACT FORM - SEND MESSAGE TO EMAIL
// No key needed - uses FormSubmit (formsubmit.co)
// =========================================

// Messages will be delivered to this email
const CONTACT_RECEIVER_EMAIL = "tartesamiksha@gmail.com";


const contactForm = document.querySelector(".contact-form");

contactForm.addEventListener("submit", async function(event) {

    event.preventDefault();


    // =========================================
    // GET INPUT VALUES
    // =========================================

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();


    // =========================================
    // VALIDATION
    // =========================================

    if (name === "") {

        alert("Please enter your name.");

        document.getElementById("name").focus();

        return;
    }


    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        alert("Please enter a valid email address.");

        document.getElementById("email").focus();

        return;
    }


    if (message === "") {

        alert("Please write your message.");

        document.getElementById("message").focus();

        return;
    }


    // =========================================
    // DISABLE BUTTON WHILE SENDING
    // =========================================

    const sendBtn = contactForm.querySelector("button[type='submit']");
    const originalText = sendBtn.textContent;

    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";


    // =========================================
    // SEND THE MESSAGE
    // =========================================

    try {

        const response = await fetch(
            "https://formsubmit.co/ajax/" + encodeURIComponent(CONTACT_RECEIVER_EMAIL),
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    _subject: "RoadCare - New message from " + name,
                    _template: "box",
                    _captcha: "false",
                    Name: name,
                    email: email,        // you can reply directly to this email
                    Message: message
                })
            }
        );

        const result = await response.json();

        if (response.ok && (result.success === true || result.success === "true")) {

            alert("Thank you, " + name + "! Your message has been sent successfully.");

            contactForm.reset();

        } else {

            alert("Could not send the message: " + (result.message || "Unknown error"));
        }

    } catch (error) {

        console.error(error);

        alert("Could not send the message. Please check your internet connection and try again.");

    } finally {

        // Restore the button
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
    }
});