
/* =====================================
   VIRTUAL HUMAN - SUPABASE AUTH
===================================== */

// Supabase project configuration
const SUPABASE_URL = "https://vjqipmeuflpbihgvuwqq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FBAnKsj2USSBd3UZbjORpA__eOoMvs5";

// Initialize Supabase
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// Authentication elements
const authScreen = document.getElementById("auth-screen");
const mainApp = document.getElementById("main-app");
const authForm = document.getElementById("auth-form");

const authTitle = document.getElementById("auth-title");
const authDescription = document.getElementById("auth-description");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");

const nameField = document.getElementById("name-field");
const nameInput = document.getElementById("auth-name");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");

const switchText = document.getElementById("switch-text");
const switchButton = document.getElementById("auth-switch-btn");

const logoutButton = document.getElementById("logout-btn");

let isSignupMode = false;

// Switch between login and signup
function updateAuthMode() {
    authMessage.textContent = "";

    isSignupMode = !isSignupMode;

    nameField.hidden = !isSignupMode;
    nameInput.required = isSignupMode;

    if (isSignupMode) {
        authTitle.textContent = "Create your account.";
        authDescription.textContent =
            "Start building your own digital world.";

        authSubmit.textContent = "Create Account →";
        switchText.textContent = "Already have an account?";
        switchButton.textContent = "Sign in";

        passwordInput.autocomplete = "new-password";
    } else {
        authTitle.textContent = "Welcome back.";
        authDescription.textContent =
            "Sign in to enter your digital world.";

        authSubmit.textContent = "Sign In →";
        switchText.textContent = "Don't have an account?";
        switchButton.textContent = "Create account";

        passwordInput.autocomplete = "current-password";
    }
}

switchButton.addEventListener("click", updateAuthMode);

// Display messages
function showAuthMessage(message, type = "info") {
    authMessage.textContent = message;

    if (type === "error") {
        authMessage.style.color = "#f87171";
    } else if (type === "success") {
        authMessage.style.color = "#4ade80";
    } else {
        authMessage.style.color = "#fbbf24";
    }
}

// Loading state
function setLoading(loading) {
    authSubmit.disabled = loading;

    if (loading) {
        authSubmit.textContent = "Please wait...";
    } else {
        authSubmit.textContent = isSignupMode
            ? "Create Account →"
            : "Sign In →";
    }
}

// Authentication form
authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();

    setLoading(true);
    authMessage.textContent = "";

    try {
        if (isSignupMode) {

            const { data, error } =
                await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            display_name: fullName
                        }
                    }
                });

            if (error) throw error;

            if (data.session) {
                showAuthMessage(
                    "Account created successfully!",
                    "success"
                );
            } else {
                showAuthMessage(
                    "Account created! Please verify your email before signing in.",
                    "success"
                );
            }

        } else {

            const { error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (error) throw error;

            showAuthMessage(
                "Login successful!",
                "success"
            );
        }

    } catch (error) {
        showAuthMessage(error.message, "error");
    } finally {
        setLoading(false);
    }
});

// Display the correct screen
function updateAppScreen(session) {
    const isLoggedIn = Boolean(session?.user);

    authScreen.hidden = isLoggedIn;
    mainApp.hidden = !isLoggedIn;

    if (!isLoggedIn) {
        authForm.reset();

        if (isSignupMode) {
            updateAuthMode();
        }

        authMessage.textContent = "";
    }
}

// Monitor login sessions
supabaseClient.auth.onAuthStateChange(
    (_event, session) => {
        updateAppScreen(session);
    }
);

// Check existing session
async function initializeApp() {
    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        showAuthMessage(
            "Unable to check session. Please refresh.",
            "error"
        );
        return;
    }

    updateAppScreen(data.session);
}

// Logout
logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    const { error } = await supabaseClient.auth.signOut();

    logoutButton.disabled = false;

    if (error) {
        alert("Logout failed: " + error.message);
    }
});

// Website navigation
const navigationItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach(page => {
        page.classList.toggle("active", page.id === pageId);
    });

    navigationItems.forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageId
        );
    });
}

navigationItems.forEach(item => {
    item.addEventListener("click", () => {
        showPage(item.dataset.page);
    });
});

document.getElementById("start-btn").addEventListener("click", () => {
    showPage("settings");
});

// Initialize
initializeApp();

console.log("Virtual Human initialized.");
