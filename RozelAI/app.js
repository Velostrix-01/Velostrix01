
/* =====================================
   VIRTUAL HUMAN
   AUTH + CHARACTER + MULTIPLE CHATS
===================================== */

// SUPABASE CONFIGURATION

const SUPABASE_URL = "https://vjqipmeuflpbihgvuwqq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FBAnKsj2USSBd3UZbjORpA__eOoMvs5";

if (!window.supabase) {
    throw new Error("Supabase library did not load. Check your internet connection and CDN script.");
}

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);


// =====================================
// AUTHENTICATION ELEMENTS
// =====================================

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


// =====================================
// CHARACTER FORM ELEMENTS
// =====================================

const characterForm = document.getElementById("character-form");
const characterHeadingTitle = document.getElementById("character-heading-title");
const characterSaveButton = document.getElementById("character-save-btn");
const characterMessage = document.getElementById("character-message");
const startButton = document.getElementById("start-btn");

const characterInputs = {
    name: document.getElementById("character-name"),
    age: document.getElementById("character-age"),
    nationality: document.getElementById("character-nationality"),
    city: document.getElementById("character-city"),
    background: document.getElementById("character-background"),
    personality: document.getElementById("character-personality"),
    relationship_type: document.getElementById("character-relationship"),
    interests: document.getElementById("character-interests"),
    autonomy_level: document.getElementById("character-autonomy"),
    communication_frequency: document.getElementById("character-frequency")
};


// =====================================
// GLOBAL STATE
// =====================================

let isSignupMode = false;
let activeUserId = null;
let characterRecord = null;
let characterLoadSequence = 0;

let chatHistory = [];
let conversations = [];
let activeConversationId = null;
let isChatSending = false;
let conversationLoadSequence = 0;


// =====================================
// AUTHENTICATION
// =====================================

function updateAuthMode() {
    authMessage.textContent = "";
    isSignupMode = !isSignupMode;

    nameField.hidden = !isSignupMode;
    nameInput.required = isSignupMode;

    if (isSignupMode) {
        authTitle.textContent = "Create your account.";
        authDescription.textContent = "Start building your own digital world.";
        authSubmit.textContent = "Create Account →";
        switchText.textContent = "Already have an account?";
        switchButton.textContent = "Sign in";
        passwordInput.autocomplete = "new-password";
    } else {
        authTitle.textContent = "Welcome back.";
        authDescription.textContent = "Sign in to enter your digital world.";
        authSubmit.textContent = "Sign In →";
        switchText.textContent = "Don't have an account?";
        switchButton.textContent = "Create account";
        passwordInput.autocomplete = "current-password";
    }
}

switchButton.addEventListener("click", updateAuthMode);


function showAuthMessage(message, type = "info") {
    authMessage.textContent = message;

    authMessage.style.color =
        type === "error" ? "#f87171" :
        type === "success" ? "#4ade80" :
        "#fbbf24";
}


function setAuthLoading(loading) {
    authSubmit.disabled = loading;

    authSubmit.textContent = loading
        ? "Please wait..."
        : isSignupMode
            ? "Create Account →"
            : "Sign In →";
}


authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();

    setAuthLoading(true);
    authMessage.textContent = "";

    try {
        if (isSignupMode) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { display_name: fullName },
                    emailRedirectTo: "https://velostrix.com/RozelAI/index.html"
                }
            });

            if (error) throw error;

            if (data.session) {
                showAuthMessage("Account created successfully!", "success");
            } else {
                showAuthMessage(
                    "Account created! Please verify your email before signing in.",
                    "success"
                );
            }

        } else {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            showAuthMessage("Login successful!", "success");
        }

    } catch (error) {
        showAuthMessage(
            error.message || "Authentication failed. Please try again.",
            "error"
        );

    } finally {
        setAuthLoading(false);
    }
});


function updateAppScreen(session) {
    const isLoggedIn = Boolean(session?.user);

    authScreen.hidden = isLoggedIn;
    mainApp.hidden = !isLoggedIn;

    if (!isLoggedIn) {
        authForm.reset();
        authMessage.textContent = "";

        if (isSignupMode) {
            updateAuthMode();
        }
    }
}


// =====================================
// CHARACTER PROFILE
// =====================================

function showCharacterMessage(message, type = "info") {
    characterMessage.textContent = message;
    characterMessage.className = "character-message";

    if (type === "error" || type === "success") {
        characterMessage.classList.add(type);
    }
}


function updateCharacterLabels() {
    const hasCharacter = Boolean(characterRecord);

    characterHeadingTitle.textContent = hasCharacter
        ? "Update your character."
        : "Create your character.";

    characterSaveButton.innerHTML = hasCharacter
        ? 'Save Changes <span>→</span>'
        : 'Save Character <span>→</span>';

    startButton.innerHTML = hasCharacter
        ? 'Edit Your Character <span>→</span>'
        : 'Create Your Character <span>→</span>';

    const chatCharacterName = document.getElementById("chat-character-name");

    if (chatCharacterName) {
        chatCharacterName.textContent = characterRecord
            ? characterRecord.name
            : "Your Character";
    }
}


function fillCharacterForm(character) {
    characterInputs.name.value = character.name || "";
    characterInputs.age.value = character.age ?? "";
    characterInputs.nationality.value = character.nationality || "";
    characterInputs.city.value = character.city || "";
    characterInputs.background.value = character.background || "";
    characterInputs.personality.value = character.personality || "";
    characterInputs.relationship_type.value = character.relationship_type || "";

    characterInputs.interests.value = Array.isArray(character.interests)
        ? character.interests.join(", ")
        : "";

    characterInputs.autonomy_level.value =
        character.autonomy_level || "medium";

    characterInputs.communication_frequency.value =
        character.communication_frequency || "frequent";
}


function resetCharacterForm() {
    characterForm.reset();

    characterInputs.autonomy_level.value = "medium";
    characterInputs.communication_frequency.value = "frequent";
}


// =====================================
// CHAT ELEMENTS
// =====================================

const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
const chatSendButton = document.getElementById("chat-send-btn");
const chatCharacterName = document.getElementById("chat-character-name");
const chatEmpty = document.getElementById("chat-empty");

const newChatButton = document.getElementById("new-chat-btn");
const conversationList = document.getElementById("conversation-list");
const activeConversationTitle = document.getElementById("active-conversation-title");


// =====================================
// CHAT DISPLAY FUNCTIONS
// =====================================

function showChatEmpty(message = "Send her a message to begin.") {
    chatMessages.replaceChildren();

    if (chatEmpty) {
        chatEmpty.hidden = false;

        const description = chatEmpty.querySelector("p");

        if (description) {
            description.textContent = message;
        }

        chatMessages.appendChild(chatEmpty);
    }
}


function resetChatView() {
    chatHistory = [];
    activeConversationId = null;

    if (activeConversationTitle) {
        activeConversationTitle.textContent = "New conversation";
    }

    showChatEmpty("Send her a message to begin.");
    renderConversationList();
}


function addChatMessage(role, content, isTyping = false) {
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;

    if (isTyping) {
        message.classList.add("typing");
    }

    const label = document.createElement("span");
    label.className = "chat-message-label";

    label.textContent = role === "user"
        ? "YOU"
        : chatCharacterName.textContent;

    const text = document.createElement("div");

    // Plain text only. No Markdown or HTML rendering.
    text.textContent = content;

    message.appendChild(label);
    message.appendChild(text);

    if (chatEmpty) {
        chatEmpty.hidden = true;
    }

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}


function setChatLoading(loading) {
    isChatSending = loading;

    chatSendButton.disabled = loading;
    chatInput.disabled = loading;

    if (newChatButton) {
        newChatButton.disabled = loading;
    }

    chatSendButton.textContent = loading ? "..." : "Send →";
}


function formatConversationDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString([], {
        day: "numeric",
        month: "short"
    });
}


// =====================================
// CONVERSATION LIST
// =====================================

function renderConversationList() {
    if (!conversationList) return;

    conversationList.replaceChildren();

    if (conversations.length === 0) {
        const empty = document.createElement("p");

        empty.className = "conversation-list-empty";
        empty.textContent = "No conversations yet";

        conversationList.appendChild(empty);
        return;
    }

    conversations.forEach((conversation) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "conversation-item";

        if (conversation.id === activeConversationId) {
            button.classList.add("active");
        }

        const title = document.createElement("span");

        title.className = "conversation-item-title";
        title.textContent = conversation.title || "New Conversation";

        const date = document.createElement("span");

        date.className = "conversation-item-date";

        date.textContent = formatConversationDate(
            conversation.last_message_at ||
            conversation.updated_at ||
            conversation.created_at
        );

        button.append(title, date);

        button.addEventListener("click", () => {
            if (!isChatSending) {
                loadConversation(conversation.id);
            }
        });

        conversationList.appendChild(button);
    });
}


// =====================================
// LOAD CONVERSATIONS
// =====================================

async function loadConversationList(selectMostRecent = false) {
    if (!activeUserId || !characterRecord) return;

    const userAtStart = activeUserId;
    const characterIdAtStart = characterRecord.id;

    const { data, error } = await supabaseClient
        .from("character_conversations")
        .select("id, title, created_at, updated_at, last_message_at")
        .eq("user_id", userAtStart)
        .eq("character_id", characterIdAtStart)
        .order("last_message_at", {
            ascending: false,
            nullsFirst: false
        })
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error("Could not load conversations:", error.message);
        return;
    }

    if (
        activeUserId !== userAtStart ||
        !characterRecord ||
        characterRecord.id !== characterIdAtStart
    ) {
        return;
    }

    conversations = data || [];

    renderConversationList();

    if (selectMostRecent && conversations.length > 0) {
        await loadConversation(conversations[0].id);

    } else if (activeConversationId) {
        const stillExists = conversations.some(
            (item) => item.id === activeConversationId
        );

        if (!stillExists) {
            resetChatView();
        } else {
            renderConversationList();
        }
    }
}


// =====================================
// LOAD SELECTED CONVERSATION MESSAGES
// =====================================

async function loadConversation(conversationId) {
    if (!activeUserId || !characterRecord || !conversationId) {
        return;
    }

    const requestNumber = ++conversationLoadSequence;
    const userAtStart = activeUserId;
    const characterIdAtStart = characterRecord.id;

    const selectedConversation = conversations.find(
        (item) => item.id === conversationId
    );

    if (activeConversationTitle) {
        activeConversationTitle.textContent =
            selectedConversation?.title || "Conversation";
    }

    activeConversationId = conversationId;
    chatHistory = [];

    showChatEmpty("Loading conversation...");
    renderConversationList();

    const { data, error } = await supabaseClient
        .from("character_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .eq("user_id", userAtStart)
        .order("created_at", { ascending: true });

    if (
        requestNumber !== conversationLoadSequence ||
        activeUserId !== userAtStart ||
        !characterRecord ||
        characterRecord.id !== characterIdAtStart ||
        activeConversationId !== conversationId
    ) {
        return;
    }

    if (error) {
        console.error("Could not load conversation messages:", error.message);

        showChatEmpty("Couldn't load this conversation. Please try again.");
        return;
    }

    chatMessages.replaceChildren();

    chatHistory = (data || []).map((item) => ({
        role: item.role,
        content: item.content
    }));

    if (chatHistory.length === 0) {
        showChatEmpty("Send her a message to begin.");
        return;
    }

    chatHistory.forEach((item) => {
        addChatMessage(item.role, item.content);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// =====================================
// CREATE NEW CONVERSATION
// =====================================

function startNewConversation() {
    if (isChatSending) return;

    ++conversationLoadSequence;

    activeConversationId = null;
    chatHistory = [];

    if (activeConversationTitle) {
        activeConversationTitle.textContent = "New conversation";
    }

    showChatEmpty(
        "This is a new conversation. Send her a message to begin."
    );

    renderConversationList();
    chatInput.focus();
}


if (newChatButton) {
    newChatButton.addEventListener("click", startNewConversation);
}


// =====================================
// LOAD CHARACTER
// =====================================

async function loadCharacter(userId) {
    const requestNumber = ++characterLoadSequence;

    showCharacterMessage("Checking your character profile...");

    try {
        const { data, error } = await supabaseClient
            .from("characters")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (
            requestNumber !== characterLoadSequence ||
            activeUserId !== userId
        ) {
            return;
        }

        if (error) throw error;

        characterRecord = data;

        if (data) {
            fillCharacterForm(data);

            showCharacterMessage(
                "Your character profile is loaded. You can edit it and save changes.",
                "success"
            );

        } else {
            resetCharacterForm();

            showCharacterMessage(
                "No character created yet. Fill in the details to create one."
            );
        }

        updateCharacterLabels();

        if (data) {
            await loadConversationList(true);
        } else {
            conversations = [];
            resetChatView();
        }

    } catch (error) {
        if (
            requestNumber !== characterLoadSequence ||
            activeUserId !== userId
        ) {
            return;
        }

        showCharacterMessage(
            "Could not load your character profile: " +
            (error.message || "Unknown error"),
            "error"
        );
    }
}


// =====================================
// SAVE CHARACTER
// =====================================

characterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    showCharacterMessage("");

    const name = characterInputs.name.value.trim();
    const personality = characterInputs.personality.value.trim();
    const ageText = characterInputs.age.value.trim();

    const age = ageText === "" ? null : Number(ageText);

    if (!name || !personality) {
        showCharacterMessage(
            "Please enter a character name and personality.",
            "error"
        );
        return;
    }

    if (
        age !== null &&
        (!Number.isInteger(age) || age < 1 || age > 120)
    ) {
        showCharacterMessage(
            "Age must be a whole number between 1 and 120.",
            "error"
        );
        return;
    }

    characterSaveButton.disabled = true;
    characterSaveButton.textContent = "Saving...";

    try {
        const { data: userData, error: userError } =
            await supabaseClient.auth.getUser();

        if (userError) throw userError;

        if (!userData.user) {
            throw new Error(
                "Your session has expired. Please sign in again."
            );
        }

        const interests = characterInputs.interests.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

        const characterData = {
            user_id: userData.user.id,
            name,
            age,
            nationality: characterInputs.nationality.value.trim() || null,
            city: characterInputs.city.value.trim() || null,
            background: characterInputs.background.value.trim() || null,
            personality,
            relationship_type:
                characterInputs.relationship_type.value.trim() || null,
            interests,
            autonomy_level: characterInputs.autonomy_level.value,
            communication_frequency:
                characterInputs.communication_frequency.value,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseClient
            .from("characters")
            .upsert(characterData, {
                onConflict: "user_id"
            })
            .select()
            .single();

        if (error) throw error;

        characterRecord = data;

        fillCharacterForm(data);
        updateCharacterLabels();

        showCharacterMessage(
            "Character saved successfully. Your profile is linked to your account.",
            "success"
        );

        await loadConversationList(true);

    } catch (error) {
        showCharacterMessage(
            "Could not save your character: " +
            (error.message || "Unknown error"),
            "error"
        );

    } finally {
        characterSaveButton.disabled = false;
        updateCharacterLabels();
    }
});


// =====================================
// SEND MESSAGE
// =====================================

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isChatSending) return;

    const message = chatInput.value.trim();

    if (!message) return;

    if (!activeUserId) {
        addChatMessage(
            "assistant",
            "Your session has expired. Please sign in again."
        );
        return;
    }

    if (!characterRecord) {
        addChatMessage(
            "assistant",
            "Create your character first before starting a conversation."
        );
        return;
    }

    // Display user message immediately.
    addChatMessage("user", message);

    chatInput.value = "";
    setChatLoading(true);

    const typingMessage = addChatMessage(
        "assistant",
        "Thinking...",
        true
    );

    try {
        const requestBody = {
            messages: [
                { role: "user", content: message }
            ],
            conversation_id: activeConversationId
        };

        const { data, error } = await supabaseClient.functions.invoke(
            "character-chat",
            {
                body: requestBody
            }
        );

        if (error) {
            let details = error.message;

            try {
                const response = error.context;

                if (response && typeof response.json === "function") {
                    const responseBody = await response.json();
                    details = responseBody.error || details;
                }
            } catch (_) {
                // Keep original error.
            }

            throw new Error(details || "Unable to contact the AI.");
        }

        if (!data || !data.reply || !data.conversation_id) {
            throw new Error(
                data?.error || "The AI returned an incomplete response."
            );
        }

        activeConversationId = data.conversation_id;

        chatHistory.push(
            { role: "user", content: message },
            { role: "assistant", content: data.reply }
        );

        typingMessage.remove();

        addChatMessage("assistant", data.reply);

        await loadConversationList(false);

        const activeItem = conversations.find(
            (item) => item.id === activeConversationId
        );

        if (activeConversationTitle && activeItem) {
            activeConversationTitle.textContent =
                activeItem.title || "Conversation";
        }

    } catch (error) {
        typingMessage.remove();

        addChatMessage(
            "assistant",
            "Sorry, I couldn't respond right now. " +
            (error.message || "Please try again.")
        );

    } finally {
        setChatLoading(false);
        chatInput.focus();
    }
});


// =====================================
// SESSION HANDLING
// =====================================

function handleSession(session) {
    updateAppScreen(session);

    const userId = session?.user?.id || null;

    if (userId !== activeUserId) {
        activeUserId = userId;
        characterRecord = null;
        characterLoadSequence++;

        if (userId) {
            updateCharacterLabels();
            loadCharacter(userId);

        } else {
            resetCharacterForm();
            showCharacterMessage("");
            updateCharacterLabels();

            conversations = [];
            resetChatView();
        }
    }
}


// Keep database requests outside the auth callback.
supabaseClient.auth.onAuthStateChange((_event, session) => {
    updateAppScreen(session);

    const userId = session?.user?.id || null;

    if (userId !== activeUserId) {
        activeUserId = userId;
        characterRecord = null;
        characterLoadSequence++;

        if (userId) {
            updateCharacterLabels();

            window.setTimeout(() => {
                if (activeUserId === userId) {
                    loadCharacter(userId);
                }
            }, 0);

        } else {
            resetCharacterForm();
            showCharacterMessage("");
            updateCharacterLabels();

            conversations = [];
            resetChatView();
        }
    }
});


async function initializeApp() {
    try {
        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        handleSession(data.session);

    } catch (error) {
        showAuthMessage(
            "Unable to check session. Please refresh the page.",
            "error"
        );
    }
}


// =====================================
// LOGOUT
// =====================================

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

    } catch (error) {
        alert("Logout failed: " + (error.message || "Unknown error"));

    } finally {
        logoutButton.disabled = false;
    }
});


// =====================================
// WEBSITE NAVIGATION
// =====================================

const navigationItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach((page) => {
        page.classList.toggle("active", page.id === pageId);
    });

    navigationItems.forEach((item) => {
        item.classList.toggle(
            "active",
            item.dataset.page === pageId
        );
    });
}

navigationItems.forEach((item) => {
    item.addEventListener("click", () => {
        showPage(item.dataset.page);
    });
});

startButton.addEventListener("click", () => {
    showPage("character");
});


// =====================================
// INITIALIZE WEBSITE
// =====================================

initializeApp();

console.log("Virtual Human initialized.");


// =====================================
// CLEAR CHAT STATE ON SIGN OUT
// =====================================

supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
        ++conversationLoadSequence;

        chatHistory = [];
        conversations = [];
        activeConversationId = null;

        if (conversationList) {
            conversationList.replaceChildren();
        }

        resetChatView();

        chatCharacterName.textContent = "Your Character";
    }
});
