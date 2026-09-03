const loginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const submitButton = loginForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
    loginMessage.hidden = true;
    loginMessage.style.display = "none";

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: document.getElementById("username").value,
                password: document.getElementById("password").value
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to log in.");
        }

        window.location.href = "/admin.html";
    } catch (error) {
        loginMessage.textContent = "Wrong user or password";
        loginMessage.hidden = false;
        loginMessage.style.display = "block";
        loginMessage.focus();
        submitButton.disabled = false;
        submitButton.textContent = "Log In";
    }
});
